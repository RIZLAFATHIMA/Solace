import logging
from flask import Blueprint, jsonify, request
from database import SessionLocal
from models.db_models import User, TherapistPatient, JournalEntry, Emotion
from utils.auth_middleware import token_required

logger = logging.getLogger(__name__)

therapist_bp = Blueprint('therapist', __name__)


# ---------------------------------------------------------------------------
# GET /api/therapist/patients
# Returns all patients assigned to this therapist.
# FIX: rejected patients are now excluded from the list entirely.
#      Previously ALL patients (including rejected) were returned with full
#      name + email — a privacy leak.
# ---------------------------------------------------------------------------
@therapist_bp.route('/patients', methods=['GET'])
@token_required
def get_assigned_patients(current_user_id, current_user_role):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied. Only therapists can view patients'}), 403

    db = SessionLocal()
    try:
        # FIX: only fetch pending and accepted — rejected patients are excluded
        assignments = (
            db.query(TherapistPatient)
            .filter(
                TherapistPatient.therapist_id == current_user_id,
                TherapistPatient.status.in_(['pending', 'accepted'])
            )
            .all()
        )

        patients_data = []
        for assignment in assignments:
            patient = db.query(User).filter(User.user_id == assignment.patient_id).first()
            if patient:
                patients_data.append({
                    "patient_id": patient.user_id,
                    "name": patient.name,
                    "email": patient.email,
                    "status": assignment.status,
                    "assigned_at": assignment.assigned_at.isoformat() + "Z" if assignment.assigned_at else None
                })

        return jsonify(patients_data), 200

    except Exception as e:
        logger.error(f"Failed to fetch patients for therapist {current_user_id}: {e}")
        return jsonify({'message': 'Failed to fetch patients.'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/therapist/patients/<patient_id>/status
# Accept or reject a pending patient assignment.
# FIX: added db.rollback() on failure + guard against re-processing
#      already accepted/rejected assignments.
# ---------------------------------------------------------------------------
@therapist_bp.route('/patients/<int:patient_id>/status', methods=['POST'])
@token_required
def update_patient_status(current_user_id, current_user_role, patient_id):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'message': 'Request body is required'}), 400

    new_status = data.get('status')
    if new_status not in ['accepted', 'rejected']:
        return jsonify({'message': 'Invalid status. Must be accepted or rejected.'}), 400

    db = SessionLocal()
    try:
        assignment = db.query(TherapistPatient).filter(
            TherapistPatient.therapist_id == current_user_id,
            TherapistPatient.patient_id == patient_id
        ).first()

        if not assignment:
            return jsonify({'message': 'Patient link not found'}), 404

        # FIX: prevent re-processing an already finalised assignment
        if assignment.status == new_status:
            return jsonify({'message': f'Patient is already {new_status}.'}), 409

        if assignment.status != 'pending':
            return jsonify({
                'message': f'Cannot change status. Assignment is already {assignment.status}.'
            }), 409

        assignment.status = new_status
        db.commit()

        return jsonify({'message': f'Patient {new_status} successfully'}), 200

    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to update patient {patient_id} status "
            f"for therapist {current_user_id}: {e}"
        )
        return jsonify({'message': 'Failed to update patient status.'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/therapist/patients/<patient_id>/emotions
# Returns emotion trend data for a specific accepted patient.
# FIX: added error handling + clearer rejection message.
# ---------------------------------------------------------------------------
@therapist_bp.route('/patients/<int:patient_id>/emotions', methods=['GET'])
@token_required
def get_patient_emotions(current_user_id, current_user_role, patient_id):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied'}), 403

    db = SessionLocal()
    try:
        assignment = db.query(TherapistPatient).filter(
            TherapistPatient.therapist_id == current_user_id,
            TherapistPatient.patient_id == patient_id
        ).first()

        if not assignment:
            return jsonify({'message': 'This patient is not assigned to you.'}), 403

        if assignment.status == 'pending':
            return jsonify({
                'message': 'Patient has not accepted your request yet.'
            }), 403

        if assignment.status == 'rejected':
            return jsonify({
                'message': 'This patient assignment was rejected.'
            }), 403

        # Fetch all journal entries for this patient in chronological order
        entries = (
            db.query(JournalEntry)
            .filter(JournalEntry.user_id == patient_id)
            .order_by(JournalEntry.created_at.asc())
            .all()
        )

        emotion_trends = []
        for entry in entries:
            emotions = (
                db.query(Emotion)
                .filter(Emotion.journal_id == entry.journal_id)
                .all()
            )
            for e in emotions:
                emotion_trends.append({
                    "date": entry.created_at.isoformat() + "Z",
                    "entry_type": entry.entry_type,
                    "emotion": e.emotion_label,
                    "confidence_percentage": e.confidence_score,
                    "model_type": e.model_type
                })

        return jsonify(emotion_trends), 200

    except Exception as e:
        logger.error(
            f"Failed to fetch emotions for patient {patient_id} "
            f"requested by therapist {current_user_id}: {e}"
        )
        return jsonify({'message': 'Failed to fetch patient emotion data.'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/therapist/patients/<patient_id>/profile
# NEW: Returns basic profile info for an accepted patient.
# Therapists need to see who they are treating — name, email, join date.
# ---------------------------------------------------------------------------
@therapist_bp.route('/patients/<int:patient_id>/profile', methods=['GET'])
@token_required
def get_patient_profile(current_user_id, current_user_role, patient_id):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied'}), 403

    db = SessionLocal()
    try:
        assignment = db.query(TherapistPatient).filter(
            TherapistPatient.therapist_id == current_user_id,
            TherapistPatient.patient_id == patient_id
        ).first()

        if not assignment:
            return jsonify({'message': 'This patient is not assigned to you.'}), 403

        if assignment.status != 'accepted':
            return jsonify({'message': 'Patient assignment is not yet accepted.'}), 403

        patient = db.query(User).filter(User.user_id == patient_id).first()
        if not patient:
            return jsonify({'message': 'Patient not found.'}), 404

        # Count total journal entries for this patient
        total_entries = (
            db.query(JournalEntry)
            .filter(JournalEntry.user_id == patient_id)
            .count()
        )

        return jsonify({
            "patient_id": patient.user_id,
            "name": patient.name,
            "email": patient.email,
            "total_journal_entries": total_entries,
            "assigned_at": assignment.assigned_at.isoformat() + "Z" if assignment.assigned_at else None
        }), 200

    except Exception as e:
        logger.error(
            f"Failed to fetch profile for patient {patient_id} "
            f"requested by therapist {current_user_id}: {e}"
        )
        return jsonify({'message': 'Failed to fetch patient profile.'}), 500
    finally:
        db.close()
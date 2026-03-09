from flask import Blueprint, jsonify, request
from database import SessionLocal
from models.db_models import User, TherapistPatient, JournalEntry, Emotion
from utils.auth_middleware import token_required

therapist_bp = Blueprint('therapist', __name__)

@therapist_bp.route('/patients', methods=['GET'])
@token_required
def get_assigned_patients(current_user_id, current_user_role):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied. Only therapists can view patients'}), 403

    db = SessionLocal()
    try:
        # Get all patients assigned to this therapist (both pending and accepted)
        assignments = db.query(TherapistPatient).filter(TherapistPatient.therapist_id == current_user_id).all()
        
        patients_data = []
        for assignment in assignments:
            patient = db.query(User).filter(User.user_id == assignment.patient_id).first()
            if patient:
                patients_data.append({
                    "patient_id": patient.user_id,
                    "name": patient.name,
                    "email": patient.email,
                    "status": assignment.status,
                    "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None
                })
        
        return jsonify(patients_data), 200
    finally:
        db.close()

@therapist_bp.route('/patients/<int:patient_id>/status', methods=['POST'])
@token_required
def update_patient_status(current_user_id, current_user_role, patient_id):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied'}), 403

    data = request.get_json()
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

        assignment.status = new_status
        db.commit()
        return jsonify({'message': f'Patient {new_status} successfully'}), 200
    finally:
        db.close()

@therapist_bp.route('/patients/<int:patient_id>/emotions', methods=['GET'])
@token_required
def get_patient_emotions(current_user_id, current_user_role, patient_id):
    if current_user_role != 'therapist':
        return jsonify({'message': 'Access denied'}), 403

    db = SessionLocal()
    try:
        # Verify the patient is assigned to this therapist AND is accepted
        assignment = db.query(TherapistPatient).filter(
            TherapistPatient.therapist_id == current_user_id,
            TherapistPatient.patient_id == patient_id
        ).first()

        if not assignment:
            return jsonify({'message': 'Patient not assigned to you'}), 403
            
        if assignment.status != 'accepted':
            return jsonify({'message': 'Patient assignment is still pending or rejected'}), 403

        # Get all journal entries for this patient
        entries = db.query(JournalEntry).filter(JournalEntry.user_id == patient_id).order_by(JournalEntry.created_at.asc()).all()
        
        emotion_trends = []
        for entry in entries:
            # We fetch emotions associated with this entry
            emotions = db.query(Emotion).filter(Emotion.journal_id == entry.journal_id).all()
            for e in emotions:
                emotion_trends.append({
                    "date": entry.created_at.isoformat(),
                    "entry_type": entry.entry_type,
                    "emotion": e.emotion_label,
                    "confidence_percentage": e.confidence_score,  # Percentage for the chart
                    "model_type": e.model_type
                })
                
        return jsonify(emotion_trends), 200
    finally:
        db.close()

import os
import logging
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from database import SessionLocal
from models.db_models import JournalEntry, Emotion
from utils.auth_middleware import token_required
from services.emotion_service import predict_text_emotion, predict_voice_emotion

logger = logging.getLogger(__name__)

journal_bp = Blueprint('journal', __name__)

UPLOAD_FOLDER = 'uploads'
# Audio formats the browser/app may send
ALLOWED_EXTENSIONS = {'wav', 'webm', 'ogg', 'mp3', 'm4a'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _allowed_file(filename):
    """Return True only if the file has an allowed audio extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _cleanup_file(filepath):
    """Safely delete a file from disk — used for rollback on failure."""
    try:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Cleaned up file: {filepath}")
    except Exception as e:
        logger.error(f"Failed to clean up file {filepath}: {e}")


# ---------------------------------------------------------------------------
# POST /api/journal/text
# ---------------------------------------------------------------------------
@journal_bp.route('/text', methods=['POST'])
@token_required
def create_text_entry(current_user_id, current_user_role):
    if current_user_role != 'patient':
        return jsonify({'message': 'Only patients can create journal entries'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'message': 'Request body is required'}), 400

    text_content = data.get('text_content', '').strip()
    if not text_content:
        return jsonify({'message': 'Text content is required'}), 400

    db = SessionLocal()
    try:
        # 1. Save journal entry
        entry = JournalEntry(
            user_id=current_user_id,
            entry_type='text',
            text_content=text_content
        )
        db.add(entry)
        db.flush()      # FIX: flush to get journal_id WITHOUT a full commit
                        # so if emotion save fails, the whole thing rolls back

        # 2. Predict emotion
        prediction = predict_text_emotion(text_content)

        # 3. Save emotion linked to the entry
        emotion_record = Emotion(
            journal_id=entry.journal_id,
            emotion_label=prediction['emotion_label'],
            confidence_score=prediction['confidence_score'],
            model_type='text'
        )
        db.add(emotion_record)
        db.commit()     # Single commit — both entry + emotion saved atomically

        return jsonify({
            'message': 'Journal entry saved successfully',
            'journal_id': entry.journal_id,
            'emotion_prediction': prediction
        }), 201

    except Exception as e:
        db.rollback()   # FIX: rollback on any failure so no partial writes
        logger.error(f"Failed to save text journal entry for user {current_user_id}: {e}")
        return jsonify({'message': 'Failed to save journal entry. Please try again.'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/journal/voice
# ---------------------------------------------------------------------------
@journal_bp.route('/voice', methods=['POST'])
@token_required
def create_voice_entry(current_user_id, current_user_role):
    if current_user_role != 'patient':
        return jsonify({'message': 'Only patients can create journal entries'}), 403

    if 'audio' not in request.files:
        return jsonify({'message': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    if not audio_file or audio_file.filename == '':
        return jsonify({'message': 'Empty filename'}), 400

    # FIX: validate file extension before saving anything to disk
    if not _allowed_file(audio_file.filename):
        return jsonify({
            'message': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    filename = secure_filename(f"{current_user_id}_{audio_file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    db = SessionLocal()
    try:
        # 1. Save file to disk
        audio_file.save(filepath)

        # 2. Save journal entry
        entry = JournalEntry(
            user_id=current_user_id,
            entry_type='voice',
            audio_path=filepath
        )
        db.add(entry)
        db.flush()      # FIX: flush instead of commit to keep transaction open

        # 3. Predict emotion
        prediction = predict_voice_emotion(filepath)

        # 4. Save emotion
        emotion_record = Emotion(
            journal_id=entry.journal_id,
            emotion_label=prediction['emotion_label'],
            confidence_score=prediction['confidence_score'],
            model_type='voice'
        )
        db.add(emotion_record)
        db.commit()     # Single atomic commit

        return jsonify({
            'message': 'Voice entry saved successfully',
            'journal_id': entry.journal_id,
            'emotion_prediction': prediction
        }), 201

    except Exception as e:
        db.rollback()
        # FIX: clean up the saved file if anything went wrong after saving it
        _cleanup_file(filepath)
        logger.error(f"Failed to save voice journal entry for user {current_user_id}: {e}")
        return jsonify({'message': f'Error processing voice entry: {str(e)}'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/journal/my-entries
# ---------------------------------------------------------------------------
@journal_bp.route('/my-entries', methods=['GET'])
@token_required
def get_my_entries(current_user_id, current_user_role):
    if current_user_role != 'patient':
        return jsonify({'message': 'Only patients can view their entries here'}), 403

    db = SessionLocal()
    try:
        entries = (
            db.query(JournalEntry)
            .filter(JournalEntry.user_id == current_user_id)
            .order_by(JournalEntry.created_at.desc())
            .all()
        )

        result = []
        for entry in entries:
            emotions = (
                db.query(Emotion)
                .filter(Emotion.journal_id == entry.journal_id)
                .all()
            )
            emotion_data = [
                {
                    "label": e.emotion_label,
                    "confidence": e.confidence_score,
                    "model": e.model_type
                }
                for e in emotions
            ]

            result.append({
                "journal_id": entry.journal_id,
                "entry_type": entry.entry_type,
                "text_content": entry.text_content,
                # audio_path intentionally excluded — don't expose server file paths to frontend
                "created_at": entry.created_at.isoformat() + "Z",
                "emotions": emotion_data
            })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Failed to fetch entries for user {current_user_id}: {e}")
        return jsonify({'message': 'Failed to fetch journal entries.'}), 500
    finally:
        db.close()
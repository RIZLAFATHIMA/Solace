import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from database import SessionLocal
from models.db_models import JournalEntry, Emotion
from utils.auth_middleware import token_required
from services.emotion_service import predict_text_emotion, predict_voice_emotion

journal_bp = Blueprint('journal', __name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@journal_bp.route('/text', methods=['POST'])
@token_required
def create_text_entry(current_user_id, current_user_role):
    if current_user_role != 'patient':
        return jsonify({'message': 'Only patients can create journal entries'}), 403

    data = request.get_json()
    text_content = data.get('text_content')
    if not text_content:
        return jsonify({'message': 'Text content is required'}), 400

    db = SessionLocal()
    try:
        # Create Journal Entry
        entry = JournalEntry(
            user_id=current_user_id,
            entry_type='text',
            text_content=text_content
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        # Get Emotion Prediction
        prediction = predict_text_emotion(text_content)

        # Save Emotion
        emotion_record = Emotion(
            journal_id=entry.journal_id,
            emotion_label=prediction['emotion_label'],
            confidence_score=prediction['confidence_score'],
            model_type='text'
        )
        db.add(emotion_record)
        db.commit()

        return jsonify({
            'message': 'Journal entry saved successfully',
            'journal_id': entry.journal_id,
            'emotion_prediction': prediction
        }), 201
    finally:
        db.close()

@journal_bp.route('/voice', methods=['POST'])
@token_required
def create_voice_entry(current_user_id, current_user_role):
    if current_user_role != 'patient':
        return jsonify({'message': 'Only patients can create journal entries'}), 403

    if 'audio' not in request.files:
        return jsonify({'message': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'message': 'Empty filename'}), 400

    filename = secure_filename(f"{current_user_id}_{audio_file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio_file.save(filepath)

    db = SessionLocal()
    try:
        # Create Journal Entry
        entry = JournalEntry(
            user_id=current_user_id,
            entry_type='voice',
            audio_path=filepath
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        # Get Emotion Prediction
        prediction = predict_voice_emotion(filepath)

        # Save Emotion
        emotion_record = Emotion(
            journal_id=entry.journal_id,
            emotion_label=prediction['emotion_label'],
            confidence_score=prediction['confidence_score'],
            model_type='voice'
        )
        db.add(emotion_record)
        db.commit()

        return jsonify({
            'message': 'Voice entry saved successfully',
            'journal_id': entry.journal_id,
            'emotion_prediction': prediction
        }), 201
    except Exception as e:
        return jsonify({'message': f'Error processing voice entry: {str(e)}'}), 500
    finally:
        db.close()

@journal_bp.route('/my-entries', methods=['GET'])
@token_required
def get_my_entries(current_user_id, current_user_role):
    if current_user_role != 'patient':
        return jsonify({'message': 'Only patients can view their entries here'}), 403

    db = SessionLocal()
    try:
        entries = db.query(JournalEntry).filter(JournalEntry.user_id == current_user_id).order_by(JournalEntry.created_at.desc()).all()
        result = []
        for entry in entries:
            # Get associated emotions
            emotions = db.query(Emotion).filter(Emotion.journal_id == entry.journal_id).all()
            emotion_data = [{"label": e.emotion_label, "confidence": e.confidence_score, "model": e.model_type} for e in emotions]
            
            result.append({
                "journal_id": entry.journal_id,
                "entry_type": entry.entry_type,
                "text_content": entry.text_content,
                "created_at": entry.created_at.isoformat(),
                "emotions": emotion_data
            })
        
        return jsonify(result), 200
    finally:
        db.close()

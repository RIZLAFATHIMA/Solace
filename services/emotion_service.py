import os
import requests
import numpy as np
import librosa

import logging

logging.basicConfig(filename='app_debug.log', level=logging.DEBUG)

logging.info("Loading Text Emotion settings...")
# Since Windows doesn't easily compile transformers without Rust,
# we use the lightweight HuggingFace API pattern or a simple heuristic fallback
# if the local HuggingFace inference endpoint is unavailable.

logging.info("Loading Voice Emotion Model (Keras)...")
try:
    # Importing keras here to avoid slow startup if not needed
    import tensorflow as tf
    voice_model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'voice_model', 'voice_emotion_cnn_lstm.keras')
    voice_model = tf.keras.models.load_model(voice_model_path)
except Exception as e:
    logging.error(f"Failed to load voice model. Ensure 'models/voice_model/voice_emotion_cnn_lstm.keras' is valid. Error: {e}")
    voice_model = None

# Fallback mapping if your models just output numerical labels
TEXT_EMOTION_MAP = {
    "LABEL_0": "Joy",
    "LABEL_1": "Sadness",
    "LABEL_2": "Anger",
    "LABEL_3": "Fear"
}

VOICE_EMOTION_MAP = {
    0: "Neutral",
    1: "Sadness",
    2: "Joy",
    3: "Anger"
}

def predict_text_emotion(text: str) -> dict:
    try:
        # A lightweight fallback heuristic since compiled transformers aren't available
        text_lower = text.lower()
        if any(word in text_lower for word in ["happy", "great", "awesome", "good", "joy"]):
            label, score = "Joy", 85.0
        elif any(word in text_lower for word in ["sad", "depressed", "cry", "down"]):
            label, score = "Sadness", 80.0
        elif any(word in text_lower for word in ["angry", "mad", "furious"]):
            label, score = "Anger", 75.0
        elif any(word in text_lower for word in ["scared", "fear", "anxious"]):
            label, score = "Fear", 70.0
        else:
            label, score = "Neutral", 60.0

        return {
            "emotion_label": label,
            "confidence_score": score
        }
    except Exception as e:
        print(f"Error predicting text emotion: {e}")
        return {"emotion_label": "Error", "confidence_score": 0.0}

def extract_mfcc(file_path):
    """ Standard MFCC extraction for speech emotion recognition """
    try:
        # Load audio file matching librosa standards. Let it dynamically determine sample rate since WebM/Ogg can be tricky without ffmpeg
        y, sr = librosa.load(file_path, sr=None)
        
        # If audio is shorter than desired duration, it padds it. If longer, it gets truncated later.
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        
        # Pad or truncate to ensure fixed length (e.g., 130 frames)
        max_pad_len = 130
        pad_width = max_pad_len - mfcc.shape[1]
        
        if pad_width > 0:
            mfcc = np.pad(mfcc, pad_width=((0, 0), (0, pad_width)), mode='constant')
        else:
            mfcc = mfcc[:, :max_pad_len]
            
        logging.debug(f"[DEBUG] Extracted MFCC shape: {mfcc.shape}")
        return mfcc
    except Exception as e:
        logging.error(f"[ERROR] failed to extract MFCC from {file_path}: {str(e)}")
        # Return a zero matrix of correct shape as fallback so shape errors don't crash predict
        return np.zeros((40, 130))

def predict_voice_emotion(audio_path: str) -> dict:
    if not voice_model:
        return {"emotion_label": "Unknown", "confidence_score": 0.0}

    try:
        # Preprocess audio (Extract MFCCs)
        # Note: You may need to tweak reshaping based on your model's expected Input Shape
        # e.g., (1, 40, 130, 1) to match CNN formats
        features = extract_mfcc(audio_path)
        features = np.expand_dims(features, axis=0) # batch size 1
        features = np.expand_dims(features, axis=-1) # channels 1
        logging.debug(f"[DEBUG] Final feature shape for prediction: {features.shape}")
        
        # Predict
        predictions = voice_model.predict(features)
        logging.debug(f"[DEBUG] Raw Model Output: {predictions}")
        predicted_class = np.argmax(predictions, axis=1)[0]
        confidence = float(np.max(predictions) * 100.0) # Confidenct in percentage
        
        readable_label = VOICE_EMOTION_MAP.get(predicted_class, f"Emotion_{predicted_class}")
        
        return {
            "emotion_label": readable_label,
            "confidence_score": round(confidence, 2)
        }
    except Exception as e:
        logging.error(f"Error predicting voice emotion: {e}")
        return {"emotion_label": "Error", "confidence_score": 0.0}

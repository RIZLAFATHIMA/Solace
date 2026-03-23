import os
import numpy as np
import librosa
import logging
import logging.handlers

# -----------------------------------------------------------------------
# Logging setup — rotating file so app_debug.log never grows unboundedly.
# Keeps last 5 files, each max 2MB.
# -----------------------------------------------------------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    handler = logging.handlers.RotatingFileHandler(
        'app_debug.log',
        maxBytes=2 * 1024 * 1024,  # 2 MB per file
        backupCount=5               # keep last 5 rotated files
    )
    handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    ))
    logger.addHandler(handler)

# -----------------------------------------------------------------------
# Voice model — loaded once at startup
# -----------------------------------------------------------------------
voice_model = None

logger.info("Loading voice emotion model (Keras)...")
try:
    import tensorflow as tf
    voice_model_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'models', 'voice_model', 'voice_emotion_cnn_lstm.keras'
    )
    if os.path.exists(voice_model_path):
        voice_model = tf.keras.models.load_model(voice_model_path)
        logger.info(f"Voice model loaded successfully from: {voice_model_path}")
    else:
        logger.warning(
            f"Voice model file not found at: {voice_model_path}. "
            "Voice emotion prediction will be unavailable."
        )
except Exception as e:
    logger.error(f"Failed to load voice model: {e}")
    voice_model = None

# -----------------------------------------------------------------------
# Emotion label maps
# TEXT_EMOTION_MAP is ready for when you plug in a real HuggingFace model.
# The model outputs LABEL_0, LABEL_1 etc. — this maps them to readable names.
# -----------------------------------------------------------------------
TEXT_EMOTION_MAP = {
    "LABEL_0": "Joy",
    "LABEL_1": "Sadness",
    "LABEL_2": "Anger",
    "LABEL_3": "Fear",
    "LABEL_4": "Neutral"
}

VOICE_EMOTION_MAP = {
    0: "Neutral",
    1: "Sadness",
    2: "Joy",
    3: "Anger",
    4: "Fear"
}

# -----------------------------------------------------------------------
# Text emotion — keyword heuristic with basic negation handling
# TODO: Replace with a real HuggingFace model call when transformers
#       are available. Example endpoint:
#       POST https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base
#       Headers: {"Authorization": "Bearer YOUR_HF_TOKEN"}
#       Body:    {"inputs": text}
# -----------------------------------------------------------------------

# Negation words that flip the meaning of what follows
_NEGATIONS = {"not", "no", "never", "don't", "didn't", "doesn't", "won't", "can't", "couldn't"}

_EMOTION_KEYWORDS = {
    "Joy":     ["happy", "great", "awesome", "good", "joy", "excited",
                "wonderful", "fantastic", "love", "glad", "elated", "thrilled"],
    "Sadness": ["sad", "depressed", "cry", "down", "unhappy", "miserable",
                "hopeless", "lonely", "grief", "sorrow", "devastated"],
    "Anger":   ["angry", "mad", "furious", "frustrated", "annoyed",
                "irritated", "rage", "hate", "outraged"],
    "Fear":    ["scared", "fear", "anxious", "nervous", "worried",
                "terrified", "dread", "panic", "afraid", "stress"],
}

def _has_keyword_negated(words, keywords):
    """
    Returns True if any keyword from the list appears in words[]
    WITHOUT a negation word immediately before it.
    e.g. "I'm not happy" → negated → does NOT match Joy
         "I'm happy"     → not negated → matches Joy
    """
    for i, word in enumerate(words):
        if word in keywords:
            if i > 0 and words[i - 1] in _NEGATIONS:
                continue  # negated — skip this keyword
            return True
    return False


def predict_text_emotion(text: str) -> dict:
    """
    Predict emotion from text using a keyword heuristic with negation awareness.
    Confidence scores are intentionally conservative to reflect that this is
    a heuristic, not a trained model.
    """
    try:
        words = text.lower().split()

        for emotion, keywords in _EMOTION_KEYWORDS.items():
            if _has_keyword_negated(words, keywords):
                # Map emotion to a confidence score
                score_map = {"Joy": 82.0, "Sadness": 78.0, "Anger": 75.0, "Fear": 72.0}
                return {
                    "emotion_label": emotion,
                    "confidence_score": score_map[emotion],
                    "method": "heuristic"   # tells frontend this isn't ML-based
                }

        return {
            "emotion_label": "Neutral",
            "confidence_score": 60.0,
            "method": "heuristic"
        }

    except Exception as e:
        logger.error(f"Error predicting text emotion: {e}")
        return {"emotion_label": "Neutral", "confidence_score": 0.0, "method": "error"}


# -----------------------------------------------------------------------
# Voice emotion — MFCC extraction + CNN-LSTM model
# -----------------------------------------------------------------------

def extract_mfcc(file_path: str) -> np.ndarray:
    """
    Extract MFCC features from an audio file.
    Returns a (40, 130) shaped array, zero-padded or truncated as needed.
    Falls back to a zero matrix if extraction fails so the caller
    always gets a correctly shaped array.
    """
    try:
        y, sr = librosa.load(file_path, sr=None)

        if len(y) == 0:
            raise ValueError("Audio file is empty or could not be decoded.")

        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)

        max_pad_len = 130
        pad_width = max_pad_len - mfcc.shape[1]

        if pad_width > 0:
            mfcc = np.pad(mfcc, pad_width=((0, 0), (0, pad_width)), mode='constant')
        else:
            mfcc = mfcc[:, :max_pad_len]

        logger.debug(f"Extracted MFCC shape: {mfcc.shape} from {file_path}")
        return mfcc

    except Exception as e:
        logger.error(f"Failed to extract MFCC from {file_path}: {e}")
        return np.zeros((40, 130))  # safe fallback shape


def predict_voice_emotion(audio_path: str) -> dict:
    """
    Predict emotion from an audio file using the CNN-LSTM model.
    Returns Unknown if the model failed to load at startup.
    """
    if voice_model is None:
        logger.warning("Voice model is not loaded. Returning Unknown.")
        return {"emotion_label": "Unknown", "confidence_score": 0.0}

    try:
        features = extract_mfcc(audio_path)

        # Shape: (1, 40, 130, 1) — batch=1, height=40, width=130, channels=1
        features = np.expand_dims(features, axis=0)
        features = np.expand_dims(features, axis=-1)
        logger.debug(f"Feature shape for prediction: {features.shape}")

        predictions = voice_model.predict(features, verbose=0)
        logger.debug(f"Raw model output: {predictions}")

        predicted_class = int(np.argmax(predictions, axis=1)[0])
        confidence = round(float(np.max(predictions) * 100.0), 2)
        readable_label = VOICE_EMOTION_MAP.get(predicted_class, f"Emotion_{predicted_class}")

        logger.info(f"Voice prediction: {readable_label} ({confidence}%) for {audio_path}")

        return {
            "emotion_label": readable_label,
            "confidence_score": confidence
        }

    except Exception as e:
        logger.error(f"Error predicting voice emotion for {audio_path}: {e}")
        return {"emotion_label": "Error", "confidence_score": 0.0}
"""
generate_mock_data.py
---------------------
Utility script to seed a patient account with realistic mock journal
entries spanning the last 14 days. Useful for testing charts and
emotion trend visualizations.

Usage:
    cd emotion_system
    python backend/generate_mock_data.py
"""

import os
import sys
import random
import logging
from datetime import datetime, timedelta

# Allow running from any working directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models.db_models import User, JournalEntry, Emotion

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Simulates a realistic emotional journey over 14 days
MOOD_JOURNEY = [
    {"label": "Sadness", "conf": 82.5, "days_ago": 14,
     "text": "Feeling very low today. Couldn't find the energy to go out."},
    {"label": "Sadness", "conf": 70.1, "days_ago": 13,
     "text": "Still a bit gloomy, but I managed to make breakfast."},
    {"label": "Neutral",  "conf": 65.0, "days_ago": 11,
     "text": "An okay day. Nothing special happened, just work and home."},
    {"label": "Neutral",  "conf": 88.0, "days_ago": 10,
     "text": "Feeling stable. The weather is nice."},
    {"label": "Joy",      "conf": 92.4, "days_ago": 8,
     "text": "Had an amazing lunch with an old friend! Laughed so much."},
    {"label": "Fear",     "conf": 78.9, "days_ago": 7,
     "text": "I have a huge presentation coming up and I am so anxious and scared."},
    {"label": "Anger",    "conf": 90.0, "days_ago": 5,
     "text": "So frustrating! My project got delayed again due to someone else's mistake."},
    {"label": "Neutral",  "conf": 55.4, "days_ago": 3,
     "text": "Calmed down from earlier this week. Just processing things."},
    {"label": "Joy",      "conf": 89.2, "days_ago": 2,
     "text": "The presentation actually went perfectly! So relieved and happy."},
    {"label": "Joy",      "conf": 95.1, "days_ago": 0,
     "text": "Woke up feeling incredibly refreshed and optimistic about the weekend!"},
]


def generate_mock_data(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.error(f"User with email '{email}' not found in the database.")
            return

        logger.info(f"Generating mock data for: {user.name} (ID: {user.user_id})")

        now = datetime.now()

        for step in MOOD_JOURNEY:
            entry_date = now - timedelta(days=step["days_ago"])
            # Randomise time so entries don't all appear at midnight
            entry_date = entry_date.replace(
                hour=random.randint(9, 21),
                minute=random.randint(0, 59),
                second=0,
                microsecond=0
            )

            # 1. Add journal entry
            new_entry = JournalEntry(
                user_id=user.user_id,
                entry_type="text",
                text_content=step["text"],
                created_at=entry_date
            )
            db.add(new_entry)

            # FIX: use flush() instead of commit() inside the loop.
            # flush() sends the INSERT to the DB and gives us the
            # auto-generated journal_id WITHOUT closing the transaction.
            # This means if anything fails, the entire batch rolls back
            # cleanly — no orphaned journal entries with no emotions.
            db.flush()

            # 2. Add corresponding emotion linked to the entry
            new_emotion = Emotion(
                journal_id=new_entry.journal_id,
                emotion_label=step["label"],
                confidence_score=step["conf"],
                model_type="text",
                created_at=entry_date
            )
            db.add(new_emotion)

        # Single commit at the end — all 10 entries saved atomically
        db.commit()
        logger.info(
            f"Successfully generated {len(MOOD_JOURNEY)} mock entries "
            "spanning the last 14 days."
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to generate mock data, rolled back all changes: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    # Allow passing email as a command-line argument:
    # python generate_mock_data.py someone@example.com
    if len(sys.argv) > 1:
        target_email = sys.argv[1]
    else:
        target_email = "rizlafathimsts1@gmail.com"

    generate_mock_data(target_email)
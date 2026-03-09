from sqlalchemy import Column, Integer, String, Text, Float, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), CheckConstraint("role IN ('patient','therapist')"))
    invite_code = Column(String(20), unique=True, nullable=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete")
    patients_assigned = relationship("TherapistPatient", foreign_keys="[TherapistPatient.therapist_id]", back_populates="therapist")
    therapists_assigned = relationship("TherapistPatient", foreign_keys="[TherapistPatient.patient_id]", back_populates="patient")

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    journal_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    entry_type = Column(String(10), CheckConstraint("entry_type IN ('text','voice')"))
    text_content = Column(Text, nullable=True)
    audio_path = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="journal_entries")
    emotions = relationship("Emotion", back_populates="journal", cascade="all, delete")

class Emotion(Base):
    __tablename__ = "emotions"

    emotion_id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, ForeignKey("journal_entries.journal_id", ondelete="CASCADE"))
    emotion_label = Column(String(50))
    confidence_score = Column(Float) # Stores percentage/confidence of the emotion
    model_type = Column(String(10), CheckConstraint("model_type IN ('text','voice')"))
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    journal = relationship("JournalEntry", back_populates="emotions")

class TherapistPatient(Base):
    __tablename__ = "therapist_patient"

    id = Column(Integer, primary_key=True, index=True)
    therapist_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    patient_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    status = Column(String(20), CheckConstraint("status IN ('pending', 'accepted', 'rejected')"), default='pending')
    assigned_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    therapist = relationship("User", foreign_keys=[therapist_id], back_populates="patients_assigned")
    patient = relationship("User", foreign_keys=[patient_id], back_populates="therapists_assigned")

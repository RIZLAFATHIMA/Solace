from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import quote_plus
import os
from dotenv import load_dotenv

load_dotenv()

# Option 1: Full DATABASE_URL provided directly (must be already URL-encoded)
DATABASE_URL = os.environ.get("DATABASE_URL")

# Option 2: Build URL from individual parts — password is auto URL-encoded
# so special characters like # ! @ in passwords work without manual encoding
if not DATABASE_URL:
    db_user     = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")
    db_host     = os.environ.get("DB_HOST")
    db_port     = os.environ.get("DB_PORT", "5432")
    db_name     = os.environ.get("DB_NAME", "postgres")

    if all([db_user, db_password, db_host]):
        DATABASE_URL = (
            f"postgresql://{db_user}:{quote_plus(db_password)}"
            f"@{db_host}:{db_port}/{db_name}"
        )
    else:
        raise RuntimeError(
            "Database credentials not found.\n"
            "Add either DATABASE_URL or all of these to your .env:\n"
            "  DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME"
        )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
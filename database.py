from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Using Supabase PostgreSQL connection string
# URL Encoding the password since it contains special characters (#, !)
from urllib.parse import quote_plus
password = quote_plus("#solace123!!!")
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    f"postgresql://postgres:{password}@db.dqvfbptimbybyobzkmyl.supabase.co:5432/postgres"
)

# Set pool_pre_ping=True to check connections before using them, preventing issues with stale connections
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

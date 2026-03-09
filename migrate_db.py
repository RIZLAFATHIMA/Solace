from database import engine, Base
from sqlalchemy import text

def add_status_column():
    with engine.connect() as conn:
        try:
            # Check if column exists first
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='therapist_patient' and column_name='status'"))
            if result.fetchone() is None:
                print("Adding status column to therapist_patient table...")
                conn.execute(text("ALTER TABLE therapist_patient ADD COLUMN status VARCHAR(20) DEFAULT 'pending'"))
                conn.execute(text("ALTER TABLE therapist_patient ADD CONSTRAINT status_check CHECK (status IN ('pending', 'accepted', 'rejected'))"))
                conn.commit()
                print("Successfully added status column.")
            else:
                print("Status column already exists.")
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    add_status_column()

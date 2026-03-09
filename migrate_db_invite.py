from database import engine, Base
from sqlalchemy import text

def add_invite_code_column():
    with engine.connect() as conn:
        try:
            # Check if column exists first
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' and column_name='invite_code'"))
            if result.fetchone() is None:
                print("Adding invite_code column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN invite_code VARCHAR(20) UNIQUE"))
                conn.commit()
                print("Successfully added invite_code column.")
            else:
                print("invite_code column already exists.")
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    add_invite_code_column()

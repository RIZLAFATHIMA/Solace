from database import engine, Base
from sqlalchemy import text
import traceback

def add_is_verified_column():
    with engine.connect() as conn:
        try:
            # Check if column exists first
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' and column_name='is_verified'"))
            if result.fetchone() is None:
                print("Adding is_verified column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0"))
                conn.commit()
                print("Successfully added is_verified column.")
            else:
                print("is_verified column already exists.")
        except Exception as e:
            print(f"Error updating schema: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    add_is_verified_column()

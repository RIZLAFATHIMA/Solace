from database import SessionLocal
from models.db_models import User

db = SessionLocal()
users = db.query(User).all()

print(f"Total users: {len(users)}")
for u in users:
    print(f"ID: {u.user_id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")
    if not u.password_hash:
        print(" -> WARNING: No password hash!")
    if not u.role:
        print(" -> WARNING: No role!")

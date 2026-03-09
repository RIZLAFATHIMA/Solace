import datetime
import jwt
import random
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from database import SessionLocal
from models.db_models import User, TherapistPatient

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('role'):
        return jsonify({'message': 'Missing required fields'}), 400

    if data.get('role') not in ['patient', 'therapist']:
        return jsonify({'message': 'Invalid role. Must be patient or therapist.'}), 400

    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == data['email']).first()
        if existing_user:
            return jsonify({'message': 'User already exists'}), 409

        # Generate invite code if it's a therapist
        invite_code = None
        if data['role'] == 'therapist':
            while True:
                code = str(random.randint(100000, 999999))
                if not db.query(User).filter(User.invite_code == code).first():
                    invite_code = code
                    break
                    
        # Create new user
        hashed_password = generate_password_hash(data['password'])
        new_user = User(
            name=data.get('name', ''),
            email=data['email'],
            password_hash=hashed_password,
            role=data['role'],
            invite_code=invite_code
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # If it's a patient and they provided an invite_code, create a pending link
        if data['role'] == 'patient' and data.get('invite_code'):
            therapist = db.query(User).filter(User.invite_code == data['invite_code'], User.role == 'therapist').first()
            if therapist:
                new_link = TherapistPatient(
                    therapist_id=therapist.user_id,
                    patient_id=new_user.user_id,
                    status='pending'
                )
                db.add(new_link)
                db.commit()

        return jsonify({'message': 'User registered successfully', 'user_id': new_user.user_id}), 201
    finally:
        db.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == data['email']).first()
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'message': 'Invalid email or password'}), 401

        # Generate JWT token
        token = jwt.encode({
            'user_id': user.user_id,
            'role': user.role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['JWT_SECRET_KEY'], algorithm="HS256")

        return jsonify({
            'token': token,
            'user': {
                'user_id': user.user_id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'invite_code': user.invite_code
            }
        }), 200
    finally:
        db.close()

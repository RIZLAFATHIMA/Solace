"""
routes/auth.py
--------------
Handles user registration, email verification, and login.
"""

import datetime
import jwt
import random
import logging
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from database import SessionLocal
from models.db_models import User, TherapistPatient
from utils.email_service import (
    generate_verification_token,
    confirm_verification_token,
    send_verification_email
)

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


def _make_token(user):
    """Generate a JWT token for a given user."""
    return jwt.encode(
        {
            'user_id': user.user_id,
            'role': user.role,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
        },
        current_app.config['JWT_SECRET_KEY'],
        algorithm="HS256"
    )


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('role'):
        return jsonify({'message': 'Missing required fields'}), 400

    if data.get('role') not in ['patient', 'therapist']:
        return jsonify({'message': 'Invalid role. Must be patient or therapist.'}), 400

    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == data['email']).first()
        if existing_user:
            if not existing_user.is_verified:
                # Resend verification email if they registered but never verified
                token = generate_verification_token(existing_user.email)
                send_verification_email(existing_user.email, token)
                return jsonify({
                    'message': 'Account already exists but is not verified. '
                               'A new verification email has been sent.'
                }), 409
            return jsonify({'message': 'User already exists'}), 409

        # Generate unique invite code for therapists
        invite_code = None
        if data['role'] == 'therapist':
            while True:
                code = str(random.randint(100000, 999999))
                if not db.query(User).filter(User.invite_code == code).first():
                    invite_code = code
                    break

        hashed_password = generate_password_hash(data['password'])
        new_user = User(
            name=data.get('name', ''),
            email=data['email'],
            password_hash=hashed_password,
            role=data['role'],
            invite_code=invite_code,
            is_verified=0  # Not verified until email is confirmed
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Link patient to therapist if invite code provided
        if data['role'] == 'patient' and data.get('invite_code'):
            therapist = db.query(User).filter(
                User.invite_code == data['invite_code'],
                User.role == 'therapist'
            ).first()
            if therapist:
                new_link = TherapistPatient(
                    therapist_id=therapist.user_id,
                    patient_id=new_user.user_id,
                    status='pending'
                )
                db.add(new_link)
                db.commit()

        # Send verification email
        token = generate_verification_token(new_user.email)
        email_sent = send_verification_email(new_user.email, token)

        if not email_sent:
            logger.error(f"Failed to send verification email to {new_user.email}")
            return jsonify({
                'message': 'Account created but verification email could not be sent. '
                           'Please contact support.'
            }), 201

        return jsonify({
            'message': 'Registration successful! Please check your email to verify your account.'
        }), 201

    except Exception as e:
        db.rollback()
        logger.error(f"Registration failed: {e}")
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/auth/verify/<token>
# Called when user clicks the link in their email
# ---------------------------------------------------------------------------
@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    email = confirm_verification_token(token)

    if not email:
        # Redirect to login with an error message
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        return f"""
        <html>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f4f4f4;">
          <div style="max-width:400px;margin:auto;background:white;padding:32px;border-radius:10px;">
            <h2 style="color:#e74c3c;">Link Expired</h2>
            <p>This verification link is invalid or has expired.</p>
            <p>Please register again to get a new link.</p>
            <a href="{frontend_url}/register"
               style="background:#4a779b;color:white;padding:12px 24px;
                      border-radius:8px;text-decoration:none;">
              Back to Register
            </a>
          </div>
        </body>
        </html>
        """, 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return jsonify({'message': 'User not found.'}), 404

        if user.is_verified:
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
            return f"""
            <html>
            <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f4f4f4;">
              <div style="max-width:400px;margin:auto;background:white;padding:32px;border-radius:10px;">
                <h2 style="color:#4a779b;">Already Verified</h2>
                <p>Your account is already verified. You can log in now.</p>
                <a href="{frontend_url}/login"
                   style="background:#4a779b;color:white;padding:12px 24px;
                          border-radius:8px;text-decoration:none;">
                  Go to Login
                </a>
              </div>
            </body>
            </html>
            """, 200

        # Mark as verified
        user.is_verified = 1
        db.commit()

        # Redirect to login page with success message
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        return f"""
        <html>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f4f4f4;">
          <div style="max-width:400px;margin:auto;background:white;padding:32px;border-radius:10px;">
            <h2 style="color:#4a779b;">Email Verified! 🎉</h2>
            <p>Your account has been successfully verified.</p>
            <p>You can now log in to Serenity.</p>
            <a href="{frontend_url}/login"
               style="background:#4a779b;color:white;padding:12px 24px;
                      border-radius:8px;text-decoration:none;">
              Go to Login
            </a>
          </div>
        </body>
        </html>
        """, 200

    except Exception as e:
        db.rollback()
        logger.error(f"Email verification failed: {e}")
        return jsonify({'message': 'Verification failed. Please try again.'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
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

        # Block login if email not verified
        if not user.is_verified:
            return jsonify({
                'message': 'Please verify your email before logging in. '
                           'Check your inbox for the verification link.'
            }), 403

        token = _make_token(user)

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

    except Exception as e:
        logger.error(f"Login failed: {e}")
        return jsonify({'message': f'Login failed: {str(e)}'}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/auth/resend-verification
# Lets a user request a new verification email
# ---------------------------------------------------------------------------
@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json()
    email = data.get('email') if data else None

    if not email:
        return jsonify({'message': 'Email is required'}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        # Always return success even if email not found (security best practice)
        # to avoid leaking which emails are registered
        if not user or user.is_verified:
            return jsonify({
                'message': 'If that email exists and is unverified, '
                           'a new verification link has been sent.'
            }), 200

        token = generate_verification_token(user.email)
        send_verification_email(user.email, token)

        return jsonify({
            'message': 'A new verification email has been sent. Please check your inbox.'
        }), 200

    except Exception as e:
        logger.error(f"Resend verification failed: {e}")
        return jsonify({'message': 'Failed to resend verification email.'}), 500
    finally:
        db.close()
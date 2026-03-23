import os
from dotenv import load_dotenv

# Load .env file FIRST before anything else reads os.environ
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from database import engine, Base
from models import db_models

app = Flask(__name__)

# Enable CORS for the React frontend
# In production, replace "*" with your actual frontend domain
CORS(app, resources={r"/api/*": {"origins": os.environ.get("FRONTEND_ORIGIN", "*")}})

# Secrets are now loaded from .env — no hardcoded fallbacks
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")

# Safety check: crash early if secrets are missing rather than running insecurely
if not app.config["SECRET_KEY"] or not app.config["JWT_SECRET_KEY"]:
    raise RuntimeError(
        "SECRET_KEY and JWT_SECRET_KEY must be set in your .env file. "
        "Run: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

from routes.auth import auth_bp
from routes.journal import journal_bp
from routes.therapist import therapist_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(journal_bp, url_prefix='/api/journal')
app.register_blueprint(therapist_bp, url_prefix='/api/therapist')

# Create tables if they don't exist
with app.app_context():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created or already exist.")
    except Exception as e:
        print(f"Failed to connect to Database or create tables. Error: {e}")

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Emotion Journal API is running"}), 200

if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.run(debug=debug_mode, port=5000)
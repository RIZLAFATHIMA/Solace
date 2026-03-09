import os
from flask import Flask, jsonify
from flask_cors import CORS
from database import engine, Base
from models import db_models

app = Flask(__name__)
# Enable CORS for the React frontend running on port 5173
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "super-secret-dev-key")
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-super-secret-key")

from routes.auth import auth_bp
from routes.journal import journal_bp
from routes.therapist import therapist_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(journal_bp, url_prefix='/api/journal')
app.register_blueprint(therapist_bp, url_prefix='/api/therapist')

# Create tables if they don't exist
# In a production environment, you would use Alembic or similar for migrations.
with app.app_context():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created or already exist.")
    except Exception as e:
        print(f"Failed to connect to Database or create tables. Ensure PostgreSQL is running and credentials are correct. Error: {e}")

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Emotion Journal API is running"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)

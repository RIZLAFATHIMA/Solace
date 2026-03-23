"""
utils/email_service.py
----------------------
Handles sending verification emails via Gmail SMTP.
Uses itsdangerous to generate and verify secure tokens.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MAIL_EMAIL    = os.environ.get("MAIL_EMAIL")
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
FRONTEND_URL  = os.environ.get("FRONTEND_URL", "http://localhost:5173")
SECRET_KEY    = os.environ.get("SECRET_KEY")

# Token expires after 24 hours
TOKEN_EXPIRY_SECONDS = 86400


def generate_verification_token(email: str) -> str:
    """Generate a secure time-limited token for the given email."""
    serializer = URLSafeTimedSerializer(SECRET_KEY)
    return serializer.dumps(email, salt="email-verification")


def confirm_verification_token(token: str) -> str | None:
    """
    Decode and validate a verification token.
    Returns the email if valid, None if expired or invalid.
    """
    serializer = URLSafeTimedSerializer(SECRET_KEY)
    try:
        email = serializer.loads(
            token,
            salt="email-verification",
            max_age=TOKEN_EXPIRY_SECONDS
        )
        return email
    except SignatureExpired:
        logger.warning("Verification token has expired.")
        return None
    except BadSignature:
        logger.warning("Invalid verification token.")
        return None


def send_verification_email(email: str, token: str) -> bool:
    """
    Send a verification email to the user.
    Returns True on success, False on failure.
    """
    if not MAIL_EMAIL or not MAIL_PASSWORD:
        logger.error(
            "MAIL_EMAIL or MAIL_PASSWORD not set in .env. "
            "Cannot send verification email."
        )
        return False

    # The link points to your backend verify endpoint
    verify_url = f"http://localhost:5000/api/auth/verify/{token}"

    # --- Build the email ---
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your Serenity account"
    msg["From"]    = f"Serenity App <{MAIL_EMAIL}>"
    msg["To"]      = email

    # Plain text fallback
    text_body = f"""
Hi,

Thank you for registering on Serenity — your emotion journal.

Please verify your email address by clicking the link below:
{verify_url}

This link expires in 24 hours.

If you did not create an account, you can safely ignore this email.

— The Serenity Team
"""

    # HTML version
    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px;">
  <div style="max-width: 480px; margin: auto; background: white; border-radius: 10px; padding: 32px;">
    <h2 style="color: #4a779b;">Welcome to Serenity 🌿</h2>
    <p style="color: #444; font-size: 15px;">
      Thank you for signing up! Please verify your email address to activate your account.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{verify_url}"
         style="background: #4a779b; color: white; padding: 14px 28px;
                border-radius: 8px; text-decoration: none; font-size: 15px;">
        Verify My Email
      </a>
    </div>
    <p style="color: #888; font-size: 13px;">
      This link expires in 24 hours.<br>
      If you didn't create an account, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #aaa; font-size: 12px; text-align: center;">
      — The Serenity Team
    </p>
  </div>
</body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    # --- Send via Gmail SMTP ---
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_EMAIL, MAIL_PASSWORD)
            server.sendmail(MAIL_EMAIL, email, msg.as_string())
        logger.info(f"Verification email sent to {email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "Gmail authentication failed. "
            "Make sure you are using an App Password, not your real Gmail password."
        )
        return False
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        return False
"""
test_login.py
-------------
Quick manual test to check login for a specific existing account.
Useful for debugging a known user's login flow.

Usage:
    cd emotion_system
    python test_login.py
"""

import requests
import traceback

# Change these to the account you want to test
TEST_EMAIL = "your_email@example.com"
TEST_PASSWORD = "your_password"

try:
    url = "http://localhost:5000/api/auth/login"
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }

    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)

    try:
        print("Response JSON:", response.json())
    except Exception:
        print("Response Text:", response.text)

except Exception as e:
    print("Request failed:", e)
    traceback.print_exc()
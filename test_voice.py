"""
tests/test_voice.py
-------------------
Tests the /api/journal/voice endpoint by generating a dummy WAV file,
registering a test patient, and uploading the audio.

Usage:
    cd emotion_system
    python tests/test_voice.py
"""

import requests
import numpy as np
import soundfile as sf
import os
import string
import random

BASE_URL = "http://localhost:5000/api"
TEST_FILE = "tests/dummy_test.wav"  # stays inside tests/, ignored by .gitignore


def generate_test_wav():
    """Create a 3-second 440Hz sine wave WAV file for testing."""
    sample_rate = 22050
    duration = 3
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio_data = np.sin(2 * np.pi * 440 * t)
    sf.write(TEST_FILE, audio_data, sample_rate)
    print(f"Created test audio: {TEST_FILE}")


def get_test_token():
    """Register + login a throwaway test patient and return the JWT token."""
    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    email = f"test_audio_{suffix}@example.com"
    password = "password123"

    # Register (ignore error if already exists)
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": "Audio Test User",
        "role": "patient"
    })

    # Login
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })

    token = res.json().get("token")
    if not token:
        raise RuntimeError(f"Failed to get auth token. Login response: {res.json()}")

    return token


def test_voice_upload():
    print("\n--- Test: Voice journal upload ---")
    generate_test_wav()

    try:
        token = get_test_token()
        print(f"Got auth token: {token[:20]}...")

        with open(TEST_FILE, "rb") as f:
            files = {"audio": (TEST_FILE, f, "audio/wav")}
            headers = {"Authorization": f"Bearer {token}"}
            res = requests.post(f"{BASE_URL}/journal/voice", files=files, headers=headers)

        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")
        assert res.status_code == 201, f"Expected 201, got {res.status_code}"
        assert "emotion_prediction" in res.json(), "No emotion_prediction in response"
        print("PASSED")

    finally:
        # Always clean up the test file
        if os.path.exists(TEST_FILE):
            os.remove(TEST_FILE)
            print(f"Cleaned up {TEST_FILE}")


if __name__ == "__main__":
    test_voice_upload()
    print("\nVoice upload test passed!")
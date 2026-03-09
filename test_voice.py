import requests
import numpy as np
import soundfile as sf
import os

# Generate a 3-second dummy audio file
sample_rate = 22050
duration = 3
t = np.linspace(0, duration, int(sample_rate * duration))
audio_data = np.sin(2 * np.pi * 440 * t) # 440 Hz sine wave

test_file = 'dummy_test.wav'
sf.write(test_file, audio_data, sample_rate)

print(f"Created {test_file}. Attempting to upload...")

# We need a valid patient token for the backend. 
# We'll register a dummy patient first to get a token.
base_url = "http://localhost:5000/api"

try:
    print("Registering dummy patient...")
    reg_res = requests.post(f"{base_url}/auth/register", json={
        "email": "test_audio@example.com",
        "password": "password123",
        "name": "Audio Test",
        "role": "patient"
    })
except Exception:
    pass # Might already exist

print("Logging in...")
login_res = requests.post(f"{base_url}/auth/login", json={
    "email": "test_audio@example.com",
    "password": "password123"
})

token = login_res.json().get('token')
if not token:
    print("Failed to get token!")
    exit(1)

print("Uploading audio...")
with open(test_file, 'rb') as f:
    files = {'audio': (test_file, f, 'audio/wav')}
    headers = {'Authorization': f'Bearer {token}'}
    res = requests.post(f"{base_url}/journal/voice", files=files, headers=headers)

print(f"Status Code: {res.status_code}")
print(f"Response: {res.json()}")

os.remove(test_file)

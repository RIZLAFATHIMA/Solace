"""
test_backend_login.py
---------------------
Tests for /api/auth/register and /api/auth/login endpoints.

Usage:
    cd emotion_system
    python test_backend_login.py
"""

import requests
import string
import random

BASE_URL = "http://localhost:5000/api"

def random_email():
    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    return f"test_{suffix}@test.com"


def test_register_and_login():
    email = random_email()
    password = "testpassword123"

    print("\n--- Test: Register new patient ---")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Test User",
        "email": email,
        "password": password,
        "role": "patient"
    })
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 201, f"Expected 201, got {res.status_code}"
    assert "token" in res.json(), "No token in register response"
    print("PASSED")

    print("\n--- Test: Login with registered user ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "token" in res.json(), "No token in login response"
    print("PASSED")

    print("\n--- Test: Login with wrong password ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": "wrongpassword"
    })
    print(f"Status: {res.status_code}")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("PASSED")

    print("\n--- Test: Register duplicate email ---")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Duplicate",
        "email": email,
        "password": password,
        "role": "patient"
    })
    print(f"Status: {res.status_code}")
    assert res.status_code == 409, f"Expected 409, got {res.status_code}"
    print("PASSED")

    print("\n--- Test: Register with invalid role ---")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Bad Role",
        "email": random_email(),
        "password": password,
        "role": "admin"
    })
    print(f"Status: {res.status_code}")
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("PASSED")


if __name__ == "__main__":
    test_register_and_login()
    print("\nAll auth tests passed!")
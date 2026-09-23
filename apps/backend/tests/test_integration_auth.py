"""
Integration tests for the client authentication flow.

Covers Requirements 6.4, 6.5 and 6.6:
  - Full HTTP → validation → token → laudo data flow (Req 6.4, 6.5)
  - Rejection of invalid/absent credentials without exposing laudo data (Req 6.6)
"""

import time

import pytest
import jwt as pyjwt
from fastapi.testclient import TestClient

from src.application.main import app

# ---------------------------------------------------------------------------
# Shared client fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Valid credentials used throughout the test file
# These match the mock dataset in src/services/laudo_service.py
# ---------------------------------------------------------------------------

VALID_PROTOCOLO = "20101.2306"
VALID_CPF = "52998224725"


# ---------------------------------------------------------------------------
# Test 1: Full happy-path flow (Req 6.4, 6.5)
# ---------------------------------------------------------------------------

def test_client_auth_full_flow_valid_credentials(client):
    """
    Req 6.4 / 6.5: POST /api/auth/cliente with valid credentials must return
    HTTP 200 with sucesso=True, a non-empty token, and that token must have
    exp > now (i.e. expiration time in the future).
    """
    response = client.post(
        "/api/auth/cliente",
        json={"protocolo": VALID_PROTOCOLO, "cpf": VALID_CPF},
    )

    assert response.status_code == 200

    data = response.json()
    assert data["sucesso"] is True
    assert "token" in data
    assert data["token"]  # non-empty

    # Decode the token without signature verification to inspect claims
    decoded = pyjwt.decode(
        data["token"],
        options={"verify_signature": False},
    )
    assert decoded["exp"] > time.time(), "Token expiration must be in the future"


# ---------------------------------------------------------------------------
# Test 2: Non-existent protocol → 401 (Req 6.6)
# ---------------------------------------------------------------------------

def test_client_auth_invalid_protocol_returns_401(client):
    """
    Req 6.6: A protocol that does not exist in the dataset must return HTTP 401.
    The response body must NOT expose any laudo data fields.
    """
    response = client.post(
        "/api/auth/cliente",
        json={"protocolo": "INVALIDO.9999", "cpf": VALID_CPF},
    )

    assert response.status_code == 401

    body = response.json()
    # The top-level response must not contain a 'laudo' field
    assert "laudo" not in body
    # The detail block must signal failure
    assert body["detail"]["sucesso"] is False


# ---------------------------------------------------------------------------
# Test 3: Wrong CPF for existing protocol → 401 or 422 (Req 6.6)
# ---------------------------------------------------------------------------

def test_client_auth_invalid_cpf_returns_401_or_422(client):
    """
    Req 6.6: An existing protocol with a mismatched — but structurally valid —
    CPF must return HTTP 401.  A CPF with all identical digits fails the
    digit-check algorithm and returns HTTP 422 (Pydantic validation error).
    Either way, laudo data must not be exposed.
    """
    # "11111111111" has all identical digits → fails Pydantic CPF validator → 422
    response_invalid_digits = client.post(
        "/api/auth/cliente",
        json={"protocolo": VALID_PROTOCOLO, "cpf": "11111111111"},
    )
    assert response_invalid_digits.status_code == 422

    # "07584028007" is a structurally valid CPF that does NOT match the protocol
    response_wrong_cpf = client.post(
        "/api/auth/cliente",
        json={"protocolo": VALID_PROTOCOLO, "cpf": "07584028007"},
    )
    assert response_wrong_cpf.status_code in (401, 422)
    # If 401, laudo data must not be present
    if response_wrong_cpf.status_code == 401:
        assert "laudo" not in response_wrong_cpf.json()


# ---------------------------------------------------------------------------
# Test 4: Token received from login allows GET /api/auth/me (Req 6.4, 6.5)
# ---------------------------------------------------------------------------

def test_client_token_works_on_me_endpoint(client):
    """
    Req 6.4 / 6.5: The JWT returned by a successful /api/auth/cliente POST
    must be accepted by GET /api/auth/me and the session must report role=CLIENTE.
    """
    login_response = client.post(
        "/api/auth/cliente",
        json={"protocolo": VALID_PROTOCOLO, "cpf": VALID_CPF},
    )
    assert login_response.status_code == 200

    token = login_response.json()["token"]

    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["role"] == "CLIENTE"

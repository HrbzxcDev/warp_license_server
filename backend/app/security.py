import os
from dotenv import load_dotenv
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

load_dotenv()

API_KEY = os.getenv("API_KEY", "change-this-secret-key")
ADMIN_KEY = os.getenv("ADMIN_KEY", "change-this-admin-key")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
admin_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


def require_api_key(key: str = Security(api_key_header)):
    """Used by client-facing endpoints (your installer app)."""
    if key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
    return key


def require_admin_key(key: str = Security(admin_key_header)):
    """Used by admin endpoints (your key generator app)."""
    if key != ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin key.",
        )
    return key

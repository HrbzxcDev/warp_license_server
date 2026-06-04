from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_connection
from app.datetime_utils import normalize_db_timestamp, utc_now_iso
from app.security import require_api_key, require_admin_key
from app.models.schemas import (
    VerifyRequest,
    ActivateRequest,
    CreateLicenseRequest,
    LicenseResponse,
    MessageResponse,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ── Client endpoints (used by your installer app) ───────────────

@router.post("/verify-key", response_model=MessageResponse)
@limiter.limit("10/minute")
def verify_key(
    request: Request,
    body: VerifyRequest,
    _key=Depends(require_api_key),
):
    """
    Check if a license key exists and is not yet used.
    Call this before showing the 'Activate' button in your installer.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM licenses WHERE license_key = ? AND product = ?",
        (body.license_key, body.product),
    ).fetchone()
    conn.close()

    if not row:
        return MessageResponse(success=False, message="License key not found.")

    if row["status"] == "active":
        return MessageResponse(
            success=False,
            message="License key is already activated on another machine.",
            data={"status": row["status"]},
        )

    return MessageResponse(
        success=True,
        message="License key is valid and available.",
        data={"status": row["status"]},
    )


@router.post("/activate-key", response_model=MessageResponse)
@limiter.limit("5/minute")
def activate_key(
    request: Request,
    body: ActivateRequest,
    _key=Depends(require_api_key),
):
    """
    Activate a license key and bind it to a machine ID.
    Call this when the user confirms installation.
    """
    conn = get_connection()

    row = conn.execute(
        "SELECT * FROM licenses WHERE license_key = ? AND product = ?",
        (body.license_key, body.product),
    ).fetchone()

    if not row:
        conn.close()
        return MessageResponse(success=False, message="License key not found.")

    if row["status"] == "active":
        # Allow re-activation on the same machine (e.g. reinstall)
        if row["machine_id"] == body.machine_id:
            conn.close()
            return MessageResponse(
                success=True,
                message="License already active on this machine.",
                data={"status": "active"},
            )
        conn.close()
        return MessageResponse(
            success=False,
            message="License key is already activated on a different machine.",
        )

    now = utc_now_iso()
    conn.execute(
        """
        UPDATE licenses
        SET status = 'active', machine_id = ?, activated_at = ?
        WHERE license_key = ? AND product = ?
        """,
        (body.machine_id, now, body.license_key, body.product),
    )
    conn.commit()
    conn.close()

    return MessageResponse(
        success=True,
        message="License activated successfully.",
        data={"status": "active", "activated_at": now},
    )


# ── Admin endpoints (used by your key generator app) ───────────

@router.post("/admin/create-key", response_model=MessageResponse)
def create_key(
    body: CreateLicenseRequest,
    _key=Depends(require_admin_key),
):
    """Add a new license key to the database."""
    conn = get_connection()

    existing = conn.execute(
        "SELECT id FROM licenses WHERE license_key = ?",
        (body.license_key,),
    ).fetchone()

    if existing:
        conn.close()
        return MessageResponse(success=False, message="License key already exists.")

    conn.execute(
        """
        INSERT INTO licenses (license_key, product, status, notes, created_at)
        VALUES (?, ?, 'inactive', ?, ?)
        """,
        (body.license_key, body.product, body.notes, utc_now_iso()),
    )
    conn.commit()
    conn.close()

    return MessageResponse(success=True, message="License key created.", data={"license_key": body.license_key})


@router.get("/admin/list-keys", response_model=list[LicenseResponse])
def list_keys(_key=Depends(require_admin_key)):
    """List all license keys (admin view)."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM licenses ORDER BY created_at DESC").fetchall()
    conn.close()
    return [
        {
            **dict(row),
            "created_at": normalize_db_timestamp(row["created_at"]),
            "activated_at": normalize_db_timestamp(row["activated_at"]),
        }
        for row in rows
    ]


@router.delete("/admin/revoke-key/{license_key}", response_model=MessageResponse)
def revoke_key(license_key: str, _key=Depends(require_admin_key)):
    """Reset a license key back to inactive (e.g. if a user needs to move machines)."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM licenses WHERE license_key = ?", (license_key,)
    ).fetchone()

    if not row:
        conn.close()
        return MessageResponse(success=False, message="License key not found.")

    conn.execute(
        "UPDATE licenses SET status = 'inactive', machine_id = NULL, activated_at = NULL WHERE license_key = ?",
        (license_key,),
    )
    conn.commit()
    conn.close()

    return MessageResponse(success=True, message="License key revoked and reset to inactive.")

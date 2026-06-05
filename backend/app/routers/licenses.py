from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.license import License
from app.models.schemas import (
    ActivateRequest,
    CreateLicenseRequest,
    LicenseResponse,
    MessageResponse,
    VerifyRequest,
)
from app.security import require_admin_key, require_api_key

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _to_response(license_row: License) -> LicenseResponse:
    return LicenseResponse(
        license_key=license_row.license_key,
        product=license_row.product,
        status=license_row.status,
        machine_id=license_row.machine_id,
        activated_at=(
            license_row.activated_at.isoformat() if license_row.activated_at else None
        ),
        created_at=license_row.created_at.isoformat(),
        notes=license_row.notes,
    )


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ── Client endpoints (used by your installer app) ───────────────

@router.post("/verify-key", response_model=MessageResponse)
@limiter.limit("10/minute")
def verify_key(
    request: Request,
    body: VerifyRequest,
    db: Session = Depends(get_db),
    _key=Depends(require_api_key),
):
    row = db.scalar(
        select(License).where(
            License.license_key == body.license_key,
            License.product == body.product,
        )
    )

    if not row:
        return MessageResponse(success=False, message="License key not found.")

    if row.status == "active":
        return MessageResponse(
            success=False,
            message="License key is already activated on another machine.",
            data={"status": row.status},
        )

    return MessageResponse(
        success=True,
        message="License key is valid and available.",
        data={"status": row.status},
    )


@router.post("/activate-key", response_model=MessageResponse)
@limiter.limit("5/minute")
def activate_key(
    request: Request,
    body: ActivateRequest,
    db: Session = Depends(get_db),
    _key=Depends(require_api_key),
):
    row = db.scalar(
        select(License).where(
            License.license_key == body.license_key,
            License.product == body.product,
        )
    )

    if not row:
        return MessageResponse(success=False, message="License key not found.")

    if row.status == "active":
        if row.machine_id == body.machine_id:
            return MessageResponse(
                success=True,
                message="License already active on this machine.",
                data={"status": "active"},
            )
        return MessageResponse(
            success=False,
            message="License key is already activated on a different machine.",
        )

    now = _utc_now()
    row.status = "active"
    row.machine_id = body.machine_id
    row.activated_at = now
    db.commit()

    return MessageResponse(
        success=True,
        message="License activated successfully.",
        data={"status": "active", "activated_at": now.isoformat()},
    )


# ── Admin endpoints (used by your key generator app) ───────────

@router.post("/admin/create-key", response_model=MessageResponse)
def create_key(
    body: CreateLicenseRequest,
    db: Session = Depends(get_db),
    _key=Depends(require_admin_key),
):
    existing = db.scalar(
        select(License.id).where(License.license_key == body.license_key)
    )

    if existing:
        return MessageResponse(success=False, message="License key already exists.")

    license_row = License(
        license_key=body.license_key,
        product=body.product or "default",
        status="inactive",
        notes=body.notes,
    )
    db.add(license_row)
    db.commit()

    return MessageResponse(
        success=True,
        message="License key created.",
        data={"license_key": body.license_key},
    )


@router.get("/admin/list-keys", response_model=list[LicenseResponse])
def list_keys(
    db: Session = Depends(get_db),
    _key=Depends(require_admin_key),
):
    rows = db.scalars(select(License).order_by(License.created_at.desc())).all()
    return [_to_response(row) for row in rows]


@router.delete("/admin/revoke-key/{license_key}", response_model=MessageResponse)
def revoke_key(
    license_key: str,
    db: Session = Depends(get_db),
    _key=Depends(require_admin_key),
):
    row = db.scalar(select(License).where(License.license_key == license_key))

    if not row:
        return MessageResponse(success=False, message="License key not found.")

    row.status = "inactive"
    row.machine_id = None
    row.activated_at = None
    db.commit()

    return MessageResponse(
        success=True,
        message="License key revoked and reset to inactive.",
    )

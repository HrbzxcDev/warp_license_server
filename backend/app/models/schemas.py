from pydantic import BaseModel
from typing import Optional


# ── Request bodies ──────────────────────────────────────────────

class VerifyRequest(BaseModel):
    license_key: str
    product: Optional[str] = "default"


class ActivateRequest(BaseModel):
    license_key: str
    machine_id: str          # Unique ID of the machine doing the install
    product: Optional[str] = "default"


class CreateLicenseRequest(BaseModel):
    license_key: str
    product: Optional[str] = "default"
    notes: Optional[str] = None


# ── Response bodies ─────────────────────────────────────────────

class LicenseResponse(BaseModel):
    license_key: str
    product: str
    status: str
    machine_id: Optional[str]
    activated_at: Optional[str]
    created_at: str
    notes: Optional[str]


class MessageResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

"""
Crew roster persistence.

Stores crew registration data (name, role, height, weight, photo URL)
in data/crew_roster.json and crew photos in data/photos/.

Endpoints
---------
GET  /api/crew-roster             Return the saved roster.
POST /api/crew-roster             Save (upsert) text fields for all crew members.
POST /api/crew-roster/{id}/photo  Upload a photo for one crew member.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

# ── Paths ─────────────────────────────────────────────
DATA_DIR    = Path(__file__).resolve().parent.parent / "data"
ROSTER_FILE = DATA_DIR / "crew_roster.json"
PHOTOS_DIR  = DATA_DIR / "photos"

ALLOWED_EXTS    = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB

# ── Default roster (fallback when no JSON file exists) ─
DEFAULT_CREW: list[dict[str, Any]] = [
    {"id": "CM-1", "name": "A. Okada",     "role": "Commander",          "height_cm": None, "weight_kg": None, "photo_url": None},
    {"id": "CM-2", "name": "M. Reyes",     "role": "Flight Engineer",    "height_cm": None, "weight_kg": None, "photo_url": None},
    {"id": "CM-3", "name": "J. Park",      "role": "Mission Specialist", "height_cm": None, "weight_kg": None, "photo_url": None},
    {"id": "CM-4", "name": "S. Lindqvist", "role": "Medical Officer",    "height_cm": None, "weight_kg": None, "photo_url": None},
]


# ── Internal helpers ──────────────────────────────────

def _ensure_dirs() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    PHOTOS_DIR.mkdir(exist_ok=True)


def _load_raw() -> dict:
    _ensure_dirs()
    if ROSTER_FILE.is_file():
        try:
            return json.loads(ROSTER_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"crew": [dict(m) for m in DEFAULT_CREW]}


def _save_raw(data: dict) -> None:
    _ensure_dirs()
    ROSTER_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ── Public helpers (used by mock_data) ───────────────

def get_member(crew_id: str) -> dict | None:
    """Return saved data for one crew member, or None if not found."""
    for m in _load_raw().get("crew", []):
        if m["id"] == crew_id:
            return m
    return None


def get_effective_roster() -> list[dict]:
    """Return saved roster; fall back to DEFAULT_CREW if file is empty."""
    crew = _load_raw().get("crew", [])
    return crew if crew else [dict(m) for m in DEFAULT_CREW]


# ── Pydantic models ───────────────────────────────────

class CrewMemberIn(BaseModel):
    id: str
    name: str
    role: str
    height_cm: int | None = None
    weight_kg: int | None = None


class SaveRosterBody(BaseModel):
    crew: list[CrewMemberIn]


# ── API router ────────────────────────────────────────

router = APIRouter(prefix="/api/crew-roster", tags=["crew-roster"])


@router.get("")
def get_roster() -> dict:
    """Return the saved crew roster (text fields + photo URLs)."""
    return _load_raw()


@router.post("")
def save_roster(body: SaveRosterBody) -> dict:
    """Upsert text fields for all crew members; preserve existing photo URLs."""
    existing_by_id = {m["id"]: m for m in _load_raw().get("crew", [])}

    updated: list[dict] = []
    for member in body.crew:
        prev = existing_by_id.get(member.id, {})
        updated.append({
            "id":        member.id,
            "name":      member.name,
            "role":      member.role,
            "height_cm": member.height_cm,
            "weight_kg": member.weight_kg,
            "photo_url": prev.get("photo_url"),   # preserve any existing photo
        })

    _save_raw({"crew": updated})
    return {"saved": True, "crew": updated}


@router.post("/{crew_id}/photo")
async def upload_photo(crew_id: str, photo: UploadFile = File(...)) -> dict:
    """
    Upload a photo for one crew member.
    Saves the file to data/photos/ and stores the URL in crew_roster.json.
    """
    _ensure_dirs()

    suffix = Path(photo.filename or "photo.jpg").suffix.lower() or ".jpg"
    if suffix not in ALLOWED_EXTS:
        raise HTTPException(
            400,
            f"Unsupported image type '{suffix}'. Allowed: {sorted(ALLOWED_EXTS)}",
        )

    content = await photo.read()
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, f"Photo exceeds {MAX_PHOTO_BYTES // (1024 * 1024)} MB limit")

    # Remove any previous photo for this crew member before writing the new one
    for old in PHOTOS_DIR.glob(f"{crew_id}.*"):
        if old.name != ".gitkeep":
            old.unlink(missing_ok=True)

    dest = PHOTOS_DIR / f"{crew_id}{suffix}"
    dest.write_bytes(content)

    photo_url = f"/data/photos/{crew_id}{suffix}"

    # Persist the URL in crew_roster.json
    data = _load_raw()
    found = False
    for member in data.get("crew", []):
        if member["id"] == crew_id:
            member["photo_url"] = photo_url
            found = True
            break
    if not found:
        data.setdefault("crew", []).append({
            "id": crew_id, "name": crew_id, "role": "",
            "height_cm": None, "weight_kg": None,
            "photo_url": photo_url,
        })
    _save_raw(data)

    return {"photo_url": photo_url}

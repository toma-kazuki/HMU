"""API response models for HMU prototype."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class OperationalMode(str, Enum):
    NOMINAL_MONITORING = "nominal_monitoring"
    ALERT = "alert"
    DEGRADED = "degraded"
    GROUND_SUPPORTED = "ground_supported"


class AlertSeverity(str, Enum):
    EMERGENCY = "emergency"
    WARNING = "warning"
    CAUTION = "caution"
    ADVISORY = "advisory"


class AlertItem(BaseModel):
    id: str
    severity: AlertSeverity
    title: str
    message: str
    source: str
    parameter: str | None = None
    value: str | None = None
    threshold: str | None = None


class VitalSample(BaseModel):
    t_offset_min: int = Field(description="Minutes before now")
    heart_rate_bpm: float
    spo2_pct: float
    respiratory_rate_bpm: float


class WearableSnapshot(BaseModel):
    heart_rate_bpm: float
    heart_rate_unit: str = "bpm"
    spo2_pct: float
    spo2_unit: str = "%"
    respiratory_rate_bpm: float
    respiratory_rate_unit: str = "breaths/min"
    skin_temp_c: float
    skin_temp_unit: str = "°C"
    systolic_mmhg: float
    diastolic_mmhg: float
    blood_pressure_unit: str = "mmHg"
    sleep_score: int = Field(ge=0, le=100)
    health_score: int = Field(ge=0, le=100)
    activity_score: int = Field(ge=0, le=100)
    stress_management_score: int = Field(ge=0, le=100)
    readiness_score: int = Field(ge=0, le=100)
    wearable_link_quality_pct: float
    last_sync_ago_sec: int


class EnvironmentalSnapshot(BaseModel):
    cabin_co2_mmhg: float
    co2_unit: str = "mmHg"
    cabin_temp_c: float
    temp_unit: str = "°C"
    mission_cumulative_dose_msv: float
    dose_unit: str = "mSv"


class SensorIntegrity(BaseModel):
    heart_rate: Literal["ok", "stale", "lost"]
    spo2: Literal["ok", "stale", "lost"]
    environmental: Literal["ok", "stale", "lost"]


class DashboardPayload(BaseModel):
    mode: OperationalMode
    crew_member_id: str
    mission_day: int
    wearable: WearableSnapshot
    environmental: EnvironmentalSnapshot
    integrity: SensorIntegrity
    alerts: list[AlertItem]
    vitals_series: list[VitalSample]


class ModeOverrideBody(BaseModel):
    """Demo-only: force Ground-Supported Mode from UI."""

    ground_supported: bool

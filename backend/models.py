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
    symptom_title: str | None = None
    plain_language_gloss: str | None = None
    urgency: str | None = None
    related_params: list[dict] | None = None


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
    """Higher = better stress coping (workload tolerance)."""
    fatigue_score: int = Field(ge=0, le=100)
    """Fatigue resistance: higher = lower perceived fatigue / better recovery."""
    readiness_score: int = Field(ge=0, le=100)
    wearable_link_quality_pct: float
    last_sync_ago_sec: int


class EnvironmentalSnapshot(BaseModel):
    cabin_co2_mmhg: float
    co2_unit: str = "mmHg"
    cabin_temp_c: float
    temp_unit: str = "°C"
    cabin_humidity_pct: float
    humidity_unit: str = "%"
    mission_cumulative_dose_msv: float
    dose_unit: str = "mSv"


# ── Per-device models ────────────────────────────────────────────────────────

class DeviceStatus(BaseModel):
    connected: bool
    battery_pct: int | None = None  # None = device has no battery / externally powered
    last_sync_ago_sec: int
    signal: Literal["ok", "stale", "lost"] = "ok"


class BioMonitorData(BaseModel):
    """Astroskin / Bio-Monitor smart t-shirt."""

    status: DeviceStatus
    heart_rate_bpm: float
    resting_heart_rate_bpm: float  # lowest HR recorded at rest (past 24 h)
    ecg_rhythm: str          # e.g. "Normal sinus", "Sinus tachycardia"
    systolic_mmhg: float
    diastolic_mmhg: float
    bp_unit: str = "mmHg"
    breathing_rate_bpm: float
    tidal_volume_l: float    # breath volume per breath
    skin_temp_c: float
    temp_unit: str = "°C"
    spo2_pct: float
    activity_mets: float     # metabolic equivalent of task


class OuraRingData(BaseModel):
    """Oura ring — recovery, sleep, HRV."""

    status: DeviceStatus
    hrv_ms: float            # heart-rate variability (RMSSD)
    body_temp_deviation_c: float  # vs personal 30-day baseline
    sleep_deep_pct: float
    sleep_rem_pct: float
    sleep_light_pct: float
    sleep_awake_pct: float
    respiratory_rate_bpm: float
    spo2_avg_pct: float
    steps: int


class ThermoMiniData(BaseModel):
    """Thermo-mini non-invasive core body temperature sensor."""

    status: DeviceStatus
    core_body_temp_c: float
    temp_unit: str = "°C"


class ActiwatchData(BaseModel):
    """Actiwatch Spectrum — activity, ambient light, sleep."""

    status: DeviceStatus
    activity_counts_per_epoch: int   # raw actigraphy counts
    ambient_light_lux: float
    sleep_onset_min: int             # minutes to fall asleep (last sleep period)
    wake_episodes: int               # wake-after-sleep-onset events
    activity_level: str              # Sedentary / Light / Moderate / Vigorous
    hyperactivity_index: float       # 0–10 derived restlessness score


class PersonalCO2Data(BaseModel):
    """Personal CO₂ exposure monitor (individual, not cabin ambient)."""

    status: DeviceStatus
    current_ppm: float
    peak_ppm: float
    co2_unit: str = "ppm"


class EVARMData(BaseModel):
    """EVARM individual radiation dosimeter."""

    status: DeviceStatus
    dose_rate_usv_h: float        # current dose rate
    rate_unit: str = "μSv/h"
    personal_cumulative_msv: float
    dose_unit: str = "mSv"


class WearableDevices(BaseModel):
    bio_monitor: BioMonitorData
    oura_ring: OuraRingData
    thermo_mini: ThermoMiniData
    actiwatch: ActiwatchData
    personal_co2: PersonalCO2Data
    evarm: EVARMData


# ── Integrity / payload ───────────────────────────────────────────────────────

class SensorIntegrity(BaseModel):
    heart_rate: Literal["ok", "stale", "lost"]
    spo2: Literal["ok", "stale", "lost"]
    environmental: Literal["ok", "stale", "lost"]


class DashboardPayload(BaseModel):
    mode: OperationalMode
    crew_member_id: str
    display_name: str = ""
    mission_day: int
    scenario_assumption: str = Field(
        default="nominal",
        description="Activity profile for alerts/thresholds (API key `scenario`): nominal | exercise | stress | sleep.",
    )
    location: Literal["iva", "eva"] = Field(
        default="iva",
        description="IVA: in habitat air. EVA: suited — habitat CO₂/temp alerts suppressed.",
    )
    wearable: WearableSnapshot
    devices: WearableDevices
    environmental: EnvironmentalSnapshot
    integrity: SensorIntegrity
    alerts: list[AlertItem]
    vitals_series: list[VitalSample]
    cognitive_risk: dict | None = None


class CrewColumnSummary(BaseModel):
    """One crew column on the multi-crew desktop overview."""

    crew_member_id: str
    display_name: str
    role: str = ""
    avatar_url: str
    scenario: str = Field(
        default="nominal",
        description="Activity profile for mock vitals: nominal | exercise | stress | sleep (per crew).",
    )
    location: Literal["iva", "eva"] = Field(
        default="iva",
        description="IVA vs EVA for activity status display and alert context (same keys as detail API).",
    )
    mode: OperationalMode
    health_score: int = Field(ge=0, le=100)
    sleep_score: int = Field(ge=0, le=100)
    fatigue_score: int = Field(ge=0, le=100)
    stress_score: int = Field(
        ge=0,
        le=100,
        description="Mapped from stress_management_score for the overview (higher = better coping).",
    )


class OverviewPayload(BaseModel):
    mission_day: int
    mode: OperationalMode
    crew: list[CrewColumnSummary]
    environmental: EnvironmentalSnapshot
    integrity_environmental: Literal["ok", "stale", "lost"] = "ok"


class ModeOverrideBody(BaseModel):
    """Demo-only: force Ground-Supported Mode from UI."""

    ground_supported: bool

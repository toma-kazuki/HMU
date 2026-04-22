"""Synthetic wearable and environmental data for HMU prototype."""

from __future__ import annotations

import math
import random
from datetime import UTC, datetime

from backend.models import (
    ActiwatchData,
    BioMonitorData,
    DeviceStatus,
    EnvironmentalSnapshot,
    EVARMData,
    OperationalMode,
    OuraRingData,
    PersonalCO2Data,
    SensorIntegrity,
    ThermoMiniData,
    VitalSample,
    WearableDevices,
    WearableSnapshot,
)

# Four-person crew for desktop overview (display names are fictional placeholders).
CREW_ROSTER: list[dict[str, str]] = [
    {"id": "CM-1", "display_name": "A. Okada", "role": "Commander"},
    {"id": "CM-2", "display_name": "M. Reyes", "role": "Flight Engineer"},
    {"id": "CM-3", "display_name": "J. Park", "role": "Mission Specialist"},
    {"id": "CM-4", "display_name": "S. Lindqvist", "role": "Medical Officer"},
]

# Per-crew activity profile keys for overview mock (nominal | exercise | stress | sleep).
_SCENARIO_BY_INDEX: tuple[str, ...] = ("nominal", "exercise", "stress", "sleep")


def scenario_for_crew_id(crew_member_id: str) -> str:
    """Deterministic operational scenario per crew member (supports mixed-crew display)."""
    for i, c in enumerate(CREW_ROSTER):
        if c["id"] == crew_member_id:
            return _SCENARIO_BY_INDEX[i % len(_SCENARIO_BY_INDEX)]
    return "nominal"


def location_for_crew_id(crew_member_id: str) -> str:
    """IVA vs EVA for overview/detail consistency (prototype: one crew on EVA for mixed display)."""
    for i, c in enumerate(CREW_ROSTER):
        if c["id"] == crew_member_id:
            return "eva" if i == 2 else "iva"
    return "iva"


def crew_display_name(crew_member_id: str) -> str:
    from backend.roster import get_member
    saved = get_member(crew_member_id)
    if saved and saved.get("name"):
        return saved["name"]
    for c in CREW_ROSTER:
        if c["id"] == crew_member_id:
            return c["display_name"]
    return crew_member_id


def crew_role(crew_member_id: str) -> str:
    from backend.roster import get_member
    saved = get_member(crew_member_id)
    if saved and saved.get("role"):
        return saved["role"]
    for c in CREW_ROSTER:
        if c["id"] == crew_member_id:
            return c["role"]
    return ""


def avatar_url_for_crew(crew_member_id: str) -> str:
    """Return uploaded photo if available, else a stable generated avatar."""
    from backend.roster import get_member
    from urllib.parse import quote
    saved = get_member(crew_member_id)
    if saved and saved.get("photo_url"):
        return saved["photo_url"]
    seed = quote(crew_member_id, safe="")
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf"

# Demo state toggled via API
_ground_supported: bool = False
_demo_degraded: bool = False

# ── Alert demonstration mode ─────────────────────────────────────────────────
# Enabled at server startup so the dashboard opens showing a live alert scenario.
#
# Forced conditions when active
# ─────────────────────────────
# CM-2 (M. Reyes — Flight Engineer)  ← physiological event
#   SpO₂       88.5 %     low_warn < 92 %           → WARNING
#   Heart rate  128 bpm    high_caution > 120 bpm    → CAUTION  (high_warn threshold = 130)
#   Systolic BP 168 mmHg   high_caution > 160 mmHg   → CAUTION  (high_warn threshold = 170)
#   RR          7.0 br/min low_warn < 8 br/min       → WARNING
#
# Habitat environment               ← shared across all crew
#   Cabin CO₂   7.5 mmHg   high_caution > 6 mmHg    → CAUTION  (high_warn threshold = 8)
#   Cumul. dose 158.0 mSv  high_warn > 150 mSv       → WARNING
#
# Together these drive mission mode → ALERT and demonstrate the full pipeline.
# Toggle via POST /api/settings/alert-demo or the "Alert Demo" checkbox in the UI.
_alert_demo: bool = True
_ALERT_DEMO_CREW = "CM-2"


def set_alert_demo(on: bool) -> None:
    global _alert_demo
    _alert_demo = on


def is_alert_demo() -> bool:
    return _alert_demo


def set_ground_supported(on: bool) -> None:
    global _ground_supported
    _ground_supported = on


def set_demo_degraded(on: bool) -> None:
    global _demo_degraded
    _demo_degraded = on


def is_ground_supported() -> bool:
    return _ground_supported


def is_demo_degraded() -> bool:
    return _demo_degraded


def _wave(seed: float, i: int, period: int = 96) -> float:
    x = 2 * math.pi * (i / period) + seed
    return math.sin(x) * 0.5 + math.sin(2 * x) * 0.15


def build_wearable(
    crew_member_id: str,
    mission_day: int,
    *,
    scenario: str = "nominal",
) -> WearableSnapshot:
    """scenario: nominal | exercise | stress | sleep"""
    rng = random.Random(hash(crew_member_id) % (2**32) + mission_day)
    base_hr = {"nominal": 72, "exercise": 128, "stress": 112, "sleep": 54}[scenario]
    hr_jitter = rng.uniform(-4, 4) + _wave(0.3, mission_day * 17 + rng.randint(0, 50)) * 6

    hr = max(38, base_hr + hr_jitter)
    spo2 = 97 + rng.uniform(-1.2, 0.8)
    if scenario == "stress":
        spo2 -= rng.uniform(0, 2)
    rr = 14 + rng.uniform(-2, 3) + (6 if scenario == "exercise" else 0)

    skin = 33.2 + rng.uniform(-0.4, 0.5)
    sys_bp = 118 + rng.uniform(-6, 18) + (12 if scenario == "exercise" else 0)
    dia_bp = 74 + rng.uniform(-5, 8)

    sleep_score = int(max(0, min(100, 78 + rng.randint(-12, 8))))
    health_score = int(max(0, min(100, 86 + rng.randint(-10, 6))))
    activity_score = int(max(0, min(100, 71 + rng.randint(-15, 20))))
    stress_mgmt = int(max(0, min(100, 80 + rng.randint(-18, 5))))
    readiness = int(max(0, min(100, (sleep_score + health_score + stress_mgmt) / 3)))

    if scenario == "sleep":
        sleep_score = min(100, sleep_score + 8)
        readiness = int((sleep_score * 0.4 + health_score * 0.35 + stress_mgmt * 0.25))

    # Fatigue resistance: higher = less fatigue (aligned with sleep + workload proxy).
    fatigue_load = max(0.0, 100 - readiness + rng.uniform(-8, 12))
    if scenario == "stress":
        fatigue_load += 15
    if scenario == "sleep":
        fatigue_load = max(0.0, fatigue_load - 20)
    fatigue_resistance = int(max(0, min(100, 100 - fatigue_load * 0.85)))

    link = 94.0 + rng.uniform(-6, 5)
    sync_sec = rng.randint(12, 95)

    # ── Alert demo overrides (forced out-of-range for demonstration) ──────────
    if _alert_demo and crew_member_id == _ALERT_DEMO_CREW:
        spo2      = 88.5   # < 92  → WARNING:  Low blood oxygen saturation
        hr        = 128.0  # > 120 → CAUTION:  Sustained elevated heart rate (warn threshold: 130)
        sys_bp    = 168.0  # > 160 → CAUTION:  Systolic pressure deviation   (warn threshold: 170)
        rr        = 7.0    # < 8   → WARNING:  Respiratory rate outside range

    return WearableSnapshot(
        heart_rate_bpm=round(hr, 1),
        spo2_pct=round(spo2, 1),
        respiratory_rate_bpm=round(rr, 1),
        skin_temp_c=round(skin, 2),
        systolic_mmhg=round(sys_bp, 1),
        diastolic_mmhg=round(dia_bp, 1),
        sleep_score=sleep_score,
        health_score=health_score,
        activity_score=activity_score,
        stress_management_score=stress_mgmt,
        fatigue_score=fatigue_resistance,
        readiness_score=readiness,
        wearable_link_quality_pct=round(min(100, max(0, link)), 1),
        last_sync_ago_sec=sync_sec,
    )


def build_devices(
    crew_member_id: str,
    mission_day: int,
    wearable: WearableSnapshot,
    *,
    scenario: str = "nominal",
) -> WearableDevices:
    """Generate per-device mock data consistent with the wearable snapshot."""
    rng = random.Random(hash(crew_member_id + "dev") % (2**32) + mission_day)

    def _dev_status(base_battery: int | None, *, always_on: bool = False) -> DeviceStatus:
        batt: int | None = None
        if base_battery is not None:
            batt = max(5, min(100, base_battery + rng.randint(-10, 5)))
        sync = rng.randint(8, 120)
        if _demo_degraded and not always_on:
            connected = rng.random() > 0.35
            signal = "ok" if connected else "stale"
        else:
            connected = True
            signal = "ok" if (batt is None or batt > 10) else "stale"
        return DeviceStatus(connected=connected, battery_pct=batt, last_sync_ago_sec=sync, signal=signal)

    sleeping = scenario == "sleep"
    exercising = scenario == "exercise"
    stressed = scenario == "stress"

    # ── Bio-Monitor (t-shirt) ────────────────────────
    hr = wearable.heart_rate_bpm
    ecg_map = {
        "nominal": "Normal sinus",
        "sleep": "Normal sinus — sleep",
        "exercise": "Sinus tachycardia",
        "stress": "Sinus tachycardia" if hr > 100 else "Normal sinus",
    }
    tidal_vol = 0.5 + rng.uniform(-0.05, 0.1)
    if exercising:
        tidal_vol = 1.8 + rng.uniform(-0.2, 0.4)
    mets = {"nominal": 1.4, "sleep": 0.9, "exercise": 7.5, "stress": 2.8}[scenario]
    mets += rng.uniform(-0.2, 0.3)
    # Resting HR is a personal physiological baseline — seeded by crew ID,
    # not by scenario (it reflects the prior rest period, not current activity).
    rhr_base = random.Random(hash(crew_member_id + "rhr") % (2**32)).uniform(52, 68)
    rhr = round(rhr_base + rng.uniform(-3, 4) + (3.5 if stressed else 0), 1)

    # When alert demo is active for this crew member, reflect the emergency
    # ECG rhythm that matches the forced tachycardia reading.
    if _alert_demo and crew_member_id == _ALERT_DEMO_CREW:
        ecg_map[scenario] = "Sinus tachycardia"

    bio = BioMonitorData(
        status=_dev_status(78),
        heart_rate_bpm=wearable.heart_rate_bpm,
        resting_heart_rate_bpm=round(min(rhr, wearable.heart_rate_bpm), 1),
        ecg_rhythm=ecg_map[scenario],
        systolic_mmhg=wearable.systolic_mmhg,
        diastolic_mmhg=wearable.diastolic_mmhg,
        breathing_rate_bpm=wearable.respiratory_rate_bpm,
        tidal_volume_l=round(tidal_vol, 2),
        skin_temp_c=wearable.skin_temp_c,
        spo2_pct=wearable.spo2_pct,
        activity_mets=round(mets, 1),
    )

    # ── Oura Ring ────────────────────────────────────
    hrv_base = {"nominal": 52, "sleep": 58, "exercise": 35, "stress": 28}[scenario]
    hrv = max(15, hrv_base + rng.uniform(-8, 10))
    temp_dev = rng.uniform(-0.3, 0.5) + (0.4 if stressed else 0)
    deep = rng.uniform(15, 25)
    rem = rng.uniform(18, 26)
    awake = rng.uniform(4, 10)
    light = 100 - deep - rem - awake
    oura = OuraRingData(
        status=_dev_status(65),
        hrv_ms=round(hrv, 1),
        body_temp_deviation_c=round(temp_dev, 2),
        sleep_deep_pct=round(deep, 1),
        sleep_rem_pct=round(rem, 1),
        sleep_light_pct=round(light, 1),
        sleep_awake_pct=round(awake, 1),
        respiratory_rate_bpm=round(wearable.respiratory_rate_bpm + rng.uniform(-0.5, 0.5), 1),
        spo2_avg_pct=round(wearable.spo2_pct - rng.uniform(0, 0.5), 1),
        steps=rng.randint(0, 300) if sleeping else rng.randint(1200, 9500) if exercising else rng.randint(3000, 7000),
    )

    # ── Thermo-mini ──────────────────────────────────
    core_base = 37.0 + rng.uniform(-0.2, 0.3)
    if exercising:
        core_base += rng.uniform(0.5, 1.2)
    if stressed:
        core_base += rng.uniform(0.1, 0.4)
    thermo = ThermoMiniData(
        status=_dev_status(88),
        core_body_temp_c=round(core_base, 2),
    )

    # ── Actiwatch Spectrum ───────────────────────────
    act_counts = {"nominal": 1800, "sleep": 120, "exercise": 7400, "stress": 3200}[scenario]
    act_counts = int(act_counts + rng.uniform(-300, 400))
    lux_base = {"nominal": 220, "sleep": 0, "exercise": 350, "stress": 180}[scenario]
    lux = max(0, lux_base + rng.uniform(-40, 60))
    act_level = (
        "Sedentary" if act_counts < 500
        else "Light" if act_counts < 2500
        else "Moderate" if act_counts < 5000
        else "Vigorous"
    )
    hyperact = round(min(10, max(0, (wearable.stress_management_score / 100) * rng.uniform(1.5, 5) if stressed else rng.uniform(0.2, 2.0))), 1)
    actiwatch = ActiwatchData(
        status=_dev_status(72),
        activity_counts_per_epoch=act_counts,
        ambient_light_lux=round(lux, 1),
        sleep_onset_min=rng.randint(0, 5) if sleeping else rng.randint(8, 32),
        wake_episodes=rng.randint(0, 2) if sleeping else rng.randint(0, 5),
        activity_level=act_level,
        hyperactivity_index=hyperact,
    )

    # ── Personal CO₂ monitor ─────────────────────────
    co2_base = {"nominal": 820, "sleep": 750, "exercise": 1350, "stress": 1050}[scenario]
    co2_ppm = round(co2_base + rng.uniform(-80, 120), 0)
    co2_peak = round(co2_ppm * rng.uniform(1.05, 1.25), 0)
    personal_co2 = PersonalCO2Data(
        status=_dev_status(91),
        current_ppm=co2_ppm,
        peak_ppm=co2_peak,
    )

    # ── EVARM dosimeter ──────────────────────────────
    dose_rate = round(0.12 + rng.uniform(0, 0.22) + (0.08 if exercising else 0), 3)
    cumulative = round(12.0 + mission_day * 1.05 + rng.uniform(0, 8), 1)
    evarm = EVARMData(
        status=_dev_status(None, always_on=True),
        dose_rate_usv_h=dose_rate,
        personal_cumulative_msv=cumulative,
    )

    return WearableDevices(
        bio_monitor=bio,
        oura_ring=oura,
        thermo_mini=thermo,
        actiwatch=actiwatch,
        personal_co2=personal_co2,
        evarm=evarm,
    )


def build_environmental(mission_day: int) -> EnvironmentalSnapshot:
    rng = random.Random(42 + mission_day)
    co2 = 4.2 + rng.uniform(0, 2.8) + _wave(1.1, mission_day) * 0.6
    temp = 22.5 + rng.uniform(-1.5, 2.5)
    humidity = 55.0 + rng.uniform(-8, 10)
    dose = 12.0 + mission_day * 1.1 + rng.uniform(0, 6)

    # ── Alert demo overrides ──────────────────────────────────────────────────
    if _alert_demo:
        co2  = 7.5    # > 6.0 → CAUTION: Elevated cabin CO₂ (warn threshold: 8 mmHg)
        dose = 158.0  # > 150 → WARNING: Mission cumulative radiation

    return EnvironmentalSnapshot(
        cabin_co2_mmhg=round(max(2.0, co2), 2),
        cabin_temp_c=round(temp, 1),
        cabin_humidity_pct=round(min(80, max(30, humidity)), 1),
        mission_cumulative_dose_msv=round(dose, 1),
    )


def build_integrity(
    wearable: WearableSnapshot,
    *,
    force_degraded: bool | None = None,
) -> SensorIntegrity:
    degraded = _demo_degraded if force_degraded is None else force_degraded
    if degraded:
        return SensorIntegrity(heart_rate="stale", spo2="ok", environmental="stale")
    if wearable.wearable_link_quality_pct < 70:
        return SensorIntegrity(heart_rate="stale", spo2="stale", environmental="ok")
    if wearable.last_sync_ago_sec > 180:
        return SensorIntegrity(heart_rate="stale", spo2="ok", environmental="ok")
    return SensorIntegrity(heart_rate="ok", spo2="ok", environmental="ok")


def vitals_timeseries(
    current_hr: float,
    current_spo2: float,
    current_rr: float,
    points: int = 48,
    span_min: int = 360,
) -> list[VitalSample]:
    step = span_min // max(1, points - 1)
    out: list[VitalSample] = []
    for i in range(points):
        t = span_min - i * step
        w = 1 - (i / max(1, points - 1))
        hr = current_hr + _wave(0.7, i) * 8 - w * 3
        spo2 = current_spo2 + _wave(0.2, i + 3) * 0.8
        rr = current_rr + _wave(0.9, i + 1) * 2.5
        out.append(
            VitalSample(
                t_offset_min=t,
                heart_rate_bpm=round(hr, 1),
                spo2_pct=round(spo2, 1),
                respiratory_rate_bpm=round(rr, 1),
            )
        )
    return list(reversed(out))


def resolve_mode(
    has_emergency_or_warning: bool,
    integrity: SensorIntegrity,
) -> OperationalMode:
    if _ground_supported:
        return OperationalMode.GROUND_SUPPORTED
    if integrity.heart_rate == "lost" or integrity.spo2 == "lost":
        return OperationalMode.DEGRADED
    if integrity.heart_rate != "ok" or integrity.environmental != "ok":
        if has_emergency_or_warning:
            return OperationalMode.ALERT
        return OperationalMode.DEGRADED
    if has_emergency_or_warning:
        return OperationalMode.ALERT
    return OperationalMode.NOMINAL_MONITORING


def mission_clock_context() -> tuple[str, int]:
    now = datetime.now(UTC)
    # Synthetic mission day from epoch for stable demo
    mission_day = (now.timetuple().tm_yday % 500) + 1
    crew = "CM-2"
    return crew, mission_day


def mission_day_only() -> int:
    now = datetime.now(UTC)
    return (now.timetuple().tm_yday % 500) + 1


def aggregate_modes(modes: list[OperationalMode]) -> OperationalMode:
    """Mission-level mode from per-crew modes (most severe wins)."""
    if OperationalMode.ALERT in modes:
        return OperationalMode.ALERT
    if OperationalMode.DEGRADED in modes:
        return OperationalMode.DEGRADED
    return OperationalMode.NOMINAL_MONITORING

"""Synthetic wearable and environmental data for HMU prototype."""

from __future__ import annotations

import math
import random
from datetime import UTC, datetime

from backend.models import (
    EnvironmentalSnapshot,
    OperationalMode,
    SensorIntegrity,
    VitalSample,
    WearableSnapshot,
)

# Demo state toggled via API
_ground_supported: bool = False
_demo_degraded: bool = False


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

    link = 94.0 + rng.uniform(-6, 5)
    sync_sec = rng.randint(12, 95)

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
        readiness_score=readiness,
        wearable_link_quality_pct=round(min(100, max(0, link)), 1),
        last_sync_ago_sec=sync_sec,
    )


def build_environmental(mission_day: int) -> EnvironmentalSnapshot:
    rng = random.Random(42 + mission_day)
    co2 = 4.2 + rng.uniform(0, 2.8) + _wave(1.1, mission_day) * 0.6
    temp = 22.5 + rng.uniform(-1.5, 2.5)
    dose = 12.0 + mission_day * 1.1 + rng.uniform(0, 6)
    return EnvironmentalSnapshot(
        cabin_co2_mmhg=round(max(2.0, co2), 2),
        cabin_temp_c=round(temp, 1),
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

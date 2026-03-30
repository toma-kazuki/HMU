"""Threshold evaluation per requirements.md representative examples."""

from __future__ import annotations

from backend.models import (
    AlertItem,
    AlertSeverity,
    EnvironmentalSnapshot,
    SensorIntegrity,
    WearableSnapshot,
)


def _hr_resting_context(is_sleeping: bool) -> str:
    return "sleep" if is_sleeping else "rest"


def evaluate_alerts(
    w: WearableSnapshot,
    env: EnvironmentalSnapshot,
    integrity: SensorIntegrity,
    *,
    is_sleeping: bool = False,
) -> list[AlertItem]:
    alerts: list[AlertItem] = []
    ctx = _hr_resting_context(is_sleeping)

    # Cardiovascular (representative thresholds from requirements)
    if not is_sleeping and w.heart_rate_bpm > 125:
        alerts.append(
            AlertItem(
                id="hr-tachy",
                severity=AlertSeverity.WARNING,
                title="Sustained elevated heart rate",
                message="Heart rate elevated for resting context; consider hydration, workload, and recovery.",
                source="Wearable (ECG/PPG)",
                parameter="Heart rate",
                value=f"{w.heart_rate_bpm:.0f} bpm",
                threshold="> 125 bpm (rest, not exercising)",
            )
        )
    if is_sleeping and w.heart_rate_bpm < 42:
        alerts.append(
            AlertItem(
                id="hr-brady-sleep",
                severity=AlertSeverity.CAUTION,
                title="Low heart rate during sleep",
                message="Bradycardia while sleeping; verify sensor fit and trend.",
                source="Wearable",
                parameter="Heart rate",
                value=f"{w.heart_rate_bpm:.0f} bpm",
                threshold="< 42 bpm (sleep)",
            )
        )
    if not is_sleeping and w.heart_rate_bpm < 42:
        alerts.append(
            AlertItem(
                id="hr-brady-rest",
                severity=AlertSeverity.WARNING,
                title="Bradycardia at rest",
                message="Very low heart rate when not sleeping; assess consciousness and EVA readiness.",
                source="Wearable",
                parameter="Heart rate",
                value=f"{w.heart_rate_bpm:.0f} bpm",
                threshold="< 42 bpm (awake rest)",
            )
        )

    if w.spo2_pct < 92:
        alerts.append(
            AlertItem(
                id="spo2-low",
                severity=AlertSeverity.EMERGENCY,
                title="Low blood oxygen saturation",
                message="Marked drop in SpO₂; follow medical protocol.",
                source="Wearable",
                parameter="SpO₂",
                value=f"{w.spo2_pct:.0f} %",
                threshold="< 92 %",
            )
        )

    if w.respiratory_rate_bpm < 8 or w.respiratory_rate_bpm > 28:
        alerts.append(
            AlertItem(
                id="rr-abnormal",
                severity=AlertSeverity.CAUTION,
                title="Respiratory rate outside expected range",
                message="Very low or high respiratory rate; correlate with exertion and environment.",
                source="Wearable",
                parameter="Respiratory rate",
                value=f"{w.respiratory_rate_bpm:.0f} breaths/min",
                threshold="8–28 breaths/min (nominal band, prototype)",
            )
        )

    if w.systolic_mmhg > 165 or w.systolic_mmhg < 85:
        sev = AlertSeverity.WARNING if w.systolic_mmhg > 165 else AlertSeverity.CAUTION
        alerts.append(
            AlertItem(
                id="bp-sys",
                severity=sev,
                title="Systolic pressure deviation",
                message="Systolic BP outside typical operational band.",
                source="Wearable / intermittent cuff",
                parameter="Systolic BP",
                value=f"{w.systolic_mmhg:.0f} mmHg",
                threshold="85–165 mmHg (prototype band)",
            )
        )

    # Environmental
    if env.cabin_co2_mmhg > 7.0:
        alerts.append(
            AlertItem(
                id="co2-elevated",
                severity=AlertSeverity.WARNING,
                title="Elevated cabin CO₂",
                message="CO₂ partial pressure associated with cognitive performance risk.",
                source="Environmental monitor",
                parameter="Cabin CO₂",
                value=f"{env.cabin_co2_mmhg:.2f} mmHg",
                threshold="> 7 mmHg (advisory prototype)",
            )
        )

    if env.cabin_temp_c < 18 or env.cabin_temp_c > 27:
        alerts.append(
            AlertItem(
                id="cabin-temp",
                severity=AlertSeverity.CAUTION,
                title="Cabin temperature outside habitability band",
                message="Thermal stress may affect comfort and task efficiency.",
                source="Environmental monitor",
                parameter="Cabin temperature",
                value=f"{env.cabin_temp_c:.1f} °C",
                threshold="18–27 °C",
            )
        )

    if env.mission_cumulative_dose_msv > 150:
        alerts.append(
            AlertItem(
                id="radiation-warn",
                severity=AlertSeverity.WARNING,
                title="Mission cumulative radiation — warning band",
                message="Approaching/exceeding high advisory limit; review EVA and shielding.",
                source="Dosimeter (mission cumulative)",
                parameter="Cumulative dose",
                value=f"{env.mission_cumulative_dose_msv:.1f} mSv",
                threshold="> 150 mSv (prototype warning)",
            )
        )
    elif env.mission_cumulative_dose_msv > 50:
        alerts.append(
            AlertItem(
                id="radiation-adv",
                severity=AlertSeverity.ADVISORY,
                title="Mission cumulative radiation — advisory",
                message="Track dose against mission limits (ALARA).",
                source="Dosimeter (mission cumulative)",
                parameter="Cumulative dose",
                value=f"{env.mission_cumulative_dose_msv:.1f} mSv",
                threshold="> 50 mSv (prototype advisory)",
            )
        )

    # Degraded sensing
    if integrity.heart_rate != "ok":
        alerts.append(
            AlertItem(
                id="integrity-hr",
                severity=AlertSeverity.CAUTION,
                title="Heart rate data degraded",
                message="Check wearable fit, charging, and wireless link.",
                source="HMU integrity",
                parameter="Heart rate channel",
                value=integrity.heart_rate,
                threshold="ok",
            )
        )
    if integrity.spo2 != "ok":
        alerts.append(
            AlertItem(
                id="integrity-spo2",
                severity=AlertSeverity.CAUTION,
                title="SpO₂ data degraded",
                message="Reduced confidence in oxygenation trend.",
                source="HMU integrity",
                parameter="SpO₂ channel",
                value=integrity.spo2,
                threshold="ok",
            )
        )
    if integrity.environmental != "ok":
        alerts.append(
            AlertItem(
                id="integrity-env",
                severity=AlertSeverity.CAUTION,
                title="Environmental data degraded",
                message="Partial environmental fusion; verify hab sensors.",
                source="HMU integrity",
                parameter="Environmental fusion",
                value=integrity.environmental,
                threshold="ok",
            )
        )

    severity_order = {
        AlertSeverity.EMERGENCY: 0,
        AlertSeverity.WARNING: 1,
        AlertSeverity.CAUTION: 2,
        AlertSeverity.ADVISORY: 3,
    }
    alerts.sort(key=lambda a: severity_order[a.severity])
    return alerts

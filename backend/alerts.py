"""Alert evaluation — threshold checks aligned with 8_medical_diagnosis.md §5.

Each symptom is evaluated exactly once by a dedicated _evaluate_*() function.
Each function returns exactly 0 or 1 AlertItem — the highest matching tier.
Emergency tiers are severity upgrades of the same symptom, not separate events.

§5.10 score-based composite does not generate AlertItem; see evaluate_cognitive_risk().
"""

from __future__ import annotations

from backend.models import (
    AlertItem,
    AlertSeverity,
    EnvironmentalSnapshot,
    SensorIntegrity,
    WearableDevices,
    WearableSnapshot,
)

# ── SYMPTOM_MAP ───────────────────────────────────────────────────────────────
# Keys: condition identifiers (one per trigger direction per parameter).
# Values: metadata for AlertItem fields — symptom_title, plain_language_gloss,
#   urgency (keyed by "caution"/"warning"/"emergency"), related_params list.
# "show_rule" values: "always" | "if_alarming" | "context"

SYMPTOM_MAP: dict[str, dict] = {

    # §5.1 Hypoxaemia
    "spo2_low": {
        "symptom_title": "Hypoxaemia (low blood oxygen)",
        "plain_language_gloss": "Your blood oxygen is lower than normal. This can impair thinking, coordination, and physical performance.",
        "urgency": {
            "caution":   "Notify Flight Surgeon",
            "warning":   "Act immediately",
            "emergency": "Act immediately — escalate to cardiovascular decompensation protocol",
        },
        "related_params": [
            {"field": "bio_monitor.spo2_pct",            "role": "Primary trigger",                                             "show_rule": "always"},
            {"field": "bio_monitor.breathing_rate_bpm",  "role": "Compensatory tachypnoea — body increases RR to restore O₂",   "show_rule": "if_alarming"},
            {"field": "bio_monitor.heart_rate_bpm",      "role": "Compensatory tachycardia — elevated HR worsens prognosis",     "show_rule": "if_alarming"},
            {"field": "environmental.cabin_co2_mmhg",    "role": "High cabin CO₂ displaces O₂ and inhibits recovery",           "show_rule": "if_alarming"},
            {"field": "personal_co2.current_ppm",        "role": "Breath-zone CO₂ contributing to local hypoxia",               "show_rule": "if_alarming"},
            {"field": "oura_ring.spo2_avg_pct",          "role": "Overnight SpO₂ trend — persistent low average indicates chronic issue", "show_rule": "context"},
        ],
    },

    # §5.2 Hypercapnia
    "cabin_co2_high": {
        "symptom_title": "Hypercapnia (high CO₂)",
        "plain_language_gloss": "CO₂ levels are elevated. This can cause headache, difficulty concentrating, and increased breathing rate.",
        "urgency": {
            "caution":   "Notify Flight Surgeon",
            "warning":   "Act immediately",
            "emergency": "Act immediately — both CO₂ sources elevated simultaneously",
        },
        "related_params": [
            {"field": "environmental.cabin_co2_mmhg",   "role": "Habitat-wide CO₂ partial pressure",                          "show_rule": "always"},
            {"field": "personal_co2.current_ppm",       "role": "Per-crew breath-zone CO₂",                                    "show_rule": "always"},
            {"field": "bio_monitor.breathing_rate_bpm", "role": "Compensatory tachypnoea — body increases RR to expel CO₂",    "show_rule": "if_alarming"},
            {"field": "bio_monitor.heart_rate_bpm",     "role": "Sympathetic activation from hypercapnia",                     "show_rule": "if_alarming"},
            {"field": "bio_monitor.spo2_pct",           "role": "Concurrent hypoxaemia worsens prognosis",                     "show_rule": "if_alarming"},
            {"field": "bio_monitor.tidal_volume_l",     "role": "Increased tidal volume is a secondary compensatory mechanism", "show_rule": "context"},
        ],
    },
    "personal_co2_high": {
        "symptom_title": "Hypercapnia (high CO₂)",
        "plain_language_gloss": "CO₂ levels are elevated. This can cause headache, difficulty concentrating, and increased breathing rate.",
        "urgency": {
            "caution":   "Notify Flight Surgeon",
            "warning":   "Act immediately",
            "emergency": "Act immediately — both CO₂ sources elevated simultaneously",
        },
        "related_params": [
            {"field": "environmental.cabin_co2_mmhg",   "role": "Habitat-wide CO₂ partial pressure",                          "show_rule": "always"},
            {"field": "personal_co2.current_ppm",       "role": "Per-crew breath-zone CO₂",                                    "show_rule": "always"},
            {"field": "bio_monitor.breathing_rate_bpm", "role": "Compensatory tachypnoea — body increases RR to expel CO₂",    "show_rule": "if_alarming"},
            {"field": "bio_monitor.heart_rate_bpm",     "role": "Sympathetic activation from hypercapnia",                     "show_rule": "if_alarming"},
            {"field": "bio_monitor.spo2_pct",           "role": "Concurrent hypoxaemia worsens prognosis",                     "show_rule": "if_alarming"},
            {"field": "bio_monitor.tidal_volume_l",     "role": "Increased tidal volume is a secondary compensatory mechanism", "show_rule": "context"},
        ],
    },

    # §5.3 Tachycardia
    "heart_rate_high": {
        "symptom_title": "Tachycardia (fast heart rate)",
        "plain_language_gloss": "Your heart rate is higher than normal for your current activity level.",
        "urgency": {
            "caution": "Notify Flight Surgeon",
            "warning": "Act immediately",
        },
        "related_params": [
            {"field": "bio_monitor.heart_rate_bpm",          "role": "Primary trigger",                                             "show_rule": "always"},
            {"field": "bio_monitor.ecg_rhythm",              "role": "Distinguishes sinus tachycardia from arrhythmia",             "show_rule": "always"},
            {"field": "bio_monitor.resting_heart_rate_bpm",  "role": "Personal baseline — delta clarifies severity",                "show_rule": "always"},
            {"field": "thermo_mini.core_body_temp_c",        "role": "Fever drives tachycardia",                                    "show_rule": "if_alarming"},
            {"field": "bio_monitor.spo2_pct",                "role": "Tachycardia compensating for hypoxia",                        "show_rule": "if_alarming"},
            {"field": "bio_monitor.systolic_mmhg",           "role": "Tachycardia + hypotension → cardiovascular compromise (§5.6)", "show_rule": "if_alarming"},
            {"field": "oura_ring.hrv_ms",                    "role": "Low HRV alongside tachycardia indicates pathological cause",  "show_rule": "context"},
        ],
    },

    # §5.4 Bradycardia
    "heart_rate_low": {
        "symptom_title": "Bradycardia (slow heart rate)",
        "plain_language_gloss": "Your heart rate is lower than normal. This may be a sign of high fitness or may need assessment.",
        "urgency": {
            "caution":   "Notify Flight Surgeon",
            "warning":   "Act immediately",
            "emergency": "Act immediately — follow cardiovascular emergency protocol (see §5.6 recommended actions)",
        },
        "related_params": [
            {"field": "bio_monitor.heart_rate_bpm",          "role": "Primary trigger",                                              "show_rule": "always"},
            {"field": "bio_monitor.ecg_rhythm",              "role": "Identifies conduction abnormalities vs fitness-related bradycardia", "show_rule": "always"},
            {"field": "bio_monitor.resting_heart_rate_bpm",  "role": "Personal baseline — HR close to personal norm suggests fitness cause", "show_rule": "always"},
            {"field": "bio_monitor.systolic_mmhg",           "role": "Bradycardia + hypotension = inadequate cardiac output",        "show_rule": "if_alarming"},
            {"field": "bio_monitor.spo2_pct",                "role": "Low SpO₂ alongside bradycardia suggests hemodynamic compromise", "show_rule": "if_alarming"},
            {"field": "oura_ring.hrv_ms",                    "role": "High HRV = likely fitness; low HRV = likely pathology",        "show_rule": "context"},
        ],
    },

    # §5.5a Hypertension
    "systolic_high": {
        "symptom_title": "Hypertension (high blood pressure)",
        "plain_language_gloss": "Your blood pressure is above the normal range. Sustained elevation increases cardiovascular risk.",
        "urgency": {
            "caution": "Notify Flight Surgeon",
            "warning": "Act immediately",
        },
        "related_params": [
            {"field": "bio_monitor.systolic_mmhg",    "role": "Primary trigger",                                                "show_rule": "always"},
            {"field": "bio_monitor.diastolic_mmhg",   "role": "Paired value; diastolic > 100 is independently significant",    "show_rule": "always"},
            {"field": "bio_monitor.heart_rate_bpm",   "role": "Autonomic context",                                             "show_rule": "if_alarming"},
            {"field": "thermo_mini.core_body_temp_c", "role": "Fever + hypertension may indicate sepsis-related hemodynamic change", "show_rule": "if_alarming"},
            {"field": "environmental.cabin_co2_mmhg", "role": "Elevated CO₂ associated with BP elevation in microgravity",     "show_rule": "if_alarming"},
            {"field": "oura_ring.hrv_ms",             "role": "Low HRV + hypertension indicates high sympathetic tone",        "show_rule": "context"},
        ],
    },

    # §5.5b Hypotension
    "systolic_low": {
        "symptom_title": "Hypotension (low blood pressure)",
        "plain_language_gloss": "Your blood pressure is lower than normal. This may cause dizziness or lightheadedness.",
        "urgency": {
            "caution":   "Notify Flight Surgeon",
            "warning":   "Act immediately",
            "emergency": "Act immediately — escalate to cardiovascular decompensation protocol",
        },
        "related_params": [
            {"field": "bio_monitor.systolic_mmhg",    "role": "Primary trigger",                                       "show_rule": "always"},
            {"field": "bio_monitor.diastolic_mmhg",   "role": "Paired value",                                          "show_rule": "always"},
            {"field": "bio_monitor.heart_rate_bpm",   "role": "Reflex tachycardia in hypotension; bradycardia in vasovagal", "show_rule": "if_alarming"},
            {"field": "bio_monitor.spo2_pct",         "role": "Hypotension impairing tissue perfusion",                "show_rule": "if_alarming"},
            {"field": "thermo_mini.core_body_temp_c", "role": "Fever + hypotension → possible septic shock",           "show_rule": "if_alarming"},
            {"field": "oura_ring.hrv_ms",             "role": "Autonomic context",                                     "show_rule": "context"},
        ],
    },

    # §5.6 Cardiovascular decompensation (composite only)
    "cardiovascular_decompensation": {
        "symptom_title": "Cardiovascular decompensation risk",
        "plain_language_gloss": "Multiple cardiovascular signs are abnormal simultaneously. Immediate assessment is needed.",
        "urgency": {
            "emergency": "Act immediately — life-threatening pattern; do not wait for ground contact",
        },
        "related_params": [
            {"field": "bio_monitor.heart_rate_bpm",      "role": "Part of composite trigger",                             "show_rule": "always"},
            {"field": "bio_monitor.systolic_mmhg",       "role": "Part of composite trigger",                             "show_rule": "always"},
            {"field": "bio_monitor.spo2_pct",            "role": "Part of composite trigger",                             "show_rule": "always"},
            {"field": "bio_monitor.diastolic_mmhg",      "role": "Paired BP value",                                       "show_rule": "always"},
            {"field": "bio_monitor.breathing_rate_bpm",  "role": "Respiratory compensation pattern",                      "show_rule": "always"},
            {"field": "thermo_mini.core_body_temp_c",    "role": "Differentiates septic shock (fever) from other causes", "show_rule": "always"},
            {"field": "bio_monitor.ecg_rhythm",          "role": "Cardiac rhythm context",                                "show_rule": "always"},
            {"field": "oura_ring.hrv_ms",                "role": "Autonomic state",                                       "show_rule": "context"},
        ],
    },

    # §5.7 Fever
    "core_temp_high_fever": {
        "symptom_title": "Fever — possible infection",
        "plain_language_gloss": "Your body temperature is elevated. This may indicate your body is fighting an infection.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "thermo_mini.core_body_temp_c",         "role": "Primary trigger",                                                 "show_rule": "always"},
            {"field": "bio_monitor.heart_rate_bpm",           "role": "Fever-driven tachycardia — strengthens infection diagnosis",      "show_rule": "if_alarming"},
            {"field": "bio_monitor.breathing_rate_bpm",       "role": "Tachypnoea from fever or infection",                             "show_rule": "if_alarming"},
            {"field": "oura_ring.hrv_ms",                     "role": "Infection depresses HRV as immune system consumes autonomic resources", "show_rule": "context"},
            {"field": "oura_ring.body_temp_deviation_c",      "role": "Multi-day trend confirms sustained fever vs transient spike",    "show_rule": "always"},
            {"field": "environmental.mission_cumulative_dose_msv", "role": "High dose attenuates immune response — increases infection risk", "show_rule": "context"},
            {"field": "evarm.personal_cumulative_msv",        "role": "Per-crew radiation context",                                    "show_rule": "context"},
        ],
    },

    # §5.8a Hypothermia
    "core_temp_low": {
        "symptom_title": "Hypothermia risk (body temperature low)",
        "plain_language_gloss": "Your core body temperature is below normal. Check cabin temperature and warm up.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "thermo_mini.core_body_temp_c",    "role": "Primary trigger",                                                  "show_rule": "always"},
            {"field": "environmental.cabin_temp_c",      "role": "Environmental contribution — cabin also alarming = environmental cause", "show_rule": "if_alarming"},
            {"field": "oura_ring.body_temp_deviation_c", "role": "Persistent deviation confirms trend rather than transient spike",  "show_rule": "always"},
            {"field": "bio_monitor.heart_rate_bpm",      "role": "Bradycardia with hypothermia indicates cardiovascular risk",       "show_rule": "if_alarming"},
            {"field": "bio_monitor.skin_temp_c",         "role": "Directional surface indicator (not equivalent to core temp)",     "show_rule": "context"},
            {"field": "environmental.cabin_humidity_pct","role": "High humidity reduces evaporative warming efficiency",             "show_rule": "context"},
        ],
    },

    # §5.8b Hyperthermia (heat stress — no infection signs)
    "core_temp_high_hyperthermia": {
        "symptom_title": "Hyperthermia (heat stress)",
        "plain_language_gloss": "Your core body temperature is elevated without signs of infection. Reduce workload and cool down.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "thermo_mini.core_body_temp_c",    "role": "Primary trigger",                                      "show_rule": "always"},
            {"field": "environmental.cabin_temp_c",      "role": "Environmental heat source",                            "show_rule": "if_alarming"},
            {"field": "bio_monitor.heart_rate_bpm",      "role": "Rule out infection-driven tachycardia",                "show_rule": "always"},
            {"field": "bio_monitor.breathing_rate_bpm",  "role": "Rule out infection-driven tachypnoea",                 "show_rule": "always"},
            {"field": "oura_ring.body_temp_deviation_c", "role": "Multi-day trend — sustained elevation suggests infection over heat stress", "show_rule": "always"},
            {"field": "environmental.cabin_humidity_pct","role": "High humidity reduces evaporative cooling",             "show_rule": "if_alarming"},
        ],
    },

    # §5.9a Tachypnoea
    "breathing_rate_high": {
        "symptom_title": "Tachypnoea (fast breathing rate)",
        "plain_language_gloss": "Your breathing rate is higher than normal. This may be a response to CO₂, low oxygen, or physical or emotional stress.",
        "urgency": {
            "caution": "Notify Flight Surgeon",
            "warning": "Act immediately",
        },
        "related_params": [
            {"field": "bio_monitor.breathing_rate_bpm",  "role": "Primary trigger",                                          "show_rule": "always"},
            {"field": "bio_monitor.spo2_pct",            "role": "Low SpO₂ can drive tachypnoea",                            "show_rule": "if_alarming"},
            {"field": "environmental.cabin_co2_mmhg",    "role": "Elevated CO₂ is a primary respiratory drive stimulus",     "show_rule": "if_alarming"},
            {"field": "personal_co2.current_ppm",        "role": "Breath-zone CO₂ stimulus",                                 "show_rule": "if_alarming"},
            {"field": "thermo_mini.core_body_temp_c",    "role": "Fever drives tachypnoea",                                  "show_rule": "if_alarming"},
            {"field": "bio_monitor.heart_rate_bpm",      "role": "HR-RR coupling helps distinguish exertion from pathology", "show_rule": "if_alarming"},
            {"field": "bio_monitor.tidal_volume_l",      "role": "Combined RR + tidal volume determines minute ventilation", "show_rule": "context"},
        ],
    },

    # §5.9b Bradypnoea
    "breathing_rate_low": {
        "symptom_title": "Bradypnoea (slow breathing rate)",
        "plain_language_gloss": "Your breathing rate is lower than normal. At rest, this warrants assessment.",
        "urgency": {
            "caution": "Notify Flight Surgeon",
            "warning": "Act immediately",
        },
        "related_params": [
            {"field": "bio_monitor.breathing_rate_bpm", "role": "Primary trigger",                                             "show_rule": "always"},
            {"field": "bio_monitor.spo2_pct",           "role": "Bradypnoea risks hypoxaemia via inadequate ventilation",     "show_rule": "always"},
            {"field": "bio_monitor.tidal_volume_l",     "role": "Low tidal volume + low RR is the most dangerous combination", "show_rule": "always"},
            {"field": "bio_monitor.heart_rate_bpm",     "role": "HR-RR coupling",                                             "show_rule": "if_alarming"},
            {"field": "thermo_mini.core_body_temp_c",   "role": "Hypothermia can suppress respiratory drive",                 "show_rule": "if_alarming"},
        ],
    },

    # §5.11 Radiation dose milestone
    "mission_dose_high": {
        "symptom_title": "Cumulative radiation dose — monitoring milestone reached",
        "plain_language_gloss": "Your total radiation exposure has reached a planning threshold. No immediate symptoms expected, but remaining dose budget should be reviewed.",
        "urgency": {
            "caution": "Monitor closely",
            "warning": "Notify Flight Surgeon",
        },
        "related_params": [
            {"field": "environmental.mission_cumulative_dose_msv", "role": "Primary trigger (mission-level shared dose)",    "show_rule": "always"},
            {"field": "evarm.personal_cumulative_msv",             "role": "Per-crew dose — may differ from mission average", "show_rule": "always"},
            {"field": "evarm.dose_rate_usv_h",                     "role": "Current exposure rate — how fast dose is accumulating", "show_rule": "always"},
            {"field": "thermo_mini.core_body_temp_c",              "role": "High dose + fever = elevated infection risk; radiation attenuates immune response", "show_rule": "if_alarming"},
        ],
    },

    # §5.12a Cabin temperature
    "cabin_temp_hot": {
        "symptom_title": "Cabin temperature — too warm",
        "plain_language_gloss": "The cabin is warmer than the safe comfort range. Core body temperature and physical performance may be affected.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "environmental.cabin_temp_c",       "role": "Primary trigger",                                           "show_rule": "always"},
            {"field": "thermo_mini.core_body_temp_c",     "role": "Individual thermal response to cabin environment",          "show_rule": "always"},
            {"field": "bio_monitor.skin_temp_c",          "role": "Directional surface temperature indicator",                 "show_rule": "context"},
            {"field": "environmental.cabin_humidity_pct", "role": "High humidity + high temp = compounded risk",               "show_rule": "if_alarming"},
            {"field": "personal_co2.current_ppm",         "role": "CO₂ accumulation in a hot, poorly ventilated space",       "show_rule": "if_alarming"},
        ],
    },
    "cabin_temp_cold": {
        "symptom_title": "Cabin temperature — too cold",
        "plain_language_gloss": "The cabin is cooler than the recommended range. Risk of thermal discomfort and impaired fine motor control.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "environmental.cabin_temp_c",       "role": "Primary trigger",                                           "show_rule": "always"},
            {"field": "thermo_mini.core_body_temp_c",     "role": "Individual thermal response to cabin environment",          "show_rule": "always"},
            {"field": "bio_monitor.skin_temp_c",          "role": "Directional surface temperature indicator",                 "show_rule": "context"},
            {"field": "environmental.cabin_humidity_pct", "role": "High humidity reduces evaporative warming efficiency",      "show_rule": "if_alarming"},
            {"field": "personal_co2.current_ppm",         "role": "CO₂ accumulation in a cold, poorly ventilated space",      "show_rule": "if_alarming"},
        ],
    },

    # §5.12b Cabin humidity
    "cabin_humidity_high": {
        "symptom_title": "Cabin humidity — too high",
        "plain_language_gloss": "Cabin humidity is high. Risk of microbial growth and reduced thermoregulation.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "environmental.cabin_humidity_pct", "role": "Primary trigger",                                      "show_rule": "always"},
            {"field": "environmental.cabin_temp_c",       "role": "Combined thermal-humidity comfort; high humidity + high temp is compounded risk", "show_rule": "if_alarming"},
            {"field": "thermo_mini.core_body_temp_c",     "role": "Individual thermal response",                          "show_rule": "if_alarming"},
            {"field": "personal_co2.current_ppm",         "role": "Air quality in a humid, poorly ventilated environment", "show_rule": "context"},
        ],
    },
    "cabin_humidity_low": {
        "symptom_title": "Cabin humidity — too low",
        "plain_language_gloss": "Cabin humidity is low. Mucosal dryness may reduce respiratory defences.",
        "urgency": {
            "caution": "Monitor closely + report to Flight Surgeon at next scheduled contact",
            "warning": "Act immediately + simultaneously notify Flight Surgeon",
        },
        "related_params": [
            {"field": "environmental.cabin_humidity_pct", "role": "Primary trigger",                                "show_rule": "always"},
            {"field": "environmental.cabin_temp_c",       "role": "Combined thermal-humidity comfort",              "show_rule": "if_alarming"},
            {"field": "thermo_mini.core_body_temp_c",     "role": "Individual thermal response",                    "show_rule": "if_alarming"},
            {"field": "personal_co2.current_ppm",         "role": "Air quality context",                           "show_rule": "context"},
        ],
    },
}


def _is_alarming(field: str, devices: WearableDevices | None, env: EnvironmentalSnapshot) -> bool:
    """Return True if the given dotted field path is currently in Caution or Warning.

    Only covers fields that have alert thresholds defined in 8_medical_diagnosis.md §5.
    Devices may be None (overview path); treat as not-alarming in that case.
    """
    d = devices
    # bio_monitor
    if field == "bio_monitor.heart_rate_bpm":
        if d: return d.bio_monitor.heart_rate_bpm > 120 or d.bio_monitor.heart_rate_bpm < 45
    elif field == "bio_monitor.spo2_pct":
        if d: return d.bio_monitor.spo2_pct < 94
    elif field == "bio_monitor.systolic_mmhg":
        if d: return d.bio_monitor.systolic_mmhg > 160 or d.bio_monitor.systolic_mmhg < 90
    elif field == "bio_monitor.breathing_rate_bpm":
        if d: return d.bio_monitor.breathing_rate_bpm > 20 or d.bio_monitor.breathing_rate_bpm < 10
    # thermo_mini
    elif field == "thermo_mini.core_body_temp_c":
        if d: return d.thermo_mini.core_body_temp_c > 37.5 or d.thermo_mini.core_body_temp_c < 36.0
    # environmental
    elif field == "environmental.cabin_co2_mmhg":
        return env.cabin_co2_mmhg > 6
    elif field == "environmental.cabin_temp_c":
        return env.cabin_temp_c < 19 or env.cabin_temp_c > 26
    elif field == "environmental.cabin_humidity_pct":
        return env.cabin_humidity_pct < 30 or env.cabin_humidity_pct > 70
    elif field == "environmental.mission_cumulative_dose_msv":
        return env.mission_cumulative_dose_msv > 50
    # personal_co2
    elif field == "personal_co2.current_ppm":
        if d: return d.personal_co2.current_ppm > 1000
    return False


def _build_related_params(
    condition_key: str,
    devices: WearableDevices | None,
    env: EnvironmentalSnapshot,
) -> list[dict]:
    """Attach currently_alarming flag to each related_param entry."""
    meta = SYMPTOM_MAP.get(condition_key)
    if not meta:
        return []
    result = []
    for p in meta["related_params"]:
        entry = dict(p)
        entry["currently_alarming"] = _is_alarming(p["field"], devices, env)
        result.append(entry)
    return result


def _make_alert(
    alert_id: str,
    condition_key: str,
    tier: str,  # "caution" | "warning" | "emergency"
    severity: AlertSeverity,
    title: str,
    message: str,
    source: str,
    parameter: str | None,
    value: str | None,
    threshold: str | None,
    devices: WearableDevices | None,
    env: EnvironmentalSnapshot,
    extra_source: str | None = None,
) -> AlertItem:
    meta = SYMPTOM_MAP.get(condition_key, {})
    urgency_map = meta.get("urgency", {})
    urgency = urgency_map.get(tier) or urgency_map.get("warning") or urgency_map.get("emergency")
    return AlertItem(
        id=alert_id,
        severity=severity,
        title=title,
        message=message,
        source=extra_source or source,
        parameter=parameter,
        value=value,
        threshold=threshold,
        symptom_title=meta.get("symptom_title"),
        plain_language_gloss=meta.get("plain_language_gloss"),
        urgency=urgency,
        related_params=_build_related_params(condition_key, devices, env),
    )


# ── Per-symptom evaluation functions ─────────────────────────────────────────
# Each function evaluates one symptom and returns exactly 0 or 1 AlertItem.
# Conditions are checked highest tier first; return on first match.
# All functions share this signature:
#   _evaluate_*(hr, rr, spo2, sbp, core_t, pco2, co2_mmhg, dose, env,
#               devices, exercising, in_habitat) -> AlertItem | None

def _evaluate_hypoxaemia(
    hr, rr, spo2, devices, env,
) -> "AlertItem | None":
    """§5.1 — Emergency when SpO₂ < 92 AND HR > 130 AND RR > 20; else Warning < 92; Caution < 94."""
    if spo2 < 92 and hr > 130 and rr > 20:
        return _make_alert(
            "spo2-emerg", "spo2_low", "emergency", AlertSeverity.WARNING,
            "Hypoxaemia (low blood oxygen)",
            "Hypoxaemia + tachycardia + tachypnoea simultaneously — escalate to decompensation protocol.",
            "Bio-Monitor (SpO₂)", "SpO₂", f"{spo2:.1f} %", "< 92 % + HR > 130 + RR > 20",
            devices, env,
        )
    if spo2 < 92:
        return _make_alert(
            "spo2-warn", "spo2_low", "warning", AlertSeverity.WARNING,
            "Hypoxaemia (low blood oxygen)",
            "Marked drop in SpO₂; follow medical protocol.",
            "Bio-Monitor (SpO₂)", "SpO₂", f"{spo2:.1f} %", "< 92 %",
            devices, env,
        )
    if spo2 < 94:
        return _make_alert(
            "spo2-caut", "spo2_low", "caution", AlertSeverity.CAUTION,
            "Hypoxaemia (low blood oxygen)",
            "SpO₂ below normal; monitor and notify Flight Surgeon.",
            "Bio-Monitor (SpO₂)", "SpO₂", f"{spo2:.1f} %", "< 94 %",
            devices, env,
        )
    return None


def _evaluate_hypercapnia(
    pco2, co2_mmhg, devices, env, in_habitat,
) -> "AlertItem | None":
    """§5.2 — Emergency when both sources elevated; Warning if either at high tier; Caution otherwise."""
    cabin_warn = in_habitat and co2_mmhg > 8
    cabin_caut = in_habitat and co2_mmhg > 6
    pers_warn  = pco2 > 2500
    pers_caut  = pco2 > 1000
    both_caut  = cabin_caut and pers_caut

    if both_caut and not (cabin_warn or pers_warn):
        # Both sources at Caution simultaneously → Emergency (severity upgrade per §5.2)
        _src = "Environmental & Personal CO₂ monitors"
        _par = "Cabin CO₂ / Personal CO₂"
        _val = f"{co2_mmhg:.2f} mmHg / {pco2:.0f} ppm"
        return _make_alert(
            "co2-emerg", "cabin_co2_high", "emergency", AlertSeverity.WARNING,
            "Hypercapnia (high CO₂)",
            "Both cabin and personal CO₂ elevated simultaneously — severity upgraded.",
            _src, _par, _val, "Cabin CO₂ > 6 mmHg AND Personal CO₂ > 1 000 ppm",
            devices, env,
        )
    if cabin_warn or pers_warn:
        _src = "Environmental & Personal CO₂ monitors" if cabin_warn and pers_warn \
               else ("Environmental monitor" if cabin_warn else "Personal CO₂ monitor")
        _par = "Cabin CO₂ / Personal CO₂" if cabin_warn and pers_warn \
               else ("Cabin CO₂" if cabin_warn else "Personal CO₂")
        _val = f"{co2_mmhg:.2f} mmHg / {pco2:.0f} ppm" if cabin_warn and pers_warn \
               else (f"{co2_mmhg:.2f} mmHg" if cabin_warn else f"{pco2:.0f} ppm")
        return _make_alert(
            "co2-warn", "cabin_co2_high", "warning", AlertSeverity.WARNING,
            "Hypercapnia (high CO₂)",
            "CO₂ at Warning level; initiate scrubber recovery and improve ventilation immediately.",
            _src, _par, _val, "> 8 mmHg or > 2 500 ppm",
            devices, env,
        )
    if cabin_caut or pers_caut:
        _src = "Environmental monitor" if cabin_caut and not pers_caut \
               else ("Personal CO₂ monitor" if pers_caut and not cabin_caut \
               else "Environmental & Personal CO₂ monitors")
        _par = "Cabin CO₂" if cabin_caut and not pers_caut \
               else ("Personal CO₂" if pers_caut and not cabin_caut else "Cabin CO₂ / Personal CO₂")
        _val = f"{co2_mmhg:.2f} mmHg" if cabin_caut and not pers_caut \
               else (f"{pco2:.0f} ppm" if pers_caut and not cabin_caut \
               else f"{co2_mmhg:.2f} mmHg / {pco2:.0f} ppm")
        return _make_alert(
            "co2-caut", "cabin_co2_high", "caution", AlertSeverity.CAUTION,
            "Hypercapnia (high CO₂)",
            "CO₂ levels elevated; move to better-ventilated area and notify Flight Surgeon.",
            _src, _par, _val, "> 6 mmHg or > 1 000 ppm",
            devices, env,
        )
    return None


def _evaluate_heart_rate(
    hr, sbp, devices, env, exercising,
) -> "AlertItem | None":
    """§5.3 Tachycardia / §5.4 Bradycardia — mutually exclusive; highest tier wins."""
    # Tachycardia path
    if hr > 130:
        return _make_alert(
            "hr-tachy-warn", "heart_rate_high", "warning", AlertSeverity.WARNING,
            "Tachycardia (fast heart rate)",
            "Sustained high HR at rest; prompt assessment required.",
            "Bio-Monitor (ECG/PPG)", "Heart rate", f"{hr:.0f} bpm", "> 130 bpm",
            devices, env,
        )
    if hr > 120 and not exercising:
        return _make_alert(
            "hr-tachy-caut", "heart_rate_high", "caution", AlertSeverity.CAUTION,
            "Tachycardia (fast heart rate)",
            "Heart rate elevated for resting context.",
            "Bio-Monitor (ECG/PPG)", "Heart rate", f"{hr:.0f} bpm", "> 120 bpm (rest)",
            devices, env,
        )
    # Bradycardia path — §5.4 Emergency when HR < 40 AND SBP < 90
    if hr < 40 and sbp < 90:
        return _make_alert(
            "hr-brady-emerg", "heart_rate_low", "emergency", AlertSeverity.WARNING,
            "Bradycardia (slow heart rate)",
            "Bradycardia + hypotension — follow cardiovascular emergency protocol.",
            "Bio-Monitor", "Heart rate", f"{hr:.0f} bpm", "< 40 bpm AND SBP < 90 mmHg",
            devices, env,
        )
    if hr < 40:
        return _make_alert(
            "hr-brady-warn", "heart_rate_low", "warning", AlertSeverity.WARNING,
            "Bradycardia (slow heart rate)",
            "Very low HR; assess hemodynamics and ECG immediately.",
            "Bio-Monitor", "Heart rate", f"{hr:.0f} bpm", "< 40 bpm",
            devices, env,
        )
    if hr < 45:
        return _make_alert(
            "hr-brady-caut", "heart_rate_low", "caution", AlertSeverity.CAUTION,
            "Bradycardia (slow heart rate)",
            "HR below normal; compare to personal baseline and check ECG rhythm.",
            "Bio-Monitor", "Heart rate", f"{hr:.0f} bpm", "< 45 bpm",
            devices, env,
        )
    return None


def _evaluate_blood_pressure(
    sbp, hr, spo2, devices, env,
) -> "AlertItem | None":
    """§5.5a Hypertension / §5.5b Hypotension — mutually exclusive; highest tier wins."""
    # Hypertension path
    if sbp > 170:
        return _make_alert(
            "bp-hyper-warn", "systolic_high", "warning", AlertSeverity.WARNING,
            "Hypertension (high blood pressure)",
            "Severe hypertension; risk of hypertensive crisis.",
            "Bio-Monitor (BP)", "Systolic BP", f"{sbp:.0f} mmHg", "> 170 mmHg",
            devices, env,
        )
    if sbp > 160:
        return _make_alert(
            "bp-hyper-caut", "systolic_high", "caution", AlertSeverity.CAUTION,
            "Hypertension (high blood pressure)",
            "Systolic BP elevated above operational band.",
            "Bio-Monitor (BP)", "Systolic BP", f"{sbp:.0f} mmHg", "> 160 mmHg",
            devices, env,
        )
    # Hypotension path — §5.5b Emergency when SBP < 90 AND HR > 120 AND SpO₂ < 94
    if sbp < 90 and hr > 120 and spo2 < 94:
        return _make_alert(
            "bp-hypo-emerg", "systolic_low", "emergency", AlertSeverity.WARNING,
            "Hypotension (low blood pressure)",
            "Hypotension + tachycardia + desaturation — escalate to §5.6 protocol.",
            "Bio-Monitor (BP)", "Systolic BP", f"{sbp:.0f} mmHg", "< 90 mmHg AND HR > 120 AND SpO₂ < 94",
            devices, env,
        )
    if sbp < 80:
        return _make_alert(
            "bp-hypo-warn", "systolic_low", "warning", AlertSeverity.WARNING,
            "Hypotension (low blood pressure)",
            "Significant hypotension; organ perfusion compromised.",
            "Bio-Monitor (BP)", "Systolic BP", f"{sbp:.0f} mmHg", "< 80 mmHg",
            devices, env,
        )
    if sbp < 90:
        return _make_alert(
            "bp-hypo-caut", "systolic_low", "caution", AlertSeverity.CAUTION,
            "Hypotension (low blood pressure)",
            "Low BP; check posture, hydration, and hemodynamic signs.",
            "Bio-Monitor (BP)", "Systolic BP", f"{sbp:.0f} mmHg", "< 90 mmHg",
            devices, env,
        )
    return None


def _evaluate_cardiovascular_decompensation(
    hr, sbp, spo2, devices, env,
) -> "AlertItem | None":
    """§5.6 — Emergency-only composite; distinct clinical label from Hypotension."""
    if hr > 120 and sbp < 90 and spo2 < 94:
        return _make_alert(
            "composite-cardio-decomp", "cardiovascular_decompensation", "emergency", AlertSeverity.WARNING,
            SYMPTOM_MAP["cardiovascular_decompensation"]["symptom_title"],
            "Tachycardia + hypotension + desaturation simultaneously — life-threatening pattern.",
            "Bio-Monitor (composite)", None, None, "HR > 120 AND SBP < 90 AND SpO₂ < 94",
            devices, env,
        )
    return None


def _evaluate_core_temp(
    core_t, hr, rr, devices, env,
) -> "AlertItem | None":
    """§5.7 Fever / §5.8a Hypothermia / §5.8b Hyperthermia — label selected by HR/RR at high-temp tiers."""
    if core_t > 38.0:
        condition_key = "core_temp_high_fever" if (hr > 100 or rr > 18) else "core_temp_high_hyperthermia"
        return _make_alert(
            "core-temp-hi-warn", condition_key, "warning", AlertSeverity.WARNING,
            SYMPTOM_MAP[condition_key]["symptom_title"],
            "Core body temperature at Warning level.",
            "Thermo-mini", "Core body temperature", f"{core_t:.2f} °C", "> 38.0 °C",
            devices, env,
        )
    if core_t > 37.5:
        condition_key = "core_temp_high_fever" if (hr > 100 or rr > 18) else "core_temp_high_hyperthermia"
        return _make_alert(
            "core-temp-hi-caut", condition_key, "caution", AlertSeverity.CAUTION,
            SYMPTOM_MAP[condition_key]["symptom_title"],
            "Core body temperature elevated above normal.",
            "Thermo-mini", "Core body temperature", f"{core_t:.2f} °C", "> 37.5 °C",
            devices, env,
        )
    if core_t < 35.0:
        return _make_alert(
            "core-temp-lo-warn", "core_temp_low", "warning", AlertSeverity.WARNING,
            "Hypothermia risk (body temperature low)",
            "Significant hypothermia; begin active rewarming immediately.",
            "Thermo-mini", "Core body temperature", f"{core_t:.2f} °C", "< 35.0 °C",
            devices, env,
        )
    if core_t < 36.0:
        return _make_alert(
            "core-temp-lo-caut", "core_temp_low", "caution", AlertSeverity.CAUTION,
            "Hypothermia risk (body temperature low)",
            "Core temp below normal; check cabin temp and provide insulation.",
            "Thermo-mini", "Core body temperature", f"{core_t:.2f} °C", "< 36.0 °C",
            devices, env,
        )
    return None


def _evaluate_breathing_rate(
    rr, devices, env, exercising,
) -> "AlertItem | None":
    """§5.9a Tachypnoea / §5.9b Bradypnoea — mutually exclusive; highest tier wins."""
    if rr > 24:
        return _make_alert(
            "rr-tachy-warn", "breathing_rate_high", "warning", AlertSeverity.WARNING,
            "Tachypnoea (fast breathing rate)",
            "Marked respiratory distress; identify and address the primary driver.",
            "Bio-Monitor", "Breathing rate", f"{rr:.0f} br/min", "> 24 br/min",
            devices, env,
        )
    if rr > 20 and not exercising:
        return _make_alert(
            "rr-tachy-caut", "breathing_rate_high", "caution", AlertSeverity.CAUTION,
            "Tachypnoea (fast breathing rate)",
            "Elevated RR at rest; check SpO₂, CO₂, and core temperature.",
            "Bio-Monitor", "Breathing rate", f"{rr:.0f} br/min", "> 20 br/min (rest)",
            devices, env,
        )
    if rr < 8:
        return _make_alert(
            "rr-brady-warn", "breathing_rate_low", "warning", AlertSeverity.WARNING,
            "Bradypnoea (slow breathing rate)",
            "Severely reduced rate; risk of CO₂ retention and hypoxaemia.",
            "Bio-Monitor", "Breathing rate", f"{rr:.0f} br/min", "< 8 br/min",
            devices, env,
        )
    if rr < 10:
        return _make_alert(
            "rr-brady-caut", "breathing_rate_low", "caution", AlertSeverity.CAUTION,
            "Bradypnoea (slow breathing rate)",
            "Low RR; confirm consciousness and check SpO₂.",
            "Bio-Monitor", "Breathing rate", f"{rr:.0f} br/min", "< 10 br/min",
            devices, env,
        )
    return None


def _evaluate_radiation(dose, devices, env) -> "AlertItem | None":
    """§5.11 — Warning > 150 mSv; Caution > 50 mSv."""
    if dose > 150:
        return _make_alert(
            "radiation-warn", "mission_dose_high", "warning", AlertSeverity.WARNING,
            "Cumulative radiation dose — monitoring milestone reached",
            "High cumulative dose; review EVA schedule and dose budget.",
            "Dosimeter (mission cumulative)", "Cumulative dose", f"{dose:.1f} mSv", "> 150 mSv",
            devices, env,
        )
    if dose > 50:
        return _make_alert(
            "radiation-caut", "mission_dose_high", "caution", AlertSeverity.CAUTION,
            "Cumulative radiation dose — monitoring milestone reached",
            "Track dose against mission limits (ALARA).",
            "Dosimeter (mission cumulative)", "Cumulative dose", f"{dose:.1f} mSv", "> 50 mSv",
            devices, env,
        )
    return None


def _evaluate_cabin_temp(env, devices) -> "AlertItem | None":
    """§5.12a — IVA only; caller must gate on in_habitat."""
    if env.cabin_temp_c > 27:
        return _make_alert(
            "cabin-temp-hot-warn", "cabin_temp_hot", "warning", AlertSeverity.WARNING,
            "Cabin temperature — too warm",
            "Thermal stress risk; reduce heat sources immediately.",
            "Environmental monitor", "Cabin temperature", f"{env.cabin_temp_c:.1f} °C", "> 27 °C",
            devices, env,
        )
    if env.cabin_temp_c > 26:
        return _make_alert(
            "cabin-temp-hot-caut", "cabin_temp_hot", "caution", AlertSeverity.CAUTION,
            "Cabin temperature — too warm",
            "Cabin above comfort range; adjust HVAC.",
            "Environmental monitor", "Cabin temperature", f"{env.cabin_temp_c:.1f} °C", "> 26 °C",
            devices, env,
        )
    if env.cabin_temp_c < 18:
        return _make_alert(
            "cabin-temp-cold-warn", "cabin_temp_cold", "warning", AlertSeverity.WARNING,
            "Cabin temperature — too cold",
            "Hypothermia risk; provide insulation and activate heating.",
            "Environmental monitor", "Cabin temperature", f"{env.cabin_temp_c:.1f} °C", "< 18 °C",
            devices, env,
        )
    if env.cabin_temp_c < 19:
        return _make_alert(
            "cabin-temp-cold-caut", "cabin_temp_cold", "caution", AlertSeverity.CAUTION,
            "Cabin temperature — too cold",
            "Cabin below comfort range; adjust HVAC.",
            "Environmental monitor", "Cabin temperature", f"{env.cabin_temp_c:.1f} °C", "< 19 °C",
            devices, env,
        )
    return None


def _evaluate_cabin_humidity(env, devices) -> "AlertItem | None":
    """§5.12b — IVA only; caller must gate on in_habitat."""
    if env.cabin_humidity_pct > 75:
        return _make_alert(
            "cabin-hum-hi-warn", "cabin_humidity_high", "warning", AlertSeverity.WARNING,
            "Cabin humidity — too high",
            "Condensation and pathogen risk; activate dehumidifier.",
            "Environmental monitor", "Cabin humidity", f"{env.cabin_humidity_pct:.1f} %", "> 75 %",
            devices, env,
        )
    if env.cabin_humidity_pct > 70:
        return _make_alert(
            "cabin-hum-hi-caut", "cabin_humidity_high", "caution", AlertSeverity.CAUTION,
            "Cabin humidity — too high",
            "Elevated humidity; check moisture sources.",
            "Environmental monitor", "Cabin humidity", f"{env.cabin_humidity_pct:.1f} %", "> 70 %",
            devices, env,
        )
    if env.cabin_humidity_pct < 25:
        return _make_alert(
            "cabin-hum-lo-warn", "cabin_humidity_low", "warning", AlertSeverity.WARNING,
            "Cabin humidity — too low",
            "Very low humidity; mucosal defences impaired.",
            "Environmental monitor", "Cabin humidity", f"{env.cabin_humidity_pct:.1f} %", "< 25 %",
            devices, env,
        )
    if env.cabin_humidity_pct < 30:
        return _make_alert(
            "cabin-hum-lo-caut", "cabin_humidity_low", "caution", AlertSeverity.CAUTION,
            "Cabin humidity — too low",
            "Dry habitat; advise increased fluid intake.",
            "Environmental monitor", "Cabin humidity", f"{env.cabin_humidity_pct:.1f} %", "< 30 %",
            devices, env,
        )
    return None


def evaluate_alerts(
    w: WearableSnapshot,
    env: EnvironmentalSnapshot,
    integrity: SensorIntegrity,
    *,
    is_sleeping: bool = False,
    scenario: str = "nominal",
    location: str = "iva",
    devices: WearableDevices | None = None,
) -> list[AlertItem]:
    """Evaluate all symptoms and return a severity-sorted AlertItem list.

    Each _evaluate_*() function returns exactly 0 or 1 AlertItem — the highest
    matching tier for that symptom.  Emergency tiers are severity upgrades of
    the same symptom, never separate events.
    """
    exercising = scenario == "exercise"
    in_habitat = location == "iva"

    if devices:
        hr     = devices.bio_monitor.heart_rate_bpm
        rr     = devices.bio_monitor.breathing_rate_bpm
        spo2   = devices.bio_monitor.spo2_pct
        sbp    = devices.bio_monitor.systolic_mmhg
        core_t = devices.thermo_mini.core_body_temp_c
        pco2   = devices.personal_co2.current_ppm
    else:
        hr     = w.heart_rate_bpm
        rr     = w.respiratory_rate_bpm
        spo2   = w.spo2_pct
        sbp    = w.systolic_mmhg
        core_t = 37.0
        pco2   = 0.0

    co2_mmhg = env.cabin_co2_mmhg
    dose     = env.mission_cumulative_dose_msv

    symptom_results = [
        _evaluate_hypoxaemia(hr, rr, spo2, devices, env),
        _evaluate_hypercapnia(pco2, co2_mmhg, devices, env, in_habitat),
        _evaluate_heart_rate(hr, sbp, devices, env, exercising),
        _evaluate_blood_pressure(sbp, hr, spo2, devices, env),
        _evaluate_cardiovascular_decompensation(hr, sbp, spo2, devices, env),
        _evaluate_core_temp(core_t, hr, rr, devices, env),
        _evaluate_breathing_rate(rr, devices, env, exercising),
        _evaluate_radiation(dose, devices, env),
        _evaluate_cabin_temp(env, devices) if in_habitat else None,
        _evaluate_cabin_humidity(env, devices) if in_habitat else None,
    ]

    alerts: list[AlertItem] = [r for r in symptom_results if r is not None]

    # Sensor integrity alerts — structural, not symptom-based
    if integrity.heart_rate != "ok":
        alerts.append(AlertItem(
            id="integrity-hr",
            severity=AlertSeverity.CAUTION,
            title="Heart rate data degraded",
            message="Check wearable fit, charging, and wireless link.",
            source="HMU integrity",
            parameter="Heart rate channel",
            value=integrity.heart_rate,
            threshold="ok",
        ))
    if integrity.spo2 != "ok":
        alerts.append(AlertItem(
            id="integrity-spo2",
            severity=AlertSeverity.CAUTION,
            title="SpO₂ data degraded",
            message="Reduced confidence in oxygenation trend.",
            source="HMU integrity",
            parameter="SpO₂ channel",
            value=integrity.spo2,
            threshold="ok",
        ))
    if integrity.environmental != "ok":
        alerts.append(AlertItem(
            id="integrity-env",
            severity=AlertSeverity.CAUTION,
            title="Environmental data degraded",
            message="Partial environmental fusion; verify hab sensors.",
            source="HMU integrity",
            parameter="Environmental fusion",
            value=integrity.environmental,
            threshold="ok",
        ))

    severity_order = {
        AlertSeverity.EMERGENCY: 0,
        AlertSeverity.WARNING: 1,
        AlertSeverity.CAUTION: 2,
        AlertSeverity.ADVISORY: 3,
    }
    alerts.sort(key=lambda a: severity_order[a.severity])
    return alerts


def evaluate_cognitive_risk(
    fatigue_score: float,
    sleep_score: float,
    spo2_pct: float,
    cabin_co2_mmhg: float,
    personal_co2_ppm: float,
) -> dict | None:
    """Evaluate §5.10 Cognitive Performance Risk (Path 4).

    Returns {"tier": "caution" | "warning"} or None if no condition is met.
    Does NOT generate an AlertItem — surfaces only in score detail panel (Task 6).
    """
    env_stress = spo2_pct < 94 or cabin_co2_mmhg > 6 or personal_co2_ppm > 1000

    combo_a = fatigue_score < 70 and sleep_score < 70
    combo_b = (fatigue_score < 70 or sleep_score < 70) and env_stress
    warning_condition = (fatigue_score < 60 or sleep_score < 60) and env_stress

    if warning_condition:
        return {"tier": "warning"}
    if combo_a or combo_b:
        return {"tier": "caution"}
    return None

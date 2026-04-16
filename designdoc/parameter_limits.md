# HMU Parameter Limits
# ─────────────────────────────────────────────────────────────────
# Machine-readable threshold definitions for backend/alerts.py
# and frontend report generators.
#
# Threshold field naming convention:
#   low_critical   → reading BELOW this value triggers CRITICAL
#   low_warning    → reading BELOW this value triggers WARNING
#   low_advisory   → reading BELOW this value triggers ADVISORY
#   high_advisory  → reading ABOVE this value triggers ADVISORY
#   high_warning   → reading ABOVE this value triggers WARNING
#   high_critical  → reading ABOVE this value triggers CRITICAL
#   null           → not applicable for that direction / severity tier
#
# Severity order (highest → lowest): critical > warning > advisory > moderate
# When tiered thresholds exist (e.g. advisory + warning), only the
# highest-triggered severity should be reported at any given reading.
# ─────────────────────────────────────────────────────────────────

physiological:

  heart_rate_bpm:
    name: "Heart Rate"
    unit: bpm
    low_critical: 40        # severe bradycardia; crew-specific baseline (*1) applies
    low_warning:  45        # bradycardia boundary
    low_advisory: null
    high_advisory: null
    high_warning:  120      # tachycardia onset; exercise context exempt (*2)
    high_critical: 130      # severe tachycardia
    action: "Immediate crew action required"
    notes:
      - "*1: resting HR baseline varies by individual; adjust low thresholds per crew profile"
      - "*2: high_warning may be suspended during scheduled exercise periods"

  blood_pressure_systolic_mmhg:
    name: "Blood Pressure (systolic)"
    unit: mmHg
    low_critical:  80       # presyncope / hypotension risk
    low_warning:   null
    low_advisory:  null
    high_advisory: null
    high_warning:  null
    high_critical: 170      # hypertensive urgency
    action: "Immediate crew action required"

  spo2_pct:
    name: "SpO₂"
    unit: "%"
    low_critical:  92
    low_warning:   null
    low_advisory:  null
    high_advisory: null
    high_warning:  null
    high_critical: null
    action: "Immediate crew action required"

  respiration_rate_bpm:
    name: "Respiration Rate"
    unit: breaths/min
    low_critical:  8
    low_warning:   null
    low_advisory:  null
    high_advisory: null
    high_warning:  24       # *2: see note above; context-dependent
    high_critical: null
    action: "Immediate crew action required"

  body_temperature_c:
    name: "Body Temperature"
    unit: "°C"
    low_critical:  35       # hypothermia
    low_warning:   null
    low_advisory:  null
    high_advisory: null
    high_warning:  38       # fever
    high_critical: null
    severity: moderate      # highest severity for this parameter is moderate, not critical
    action: "Monitor and consult ground if persistent"

  fatigue_sleep_score:
    name: "Fatigue / Sleep Score"
    unit: "0–100 (higher = better)"
    low_critical:  null
    low_warning:   null
    low_advisory:  60       # placeholder — replace with mission-defined threshold before deployment
    high_advisory: null
    high_warning:  null
    high_critical: null
    severity: moderate
    action: "Monitor trends; adjust workload if needed"
    notes:
      - "Concrete low_advisory value must be confirmed with flight surgeon before operations"

environmental:

  cabin_co2_mmhg:
    name: "Cabin CO₂ Partial Pressure"
    unit: mmHg
    low_critical:  null
    low_warning:   null
    low_advisory:  null
    high_advisory: 6        # first-tier alert
    high_warning:  8        # second-tier alert; escalate response
    high_critical: null
    action:
      advisory: "Increase cabin ventilation; monitor crew for cognitive symptoms"
      warning:  "Action aligned with warning protocol; notify ground support"

  cabin_temperature_c:
    name: "Cabin Temperature"
    unit: "°C"
    low_critical:  null
    low_warning:   18       # hypothermic risk zone
    low_advisory:  null
    high_advisory: null
    high_warning:  27       # thermal stress risk zone
    high_critical: null
    severity: moderate
    action: "Monitor and consult ground if persistent"

  cabin_humidity_pct:
    name: "Relative Humidity"
    unit: "%"
    low_critical:  null
    low_warning:   25       # mucosal dryness / dehydration risk
    low_advisory:  null
    high_advisory: null
    high_warning:  75       # mould / condensation risk
    high_critical: null
    severity: moderate
    action: "Monitor and consult ground if persistent"

  radiation_cumulative_msv:
    name: "Radiation Exposure (Cumulative Dose)"
    unit: mSv
    low_critical:  null
    low_warning:   null
    low_advisory:  null
    high_advisory: 50       # begin enhanced monitoring; review EVA schedule
    high_warning:  150      # re-evaluate operational readiness; mandatory ground consult
    high_critical: null
    action:
      advisory: "Enhanced monitoring; review EVA and task schedule"
      warning:  "Mandatory ground consult; re-evaluate crew operational readiness"

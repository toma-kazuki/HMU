# HMU Parameter & Device Reference

This document is the single source of truth for all parameters surfaced in the HMU frontend. It covers, for every parameter:
- Which wearable device or environmental sensor produces it
- Its unit and typical operating range
- Alert thresholds (Caution / Warning) where defined
- The visual modality used to display it
- Which synthesized health score(s) it contributes to

All threshold values are mirrored in `PARAM_LIMITS` in `frontend/app.js`. Visual modality template definitions are in `designdoc/6_visualdesign.md`. Score computation formulas are the mock implementations in `backend/mock_data.py`.

---

## 1. Display alarm tiers

Exactly two display-level alarm tiers are used. Tier labels and colors are fixed system-wide.

| Display tier | CSS class | Color (hex) | Meaning |
| :--- | :--- | :--- | :--- |
| **Caution** | `caution` | `#d29922` (amber) | Threshold exceeded; heightened monitoring required. Contact flight surgeon if condition persists. |
| **Warning** | `warning` | `#f85149` (red) | Threshold exceeded; prompt action required. |

> **Severity (action protocol)** — The "Severity" column in §3 is an *operational action classification*, not a display color. Its behavior differs by display tier:
>
> | Severity | Caution tier | Warning tier |
> | :--- | :--- | :--- |
> | **Critical** | Notify Flight Surgeon; report value and trend. Corrective monitoring may begin immediately. | **Act immediately** — corrective action must be taken without waiting for ground contact. Flight surgeon consultation is not required before acting. |
> | **Moderate** | Monitor closely; report to Flight Surgeon at next scheduled contact. | **Act immediately** + simultaneously notify Flight Surgeon. Await pharmacological guidance before administering medication. |
> | **—** | Urgency defined per symptom in `8_medical_diagnosis.md §5`. | Urgency defined per symptom in `8_medical_diagnosis.md §5`. |
>
> Per-symptom urgency for all alert-triggering parameters is fully specified in `8_medical_diagnosis.md §5`, including composite (Emergency) trigger rules that sit above the Warning tier.

---

## 2. Wearable device catalogue

Six per-crew wearable devices plus shared environmental sensors are integrated. Each device exposes a `DeviceStatus` record (connected flag, battery %, last-sync age, signal quality) in addition to its measurement fields.

### 2.1 Bio-Monitor (Smart garment — `bio_monitor`)

Continuous biometric garment providing real-time physiological vitals.

| Field (`BioMonitorData`) | Unit | Description |
| :--- | :--- | :--- |
| `heart_rate_bpm` | bpm | Current heart rate |
| `resting_heart_rate_bpm` | bpm | Lowest HR recorded at rest in the past 24 h (personal baseline) |
| `ecg_rhythm` | text | ECG rhythm label (e.g. "Normal sinus", "Sinus tachycardia") |
| `systolic_mmhg` | mmHg | Systolic blood pressure |
| `diastolic_mmhg` | mmHg | Diastolic blood pressure |
| `breathing_rate_bpm` | breaths/min | Current respiration rate |
| `tidal_volume_l` | L | Tidal volume per breath |
| `skin_temp_c` | °C | Skin surface temperature (not core body temp) |
| `spo2_pct` | % | Pulse oximetry SpO₂ |
| `activity_mets` | METs | Metabolic equivalent of task |

> **Note on temperature:** `skin_temp_c` from the Bio-Monitor reflects skin surface temperature, which is systematically lower than core body temperature and does not have a clinical alert threshold. Core body temperature is measured separately by the Thermo-Mini.

### 2.2 Oura Ring (`oura_ring`)

Ring-form continuous recovery, sleep staging, and autonomic sensor.

| Field (`OuraRingData`) | Unit | Description |
| :--- | :--- | :--- |
| `hrv_ms` | ms | Heart-rate variability — RMSSD |
| `body_temp_deviation_c` | °C | Body temperature deviation vs 30-day personal baseline |
| `sleep_deep_pct` | % | Deep sleep stage proportion |
| `sleep_rem_pct` | % | REM sleep stage proportion |
| `sleep_light_pct` | % | Light sleep stage proportion |
| `sleep_awake_pct` | % | Wake-after-sleep-onset proportion |
| `respiratory_rate_bpm` | breaths/min | Breathing rate during sleep (separate from Bio-Monitor reading) |
| `spo2_avg_pct` | % | Average SpO₂ during the last sleep period |
| `steps` | count | Step count for current duty period |

### 2.3 Thermo-Mini (`thermo_mini`)

Non-invasive core body temperature sensor.

| Field (`ThermoMiniData`) | Unit | Description |
| :--- | :--- | :--- |
| `core_body_temp_c` | °C | Core body temperature (the clinically relevant body temperature parameter) |

### 2.4 Actiwatch Spectrum (`actiwatch`)

Wrist actigraphy and ambient-light sensor for activity and sleep quality.

| Field (`ActiwatchData`) | Unit | Description |
| :--- | :--- | :--- |
| `activity_counts_per_epoch` | counts/epoch | Raw actigraphy counts per measurement epoch |
| `ambient_light_lux` | lux | Ambient light level |
| `sleep_onset_min` | min | Time from lights-out to sleep onset (last sleep period) |
| `wake_episodes` | count | Wake-after-sleep-onset events (last sleep period) |
| `activity_level` | text | Sedentary / Light / Moderate / Vigorous |
| `hyperactivity_index` | 0–10 | Derived restlessness / motor dysregulation score |

### 2.5 Personal CO₂ Monitor (`personal_co2`)

Per-crew wearable CO₂ exposure sensor. Measures individual breath-zone CO₂ concentration in PPM — **distinct from the cabin ambient CO₂ (mmHg) measured by the environmental sensor**.

| Field (`PersonalCO2Data`) | Unit | Description |
| :--- | :--- | :--- |
| `current_ppm` | ppm | Current personal CO₂ exposure |
| `peak_ppm` | ppm | Peak exposure recorded in the current monitoring period |

### 2.6 EVARM Dosimeter (`evarm`)

Per-crew radiation dosimeter. Measures individual personal dose — **distinct from the shared mission cumulative dose in the environmental payload**.

| Field (`EVARMData`) | Unit | Description |
| :--- | :--- | :--- |
| `dose_rate_usv_h` | μSv/h | Current instantaneous dose rate |
| `personal_cumulative_msv` | mSv | Per-crew cumulative radiation dose since mission start |

### 2.7 Environmental Sensors — Shared cabin (`EnvironmentalSnapshot`)

Shared habitat sensors not associated with any individual crew member. Displayed in the Habitat panel.

| Field | Unit | Description |
| :--- | :--- | :--- |
| `cabin_co2_mmhg` | mmHg | Cabin CO₂ partial pressure |
| `cabin_temp_c` | °C | Cabin air temperature |
| `cabin_humidity_pct` | % | Relative humidity |
| `mission_cumulative_dose_msv` | mSv | Mission-level cumulative radiation dose (shared reference) |

---

## 3. Complete parameter reference

All parameters displayed in the HMU frontend. Parameters without a defined alert threshold are marked "—". Visual modality codes refer to templates defined in `6_visualdesign.md §Visual modality library`.

`SPARKLINE(alert)` = trend rendered in the click-to-expand alert trend panel.  
`mini bar` = 4 px inline progress bar in the score sensor detail row (requires parameter to be in `PARAM_RANGES` in `app.js`).

### 3.1 Physiological — with alert thresholds

| Parameter | Source field | Unit | Caution (amber) | Warning (red) | Severity | Visual modality | Score membership |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Heart Rate** | `bio_monitor.heart_rate_bpm` | bpm | < 45 · > 120 | < 40 · > 130 | Critical | ARC_GAUGE + SPARKLINE(alert) | — |
| **SpO₂** | `bio_monitor.spo2_pct` | % | < 94 | < 92 | Critical | ARC_GAUGE + SPARKLINE(alert) | Health (raw) · Readiness (raw) |
| **Systolic BP** | `bio_monitor.systolic_mmhg` | mmHg | < 90 · > 160 | < 80 · > 170 | Critical | NUMERIC + SPARKLINE(alert) · mini bar | — |
| **Respiration Rate** | `bio_monitor.breathing_rate_bpm` | breaths/min | < 10 · > 20 | < 8 · > 24 | Critical | ARC_GAUGE + SPARKLINE(alert) | Fatigue · Stress |
| **Core Body Temp** | `thermo_mini.core_body_temp_c` | °C | < 36.0 · > 37.5 | < 35.0 · > 38.0 | Moderate | BAND_INDICATOR + NUMERIC | Health · Readiness |
| **Personal CO₂** | `personal_co2.current_ppm` | ppm | > 1000 | > 2500 | — | NUMERIC *(no mini bar — not in PARAM_RANGES)* | Stress |

> **Exercise activity profile note:** When the activity profile is **Exercise** (`scenario=exercise`), the high-side Caution threshold for Heart Rate (> 120 bpm) and Respiration Rate (> 20 br/min) may be operationally suspended. **Activity status** (profile + IVA/EVA) must remain visible on-display to explain any threshold suppression. This suppression applies to the **single-parameter Caution display tier only**. Composite Emergency trigger conditions (§5.1, §5.5b, §5.6 in `8_medical_diagnosis.md`) are never suppressed — `spo2_pct` < 92 or a multi-parameter decompensation pattern during exercise is not an expected physiological response and constitutes a genuine emergency regardless of scenario tag.

### 3.2 Physiological — informational (no alert threshold)

These parameters are displayed in the score sensor panels for situational awareness but have no defined exceedance threshold in the current specification.

| Parameter | Source field | Unit | Visual modality | Score membership |
| :--- | :--- | :--- | :--- | :--- |
| Resting Heart Rate | `bio_monitor.resting_heart_rate_bpm` | bpm | NUMERIC + mini bar (`heart_rate_bpm` range) | Health · Fatigue · Stress · Readiness |
| ECG Rhythm | `bio_monitor.ecg_rhythm` | text | TEXT label | Health |
| Diastolic BP | `bio_monitor.diastolic_mmhg` | mmHg | NUMERIC (paired with systolic) | — |
| Tidal Volume | `bio_monitor.tidal_volume_l` | L | NUMERIC | Stress |
| Skin Temp | `bio_monitor.skin_temp_c` | °C | NUMERIC | — *(informational only; not core body temp)* |
| Activity (METs) | `bio_monitor.activity_mets` | METs | NUMERIC | Activity |
| HRV (RMSSD) | `oura_ring.hrv_ms` | ms | NUMERIC | Health · Fatigue · Stress · Readiness |
| Body Temp Deviation | `oura_ring.body_temp_deviation_c` | °C vs baseline | NUMERIC | Fatigue · Stress |
| Deep Sleep | `oura_ring.sleep_deep_pct` | % | NUMERIC | Sleep |
| REM Sleep | `oura_ring.sleep_rem_pct` | % | NUMERIC | Sleep |
| Light Sleep | `oura_ring.sleep_light_pct` | % | NUMERIC | Sleep |
| Awake % | `oura_ring.sleep_awake_pct` | % | NUMERIC | Sleep |
| RR (ring) | `oura_ring.respiratory_rate_bpm` | breaths/min | NUMERIC | — *(sleep breathing; separate from Bio-Monitor RR)* |
| SpO₂ avg (ring) | `oura_ring.spo2_avg_pct` | % | NUMERIC + mini bar (`spo2_pct` range) | Readiness |
| Steps | `oura_ring.steps` | count | NUMERIC | Activity |
| Activity counts | `actiwatch.activity_counts_per_epoch` | counts | NUMERIC | Activity |
| Ambient light | `actiwatch.ambient_light_lux` | lux | NUMERIC | Sleep |
| Sleep onset | `actiwatch.sleep_onset_min` | min | NUMERIC | Sleep |
| Wake episodes | `actiwatch.wake_episodes` | count | NUMERIC | Sleep · Fatigue |
| Activity level | `actiwatch.activity_level` | text | TEXT label | Activity |
| Hyperactivity index | `actiwatch.hyperactivity_index` | 0–10 | NUMERIC | Fatigue |
| Personal CO₂ peak | `personal_co2.peak_ppm` | ppm | NUMERIC | — |
| Dose rate | `evarm.dose_rate_usv_h` | μSv/h | NUMERIC | — |
| Personal cumul. dose | `evarm.personal_cumulative_msv` | mSv | NUMERIC + mini bar (`radiation_cumulative_msv` range) | Readiness |

### 3.3 Environmental — with alert thresholds

Displayed in the shared Habitat panel. No per-crew ownership.

| Parameter | Source field | Unit | Caution (amber) | Warning (red) | Severity | Visual modality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cabin CO₂** | `environmental.cabin_co2_mmhg` | mmHg | > 6 | > 8 | — | ARC_GAUGE + SPARKLINE(alert) |
| **Cabin Temperature** | `environmental.cabin_temp_c` | °C | < 19 · > 26 | < 18 · > 27 | Moderate | BAND_INDICATOR + NUMERIC |
| **Cabin Humidity** | `environmental.cabin_humidity_pct` | % | < 30 · > 70 | < 25 · > 75 | Moderate | BAND_INDICATOR + NUMERIC |
| **Mission Cumul. Dose** | `environmental.mission_cumulative_dose_msv` | mSv | > 50 | > 150 | — | PROGRESS_BAR + SPARKLINE(alert) |

---

## 4. Synthesized score reference

Six composite scores (0–100 scale) are computed from the raw device parameters and presented as the primary view in the crew-detail modal. Higher is always better for all six scores.

Score cards use PROGRESS_BAR as primary modality. Clicking a card opens the score-detail panel with a SPARKLINE (day / week / month time scale).

Alert thresholds for score values: **Caution < 70**, **Warning < 60** (applied uniformly to all six scores).

---

### 4.1 Health Score

**Label:** Health Score  
**Description:** Cardiovascular vitals, core temperature, and autonomic regulation.  
**Color:** `#3fb950` (green)

| Input parameter | Source field | Role in score |
| :--- | :--- | :--- |
| Resting heart rate | `bio_monitor.resting_heart_rate_bpm` | Cardiovascular baseline |
| ECG rhythm | `bio_monitor.ecg_rhythm` | Rhythm normality context |
| SpO₂ | `bio_monitor.spo2_pct` | Oxygenation status |
| Blood pressure | `bio_monitor.systolic_mmhg / diastolic_mmhg` | Hemodynamic status |
| Core body temp | `thermo_mini.core_body_temp_c` | Thermal regulation |
| HRV (RMSSD) | `oura_ring.hrv_ms` | Autonomic nervous system health |

**Mock formula:** `health_score = clamp(86 + randint(−10, 6), 0, 100)` — seeded by crew ID + mission day.

---

### 4.2 Sleep Score

**Label:** Sleep Score  
**Description:** Sleep quality, architecture, and onset latency.  
**Color:** `#79c0ff` (light blue)

| Input parameter | Source field | Role in score |
| :--- | :--- | :--- |
| Deep sleep | `oura_ring.sleep_deep_pct` | Restorative sleep depth |
| REM sleep | `oura_ring.sleep_rem_pct` | Cognitive recovery |
| Light sleep | `oura_ring.sleep_light_pct` | Transition / lighter rest |
| Awake % | `oura_ring.sleep_awake_pct` | Sleep fragmentation |
| Sleep onset | `actiwatch.sleep_onset_min` | Sleep latency (lower = better) |
| Wake episodes | `actiwatch.wake_episodes` | Sleep continuity |
| Ambient light | `actiwatch.ambient_light_lux` | Environmental sleep conditions |

**Mock formula:** `sleep_score = clamp(78 + randint(−12, 8), 0, 100)` (+8 during sleep scenario).

---

### 4.3 Activity Score

**Label:** Activity Score  
**Description:** Physical activity level and movement across the duty period.  
**Color:** `#d29922` (amber)

| Input parameter | Source field | Role in score |
| :--- | :--- | :--- |
| Activity (METs) | `bio_monitor.activity_mets` | Metabolic effort |
| Activity counts | `actiwatch.activity_counts_per_epoch` | Movement magnitude |
| Activity level | `actiwatch.activity_level` | Categorical intensity |
| Steps | `oura_ring.steps` | Locomotion volume |

**Mock formula:** `activity_score = clamp(71 + randint(−15, 20), 0, 100)`.

---

### 4.4 Fatigue Score

**Label:** Fatigue Score  
**Internal field:** `fatigue_score` = `fatigue_resistance` — higher = less fatigued = better.  
**Description:** Accumulated fatigue, restlessness, and recovery deficit.  
**Color:** `#f0883e` (orange)

| Input parameter | Source field | Role in score |
| :--- | :--- | :--- |
| HRV (RMSSD) | `oura_ring.hrv_ms` | Recovery status |
| Body temp deviation | `oura_ring.body_temp_deviation_c` | Physiological stress marker |
| Wake episodes | `actiwatch.wake_episodes` | Sleep fragmentation → fatigue |
| Hyperactivity index | `actiwatch.hyperactivity_index` | Motor restlessness |
| Resting heart rate | `bio_monitor.resting_heart_rate_bpm` | Cardiovascular recovery |
| Breathing rate | `bio_monitor.breathing_rate_bpm` | Respiratory effort at rest |

**Mock formula:**
```
fatigue_load = max(0,  100 − readiness_score + uniform(−8, 12))
fatigue_load += 15          (stress scenario)
fatigue_load = max(0, fatigue_load − 20)   (sleep scenario)
fatigue_score = clamp(round(100 − fatigue_load × 0.85), 0, 100)
```

---

### 4.5 Stress Management Score

**Label:** Stress Management  
**Internal field:** `stress_management_score` — higher = better coping capacity.  
**Description:** Physiological stress load and autonomic coping capacity.  
**Color:** `#db6d28` (dark orange)

| Input parameter | Source field | Role in score |
| :--- | :--- | :--- |
| Resting heart rate | `bio_monitor.resting_heart_rate_bpm` | Sympathetic activation baseline |
| Breathing rate | `bio_monitor.breathing_rate_bpm` | Respiratory stress signature |
| Tidal volume | `bio_monitor.tidal_volume_l` | Breathing depth under load |
| HRV (RMSSD) | `oura_ring.hrv_ms` | Autonomic stress resilience |
| Body temp deviation | `oura_ring.body_temp_deviation_c` | Stress-driven thermal shift |
| Personal CO₂ | `personal_co2.current_ppm` | Cognitive environment load |

**Mock formula:** `stress_management_score = clamp(80 + randint(−18, 5), 0, 100)`.

---

### 4.6 Readiness Score

**Label:** Readiness Score  
**Description:** Mission readiness integrating recovery, health, and radiation exposure.  
**Color:** `#58a6ff` (blue)

| Input parameter | Source field | Role in score |
| :--- | :--- | :--- |
| HRV (RMSSD) | `oura_ring.hrv_ms` | Autonomic readiness |
| SpO₂ avg | `oura_ring.spo2_avg_pct` | Overnight oxygenation |
| Resting heart rate | `bio_monitor.resting_heart_rate_bpm` | Cardiovascular readiness |
| SpO₂ | `bio_monitor.spo2_pct` | Current oxygenation |
| Core body temp | `thermo_mini.core_body_temp_c` | Thermal readiness |
| Personal cumul. dose | `evarm.personal_cumulative_msv` | Radiation load context |

**Mock formula:**
```
Nominal/exercise/stress:
  readiness_score = round((sleep_score + health_score + stress_mgmt) / 3)

Sleep scenario:
  readiness_score = round(sleep_score × 0.4 + health_score × 0.35 + stress_mgmt × 0.25)
```

---

## 5. Alert trend chart coverage

Clicking an active alert opens a time-series trend panel. Coverage by parameter:

| Alert parameter label | Data source | Time window | Threshold lines shown |
| :--- | :--- | :--- | :--- |
| Heart rate | `vitals_series.heart_rate_bpm` (backend) | 6 h · 48 samples | Caution 45/120 bpm · Warning 40/130 bpm |
| SpO₂ | `vitals_series.spo2_pct` (backend) | 6 h · 48 samples | Caution 94% · Warning 92% |
| Respiratory rate | `vitals_series.respiratory_rate_bpm` (backend) | 6 h · 48 samples | Caution 10/20 · Warning 8/24 br/min |
| Systolic BP | Synthetic series (client) | 24 h mock | Caution 90/160 · Warning 80/170 mmHg |
| Cabin CO₂ | Synthetic series (client) | 24 h mock | Caution 6 · Warning 8 mmHg |
| Cumulative dose | Synthetic cumulative (client) | 24 h mock | Caution 50 · Warning 150 mSv |
| Cabin temperature | Synthetic series (client) | 24 h mock | Caution 19/26 · Warning 18/27 °C |
| Heart rate channel *(integrity)* | Aliased → Heart rate chart | Same | Same |
| SpO₂ channel *(integrity)* | Aliased → SpO₂ chart | Same | Same |
| Environmental fusion *(integrity)* | Aliased → Cabin CO₂ chart | Same | Same |

---

## 6. Score threshold table (quick reference)

All six synthesized scores use the same two-tier threshold:

| Score | Caution (amber) | Warning (red) | Action protocol |
| :--- | :--- | :--- | :--- |
| Health Score | < 70 | < 60 | Moderate |
| Sleep Score | < 70 | < 60 | Moderate |
| Activity Score | < 70 | < 60 | Moderate |
| Fatigue Score | < 70 | < 60 | Moderate |
| Stress Management | < 70 | < 60 | Moderate |
| Readiness Score | < 70 | < 60 | Moderate |

---

## 7. Alert demo scenario (startup state)

The server starts with `_alert_demo = True`, forcing the following values for CM-2 to demonstrate the full alert pipeline. Values and the alert tiers they actually trigger (per current `PARAM_LIMITS`):

| Parameter | Demo value | Triggered tier | Note |
| :--- | :--- | :--- | :--- |
| CM-2 SpO₂ | 88.5 % | **WARNING** | < low_warn 92% |
| CM-2 Heart rate | 128 bpm | **CAUTION** | > high_caution 120; below high_warn 130 |
| CM-2 Systolic BP | 168 mmHg | **CAUTION** | > high_caution 160; below high_warn 170 |
| CM-2 Respiration rate | 7.0 br/min | **WARNING** | < low_warn 8 br/min |
| Cabin CO₂ | 7.5 mmHg | **CAUTION** | > high_caution 6; below high_warn 8 |
| Mission cumul. dose | 158.0 mSv | **WARNING** | > high_warn 150 mSv |

---

*This document shall be updated whenever `PARAM_LIMITS` or `PARAM_RANGES` in `app.js` change, a new device field is added to `models.py`, or a score's `SCORE_DETAILS` entry in `app.js` is modified — so that the parameter reference stays synchronized with the software implementation.*

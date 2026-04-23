# HMU Medical Diagnosis Reference

This document maps every alarm-triggering parameter in the HMU to the clinical conditions it may indicate. It is intended to support the design of symptom-level alert labelling — enabling a crew member who has no medical background to understand not just *which* value exceeded a threshold, but *what that deviation means for their body*.

Content is drawn from the existing HMU design documents (`1_problemstatement.md`, `2_conops.md`, `3_requirements.md`, `7_parameter_logic.md`) unless explicitly marked **[Proposal]**, which indicates material that is not yet stated in any current design document and is offered here as a design recommendation for team review.

---

## Navigation

| Section | Topic |
| :--- | :--- |
| [§1](#1-design-intent) | Design intent |
| [§2](#2-physiological-parameters) | Physiological parameters (6 parameters) |
| [§3](#3-environmental-parameters) | Environmental parameters (4 parameters) |
| [§4](#4-synthesized-scores) | Synthesized score cards (6 scores + display behavior) |
| [§5](#5-symptom-catalogue-for-alert-titles) | Symptom catalogue for alert titles (16 entries) |
| [§6](#6-display-design-implications) | Display design implications |

---

## 1. Design Intent

Current HMU alerts notify the crew when a measured value crosses a predefined Caution or Warning threshold. This is necessary but not sufficient: a crew member seeing *"Heart Rate — WARNING"* must independently reason about whether they are simply exercising hard or experiencing a cardiac event.

The goal captured in this document is to add a **symptom-level interpretation layer** that:

1. Names the clinical condition (e.g., *Hypercapnia*, *Hypoxaemia*) rather than only the sensor label.
2. Lists the parameters that are contributing to that condition, prioritised by exceedance severity.
3. Gives the crew a vocabulary for self-reporting to the System AI or flight surgeon.

**Alert detail display — decided:** When a crew member clicks an alert, the detail view shows **only the parameters currently exceeding their threshold** (Option A). This minimises cognitive load and maximises signal-to-noise in high-stress moments. The "Show in alert detail" column in §5 defines the display rule per parameter under this policy: parameters marked **Always** are shown regardless of alarm state; parameters marked **If alarming** are shown only when they are also in Caution or Warning; parameters marked **Context** are not shown.

---

## 2. Physiological Parameters

### 2.1 Heart Rate

**Sensor:** `bio_monitor.heart_rate_bpm`  
**Units:** bpm  
**Alert thresholds:** Caution < 45 or > 120 bpm · Warning < 40 or > 130 bpm

#### 2.1.1 Tachycardia (high heart rate)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 120 bpm | Tachycardia (mild–moderate) | Heart rate elevated above resting norm. Common causes: physical exertion, psychological stress, dehydration, fever, pain, sympathetic activation. |
| Warning | > 130 bpm | Tachycardia (significant) | Sustained high HR at rest may indicate cardiac stress, severe dehydration, infection, or autonomic dysregulation. Requires prompt assessment. |

**Semantically related parameters:** SpO₂ (rule out hypoxia-driven tachycardia), RR (rule out respiratory effort), Core Body Temp (rule out fever), HRV (autonomic context), Stress Management score, ECG rhythm label.

**Design basis:** `1_problemstatement.md` cites Apollo 15 arrhythmia detection during EVA as the canonical example of why cardiac monitoring matters operationally.

#### 2.1.2 Bradycardia (low heart rate)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | < 45 bpm | Bradycardia (mild) | HR below normal resting range. May reflect high cardiovascular fitness (common in trained astronauts) or early autonomic imbalance. Requires correlation with symptoms. |
| Warning | < 40 bpm | Bradycardia (significant) | Very low HR may cause decreased cardiac output, dizziness, syncope risk, or indicate vagal over-activation or cardiac conduction abnormality. |

**Semantically related parameters:** ECG rhythm, Systolic BP (hemodynamic stability), HRV, SpO₂ (perfusion adequacy), Readiness score.

> **[Proposal]** The current system does not distinguish fitness-related bradycardia (expected in trained crew) from pathological bradycardia. A personal baseline comparison (e.g., ±15% of the crew member's own resting HR over the prior 7 days) would reduce false alarms and improve signal specificity. `bio_monitor.resting_heart_rate_bpm` is already available as a baseline anchor.

---

### 2.2 SpO₂ (Peripheral Oxygen Saturation)

**Sensor:** `bio_monitor.spo2_pct`  
**Units:** %  
**Alert thresholds:** Caution < 94% · Warning < 92%

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | < 94% | Mild hypoxaemia | Oxygen saturation is below the normal healthy range (≥ 95%). Cognitive performance, reaction time, and fine motor control may begin to degrade. Common causes in spaceflight: elevated cabin CO₂ displacing O₂, mild respiratory illness, positional airway issues. |
| Warning | < 92% | Hypoxaemia (clinically significant) | At this level, tissue oxygenation is compromised. Symptoms can include confusion, shortness of breath, cyanosis, impaired judgment, and reduced operational capacity. Immediate assessment and corrective action are required. |

**Semantically related parameters:** RR (compensatory breathing effort), HR (compensatory tachycardia), Cabin CO₂ mmHg, Personal CO₂ ppm, Core Body Temp, Health score, Readiness score.

**Design basis:** `7_parameter_logic.md §3.1` classifies SpO₂ as **Critical** severity. `2_conops.md` lists hypoxia-adjacent hazards under "illness onset" as a key risk for detection. The two-tier scheme (Caution 94%, Warning 92%) provides a gradient: the crew has an actionable window before the condition becomes immediately dangerous.

---

### 2.3 Systolic Blood Pressure

**Sensor:** `bio_monitor.systolic_mmhg`  
**Units:** mmHg  
**Alert thresholds:** Caution < 90 or > 160 mmHg · Warning < 80 or > 170 mmHg

#### 2.3.1 Hypertension (high BP)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 160 mmHg | Stage 2 hypertension | Acutely elevated BP. In spaceflight, common triggers include psychological stress, fluid redistribution (headward fluid shift in microgravity), high workload, CO₂ elevation, and sleep deprivation. Sustained elevation increases stroke and cardiac event risk. |
| Warning | > 170 mmHg | Severe hypertension / hypertensive urgency | Requires prompt assessment. Risk of hypertensive crisis, visual changes, severe headache, or end-organ compromise. |

#### 2.3.2 Hypotension (low BP)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | < 90 mmHg | Mild hypotension | Low perfusion pressure. Causes in spaceflight: orthostatic intolerance (common after prolonged microgravity), dehydration, cardiovascular deconditioning, vasovagal response. May cause lightheadedness or near-syncope during transitions. |
| Warning | < 80 mmHg | Significant hypotension | Organ perfusion is compromised. Increases risk of syncope, cognitive impairment, fall injury during EVA transitions. Requires immediate evaluation. |

**Semantically related parameters:** HR (compensatory response), Core Body Temp (sepsis, fever), SpO₂, Diastolic BP, HRV, Health score.

> **[Proposal]** Microgravity orthostatic hypotension may be a predictable transition event (e.g., post-sleep, post-EVA). A contextual note tied to the scenario tag ("POST-EVA — transient hypotension expected; monitor for resolution") could reduce alarm fatigue for expected events.

---

### 2.4 Respiration Rate

**Sensor:** `bio_monitor.breathing_rate_bpm`  
**Units:** breaths/min  
**Alert thresholds:** Caution < 10 or > 20 br/min · Warning < 8 or > 24 br/min

#### 2.4.1 Tachypnoea (high respiration rate)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 20 br/min | Tachypnoea (mild) | Elevated breathing rate. Causes: physical exertion, pain, anxiety, early hypoxia or hypercapnia, fever. The body increases RR to expel CO₂ or compensate for reduced O₂. |
| Warning | > 24 br/min | Tachypnoea (significant) | Marked respiratory distress. Indicates the system is under substantial load. Combined with low SpO₂, suggests acute respiratory compromise. Combined with high HR and BP, may indicate severe stress response or systemic infection. |

#### 2.4.2 Bradypnoea (low respiration rate)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | < 10 br/min | Bradypnoea (mild) | Reduced breathing rate. Causes: deep relaxation or sleep (if sensor is active during rest), CNS depression, or sensor artefact. At rest this may be benign; during wakefulness it warrants assessment. |
| Warning | < 8 br/min | Bradypnoea (significant) | Severely reduced rate. Risk of CO₂ retention, inadequate ventilation, hypercapnia. Rare at rest without pharmacological cause or CNS event; if confirmed, immediate assessment is required. |

**Semantically related parameters:** SpO₂ (oxygenation status), Cabin CO₂ mmHg, Personal CO₂ ppm, Tidal Volume, HR (compensation pattern), Core Body Temp.

**Design basis:** RR is co-listed with SpO₂ and HR as a primary vital in `7_parameter_logic.md §3.1` with **Critical** severity classification.

---

### 2.5 Core Body Temperature

**Sensor:** `thermo_mini.core_body_temp_c`  
**Units:** °C  
**Alert thresholds:** Caution < 36.0 or > 37.5 °C · Warning < 35.0 or > 38.0 °C

#### 2.5.1 Hyperthermia / Fever (high temperature)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 37.5 °C | Elevated temperature / low-grade fever | Above normal resting core temperature. Common causes: infection (viral or bacterial), inflammatory response, cabin temperature elevation, post-exercise thermal load, stress. Cognitive performance, particularly executive function, may begin to degrade. |
| Warning | > 38.0 °C | Fever | Confirmed febrile state. In an isolated crew with no physician, even a moderate fever is operationally significant. Infection in microgravity may progress differently than on Earth due to altered immune function. Warrants immediate assessment and simultaneous contact with the flight surgeon. |

#### 2.5.2 Hypothermia (low temperature)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | < 36.0 °C | Mild hypothermia / sub-normal temperature | Core temp below normal range. Causes: low cabin temperature, extreme fatigue, fluid loss, metabolic suppression. May impair fine motor control and cognitive processing. |
| Warning | < 35.0 °C | Hypothermia | Significant thermal compromise. Shivering, confusion, loss of coordination. Requires immediate rewarming and simultaneous contact with the flight surgeon. Cabin temperature alert should be checked simultaneously. |

**Semantically related parameters:** Cabin Temp (environmental contribution), HR (elevated in fever, depressed in hypothermia), Body Temp Deviation (Oura Ring trending), Skin Temp (Bio-Monitor; lower than core but directional indicator), Health score.

**Note on sensor distinction:** `thermo_mini.core_body_temp_c` is the only parameter with clinical alert thresholds for temperature. `bio_monitor.skin_temp_c` is informational and reflects surface temperature — it is not equivalent to core temperature and does not trigger alerts.

---

### 2.6 Personal CO₂ Exposure

**Sensor:** `personal_co2.current_ppm`  
**Units:** ppm  
**Alert thresholds:** Caution > 1 000 ppm · Warning > 2 500 ppm

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 1 000 ppm | Elevated CO₂ exposure (personal breath zone) | At these concentrations, early cognitive effects begin: mild headache, reduced concentration, slight increase in breathing rate. OSHA/NIOSH short-term exposure limit is 5 000 ppm; the 1 000 ppm caution is an early warning suited to sustained cognitive-task environments. |
| Warning | > 2 500 ppm | Significant CO₂ exposure | Headache, dizziness, impaired decision-making, and increased respiratory rate are likely. Prolonged exposure affects mission-critical cognitive performance. The crew member should increase ventilation, check the Cabin CO₂ level, and consider position relative to air circulation. |

**Distinction from Cabin CO₂:** `personal_co2.current_ppm` (per-crew, ppm) is the breath-zone measurement. `environmental.cabin_co2_mmhg` (shared, mmHg) is the overall cabin ambient measurement. Both can exceed thresholds independently. 1 mmHg CO₂ ≈ 1 316 ppm at sea-level pressure.

**Semantically related parameters:** Cabin CO₂ mmHg, RR (respiratory compensation), HR (sympathetic response to CO₂), SpO₂ (rule out concurrent hypoxia), Tidal Volume, Stress Management score.

---

## 3. Environmental Parameters

### 3.1 Cabin CO₂

**Sensor:** `environmental.cabin_co2_mmhg`  
**Units:** mmHg  
**Alert thresholds:** Caution > 6 mmHg · Warning > 8 mmHg  
**Applies to:** All crew (habitat-level alert)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 6 mmHg (~7 900 ppm) | Elevated cabin CO₂ | Above operational norms for long-duration missions. ISS CO₂ operating levels have historically been 2–5 mmHg; levels above 6 mmHg are associated with headache, impaired cognitive performance, and increased respiratory drive across the entire crew. |
| Warning | > 8 mmHg (~10 500 ppm) | Hypercapnia risk — habitat-level | At this partial pressure, the CO₂ gradient between ambient and blood is significantly reduced, impairing CO₂ expulsion. Symptoms across crew: persistent headache, confusion, shortness of breath, reduced exercise tolerance. The scrubber system must be assessed immediately. |

**Semantically related parameters:** Personal CO₂ ppm (per-crew verification), Cabin Temp, Cabin Humidity (environmental condition context), RR for all crew, SpO₂ for all crew.

**Historical context:** The ISS has had operational episodes of elevated CO₂ linked to crew headaches and performance degradation, making this one of the most operationally validated environmental alarm parameters in the existing design documents.

---

### 3.2 Cabin Temperature

**Sensor:** `environmental.cabin_temp_c`  
**Units:** °C  
**Alert thresholds:** Caution < 19 or > 26 °C · Warning < 18 or > 27 °C

| Direction | Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- | :--- |
| Hot | Caution | > 26 °C | Thermal comfort exceeded | Reduced thermal comfort. Increased metabolic load, elevated skin temperature, mild dehydration risk. Cognitive performance begins to degrade with sustained heat. |
| Hot | Warning | > 27 °C | Thermal stress — habitat | Physiological heat stress risk across crew. Combined with physical exertion or fever, this becomes a serious compounding risk. Core body temperature monitoring should be cross-checked. |
| Cold | Caution | < 19 °C | Sub-optimal cabin temperature | Crew thermal comfort impaired. Increased metabolic cost for thermoregulation. Fine motor task performance may degrade. |
| Cold | Warning | < 18 °C | Hypothermia risk — habitat | Sustained exposure could contribute to core temperature loss, particularly in individuals with low body mass or impaired thermoregulation. |

**Semantically related parameters:** Core Body Temp (compounding risk), Cabin Humidity (perceived temperature), Skin Temp, Health score.

---

### 3.3 Cabin Humidity

**Sensor:** `environmental.cabin_humidity_pct`  
**Units:** %  
**Alert thresholds:** Caution < 30 or > 70% · Warning < 25 or > 75%

| Direction | Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- | :--- |
| High | Caution | > 70% | High humidity | Elevated mucosal moisture load; increased risk of mould and microbial growth in the habitat. Reduced evaporative cooling efficiency may impair thermoregulation during exercise. |
| High | Warning | > 75% | Humidity hazard | Condensation risk on avionics. Thermal comfort severely degraded. Respiratory mucosal irritation and potential pathogen proliferation. |
| Low | Caution | < 30% | Dry habitat | Mucous membrane dryness, eye irritation, skin dryness. Increased susceptibility to upper respiratory tract infections. |
| Low | Warning | < 25% | Very low humidity | Significant mucosal drying. Impairs the body's first-line respiratory defense. Risk of epistaxis (nosebleed), eye dryness, and worsened respiratory symptoms. |

**Semantically related parameters:** Cabin Temp (combined thermal-humidity comfort), Core Body Temp, Personal CO₂ (closed-environment air quality).

---

### 3.4 Mission Cumulative Radiation Dose

**Sensor:** `environmental.mission_cumulative_dose_msv`  
**Units:** mSv  
**Alert thresholds:** Caution > 50 mSv · Warning > 150 mSv  
**Applies to:** All crew (mission-level reference)  
**See also:** `evarm.personal_cumulative_msv` (per-crew individual dose)

| Tier | Range | Condition name | Clinical meaning |
| :--- | :--- | :--- | :--- |
| Caution | > 50 mSv | Accumulated dose — monitoring zone | Approaching the lower bound of operationally significant cumulative exposure. At 50 mSv, the stochastic risk of long-term radiation-induced cancer begins to accumulate meaningfully. No acute symptoms. This tier is an early awareness marker for mission planning (remaining dose budget). |
| Warning | > 150 mSv | High cumulative dose | Significant lifetime radiation load. For context, NASA's career exposure limits (pre-2021) were set to limit excess cancer mortality risk to 3%; 150 mSv on a single mission is a substantial fraction of career budget. No immediate acute symptoms at this level, but the cumulative stochastic risk is operationally significant. |

**Acute vs. stochastic distinction:** The thresholds used here are for chronic, cumulative dose. Acute radiation syndrome (ARS) requires a very high dose delivered over a short period (typically > 1 000 mSv in hours), which is a distinct and more severe scenario not currently modelled in the HMU alert system.

**Semantically related parameters:** Personal cumulative dose (`evarm.personal_cumulative_msv`) for per-crew comparison, Dose rate (`evarm.dose_rate_usv_h`) to understand whether the current environment is actively contributing to dose accumulation.

> **[Proposal]** The current system shows mission-level dose as a shared habitat metric and per-crew personal dose as an informational value only (no threshold). Adding a per-crew Warning threshold for `evarm.personal_cumulative_msv` would enable the HMU to flag when a specific crew member has accumulated a disproportionate dose.

---

## 4. Synthesized Scores

All six scores use a uniform two-tier threshold: **Caution < 70**, **Warning < 60**. Because scores are composites, a score alarm does not directly name a single clinical condition. Instead, the score alarm serves as a triage flag — directing the crew to examine the underlying sensor parameters.

The table below maps each score to the most clinically relevant conditions that a low score may reflect.

> **Implementation note:** This score-to-condition mapping is **clinical reference knowledge only** — it is not implemented as alert-firing logic in the current software. A low score does not trigger any Symptom alert in the Alerts panel, nor does it programmatically surface a specific condition label in the score detail panel. The mapping is preserved in `data/knowledge/low_indicates.csv` as design knowledge. What *is* implemented is the score advice text (`SCORE_ADVICE` in `frontend/app.js`): when a score falls below Caution (< 70) or Warning (< 60), the score detail panel displays a fixed advisory text per §4.7 — but this text does not reference specific Symptom entries from §5.

| Score | Condition category | Key clinical conditions (low score may indicate) | Primary sensors to cross-check |
| :--- | :--- | :--- | :--- |
| **Health Score** | Cardiovascular / thermal / autonomic | Cardiovascular deconditioning, arrhythmia, hypertension, hypoxia, fever, autonomic dysregulation | HR, SpO₂, Systolic BP, Core Body Temp, HRV |
| **Sleep Score** | Sleep architecture / circadian | Sleep deprivation, fragmented sleep, circadian misalignment, insomnia, sleep-disordered breathing | Deep %, REM %, Wake episodes, Sleep onset latency, Ambient light |
| **Activity Score** | Musculoskeletal / deconditioning | Physical deconditioning, overtraining risk, sedentary behaviour, musculoskeletal fatigue | METs, Activity counts, Steps, Activity level |
| **Fatigue Score** | Accumulated fatigue / recovery | Cumulative fatigue, sleep debt, overexertion, autonomic depletion, cognitive fatigue | HRV, Wake episodes, Resting HR, Body temp deviation, Hyperactivity index |
| **Stress Management** | Autonomic stress / psychological | Acute or chronic psychological stress, sympathetic overactivation, anxiety, cognitive overload, CO₂-driven arousal | Resting HR, RR, HRV, Body temp deviation, Personal CO₂ |
| **Readiness Score** | Mission fitness-for-duty | Insufficient recovery for task execution, residual fatigue, radiation load impact, oxygenation deficit | HRV, SpO₂ avg, Resting HR, Core Body Temp, Personal dose |

---

### 4.7 Score alarm display behavior and advice

**Score alarms are not listed in the Alerts panel.** Score values are long-duration trends, not acute events; placing them in the alert list alongside vital-sign alarms would dilute the clinical urgency of the Alerts panel.

Instead, when a crew member opens the score detail panel by clicking a score card, the panel displays contextual advice when the score is in Caution (< 70) or Warning (< 60).

**Urgency for all score alarms:** **Moderate** — monitor closely; report to Flight Surgeon at next scheduled contact if the score remains below threshold after one full sleep cycle. No immediate physical intervention is required.

| Score | Caution advice (score < 70) | Warning advice (score < 60) |
| :--- | :--- | :--- |
| **Health Score** | Review cardiovascular parameters (HR, SpO₂, BP) and core body temperature in the sensor rows below. Note HRV trend. If any raw vital is also alarming, refer to the corresponding alert in the Alerts panel. | Same as Caution. Notify Flight Surgeon at next contact with score value and which sensor parameters are flagged. |
| **Sleep Score** | Prioritise sleep opportunity in the next duty cycle. Review sleep architecture (deep %, REM %) and wake episodes. Reduce bright light exposure before the sleep period. | Same as Caution. If sleep score remains below 60 after two consecutive duty cycles, notify Flight Surgeon for evaluation of sleep disruption. |
| **Activity Score** | Review duty schedule for prolonged sedentary periods. Schedule moderate exercise to prevent musculoskeletal deconditioning per the mission exercise protocol. | Same as Caution. Sustained low activity score indicates deconditioning risk; notify Flight Surgeon for exercise prescription review. |
| **Fatigue Score** | Increase rest time and prioritise high-quality sleep in the next cycle. Review HRV and wake episodes as recovery indicators. | Defer high-criticality tasks where operationally possible. Notify Flight Surgeon if score remains below 60 after two sleep cycles. |
| **Stress Management** | Reduce non-essential workload and environmental stressors (noise, time pressure). Review resting HR and HRV trend for autonomic load indicators. If personal CO₂ is elevated, address that first (§5.2). | Same as Caution. Notify Flight Surgeon at next contact with score value and contributing sensor context. |
| **Readiness Score** | Defer safety-critical solo tasks where possible. Review contributing scores (Sleep, Health, Stress Management) to identify the primary driver and apply the corresponding advice above. | Do not assign solo or safety-critical tasks to the crew member. Notify Flight Surgeon at next scheduled contact. |

---

## 5. Symptom Catalogue for Alert Titles

This section defines the symptom label, trigger logic, parameter relationships, and recommended actions for every alarm-triggering parameter. Each entry maps directly to an alert that appears in the Alerts panel. **Exception:** §5.10 (Cognitive Performance Risk) is score-derived and surfaces in the score detail panel rather than the Alerts panel; see §5.10 for details.

**Three alarm tiers are defined:**

| Tier | Display color | Meaning |
| :--- | :--- | :--- |
| **Caution** | Amber `#d29922` | Single-parameter threshold exceeded; heightened monitoring required. |
| **Warning** | Red `#f85149` | Single-parameter threshold exceeded; prompt action required. |
| **Emergency** | Red `#f85149` (composite) | Multi-parameter pattern detected; immediate life-safety response required. Not a display-tier addition — it is a logic rule that fires a Warning-class alert with the highest urgency label. |

**"Show in alert detail" column values:**

| Value | Meaning |
| :--- | :--- |
| **Always** | Display this parameter in the alert detail view regardless of its alarm state. |
| **If alarming** | Display only when this parameter is also currently in Caution or Warning. |
| **Context** | Display as informational background; visually de-emphasised. |

> **Implementation status:** Symptom-level labelling (`symptom_title`, `plain_language_gloss`, `urgency`, `related_params`) and composite Emergency triggers are implemented in `backend/alerts.py` (commit `212858e`). These features were proposed by AI and accepted; entries that were proposed and implemented are marked **[Proposal — implemented]**. The recommended actions text in each §5.X entry is crew-facing guidance embedded in this document; it is not rendered programmatically in the current UI. **[Proposal]** tags without "implemented" mark features not yet implemented in the software.

---

### 5.1 Hypoxaemia — low blood oxygen

**Alert title:** "Hypoxaemia (low blood oxygen)"  
**Plain-language gloss:** "Your blood oxygen is lower than normal. This can impair thinking, coordination, and physical performance."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.spo2_pct` < 94 | Notify Flight Surgeon |
| Warning | `bio_monitor.spo2_pct` < 92 | Act immediately |
| Emergency | `bio_monitor.spo2_pct` < 92 AND `bio_monitor.heart_rate_bpm` > 130 AND `bio_monitor.breathing_rate_bpm` > 20 | Act immediately — escalate to §5.6 Cardiovascular Decompensation protocol |

*Exercise suppression does not apply to composite Emergency triggers. `bio_monitor.spo2_pct` < 92 during exercise is not an expected physiological response and constitutes a genuine emergency regardless of scenario tag.*

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.spo2_pct` | Primary trigger | **Always** |
| `bio_monitor.breathing_rate_bpm` | Compensatory tachypnoea — body increases RR to restore O₂ | **If alarming** |
| `bio_monitor.heart_rate_bpm` | Compensatory tachycardia — elevated HR alongside low SpO₂ worsens prognosis | **If alarming** |
| `environmental.cabin_co2_mmhg` | High cabin CO₂ displaces O₂ and inhibits recovery | **If alarming** |
| `personal_co2.current_ppm` | Breath-zone CO₂ contributing to local hypoxia | **If alarming** |
| `oura_ring.spo2_avg_pct` | Overnight SpO₂ trend — persistent low average indicates chronic issue | **Context** |

#### Recommended actions

**At Caution (SpO₂ < 94%):**
1. Check cabin O₂ supply pressure and CO₂ scrubber status.
2. Move to the area of the habitat with highest ventilation flow.
3. Reduce physical activity to decrease O₂ demand.
4. Notify Flight Surgeon with current SpO₂ reading, HR, RR, and cabin CO₂ level.

**At Warning / Emergency (SpO₂ < 92%):**
1. Administer supplemental O₂ immediately if available — do not wait for ground contact.
2. Initiate continuous monitoring of SpO₂, HR, and RR at maximum frequency.
3. Notify Flight Surgeon simultaneously with O₂ administration.
4. If HR > 130 and RR > 20 are also alarming, apply §5.6 Cardiovascular Decompensation protocol immediately.
5. If SpO₂ falls below 88% or consciousness is impaired, follow emergency medical protocol.

---

### 5.2 Hypercapnia — high CO₂

**Alert title:** "Hypercapnia (high CO₂)"  
**Plain-language gloss:** "CO₂ levels are elevated. This can cause headache, difficulty concentrating, and increased breathing rate."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `environmental.cabin_co2_mmhg` > 6 OR `personal_co2.current_ppm` > 1 000 | Notify Flight Surgeon |
| Warning | `environmental.cabin_co2_mmhg` > 8 OR `personal_co2.current_ppm` > 2 500 | Act immediately |
| Emergency | `environmental.cabin_co2_mmhg` > 6 AND `personal_co2.current_ppm` > 1 000 | Act immediately — both CO₂ sources elevated simultaneously; severity upgraded one tier |

*Note: Cabin CO₂ affects all crew simultaneously; Personal CO₂ may vary by individual position and activity. Both are shown in the alert detail regardless of which triggered the alarm.*

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `environmental.cabin_co2_mmhg` | Habitat-wide CO₂ partial pressure | **Always** |
| `personal_co2.current_ppm` | Per-crew breath-zone CO₂ | **Always** |
| `bio_monitor.breathing_rate_bpm` | Compensatory tachypnoea — body increases RR to expel CO₂ | **If alarming** |
| `bio_monitor.heart_rate_bpm` | Sympathetic activation from hypercapnia | **If alarming** |
| `bio_monitor.spo2_pct` | Concurrent hypoxaemia worsens prognosis | **If alarming** |
| `bio_monitor.tidal_volume_l` | Increased tidal volume is a secondary compensatory mechanism | **Context** |

#### Recommended actions

**At Caution:**
1. Verify CO₂ scrubber operation status and activate backup scrubber if primary is saturated.
2. Increase cabin ventilation and air circulation.
3. Move to the lowest-CO₂ area of the habitat; avoid confined spaces.
4. Reduce physical activity to decrease metabolic CO₂ production.
5. Notify Flight Surgeon with cabin CO₂ value (mmHg), personal CO₂ value (ppm), and any crew symptoms (headache, difficulty concentrating).

**At Warning / Emergency:**
1. Initiate CO₂ scrubber recovery procedure without waiting for ground contact.
2. Apply all Caution actions above.
3. Check O₂ partial pressure to rule out concurrent hypoxia (§5.1).
4. Notify Flight Surgeon immediately.
5. If CO₂ exceeds Warning and the scrubber cannot be recovered, initiate emergency cabin atmosphere protocol.

---

### 5.3 Tachycardia — fast heart rate

**Alert title:** "Tachycardia (fast heart rate)"  
**Plain-language gloss:** "Your heart rate is higher than normal for your current activity level."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.heart_rate_bpm` > 120, scenario ≠ EXERCISE | Notify Flight Surgeon |
| Warning | `bio_monitor.heart_rate_bpm` > 130 | Act immediately |

*Caution suppressed when scenario tag is EXERCISE — HR > 120 bpm is an expected physiological response to exercise. Warning tier (> 130) is never suppressed.*

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.heart_rate_bpm` | Primary trigger | **Always** |
| `bio_monitor.ecg_rhythm` | Distinguishes sinus tachycardia from arrhythmia — critical context | **Always** |
| `bio_monitor.resting_heart_rate_bpm` | Personal baseline — delta clarifies severity | **Always** |
| `thermo_mini.core_body_temp_c` | Fever drives tachycardia | **If alarming** |
| `bio_monitor.spo2_pct` | Tachycardia compensating for hypoxia | **If alarming** |
| `bio_monitor.systolic_mmhg` | Tachycardia + hypotension → cardiovascular compromise (§5.6) | **If alarming** |
| `oura_ring.hrv_ms` | Low HRV alongside tachycardia indicates pathological rather than exertional cause | **Context** |

#### Recommended actions

**At Caution (HR > 120 at rest):**
1. Check ECG rhythm label — if anything other than "Normal sinus" or "Sinus tachycardia", treat as possible arrhythmia and escalate to Warning urgency immediately.
2. Cease all physical activity and rest in a comfortable position.
3. Check core body temperature to rule out fever.
4. Check SpO₂ and cabin CO₂ to rule out hypoxia or hypercapnia as drivers.
5. Notify Flight Surgeon with HR value, ECG rhythm, SpO₂, core temp, and symptom description.

**At Warning (HR > 130):**
1. Apply all Caution actions above with immediate priority.
2. Initiate continuous HR and ECG monitoring.
3. If HR > 140 or the crew member reports chest pain or syncope, follow emergency cardiac protocol immediately.
4. If BP is low simultaneously, escalate to §5.6 Cardiovascular Decompensation protocol.

---

### 5.4 Bradycardia — slow heart rate

**Alert title:** "Bradycardia (slow heart rate)"  
**Plain-language gloss:** "Your heart rate is lower than normal. This may be a sign of high fitness or may need assessment."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.heart_rate_bpm` < 45 | Notify Flight Surgeon |
| Warning | `bio_monitor.heart_rate_bpm` < 40 | Act immediately |
| Emergency | `bio_monitor.heart_rate_bpm` < 40 AND `bio_monitor.systolic_mmhg` < 90 | Act immediately — follow cardiovascular emergency protocol (see §5.6 recommended actions; §5.6 composite trigger will not fire in a bradycardia scenario) |

> **[Proposal]** The 45 bpm threshold may generate false alarms in highly trained crew. A personal-baseline-adjusted caution band (e.g., > 15 bpm below the crew member's established resting HR from `bio_monitor.resting_heart_rate_bpm`) would improve specificity.

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.heart_rate_bpm` | Primary trigger | **Always** |
| `bio_monitor.ecg_rhythm` | Identifies conduction abnormalities vs. fitness-related bradycardia | **Always** |
| `bio_monitor.resting_heart_rate_bpm` | Personal baseline — HR close to personal resting norm suggests fitness-related cause | **Always** |
| `bio_monitor.systolic_mmhg` | Bradycardia + hypotension = inadequate cardiac output | **If alarming** |
| `bio_monitor.spo2_pct` | Low SpO₂ alongside bradycardia suggests hemodynamic compromise | **If alarming** |
| `oura_ring.hrv_ms` | High HRV with bradycardia = likely fitness; low HRV = likely pathology | **Context** |

#### Recommended actions

**At Caution (HR < 45):**
1. Check ECG rhythm — conduction abnormality (e.g., heart block) requires immediate escalation to Warning urgency.
2. Check systolic BP — if BP < 90, escalate to §5.6 protocol immediately.
3. Assess symptoms: ask if the crew member feels dizzy, faint, or short of breath.
4. If asymptomatic and ECG shows normal sinus, compare HR to personal resting baseline.
5. Notify Flight Surgeon with HR, ECG rhythm, BP, SpO₂, and symptom description.

**At Warning / Emergency (HR < 40):**
1. Apply all Caution actions with immediate priority.
2. If BP is also low, apply §5.6 Cardiovascular Decompensation protocol.
3. Prepare emergency cardiac medication kit; await Flight Surgeon guidance.
4. If HR falls below 35 bpm or consciousness is lost, follow emergency cardiac protocol immediately.

---

### 5.5a Hypertension — high blood pressure

**Alert title:** "Hypertension (high blood pressure)"  
**Plain-language gloss:** "Your blood pressure is above the normal range. Sustained elevation increases cardiovascular risk."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.systolic_mmhg` > 160 | Notify Flight Surgeon |
| Warning | `bio_monitor.systolic_mmhg` > 170 | Act immediately |

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.systolic_mmhg` | Primary trigger | **Always** |
| `bio_monitor.diastolic_mmhg` | Paired value; diastolic > 100 is independently significant | **Always** |
| `bio_monitor.heart_rate_bpm` | Autonomic context | **If alarming** |
| `thermo_mini.core_body_temp_c` | Fever + hypertension may indicate sepsis-related hemodynamic change | **If alarming** |
| `environmental.cabin_co2_mmhg` | Elevated CO₂ associated with headward fluid shifts and BP elevation in microgravity | **If alarming** |
| `oura_ring.hrv_ms` | Low HRV + hypertension indicates high sympathetic tone | **Context** |

#### Recommended actions

**At Caution (SBP > 160):**
1. Rest in a comfortable position; cease all physical activity immediately.
2. Assess for headache, visual disturbance, or chest discomfort — these indicate hypertensive urgency.
3. Recheck BP after 5 minutes of rest; if still elevated, do not dismiss as artefact.
4. Notify Flight Surgeon with BP value (systolic and diastolic), HR, and symptom description.

**At Warning (SBP > 170):**
1. Apply all Caution actions with immediate priority.
2. Initiate continuous BP monitoring.
3. Administer anti-hypertensive medication only under Flight Surgeon guidance.
4. Reduce psychological stressors and physical workload until BP normalises.

---

### 5.5b Hypotension — low blood pressure

**Alert title:** "Hypotension (low blood pressure)"  
**Plain-language gloss:** "Your blood pressure is lower than normal. This may cause dizziness or lightheadedness."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.systolic_mmhg` < 90 | Notify Flight Surgeon |
| Warning | `bio_monitor.systolic_mmhg` < 80 | Act immediately |
| Emergency | `bio_monitor.systolic_mmhg` < 90 AND `bio_monitor.heart_rate_bpm` > 120 AND `bio_monitor.spo2_pct` < 94 | Act immediately — escalate to §5.6 protocol |

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.systolic_mmhg` | Primary trigger | **Always** |
| `bio_monitor.diastolic_mmhg` | Paired value | **Always** |
| `bio_monitor.heart_rate_bpm` | Reflex tachycardia in hypotension; bradycardia in vasovagal event | **If alarming** |
| `bio_monitor.spo2_pct` | Hypotension impairing tissue perfusion | **If alarming** |
| `thermo_mini.core_body_temp_c` | Fever + hypotension → possible septic shock | **If alarming** |
| `oura_ring.hrv_ms` | Autonomic context | **Context** |

#### Recommended actions

**At Caution (SBP < 90):**
1. Move to a lying position with legs slightly elevated if safe in the current gravity environment.
2. Increase oral fluid intake if conscious and able to swallow.
3. Check HR and SpO₂ — if both are alarming simultaneously, escalate to §5.6 protocol.
4. Notify Flight Surgeon with BP, HR, SpO₂, posture history, and any recent dehydration or exertion.

**At Warning / Emergency (SBP < 80):**
1. Apply §5.6 Cardiovascular Decompensation protocol if HR or SpO₂ are also alarming.
2. Administer IV or oral fluids per onboard medical protocol.
3. Avoid all rapid posture changes.
4. Notify Flight Surgeon immediately.
5. If SBP falls below 70 or consciousness is lost, follow emergency cardiovascular protocol.

---

### 5.6 Cardiovascular Decompensation

**Alert title:** "Cardiovascular decompensation risk"  
**Plain-language gloss:** "Multiple cardiovascular signs are abnormal simultaneously. Immediate assessment is needed."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Emergency | `bio_monitor.heart_rate_bpm` > 120 AND `bio_monitor.systolic_mmhg` < 90 AND `bio_monitor.spo2_pct` < 94 | Act immediately — life-threatening pattern; do not wait for ground contact |

*This label does not have a Caution or Warning single-parameter trigger. It fires only when all three conditions are simultaneously true, regardless of which individual display tier each parameter is in.*

**Clinical significance:** Tachycardia + hypotension + desaturation is the cardiovascular decompensation pattern. Possible causes: significant dehydration, septic shock, haemorrhage, severe anaphylaxis, or cardiac event. Any of these causes requires immediate intervention.

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.heart_rate_bpm` | Part of composite trigger | **Always** |
| `bio_monitor.systolic_mmhg` | Part of composite trigger | **Always** |
| `bio_monitor.spo2_pct` | Part of composite trigger | **Always** |
| `bio_monitor.diastolic_mmhg` | Paired BP value | **Always** |
| `bio_monitor.breathing_rate_bpm` | Respiratory compensation pattern | **Always** |
| `thermo_mini.core_body_temp_c` | Differentiates septic shock (fever present) from other causes | **Always** |
| `bio_monitor.ecg_rhythm` | Cardiac rhythm context | **Always** |
| `oura_ring.hrv_ms` | Autonomic state | **Context** |

#### Recommended actions

**At Emergency (all three conditions met):**
1. Lay the crew member flat immediately; elevate legs if gravity allows.
2. Administer IV or oral fluids for suspected dehydration or haemorrhage — per onboard medical protocol.
3. Apply supplemental O₂ if SpO₂ is below 92%.
4. Initiate continuous monitoring of HR, BP, SpO₂, and RR at maximum frequency.
5. Check core body temperature to differentiate septic shock (fever present) from haemorrhagic or cardiogenic cause.
6. Notify Flight Surgeon simultaneously with resuscitation — provide all vital signs in one transmission.
7. Prepare emergency medication kit; await Flight Surgeon guidance for pharmacological intervention.
8. If no improvement within 10 minutes of initial treatment, escalate to full emergency medical protocol.

> **[Proposal — implemented]** This composite rule was proposed by AI and accepted. It is evaluated in `backend/alerts.py` (`_evaluate_cardiovascular_decompensation()`), commit `212858e`.

---

### 5.7 Fever — systemic infection risk

**Alert title:** "Fever — possible infection"  
**Plain-language gloss:** "Your body temperature is elevated. This may indicate your body is fighting an infection."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `thermo_mini.core_body_temp_c` > 37.5 | Monitor closely + report to Flight Surgeon at next scheduled contact |
| Warning | `thermo_mini.core_body_temp_c` > 38.0 | Act immediately + simultaneously notify Flight Surgeon |

*Default label when core temp exceeds threshold. Distinguish from §5.8b Hyperthermia (heat stress) by checking supporting parameters: if HR > 100 or RR > 18 or HRV is depressed, infection is more likely.*

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `thermo_mini.core_body_temp_c` | Primary trigger | **Always** |
| `bio_monitor.heart_rate_bpm` | Fever-driven tachycardia — strengthens infection diagnosis | **If alarming** |
| `bio_monitor.breathing_rate_bpm` | Tachypnoea from fever or infection | **If alarming** |
| `oura_ring.hrv_ms` | Infection depresses HRV as immune system consumes autonomic resources | **Context** |
| `oura_ring.body_temp_deviation_c` | Multi-day trend confirms sustained fever vs. transient spike | **Always** |
| `environmental.mission_cumulative_dose_msv` | High cumulative dose attenuates immune response — increases infection risk | **Context** |
| `evarm.personal_cumulative_msv` | Per-crew radiation context | **Context** |

#### Recommended actions

**At Caution (temp > 37.5 °C):**
1. Confirm measurement with a second reading after 5 minutes to rule out sensor transient.
2. Assess for associated symptoms: ask about headache, chills, muscle pain, sore throat, cough, or localised pain.
3. Check HR and RR — fever-driven tachycardia and tachypnoea strengthen the infection diagnosis.
4. Increase fluid intake to compensate for fever-related fluid loss.
5. Report to Flight Surgeon at next scheduled contact with temperature, HR, RR, SpO₂, symptom history, and radiation dose context.

**At Warning (temp > 38.0 °C):**
1. Administer antipyretic (e.g., paracetamol/acetaminophen) per onboard medical protocol — do not wait for ground contact.
2. Notify Flight Surgeon simultaneously with treatment.
3. Apply all Caution actions above with immediate priority.
4. Isolate the crew member from food preparation duties until infection is ruled out.
5. If temperature exceeds 39.0 °C or the crew member is confused or unable to function, escalate to emergency medical protocol.

---

### 5.8a Hypothermia — low body temperature

**Alert title:** "Hypothermia risk (body temperature low)"  
**Plain-language gloss:** "Your core body temperature is below normal. Check cabin temperature and warm up."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `thermo_mini.core_body_temp_c` < 36.0 | Monitor closely + report to Flight Surgeon at next scheduled contact |
| Warning | `thermo_mini.core_body_temp_c` < 35.0 | Act immediately + simultaneously notify Flight Surgeon |

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `thermo_mini.core_body_temp_c` | Primary trigger | **Always** |
| `environmental.cabin_temp_c` | Environmental contribution — if cabin also alarming, environmental cause is likely | **If alarming** |
| `oura_ring.body_temp_deviation_c` | Persistent deviation confirms trend rather than transient spike | **Always** |
| `bio_monitor.heart_rate_bpm` | Bradycardia with hypothermia indicates cardiovascular risk | **If alarming** |
| `bio_monitor.skin_temp_c` | Directional surface indicator (not clinically equivalent to core temp) | **Context** |
| `environmental.cabin_humidity_pct` | High humidity reduces evaporative warming efficiency | **Context** |

#### Recommended actions

**At Caution (temp < 36.0 °C):**
1. Check cabin temperature — if below 19 °C, initiate habitat thermal recovery.
2. Provide additional insulation (clothing, blankets) and move to the warmest area of the habitat.
3. Administer warm oral fluids if the crew member is conscious and can swallow safely.
4. Monitor HR — bradycardia with hypothermia indicates cardiovascular risk; escalate if HR < 45 bpm.
5. Report to Flight Surgeon at next scheduled contact with core temperature, cabin temperature, HR, and symptom description.

**At Warning (temp < 35.0 °C):**
1. Begin active rewarming immediately — do not wait for ground contact.
2. Notify Flight Surgeon simultaneously with rewarming.
3. Apply all Caution actions above with immediate priority.
4. If temperature falls below 34 °C or the crew member loses consciousness, follow emergency hypothermia protocol.

---

### 5.8b Hyperthermia — heat stress

**Alert title:** "Hyperthermia (heat stress)"  
**Plain-language gloss:** "Your core body temperature is elevated without signs of infection. Reduce workload and cool down."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `thermo_mini.core_body_temp_c` > 37.5 AND `bio_monitor.heart_rate_bpm` ≤ 100 AND `bio_monitor.breathing_rate_bpm` ≤ 18 | Monitor closely + report to Flight Surgeon at next scheduled contact |
| Warning | `thermo_mini.core_body_temp_c` > 38.0 AND `bio_monitor.heart_rate_bpm` ≤ 100 AND `bio_monitor.breathing_rate_bpm` ≤ 18 | Act immediately + simultaneously notify Flight Surgeon |

*Fever/heat-stress disambiguation: if `bio_monitor.heart_rate_bpm` > 100 OR `bio_monitor.breathing_rate_bpm` > 18 accompanies the elevated temperature, fire §5.7 Fever alert instead of this entry. The HR ≤ 100 and RR ≤ 18 thresholds are sub-Caution disambiguation values used only for label selection — they are not additional PARAM_LIMITS entries and do not independently trigger alerts.*

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `thermo_mini.core_body_temp_c` | Primary trigger | **Always** |
| `environmental.cabin_temp_c` | Environmental heat source | **If alarming** |
| `bio_monitor.heart_rate_bpm` | Rule out infection-driven tachycardia | **Always** |
| `bio_monitor.breathing_rate_bpm` | Rule out infection-driven tachypnoea | **Always** |
| `oura_ring.body_temp_deviation_c` | Multi-day trend — sustained elevation suggests infection over heat stress | **Always** |
| `environmental.cabin_humidity_pct` | High humidity reduces evaporative cooling | **If alarming** |

#### Recommended actions

**At Caution:**
1. Reduce cabin temperature and increase air circulation.
2. Cease all physical activity and move to the coolest available area of the habitat.
3. Provide oral rehydration.
4. Monitor core temp every 5 minutes; if declining, continue conservative management.
5. If HR or RR becomes elevated, switch to §5.7 Fever protocol.

**At Warning:**
1. Apply all Caution actions with immediate priority.
2. Notify Flight Surgeon immediately.
3. Apply cool wet cloth to neck and wrists if available.
4. If temperature does not decrease within 20 minutes or exceeds 38.5 °C, escalate to §5.7 Fever protocol.

---

### 5.9a Tachypnoea — fast breathing rate

**Alert title:** "Tachypnoea (fast breathing rate)"  
**Plain-language gloss:** "Your breathing rate is higher than normal. This may be a response to CO₂, low oxygen, or physical or emotional stress."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.breathing_rate_bpm` > 20, scenario ≠ EXERCISE | Notify Flight Surgeon |
| Warning | `bio_monitor.breathing_rate_bpm` > 24 | Act immediately |

*Caution suppressed when scenario tag is EXERCISE — elevated RR is expected during physical exertion. Warning tier (> 24) is never suppressed.*

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.breathing_rate_bpm` | Primary trigger | **Always** |
| `bio_monitor.spo2_pct` | Low SpO₂ can drive tachypnoea | **If alarming** |
| `environmental.cabin_co2_mmhg` | Elevated CO₂ is a primary respiratory drive stimulus | **If alarming** |
| `personal_co2.current_ppm` | Breath-zone CO₂ stimulus | **If alarming** |
| `thermo_mini.core_body_temp_c` | Fever drives tachypnoea | **If alarming** |
| `bio_monitor.heart_rate_bpm` | HR-RR coupling helps distinguish exertion from pathology | **If alarming** |
| `bio_monitor.tidal_volume_l` | Combined RR + tidal volume determines minute ventilation | **Context** |

#### Recommended actions

**At Caution (RR > 20 at rest):**
1. Identify likely cause: check SpO₂ (hypoxia → §5.1), cabin CO₂ (hypercapnia → §5.2), core temp (fever → §5.7), and HR (cardiovascular load → §5.3).
2. Address the primary driver using the corresponding protocol.
3. If no environmental or systemic cause is identified, assess for pain or acute psychological stress.
4. Have the crew member sit upright in a position of comfort.
5. Notify Flight Surgeon with RR value, SpO₂, cabin CO₂, HR, and any associated symptoms.

**At Warning (RR > 24):**
1. Apply all Caution actions with immediate priority.
2. If RR exceeds 30 or the crew member cannot speak in full sentences, treat as respiratory emergency.
3. Apply supplemental O₂ if SpO₂ is below 94%.
4. Notify Flight Surgeon immediately.

---

### 5.9b Bradypnoea — slow breathing rate

**Alert title:** "Bradypnoea (slow breathing rate)"  
**Plain-language gloss:** "Your breathing rate is lower than normal. At rest, this warrants assessment."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `bio_monitor.breathing_rate_bpm` < 10 | Notify Flight Surgeon |
| Warning | `bio_monitor.breathing_rate_bpm` < 8 | Act immediately |

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `bio_monitor.breathing_rate_bpm` | Primary trigger | **Always** |
| `bio_monitor.spo2_pct` | Bradypnoea risks hypoxaemia via inadequate ventilation | **Always** |
| `bio_monitor.tidal_volume_l` | Low tidal volume + low RR is the most dangerous combination | **Always** |
| `bio_monitor.heart_rate_bpm` | HR-RR coupling | **If alarming** |
| `thermo_mini.core_body_temp_c` | Hypothermia can suppress respiratory drive | **If alarming** |

#### Recommended actions

**At Caution (RR < 10):**
1. Stimulate the crew member verbally — confirm level of consciousness and responsiveness.
2. Check SpO₂ immediately; if below 94%, initiate supplemental O₂.
3. Check for any pharmacological cause (recent sedative or analgesic administration).
4. Position the crew member to optimise airway patency.
5. Notify Flight Surgeon with RR, SpO₂, level of consciousness, and any recent medication history.

**At Warning (RR < 8):**
1. Apply all Caution actions with immediate priority.
2. If the crew member is unresponsive, initiate airway management protocol immediately.
3. Notify Flight Surgeon simultaneously.
4. If RR falls below 6, follow emergency airway protocol.

---

### 5.10 Cognitive Performance Risk

**Alert title:** "Cognitive performance risk"  
**Plain-language gloss:** "Multiple factors affecting brain performance are elevated. Judgment and reaction time may be impaired."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | Combination A: `fatigue_score` < 70 AND `sleep_score` < 70 | Monitor closely |
| Caution | Combination B: (`fatigue_score` < 70 OR `sleep_score` < 70) AND (`bio_monitor.spo2_pct` < 94 OR `environmental.cabin_co2_mmhg` > 6 OR `personal_co2.current_ppm` > 1 000) | Monitor closely |
| Warning | (`fatigue_score` < 60 OR `sleep_score` < 60) AND (`bio_monitor.spo2_pct` < 94 OR `environmental.cabin_co2_mmhg` > 6 OR `personal_co2.current_ppm` > 1 000) | Monitor closely + report to Flight Surgeon at next scheduled contact |

*This label does not escalate to Act immediately — cognitive performance risk is a slow-onset, non-acute condition. The crew may not perceive their own impairment (documented in `1_problemstatement.md`); the alert serves as an external check on self-assessment.*

*Combination A fires when both score dimensions are degraded. Combination B fires when at least one score is degraded and a concurrent physiological or environmental stressor compounds it. A single score below threshold without any other condition does not trigger this alert — the score's own Caution label (in the score detail panel) is sufficient.*

*This composite condition does **not** appear in the Alerts panel — it is score-derived, and score-derived conditions surface exclusively in the score detail panel (see §4.7). When Combination A or B is met, the Fatigue Score and/or Sleep Score cards display the corresponding advice in their detail panels. No Alerts panel entry is generated.*

> **Implementation decision — not implemented:** The trigger logic defined in this section is **design knowledge only** and is not implemented in the current software. The core reason is architectural: this trigger requires Synthesized Scores (`fatigue_score`, `sleep_score`) to act as intermediate parameters feeding into a further trigger calculation. Allowing scores to become inputs to alert logic introduces a second layer of derived computation on top of already-composite values, significantly increasing system complexity and making it harder to trace why an alert fired back to a raw sensor reading. The current software maintains a strict **Parameter → Symptom** relationship — only raw device parameters (from wearable and environmental sensors) serve as trigger inputs. Introducing score-derived triggers would break this invariant. This section is retained as a design reference for future consideration, but should not be implemented without explicit architectural review.

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| Fatigue Score | Primary composite input | **Always** |
| Sleep Score | Primary composite input | **Always** |
| `bio_monitor.spo2_pct` | Hypoxia compounds cognitive degradation | **If alarming** |
| `environmental.cabin_co2_mmhg` | CO₂ reduces alertness before causing obvious distress | **If alarming** |
| `personal_co2.current_ppm` | Breath-zone CO₂ contributing to cognitive load | **If alarming** |
| `oura_ring.hrv_ms` | Autonomic recovery marker | **Context** |
| `bio_monitor.breathing_rate_bpm` | Concurrent respiratory stress | **If alarming** |

#### Recommended actions

**At Caution / Warning (all tiers):**
1. Review the scheduled task list — defer or reassign any task classified as high-criticality or requiring fine motor precision until scores recover.
2. Address the most tractable contributing factor first: if CO₂ is elevated, apply §5.2 actions; if SpO₂ is low, apply §5.1 actions.
3. Prioritise sleep opportunity in the next duty cycle — enforce rest if operationally possible.
4. Reduce non-essential workload and environmental stressors (noise, bright light, time pressure).
5. Increase check-in frequency with the affected crew member during any high-attention tasks that cannot be deferred.
6. Report to Flight Surgeon at next scheduled contact with Fatigue Score, Sleep Score, CO₂ levels, and scheduled task criticality for the next 8 hours.
7. Reassess scores after one full sleep cycle; if both remain below threshold, request extended rest period.

---

### 5.11 Radiation Exposure — cumulative dose milestone

**Alert title:** "Cumulative radiation dose — monitoring milestone reached"  
**Plain-language gloss:** "Your total radiation exposure has reached a planning threshold. No immediate symptoms expected, but remaining dose budget should be reviewed."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `environmental.mission_cumulative_dose_msv` > 50 | Monitor closely |
| Warning | `environmental.mission_cumulative_dose_msv` > 150 | Notify Flight Surgeon |

*Unlike other alerts, this one does not indicate acute impairment. The Warning tier warrants Flight Surgeon consultation for dose-budget review, not immediate medical intervention.*

> **[Proposal]** Add `evarm.personal_cumulative_msv` to `PARAM_LIMITS` with matching thresholds to enable per-crew dose alerts. Currently, personal dose is informational only.

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `environmental.mission_cumulative_dose_msv` | Primary trigger (mission-level shared dose) | **Always** |
| `evarm.personal_cumulative_msv` | Per-crew dose — may differ from mission average | **Always** |
| `evarm.dose_rate_usv_h` | Current exposure rate — how fast dose is accumulating | **Always** |
| `thermo_mini.core_body_temp_c` | High dose + fever = elevated infection risk; radiation attenuates immune response | **If alarming** |

#### Recommended actions

**At Caution (dose > 50 mSv):**
1. Review current dose rate (`evarm.dose_rate_usv_h`) — if currently elevated, move to a shielded area of the habitat.
2. Compare personal dose to mission average — if disproportionately high, review EVA and unshielded exposure history.
3. Report to Flight Surgeon at next scheduled contact with mission dose, personal dose, current dose rate, and remaining mission duration for dose budget projection.

**At Warning (dose > 150 mSv):**
1. Apply all Caution actions above.
2. Notify Flight Surgeon with mission dose, personal dose, current dose rate, and remaining mission duration.
3. Defer any non-essential EVA or high-exposure activity until dose budget has been reviewed.
4. If a fever or infection sign is present simultaneously (§5.7), escalate urgency — radiation-attenuated immunity increases infection risk.
5. Document the milestone in the crew health log for long-term follow-up.

---

### 5.12a Cabin Temperature Out of Range

**Alert title (hot):** "Cabin temperature — too warm"  
**Alert title (cold):** "Cabin temperature — too cold"  
**Plain-language gloss (hot):** "The cabin is warmer than the safe comfort range. Core body temperature and physical performance may be affected."  
**Plain-language gloss (cold):** "The cabin is cooler than the recommended range. Risk of thermal discomfort and impaired fine motor control."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `environmental.cabin_temp_c` < 19 OR > 26 | Monitor closely + report to Flight Surgeon at next scheduled contact |
| Warning | `environmental.cabin_temp_c` < 18 OR > 27 | Act immediately + simultaneously notify Flight Surgeon |

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `environmental.cabin_temp_c` | Primary trigger | **Always** |
| `thermo_mini.core_body_temp_c` | Individual thermal response to cabin environment | **Always** |
| `bio_monitor.skin_temp_c` | Directional surface temperature indicator | **Context** |
| `environmental.cabin_humidity_pct` | High humidity reduces evaporative cooling; combined with heat = compounded risk | **If alarming** |
| `personal_co2.current_ppm` | CO₂ accumulation in a hot, poorly ventilated space | **If alarming** |

#### Recommended actions

**At Caution (any direction):**
1. Adjust HVAC settings — activate cooling (hot) or heating (cold) system as appropriate.
2. Check all crew core temperatures for early signs of thermal stress (§5.7) or hypothermia (§5.8a).
3. Report to Flight Surgeon at next scheduled contact with cabin temperature and crew core temperature values.

**At Warning — Hot (> 27 °C):**
1. Immediately reduce heat-generating activities (exercise, high-power equipment).
2. Ensure all crew hydration — elevated temperature increases sweat loss.
3. Notify Flight Surgeon immediately.
4. Monitor crew core temperatures every 5 minutes until cabin temp normalises.

**At Warning — Cold (< 18 °C):**
1. Provide additional insulation to all crew members immediately.
2. Notify Flight Surgeon immediately.
3. Monitor crew core temperatures every 5 minutes; if any crew member's core temp falls below 36.0 °C, apply §5.8a protocol.

---

### 5.12b Cabin Humidity Out of Range

**Alert title (high):** "Cabin humidity — too high"  
**Alert title (low):** "Cabin humidity — too low"  
**Plain-language gloss (high):** "Cabin humidity is high. Risk of microbial growth and reduced thermoregulation."  
**Plain-language gloss (low):** "Cabin humidity is low. Mucosal dryness may reduce respiratory defences."

#### Trigger logic and urgency

| Tier | Trigger condition | Urgency |
| :--- | :--- | :--- |
| Caution | `environmental.cabin_humidity_pct` < 30 OR > 70 | Monitor closely + report to Flight Surgeon at next scheduled contact |
| Warning | `environmental.cabin_humidity_pct` < 25 OR > 75 | Act immediately + simultaneously notify Flight Surgeon |

#### Related parameters

| Parameter | Role | Show in alert detail |
| :--- | :--- | :--- |
| `environmental.cabin_humidity_pct` | Primary trigger | **Always** |
| `environmental.cabin_temp_c` | Combined thermal-humidity comfort; high humidity + high temp is compounded risk | **If alarming** |
| `thermo_mini.core_body_temp_c` | Individual thermal response | **If alarming** |
| `personal_co2.current_ppm` | Air quality in a humid, poorly ventilated environment | **Context** |

#### Recommended actions

**At Caution — High humidity (> 70%):**
1. Increase dehumidification and check moisture sources (condensation, water leaks).
2. Increase air circulation to prevent localised high-humidity zones where mould may develop.
3. Inspect food storage and medical supply areas for moisture damage.
4. Report to Flight Surgeon at next contact.

**At Caution — Low humidity (< 30%):**
1. Activate humidifier if available, or introduce a controlled moisture source.
2. Advise all crew to increase water intake to compensate for mucosal drying.
3. Monitor for upper respiratory symptoms — low humidity impairs mucosal defence.
4. Report to Flight Surgeon at next contact.

**At Warning (either direction):**
1. Apply all Caution actions immediately.
2. Notify Flight Surgeon immediately.
3. If respiratory symptoms are reported by any crew member, escalate monitoring frequency.

---

### Summary Table — Symptom Labels, Triggers, and Urgency

| # | Symptom label | Single-parameter trigger | Composite trigger | Urgency at Caution | Urgency at Warning | Urgency at Emergency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5.1 | Hypoxaemia | `spo2_pct` < 94% | SpO₂ < 92 + HR > 130 + RR > 20 | Notify FS | Act immediately | Act immediately → §5.6 |
| 5.2 | Hypercapnia | `cabin_co2` > 6 OR `personal_co2` > 1 000 | `cabin_co2` > 6 AND `personal_co2` > 1 000 simultaneously | Notify FS | Act immediately | Act immediately |
| 5.3 | Tachycardia | `heart_rate` > 120 (not Exercise) | — | Notify FS | Act immediately | — |
| 5.4 | Bradycardia | `heart_rate` < 45 | HR < 40 + SBP < 90 | Notify FS | Act immediately | Act immediately — see §5.6 actions |
| 5.5a | Hypertension | `systolic` > 160 | — | Notify FS | Act immediately | — |
| 5.5b | Hypotension | `systolic` < 90 | SBP < 90 + HR > 120 + SpO₂ < 94 | Notify FS | Act immediately | Act immediately → §5.6 |
| 5.6 | Cardiovascular decompensation | — | HR > 120 + SBP < 90 + SpO₂ < 94 | — | — | Act immediately |
| 5.7 | Fever / infection risk | `core_temp` > 37.5 | — | Monitor closely + report | Act immediately + notify FS | — |
| 5.8a | Hypothermia | `core_temp` < 36.0 | — | Monitor closely + report | Act immediately + notify FS | — |
| 5.8b | Hyperthermia (heat stress) | `core_temp` > 37.5 AND HR ≤ 100 AND RR ≤ 18 | — | Monitor closely + report | Act immediately + notify FS | — |
| 5.9a | Tachypnoea | `rr` > 20 (not Exercise) | — | Notify FS | Act immediately | — |
| 5.9b | Bradypnoea | `rr` < 10 | — | Notify FS | Act immediately | — |
| 5.10 | Cognitive performance risk *(score panel — not Alerts)* | — | Score(s) low + CO₂/SpO₂ at Caution | Monitor closely | Monitor closely + report | — |
| 5.11 | Radiation dose milestone | `mission_dose` > 50 mSv | Dose high + fever → escalate §5.7 | Monitor closely | Notify FS | — |
| 5.12a | Cabin temperature out of range | `cabin_temp` out of range | + crew core temp compounding risk | Monitor closely + report | Act immediately + notify FS | — |
| 5.12b | Cabin humidity out of range | `cabin_humidity` out of range | — | Monitor closely + report | Act immediately + notify FS | — |

---

## 6. Display Design Implications

This section captures the design direction that follows from the clinical mappings above. These are **[Proposal]** items unless otherwise indicated.

### 6.1 Alert Label Format

Each alert currently shows a parameter label and value. Proposed augmented format:

```
[TIER]      Symptom name — plain-language descriptor
            Value: X units  (threshold: Y)
            Urgency: [Act immediately / Notify Flight Surgeon / Monitor closely]
            → Brief clinical context (1 sentence)
```

Example:
```
[WARNING]   Hypoxaemia (low blood oxygen)
            SpO₂: 91.2%  (warning threshold: < 92%)
            Urgency: Act immediately
            → Oxygen saturation is significantly below normal; cognitive and
              physical performance are likely impaired.
```

### 6.2 Alert Detail Panel — Parameter Display Policy

When a crew member clicks an alert, the detail view shows parameters according to the following rules (decided — see §1):

- **Always** entries are shown regardless of their current alarm state.
- **If alarming** entries are shown only when that parameter is also currently in Caution or Warning.
- **Context** entries are not shown in the crew-facing detail view.

This policy (previously Option A) minimises cognitive load and maximises action-orientation in high-stress moments. The per-parameter display rules are defined in the "Show in alert detail" column of each §5 symptom entry.

### 6.3 Condition Name Display

The condition name (e.g., *Hypercapnia*, *Tachycardia*) should be shown in plain language alongside the medical term, particularly for crew-facing views:

- *"Tachycardia (fast heart rate)"*
- *"Hypoxaemia (low blood oxygen)"*
- *"Hypercapnia (high CO₂ — affects breathing and thinking)"*

The medical term preserves precision for communication with the flight surgeon; the plain-language gloss supports crew self-assessment.

### 6.4 Score Alarm Detail Bridging

When a score card alarm is triggered, the score detail panel should display the advice text defined in §4.7 before showing the sensor rows. This bridges the gap between the numeric score and a crew-level understanding of what it means physiologically and operationally.

---

*This document shall be updated when new alarm-triggering parameters are added to `PARAM_LIMITS`, when composite trigger rules are implemented, when score display behavior changes, or when user testing produces evidence about which detail view option better supports crew performance.*

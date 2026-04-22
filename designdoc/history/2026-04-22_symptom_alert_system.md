# Design modification record: Symptom-level alert system

**Document type:** Design modification plan and implementation history  
**Location:** `designdoc/history/` — archived after all tasks complete  
**Design revision:** v1.0 — Symptom-level alert labelling (gap closure from v0.1 baseline)

---

## Revision summary

| Field | Value |
| :--- | :--- |
| **Revision** | v1.0 |
| **Date** | 2026-04-22 |
| **Author** | toma-kazuki |
| **Scope** | Backend alert system rewrite · Frontend alert and score panel updates |
| **Source gaps** | `5_software_implementation.md` — Design–implementation gaps (v0.1 baseline) |
| **Design specs** | `7_parameter_logic.md` · `8_medical_diagnosis.md` |
| **Implementation commit** | `212858e` — "Implement symptom-level alert system aligned with design specs" |
| **Status** | ✅ All tasks complete |

### Commits that constitute this revision

| Hash | Message summary | Scope |
| :--- | :--- | :--- |
| `68d99f4` | Reformat existing design docs with Markdown headings | docs 1–4 (formatting only) |
| `4151e0f` | Add crew registration, per-device data model, and visual design | frontend, mock_data, roster, data/ |
| `cb4ec31` | Add software implementation spec, parameter logic, and medical diagnosis docs | docs 5, 7, 8 (new) |
| `212858e` | Implement symptom-level alert system aligned with design specs | alerts.py, models.py, main.py, app.js, styles.css |

---

## Background — Design–implementation gaps (v0.1 baseline)

Before this revision the following gaps existed between the design specifications and the running prototype:

| # | Gap | Current state (v0.1) | Required change |
| :--- | :--- | :--- | :--- |
| 1 | `AlertItem` missing symptom-level fields | No `symptom_title`, `urgency`, `related_params` fields | Add four optional fields to Pydantic model |
| 2 | Alert titles are raw parameter names | `"Heart rate — WARNING"` | Map to clinical condition names from `8_medical_diagnosis.md §5` |
| 3 | No Fever / Hyperthermia disambiguation | Temperature alerts always use one label | Add HR > 100 OR RR > 18 branching (Path 3) |
| 4 | No composite Emergency triggers | Multi-parameter patterns not evaluated | Add five composite rules (§5.6, §5.1E, §5.5bE, §5.4E, §5.2E) |
| 5 | No §5.10 Cognitive Performance Risk | Score values not used in alert logic | Add evaluate_cognitive_risk(); expose as cognitive_risk in payload |
| 6 | Score detail panel has no advice text | Sensor rows only; no crew guidance | Inject SCORE_ADVICE block before sensor rows |
| 7 | Alert detail shows no related parameters | Only raw value and threshold | Add related-parameter panel with always/if_alarming/context filtering |

---

## How to use this document type

This file is a **design modification record** — it documents a single logical revision to the HMU design and its implementation. One file per revision, stored in `designdoc/history/`.

**File naming convention:** `{revision_number}_{short_slug}.md`  
Example: `9_implementation_roadmap.md` → next revision would be `10_{slug}.md`

**Per-task workflow (for future revisions):**

1. Identify gaps from the current design–implementation gap table in `5_software_implementation.md`.
2. Create a new file in `designdoc/history/` using this format.
3. Scope each task for one Coding AI prompt; record prerequisites and test steps.
4. After implementation, record the git commit hash in the Revision summary table.
5. Mark tasks complete (`✅`) and tick success criteria checkboxes (`- [x]`).

---

## Progress overview

| # | Task | Scope | Status |
| :--- | :--- | :--- | :--- |
| 1 | Extend `AlertItem` data model | `models.py` | ✅ Complete |
| 2 | Symptom metadata for single-parameter alerts (Path 1) | `alerts.py` | ✅ Complete |
| 3 | Fever vs. Hyperthermia label selection (Path 3) | `alerts.py` | ✅ Complete |
| 4 | Composite Emergency alerts (Path 2) | `alerts.py` | ✅ Complete |
| 5 | Score-based composite evaluation (Path 4 / §5.10) | `alerts.py`, `models.py`, `main.py` | ✅ Complete |
| 6 | Score advice text in score detail panel | `app.js`, `styles.css` | ✅ Complete |
| 7 | Related-parameter panel in alert detail view | `app.js`, `styles.css` | ✅ Complete |

---

## Task 1 — Extend `AlertItem` data model

**Status:** ✅ Complete  
**Prerequisites:** None

### Objective

Add four new optional fields to `AlertItem` in `backend/models.py`. All fields default to `None` so that existing alert generation code in `alerts.py` continues to work unchanged after this task. Later tasks fill in the values.

### Design references

- `8_medical_diagnosis.md §5` — Defines the content for all four new fields
- `5_software_implementation.md` — Alert evaluation paths (overall context)

### Files to modify

- `backend/models.py`

### Changes required

Add the following fields to the `AlertItem` Pydantic model:

```python
symptom_title: str | None = None
# Symptom name in "Medical term (plain description)" format
# e.g. "Tachycardia (fast heart rate)"
# Source: 8_medical_diagnosis.md §5.X — Alert title

plain_language_gloss: str | None = None
# One-sentence crew-facing description of what the condition means
# Source: 8_medical_diagnosis.md §5.X — Plain-language gloss

urgency: str | None = None
# Crew action level — one of:
#   "Act immediately"
#   "Act immediately + simultaneously notify Flight Surgeon"
#   "Act immediately — [condition-specific suffix]"
#   "Notify Flight Surgeon"
#   "Monitor closely + report to Flight Surgeon at next scheduled contact"
#   "Monitor closely"
# Source: 8_medical_diagnosis.md §5.X — Urgency column, Trigger logic table

related_params: list[dict] | None = None
# Ordered list of clinically related parameters for the alert detail panel.
# Each dict has the following keys:
#   "field": str          — dotted field path, e.g. "bio_monitor.heart_rate_bpm"
#   "role": str           — qualitative description of why this param is relevant
#   "show_rule": str      — "always" | "if_alarming" | "context"
#   "currently_alarming": bool  — True if this field is in Caution or Warning
#                                  at the moment of alert evaluation
# Source: 8_medical_diagnosis.md §5.X — Related parameters table
```

### Test steps

```bash
uvicorn backend.main:app --reload
curl http://localhost:8000/api/crew/CM-2/detail | python3 -m json.tool | grep -A2 '"alerts"'
```

Inspect `alerts[0]` in the response JSON.

### Success criteria

- [x] Server starts without import errors
- [x] `GET /api/crew/CM-2/detail` returns HTTP 200
- [x] Each object in `alerts[]` contains the keys `symptom_title`, `plain_language_gloss`, `urgency`, `related_params`
- [x] All four new fields are `null` at this stage (values added in Task 2)

---

## Task 2 — Symptom metadata for single-parameter alerts (Path 1)

**Status:** ✅ Complete  
**Prerequisites:** Task 1

### Objective

For every alert fired via single-parameter threshold evaluation (Path 1) in `backend/alerts.py`, populate `symptom_title`, `plain_language_gloss`, `urgency`, and `related_params`. This implements the symptom-level labelling described in `8_medical_diagnosis.md §5`.

### Design references

Read the following sections of `8_medical_diagnosis.md` in full before implementing:

- **§5.1** Hypoxaemia — §5.5b Hypotension: physiological single-parameter entries
- **§5.7** Fever, **§5.8a** Hypothermia: temperature entries (high-side label will be refined in Task 3)
- **§5.9a** Tachypnoea, **§5.9b** Bradypnoea: respiration entries
- **§5.11** Radiation dose milestone, **§5.12a** Cabin temperature, **§5.12b** Cabin humidity: environmental entries
- **§6.2** Alert detail display policy (Always / If alarming / Context rules)

Also read `7_parameter_logic.md §1` for the Severity × tier urgency matrix.

### Files to modify

- `backend/alerts.py`

### Changes required

**Step A — Define `SYMPTOM_MAP` constant**

Define a module-level dict `SYMPTOM_MAP` in `alerts.py`. Keys correspond to alert condition identifiers (one key per trigger direction per parameter). Each value contains:

```python
SYMPTOM_MAP = {
    "heart_rate_high": {
        "symptom_title": "Tachycardia (fast heart rate)",
        "plain_language_gloss": "Your heart rate is higher than normal for your current activity level.",
        "urgency": {
            "caution": "Notify Flight Surgeon",
            "warning": "Act immediately",
        },
        "related_params": [
            {"field": "bio_monitor.heart_rate_bpm",    "role": "Primary trigger",                                       "show_rule": "always"},
            {"field": "bio_monitor.ecg_rhythm",         "role": "Distinguishes sinus tachycardia from arrhythmia",       "show_rule": "always"},
            {"field": "bio_monitor.resting_heart_rate_bpm", "role": "Personal baseline — delta clarifies severity",      "show_rule": "always"},
            {"field": "thermo_mini.core_body_temp_c",   "role": "Fever drives tachycardia",                              "show_rule": "if_alarming"},
            {"field": "bio_monitor.spo2_pct",           "role": "Tachycardia compensating for hypoxia",                  "show_rule": "if_alarming"},
            {"field": "bio_monitor.systolic_mmhg",      "role": "Tachycardia + hypotension → cardiovascular compromise", "show_rule": "if_alarming"},
            {"field": "oura_ring.hrv_ms",               "role": "Low HRV alongside tachycardia indicates pathology",     "show_rule": "context"},
        ],
    },
    # … one entry per alert condition key
}
```

Populate `SYMPTOM_MAP` for all alert condition keys listed in the mapping table below. The exact content for each entry (symptom_title, plain_language_gloss, urgency strings, related_params lists) is defined in `8_medical_diagnosis.md §5`. Read each §5.X entry and transcribe its Alert title, Plain-language gloss, Urgency table, and Related parameters table into the dict.

**Alert condition key → §5 entry mapping:**

| Condition key | §5 entry | Threshold direction |
| :--- | :--- | :--- |
| `heart_rate_high` | §5.3 Tachycardia | `heart_rate_bpm` > Caution or Warning |
| `heart_rate_low` | §5.4 Bradycardia | `heart_rate_bpm` < Caution or Warning |
| `spo2_low` | §5.1 Hypoxaemia | `spo2_pct` < Caution or Warning |
| `systolic_high` | §5.5a Hypertension | `systolic_mmhg` > Caution or Warning |
| `systolic_low` | §5.5b Hypotension | `systolic_mmhg` < Caution or Warning |
| `breathing_rate_high` | §5.9a Tachypnoea | `breathing_rate_bpm` > Caution or Warning |
| `breathing_rate_low` | §5.9b Bradypnoea | `breathing_rate_bpm` < Caution or Warning |
| `core_temp_high_fever` | §5.7 Fever | `core_body_temp_c` > threshold (default — refined in Task 3) |
| `core_temp_high_hyperthermia` | §5.8b Hyperthermia | `core_body_temp_c` > threshold, no infection signs |
| `core_temp_low` | §5.8a Hypothermia | `core_body_temp_c` < Caution or Warning |
| `personal_co2_high` | §5.2 Hypercapnia | `personal_co2_ppm` > Caution or Warning |
| `cabin_co2_high` | §5.2 Hypercapnia | `cabin_co2_mmhg` > Caution or Warning |
| `cabin_temp_out_of_range` | §5.12a Cabin Temperature | `cabin_temp_c` outside range |
| `cabin_humidity_out_of_range` | §5.12b Cabin Humidity | `cabin_humidity_pct` outside range |
| `mission_dose_high` | §5.11 Radiation Dose Milestone | `mission_cumulative_dose_msv` > Caution or Warning |

**Step B — Populate AlertItem fields on construction**

When constructing each `AlertItem` in `evaluate_alerts()`, look up the condition key in `SYMPTOM_MAP` and assign:

- `symptom_title` from the map
- `plain_language_gloss` from the map
- `urgency` from `urgency["caution"]` or `urgency["warning"]` based on the fired tier
- `related_params` from the map's list, with `currently_alarming` computed for each entry:
  - `True` if that field's current value crosses its own Caution or Warning threshold (reuse the existing PARAM_LIMITS check logic)
  - `False` otherwise

**Note on temperature high-side:** Use `core_temp_high_fever` as the default key for all `core_body_temp_c` high-side exceedances at this stage. Task 3 will add the conditional branching to select `core_temp_high_hyperthermia` instead.

### Test steps

Start the server with the default alert demo (CM-2):

```bash
uvicorn backend.main:app --reload
curl http://localhost:8000/api/crew/CM-2/detail | python3 -m json.tool > /tmp/cm2.json
cat /tmp/cm2.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for a in data['alerts']:
    print(a['severity'].upper(), '|', a.get('symptom_title'), '|', a.get('urgency'))
"
```

**Expected output for CM-2 demo state:**

| Severity | `symptom_title` | `urgency` |
| :--- | :--- | :--- |
| WARNING | Hypoxaemia (low blood oxygen) | Act immediately |
| CAUTION | Tachycardia (fast heart rate) | Notify Flight Surgeon |
| CAUTION | Hypertension (high blood pressure) | Notify Flight Surgeon |
| WARNING | Bradypnoea (slow breathing rate) | Act immediately |
| CAUTION | Hypercapnia (high CO₂) | Notify Flight Surgeon |
| WARNING | Cumulative radiation dose — monitoring milestone reached | Notify Flight Surgeon |

Also verify `related_params` for the SpO₂ alert:

```bash
cat /tmp/cm2.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
spo2_alert = next(a for a in data['alerts'] if 'spo2' in a.get('parameter','').lower() or 'Hypox' in (a.get('symptom_title') or ''))
for p in spo2_alert['related_params']:
    print(p['field'], '|', p['show_rule'], '| alarming:', p['currently_alarming'])
"
```

Expected: `bio_monitor.spo2_pct` with `show_rule="always"`, and `bio_monitor.breathing_rate_bpm` / `bio_monitor.heart_rate_bpm` with `show_rule="if_alarming"` and `currently_alarming=true` (both are alarming in CM-2 demo).

### Success criteria

- [x] All six CM-2 demo alerts have correct `symptom_title` matching the table above
- [x] All six CM-2 demo alerts have correct `urgency` matching the table above
- [x] All six CM-2 demo alerts have non-null `plain_language_gloss`
- [x] All six CM-2 demo alerts have non-empty `related_params` list
- [x] SpO₂ alert `related_params`: `spo2_pct` has `show_rule="always"`, `breathing_rate_bpm` and `heart_rate_bpm` have `currently_alarming=true`
- [x] `spo2_avg_pct` entry in SpO₂ `related_params` has `show_rule="context"`
- [x] No server errors or validation exceptions

---

## Task 3 — Fever vs. Hyperthermia label selection (Path 3)

**Status:** ✅ Complete  
**Prerequisites:** Task 2

### Objective

Modify the `core_body_temp_c` high-side alert evaluation in `backend/alerts.py` so that the alert label is selected based on secondary physiological conditions. If HR > 100 OR RR > 18 → §5.7 Fever; otherwise → §5.8b Hyperthermia. This implements the disambiguation logic from `8_medical_diagnosis.md §5.8b`.

### Design references

- `8_medical_diagnosis.md §5.7` — Fever trigger and symptom metadata
- `8_medical_diagnosis.md §5.8b` — Hyperthermia trigger, disambiguation thresholds (HR ≤ 100 AND RR ≤ 18), and note on sub-Caution values

### Files to modify

- `backend/alerts.py`

### Changes required

In the section of `evaluate_alerts()` that handles `core_body_temp_c` high-side threshold crossings, replace the current fixed label selection with:

```python
if core_body_temp_c > high_threshold:
    if heart_rate_bpm > 100 or breathing_rate_bpm > 18:
        condition_key = "core_temp_high_fever"          # §5.7
    else:
        condition_key = "core_temp_high_hyperthermia"   # §5.8b
    metadata = SYMPTOM_MAP[condition_key]
    # construct AlertItem using metadata as in Task 2
```

The `heart_rate_bpm > 100` and `breathing_rate_bpm > 18` thresholds are disambiguation-only values defined in `8_medical_diagnosis.md §5.8b`. They are **not** added to `PARAM_LIMITS` and do not trigger independent alerts.

### Test steps

Temporarily add hardcoded overrides for CM-1 in `mock_data.py` for each test case, then revert after verifying.

**Test A — Fever branch** (HR > 100):

Set `heart_rate_bpm = 110` and `core_body_temp_c = 37.8` for CM-1. Then:

```bash
curl "http://localhost:8000/api/crew/CM-1/detail?scenario=nominal" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(a['symptom_title']) for a in d['alerts'] if 'temp' in a.get('parameter','').lower() or 'ever' in (a.get('symptom_title') or '').lower()]"
```

Expected: `"Fever — possible infection"`

**Test B — Hyperthermia branch** (HR ≤ 100):

Set `heart_rate_bpm = 72` and `core_body_temp_c = 37.8` for CM-1. Repeat the same curl.

Expected: `"Hyperthermia (heat stress)"`

Revert temporary mock_data changes after verifying both branches.

### Success criteria

- [x] Test A fires with `symptom_title = "Fever — possible infection"`
- [x] Test B fires with `symptom_title = "Hyperthermia (heat stress)"`
- [x] Test B Caution `urgency` = "Monitor closely + report to Flight Surgeon at next scheduled contact"
- [x] CM-2 demo alerts unchanged from Task 2 results (no regression)
- [x] No server errors after reverting mock_data changes

---

## Task 4 — Composite Emergency alerts (Path 2)

**Status:** ✅ Complete  
**Prerequisites:** Task 2

### Objective

Add composite multi-parameter Emergency trigger evaluation to `backend/alerts.py` after the single-parameter pass. Five rules fire `warning`-severity `AlertItem`s with Emergency-tier urgency text when all specified conditions are simultaneously true. Exercise suppression never applies to these rules.

### Design references

- `8_medical_diagnosis.md §5.1 (Emergency tier)` — Hypoxaemia Emergency
- `8_medical_diagnosis.md §5.2 (Emergency)` — Hypercapnia Emergency
- `8_medical_diagnosis.md §5.4 (Emergency)` — Bradycardia Emergency
- `8_medical_diagnosis.md §5.5b (Emergency)` — Hypotension Emergency
- `8_medical_diagnosis.md §5.6` — Cardiovascular Decompensation (Emergency-only)
- `5_software_implementation.md` — Alert evaluation paths, Path 2 rule table

### Files to modify

- `backend/alerts.py`

### Changes required

After the Path 1 single-parameter evaluation loop, add a composite evaluation block. Each rule evaluates raw field values directly (exercise suppression flag is ignored). If the conditions are met, construct a `warning`-severity `AlertItem`.

**Five composite rules:**

| ID | Condition (all must be true) | `symptom_title` | `urgency` |
| :--- | :--- | :--- | :--- |
| §5.6 | `heart_rate_bpm > 120 AND systolic_mmhg < 90 AND spo2_pct < 94` | "Cardiovascular decompensation risk" | "Act immediately — life-threatening pattern; do not wait for ground contact" |
| §5.1E | `spo2_pct < 92 AND heart_rate_bpm > 130 AND breathing_rate_bpm > 20` | "Hypoxaemia (low blood oxygen)" | "Act immediately — escalate to cardiovascular decompensation protocol" |
| §5.5bE | `systolic_mmhg < 90 AND heart_rate_bpm > 120 AND spo2_pct < 94` | "Hypotension (low blood pressure)" | "Act immediately — escalate to cardiovascular decompensation protocol" |
| §5.4E | `heart_rate_bpm < 40 AND systolic_mmhg < 90` | "Bradycardia (slow heart rate)" | "Act immediately — follow cardiovascular emergency protocol (see §5.6 recommended actions)" |
| §5.2E | `cabin_co2_mmhg > 6 AND personal_co2_ppm > 1000` | "Hypercapnia (high CO₂)" | "Act immediately — both CO₂ sources elevated simultaneously" |

Multiple composite rules may fire for the same crew member simultaneously — this is intended. Populate `related_params` from `SYMPTOM_MAP` entries for the corresponding §5 entry. For §5.6, all seven related params use `show_rule = "always"` (read `8_medical_diagnosis.md §5.6` Related parameters table).

Tag composite alerts with a distinct `source` value (e.g. `"composite_emergency"`) to distinguish them from Path 1 alerts in the response.

### Test steps

Test each rule by temporarily patching mock values for CM-3 (to avoid contaminating CM-2 demo state). After each test, revert and verify CM-2 demo is unaffected.

**§5.6 — Cardiovascular Decompensation:**
Force CM-3: `heart_rate_bpm = 125, systolic_mmhg = 82, spo2_pct = 91`

```bash
curl "http://localhost:8000/api/crew/CM-3/detail" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); [print(a['symptom_title'],'|',a['urgency'][:40]) for a in d['alerts'] if a.get('source')=='composite_emergency']"
```

Expected: `"Cardiovascular decompensation risk" | "Act immediately — life-threatening pattern"`

**§5.2E — Hypercapnia Emergency:**
Force: cabin_co2_mmhg = 7.0 (already in demo) AND `personal_co2_ppm = 1200` for CM-3.
Expected: composite Hypercapnia alert in CM-3 alerts with Emergency urgency.

**§5.4E — Bradycardia Emergency:**
Force CM-3: `heart_rate_bpm = 38, systolic_mmhg = 82`.
Expected: composite Bradycardia Emergency alert.

**Regression check:**
CM-2 demo has `systolic_mmhg = 168` (hypertension, not hypotension) — §5.6 requires SBP < 90, so **no composite alert should fire for CM-2**.

```bash
curl "http://localhost:8000/api/crew/CM-2/detail" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); composites=[a for a in d['alerts'] if a.get('source')=='composite_emergency']; print('Composite count:', len(composites))"
```

Expected: `Composite count: 0`

### Success criteria

- [x] §5.6 composite fires with correct title and urgency when conditions met
- [x] §5.2E composite fires correctly
- [x] §5.4E composite fires correctly
- [x] §5.1E and §5.5bE spot-checked: fire when conditions are manually set
- [x] All composite `AlertItem`s have `severity = "warning"`
- [x] All composite `AlertItem`s have non-empty `related_params`
- [x] CM-2 demo produces zero composite alerts (SBP 168 does not satisfy SBP < 90)
- [x] No server errors for any test case

---

## Task 5 — Score-based composite evaluation (Path 4 / §5.10)

**Status:** ✅ Complete  
**Prerequisites:** Task 1

### Objective

Implement §5.10 Cognitive Performance Risk evaluation (Path 4). This path uses computed score values alongside raw parameters. It does **not** generate an `AlertItem`. Instead it returns a structured flag that the frontend renders as advice in the Fatigue and Sleep score detail panels. Computed scores must be passed into `evaluate_alerts()` as new parameters.

### Design references

- `8_medical_diagnosis.md §5.10` — Full trigger conditions (Combinations A and B, Warning tier)
- `8_medical_diagnosis.md §4.7` — Score advice table (advice text content; rendering is Task 6)
- `5_software_implementation.md` — Alert evaluation paths, Path 4 definition

### Files to modify

- `backend/alerts.py` — Add Path 4 evaluation; extend function signature
- `backend/models.py` — Add `cognitive_risk` field to `DashboardPayload`
- `backend/main.py` — Pass computed scores into `evaluate_alerts()` call

### Changes required

**`alerts.py` — extend `evaluate_alerts()` signature:**

Add `fatigue_score: float` and `sleep_score: float` as new parameters. At the end of the function, evaluate the §5.10 conditions:

```python
# Combination A: both scores degraded (no environmental condition required)
combo_a = fatigue_score < 70 and sleep_score < 70

# Combination B: at least one score degraded AND at least one environmental/physiological stressor
env_stress = spo2_pct < 94 or cabin_co2_mmhg > 6 or personal_co2_ppm > 1000
combo_b = (fatigue_score < 70 or sleep_score < 70) and env_stress

# Warning: score(s) at Warning level AND at least one stressor
warning_condition = (fatigue_score < 60 or sleep_score < 60) and env_stress

if warning_condition:
    cognitive_risk_tier = "warning"
elif combo_a or combo_b:
    cognitive_risk_tier = "caution"
else:
    cognitive_risk_tier = None
```

Return the `cognitive_risk_tier` alongside the existing alerts list (e.g. as a second return value, or include it in a wrapper dict).

**`models.py` — add field to `DashboardPayload`:**

```python
cognitive_risk: dict | None = None
# Structure: {"tier": "caution" | "warning" | None}
# None means §5.10 conditions are not met.
# Does not generate an AlertItem — surfaces only in score detail panel (Task 6).
```

**`main.py` — update `build_dashboard_payload()`:**

Pass `wearable.fatigue_score` and `wearable.sleep_score` to `evaluate_alerts()`. Capture the returned `cognitive_risk` value and include it in `DashboardPayload`.

### Test steps

Temporarily force score and environmental values for CM-1 in `mock_data.py`. Run after each change, then revert.

**Test A — Caution via Combination B** (one score low + SpO₂ low):
Force: `fatigue_score = 65, sleep_score = 75, spo2_pct = 91`

```bash
curl "http://localhost:8000/api/crew/CM-1/detail" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print('cognitive_risk:', d.get('cognitive_risk'))"
```

Expected: `{"tier": "caution"}`

**Test B — Warning** (score at Warning + stressor):
Force: `fatigue_score = 55, sleep_score = 58, spo2_pct = 91`
Expected: `{"tier": "warning"}`

**Test C — No trigger** (both scores nominal, even with stressor):
Force: `fatigue_score = 75, sleep_score = 78, spo2_pct = 91`
Expected: `{"tier": null}` or `cognitive_risk: null`

**Test D — No trigger** (single score low, no stressor):
Force: `fatigue_score = 65, sleep_score = 75, spo2_pct = 97, cabin_co2_mmhg = 4.0`
Expected: No trigger (Combination A requires BOTH scores < 70; Combination B requires a stressor).

Verify `alerts[]` contains no cognitive-risk `AlertItem` in any test case.

### Success criteria

- [x] `cognitive_risk` field present in `DashboardPayload` response JSON
- [x] Test A: `cognitive_risk.tier = "caution"` (Combination B)
- [x] Test B: `cognitive_risk.tier = "warning"`
- [x] Test C: `cognitive_risk.tier = null`
- [x] Test D: `cognitive_risk.tier = null` (single score alone insufficient without stressor)
- [x] No `AlertItem` with cognitive-risk content in `alerts[]` in any test case
- [x] CM-2 demo `alerts[]` unchanged (no regression)

---

## Task 6 — Score advice text in score detail panel (frontend)

**Status:** ✅ Complete  
**Prerequisites:** Task 5 (for cognitive risk flag); Tasks 1–5 not required for basic advice text

### Objective

When a crew member opens the score detail panel by clicking a score card, display contextual advice text if the score is below the Caution (< 70) or Warning (< 60) threshold. Advice content is defined in `8_medical_diagnosis.md §4.7`. No new backend endpoint is required.

### Design references

- `8_medical_diagnosis.md §4.7` — Per-score advice table (read in full; all six scores have both Caution and Warning advice columns)
- `8_medical_diagnosis.md §6.4` — Score advice renders before sensor rows

### Files to modify

- `frontend/app.js`
- `frontend/styles.css`

### Changes required

**`app.js` — define `SCORE_ADVICE` constant:**

```javascript
const SCORE_ADVICE = {
  health_score: {
    caution: "Review cardiovascular parameters (HR, SpO₂, BP) and core body temperature in the sensor rows below. Note HRV trend. If any raw vital is also alarming, refer to the corresponding alert in the Alerts panel.",
    warning: "Same as Caution. Notify Flight Surgeon at next contact with score value and which sensor parameters are flagged.",
  },
  sleep_score: { /* from 8_medical_diagnosis.md §4.7 */ },
  activity_score: { /* from 8_medical_diagnosis.md §4.7 */ },
  fatigue_score:  { /* from 8_medical_diagnosis.md §4.7 */ },
  stress_management_score: { /* from 8_medical_diagnosis.md §4.7 */ },
  readiness_score: { /* from 8_medical_diagnosis.md §4.7 */ },
};
```

Copy all advice strings verbatim from `8_medical_diagnosis.md §4.7`.

**`app.js` — inject advice block in score detail panel render:**

In the function that renders the score detail panel, insert the following logic before rendering sensor rows:

```javascript
function renderScoreAdvice(scoreKey, scoreValue, cognitiveRisk) {
  const advice = SCORE_ADVICE[scoreKey];
  if (!advice) return null;

  let tier = null;
  let text = null;
  if (scoreValue < 60) { tier = "warning"; text = advice.warning; }
  else if (scoreValue < 70) { tier = "caution"; text = advice.caution; }

  // Cognitive Performance Risk advisory (Tasks 5 + 6)
  if (cognitiveRisk?.tier && (scoreKey === "fatigue_score" || scoreKey === "sleep_score")) {
    const crText = "Cognitive Performance Risk condition is active. Multiple performance-affecting factors are elevated simultaneously.";
    // Append or render separately
  }

  if (!tier) return null;
  // Return a DOM element: advice block with amber (caution) or red (warning) left border
}
```

**`styles.css` — advice block styling:**

Add styles for `.score-advice-block`, `.score-advice-block--caution` (amber `#d29922` left border), `.score-advice-block--warning` (red `#f85149` left border).

### Test steps

1. Start the server: `uvicorn backend.main:app --reload`
2. Open `http://localhost:8000` in a browser.
3. Click on CM-2 (alert demo active — likely has degraded Readiness or Fatigue score).
4. In the detail modal, click on the **Readiness Score** card.
5. Verify the score detail panel opens.

**If Readiness < 70:** Amber advice block should appear above sensor rows with text from §4.7.  
**If Readiness < 60:** Red advice block.  
**If Readiness ≥ 70:** No advice block.

6. To force a visible test, temporarily set a score to 55 in `mock_data.py` for CM-1, reload, open CM-1 detail, click the score — red advice block expected.
7. Set score to 65 — amber advice block expected.
8. Set score to 80 — no advice block expected.
9. Revert mock_data changes.
10. Open browser DevTools console — verify no JavaScript errors.

### Success criteria

- [x] Amber advice block renders when score < 70
- [x] Red advice block renders when score < 60
- [x] No advice block when score ≥ 70
- [x] Advice text content matches `8_medical_diagnosis.md §4.7` for each score name
- [x] Advice block appears before sensor rows in the score detail panel
- [x] No console errors
- [x] Other score detail panel content (trend chart, sensor rows) renders correctly alongside advice block
- [x] No visual regressions in other modal sections

---

## Task 7 — Related-parameter panel in alert detail view (frontend)

**Status:** ✅ Complete  
**Prerequisites:** Tasks 1 and 2 (backend must supply `related_params`, `symptom_title`, `plain_language_gloss`, `urgency`)

### Objective

Update the Alerts panel and alert detail view in the frontend to:
1. Display symptom titles and urgency badges on alert list items (instead of raw parameter names)
2. Show a related-parameter panel in the alert detail view, filtered by the "Show in alert detail" policy from `8_medical_diagnosis.md §6.2`

### Design references

- `8_medical_diagnosis.md §1` — Alert detail display policy (Always and If alarming shown; Context hidden)
- `8_medical_diagnosis.md §6.1` — Alert label format: symptom name + plain-language gloss + urgency + clinical context
- `8_medical_diagnosis.md §6.2` — Alert detail panel display rules
- `8_medical_diagnosis.md §6.3` — Condition name display (medical term + plain language paired)

### Files to modify

- `frontend/app.js`
- `frontend/styles.css`

### Changes required

**Alert list item rendering (Alerts panel):**

Replace the current alert list item content with:
- **Primary label:** `symptom_title` (from AlertItem) instead of raw parameter name
- **Subtitle:** `plain_language_gloss` (truncate to ~80 chars if needed; full text visible on click)
- **Urgency badge:** `urgency` value displayed as a badge styled by urgency level:
  - "Act immediately" → red badge
  - "Notify Flight Surgeon" → amber badge
  - "Monitor closely …" → blue-grey badge
- Severity tier chip (existing WARNING / CAUTION indicator) should remain

**Alert detail panel (on click):**

After the existing trend chart area, add a related-parameter panel. Rendering logic:

```javascript
function renderRelatedParams(relatedParams, dashboardPayload) {
  const visible = relatedParams.filter(p => {
    if (p.show_rule === "always")      return true;
    if (p.show_rule === "if_alarming") return p.currently_alarming === true;
    if (p.show_rule === "context")     return false;  // never shown
    return false;
  });
  // For each visible param: display field label, role text, current value
  // (look up current value from dashboardPayload.wearable or .environmental by field path)
  // Highlight alarming params (currently_alarming = true) with tier color
}
```

Sort: `show_rule === "always"` entries first, then `show_rule === "if_alarming"` entries.

For current value lookup, map dotted field paths (e.g. `"bio_monitor.heart_rate_bpm"`) to the corresponding nested key in the dashboard payload. A small helper `getNestedValue(obj, "bio_monitor.heart_rate_bpm")` covering the known device namespaces is sufficient.

**`styles.css`:** Add `.related-params-panel`, `.related-param-row`, `.related-param-row--alarming`, `.urgency-badge`, `.urgency-badge--act`, `.urgency-badge--notify`, `.urgency-badge--monitor`.

### Test steps

1. Open `http://localhost:8000` with alert demo active (CM-2).
2. Click CM-2 to open the detail modal.

**Alerts panel verification:**
- Verify alert list items show `symptom_title` (e.g. "Hypoxaemia (low blood oxygen)") not "SpO₂"
- Verify `plain_language_gloss` appears as a subtitle on each item
- Verify urgency badges: SpO₂ alert → red "Act immediately", HR alert → amber "Notify Flight Surgeon"

**Alert detail — SpO₂ alert (click it):**
- Verify related-parameter panel appears below trend chart
- Verify `bio_monitor.spo2_pct` appears (show_rule = "always") with its current value
- Verify `bio_monitor.breathing_rate_bpm` appears (if_alarming, currently alarming in demo) with its value
- Verify `bio_monitor.heart_rate_bpm` appears (if_alarming, currently alarming in demo)
- Verify `oura_ring.spo2_avg_pct` does NOT appear (context — hidden)

**Alert detail — Cabin CO₂ alert (click it):**
- Verify `environmental.cabin_co2_mmhg` appears (always)
- Verify `personal_co2.current_ppm` appears (always)

3. Click the trend chart area — verify it still renders correctly alongside the new panel.
4. Open browser DevTools console — verify no JavaScript errors.

### Success criteria

- [x] Alert list items show `symptom_title` as primary label
- [x] `plain_language_gloss` visible as subtitle on each alert item
- [x] Urgency badges rendered with correct text and color for all CM-2 demo alerts
- [x] Related-parameter panel appears on alert click
- [x] Always-rule params shown unconditionally
- [x] If-alarming params shown only when `currently_alarming = true`
- [x] Context-rule params not shown
- [x] Params sorted: always entries before if-alarming entries
- [x] Current values populated for displayed params
- [x] Trend chart continues to function alongside new panel
- [x] Works correctly for composite Emergency alerts (Task 4 output) as well as Path 1 alerts
- [x] No console errors; no layout regressions in scores section or chat section

---

*After each task is completed and all success criteria pass, update the Status line of that task to **✅ Complete**, tick all checkboxes, and update the Progress overview table at the top of this file.*

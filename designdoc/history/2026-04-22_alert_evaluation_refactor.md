# Design modification record: Alert evaluation architecture refactor

**Document type:** Design modification plan and implementation history  
**Location:** `designdoc/history/` — archived after all tasks complete  
**Design revision:** v1.1 — Alert evaluation architecture refactor (gap closure from v1.0)

---

## Revision summary

| Field | Value |
| :--- | :--- |
| **Revision** | v1.1 |
| **Date** | 2026-04-22 |
| **Author** | toma-kazuki |
| **Scope** | Backend alert evaluation rewrite (`alerts.py`) |
| **Source gaps** | v1.0 implementation — structural defects discovered during QA |
| **Design specs** | `8_medical_diagnosis.md §5` |
| **Implementation commit** | *(see below)* |
| **Status** | ✅ Complete |

### Commits that constitute this revision

| Hash | Message summary | Scope |
| :--- | :--- | :--- |
| *(pending — commit after record update)* | Refactor alert evaluation to symptom-unit architecture | `alerts.py` |

---

## Background — Structural defects in v1.0 alert evaluation

The v1.0 implementation (`212858e`) split alert evaluation into two independent sequential passes:

- **PATH 1** — Single-parameter threshold scan: iterates over every measurable parameter and fires an `AlertItem` for each threshold breach.
- **PATH 2** — Composite Emergency scan: a second pass over the same telemetry data that fires additional `AlertItem`s when multi-parameter AND conditions are met.

This structure caused a **duplicate alert defect** that was discovered during QA:

### Root cause of the defect

`8_medical_diagnosis.md §5.2` defines the Hypercapnia Emergency trigger as:

> *"Emergency | `cabin_co2_mmhg` > 6 AND `personal_co2_ppm` > 1 000 | Act immediately — both CO₂ sources elevated simultaneously; severity upgraded one tier"*

The phrase **"severity upgraded one tier"** expresses a single judgment: when both sources are simultaneously elevated, the existing Caution becomes an Emergency. It is not a new independent event to be appended alongside the Caution.

However, in the PATH 1 / PATH 2 architecture:

- PATH 1 evaluated `(cabin_co2 > 6 OR personal_co2 > 1000)` → fired `co2-caut` (Caution)
- PATH 2 evaluated `(cabin_co2 > 6 AND personal_co2 > 1000)` → fired `composite-co2-emerg` (Warning/Emergency)

Since the Emergency AND-condition is a strict subset of the Caution OR-condition, both passes fired simultaneously whenever the Emergency condition was met — producing two "Hypercapnia" alerts.

The defect was patched post-hoc with a suppression flag (`_co2_both_caut`), but this is symptomatic of the underlying architectural problem. §5.2 is not a special case; it reveals that the PATH 1 / PATH 2 separation is structurally wrong for any symptom whose Emergency tier is defined as a severity upgrade of its Caution tier.

### Why PATH 1 / PATH 2 is the wrong abstraction

The two-pass model implies that "single-parameter" and "composite" alerts are independent events that can co-exist. For cardiovascular composite alerts (§5.6, §5.1E, §5.5bE, §5.4E) this is accidentally tolerable because the composites produce different `symptom_title` values from the underlying PATH 1 alerts. But it is conceptually wrong in all cases: **the design does not define more alerts when more conditions are met — it defines a higher tier for the same symptom**.

The correct model, expressed in `8_medical_diagnosis.md §5` for every symptom, is:

```
For symptom X:
  Evaluate all available conditions (single-parameter AND composite)
  Select the highest matching tier (Emergency > Warning > Caution > none)
  Fire exactly one AlertItem, or none
```

### Symptoms affected

Currently all symptoms except §5.2 Hypercapnia happen to avoid visible duplication because their PATH 2 composites carry different `symptom_title` values. However the architecture remains fragile: any future symptom whose Emergency tier is a severity upgrade (not a new condition) will reproduce the §5.2 defect.

---

## How to use this document type

This file is a **design modification record** — it documents a single logical revision to the HMU design and its implementation. One file per revision, stored in `designdoc/history/`.

**File naming convention:** `YYYY-MM-DD_{short_slug}.md`  
Example: `2026-04-22_symptom_alert_system.md` → next revision: `2026-04-22_alert_evaluation_refactor.md`

**Per-task workflow (for future revisions):**

1. Identify gaps from the current design–implementation gap table in `5_software_implementation.md`.
2. Create a new file in `designdoc/history/` using this format.
3. Scope each task for one Coding AI prompt; record prerequisites and test steps.
4. After implementation, record the git commit hash in the Revision summary table.
5. Mark tasks complete (✅) and tick success criteria checkboxes (`- [x]`).

---

## Progress overview

| # | Task | Scope | Status |
| :--- | :--- | :--- | :--- |
| 1 | Replace PATH 1 / PATH 2 with symptom-unit evaluation functions | `alerts.py` | ✅ Complete |
| 2 | Remove suppression flags and post-hoc patches | `alerts.py` | ✅ Complete |
| 3 | Verify no regression against v1.0 alert outputs | `alerts.py`, manual QA | ✅ Complete |

---

## Task 1 — Replace PATH 1 / PATH 2 with symptom-unit evaluation functions

**Status:** ✅ Complete  
**Prerequisites:** None

### Objective

Rewrite `evaluate_alerts()` in `backend/alerts.py` so that alert evaluation is organised by **symptom** rather than by evaluation pass. Each symptom is evaluated exactly once, producing zero or one `AlertItem`. The PATH 1 / PATH 2 split is eliminated entirely.

### Design references

- `8_medical_diagnosis.md §5` — All symptom entries; each §5.X section defines the full tier hierarchy for one symptom (Caution → Warning → Emergency)
- `8_medical_diagnosis.md §5.2` — The canonical example of a severity-upgrade Emergency tier; drives the architectural change

### Concept

Replace the current two-pass structure with a helper per symptom (or inline block), each following this pattern:

```python
def _evaluate_<symptom>(...)  -> AlertItem | None:
    # Evaluate conditions from highest to lowest tier
    if <emergency_condition>:
        return _make_alert(..., tier="emergency", ...)
    if <warning_condition>:
        return _make_alert(..., tier="warning", ...)
    if <caution_condition>:
        return _make_alert(..., tier="caution", ...)
    return None
```

`evaluate_alerts()` becomes:

```python
def evaluate_alerts(...) -> list[AlertItem]:
    alerts = []
    for fn in [
        lambda: _evaluate_hypoxaemia(...),
        lambda: _evaluate_hypercapnia(...),
        lambda: _evaluate_tachycardia_bradycardia(...),
        lambda: _evaluate_blood_pressure(...),
        lambda: _evaluate_core_temp(...),
        lambda: _evaluate_breathing_rate(...),
        lambda: _evaluate_radiation(...),
        lambda: _evaluate_cabin_temp(...),
        lambda: _evaluate_cabin_humidity(...),
        lambda: _evaluate_cardiovascular_decompensation(...),
    ]:
        result = fn()
        if result is not None:
            alerts.append(result)
    return sorted(alerts, key=lambda a: severity_order[a.severity])
```

### Symptom evaluation rules

The table below maps each symptom to its full tier hierarchy as defined in `8_medical_diagnosis.md §5`. Implement conditions from highest tier to lowest; return on first match.

| Symptom function | Emergency condition | Warning condition | Caution condition | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `_evaluate_hypoxaemia` | SpO₂ < 92 AND HR > 130 AND RR > 20 | SpO₂ < 92 | SpO₂ < 94 | Emergency → §5.1E urgency |
| `_evaluate_hypercapnia` | cabin > 6 AND personal > 1000 (IVA only for cabin) | cabin > 8 OR personal > 2500 | cabin > 6 OR personal > 1000 | §5.2; single AlertItem always |
| `_evaluate_tachycardia` | — | HR > 130 | HR > 120, scenario ≠ exercise | §5.3; mutually exclusive with bradycardia |
| `_evaluate_bradycardia` | HR < 40 AND SBP < 90 | HR < 40 | HR < 45 | §5.4; call only when not tachycardia |
| `_evaluate_hypertension` | — | SBP > 170 | SBP > 160 | §5.5a; mutually exclusive with hypotension |
| `_evaluate_hypotension` | SBP < 90 AND HR > 120 AND SpO₂ < 94 | SBP < 80 | SBP < 90 | §5.5b; call only when not hypertension |
| `_evaluate_cardiovascular_decompensation` | HR > 120 AND SBP < 90 AND SpO₂ < 94 | — | — | §5.6; Emergency-only |
| `_evaluate_core_temp` | — | core > 38.0 or < 35.0 | core > 37.5 or < 36.0 | §5.7/5.8a/5.8b; label selected by HR/RR disambiguation |
| `_evaluate_breathing_rate` | — | RR > 24 or < 8 | RR > 20 (not exercise) or < 10 | §5.9a/5.9b |
| `_evaluate_radiation` | — | dose > 150 | dose > 50 | §5.11 |
| `_evaluate_cabin_temp` | — | temp > 27 or < 18 | temp > 26 or < 19 | §5.12a; IVA only |
| `_evaluate_cabin_humidity` | — | humidity > 75 or < 25 | humidity > 70 or < 30 | §5.12b; IVA only |

**Notes on mutually exclusive pairs:**

- Tachycardia and Bradycardia share the HR parameter. Evaluate Tachycardia first; evaluate Bradycardia only when Tachycardia returns `None`.
- Hypertension and Hypotension share the SBP parameter. Evaluate Hypertension first; evaluate Hypotension only when Hypertension returns `None`.
- Cardiovascular Decompensation (§5.6) overlaps with Hypotension Emergency (§5.5bE) in conditions. Evaluate §5.6 independently — it is a distinct clinical label, not a severity upgrade of Hypotension.

**Note on `_evaluate_hypercapnia` source fields:**

When the Emergency tier fires, set `source`, `parameter`, and `value` to reflect both CO₂ sources. When only one source is active, reflect that source only. This replaces the previous `_co2_both_caut` suppression flag entirely.

### Files to modify

- `backend/alerts.py`

### Changes required

1. Delete the existing PATH 1 and PATH 2 blocks inside `evaluate_alerts()`.
2. Delete the `_co2_both_caut` suppression flag (no longer needed).
3. Add one evaluation function per symptom following the pattern above.
4. Replace the body of `evaluate_alerts()` with a call sequence over these functions.
5. Retain `SYMPTOM_MAP`, `_make_alert()`, `_is_alarming()`, `_build_related_params()` — these are unchanged.
6. Retain `evaluate_cognitive_risk()` — it is separate from `evaluate_alerts()` and unchanged.
7. Retain the sensor integrity alert block at the end of `evaluate_alerts()` — it is structural, not symptom-based, and does not need to change.

### Test steps

After implementation, run the following checks. No mock data changes are required; use the existing alert demo (CM-2).

**Check 1 — Baseline CM-2 alert count and titles:**

```bash
curl -s "http://localhost:8000/api/crew/CM-2/detail?scenario=nominal" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'Total alerts: {len(d[\"alerts\"])}')
for a in d['alerts']:
    print(f'  [{a[\"severity\"]:8}] {a.get(\"symptom_title\") or a[\"title\"]}')
"
```

Expected (same as v1.0 output, 6 alerts):

| Severity | Symptom title |
| :--- | :--- |
| warning | Hypoxaemia (low blood oxygen) |
| warning | Bradypnoea (slow breathing rate) |
| warning | Cumulative radiation dose — monitoring milestone reached |
| caution | Hypercapnia (high CO₂) |
| caution | Tachycardia (fast heart rate) |
| caution | Hypertension (high blood pressure) |

**Check 2 — No duplicate symptom titles:**

```bash
curl -s "http://localhost:8000/api/crew/CM-2/detail?scenario=nominal" | python3 -c "
import json, sys
d = json.load(sys.stdin)
titles = [a.get('symptom_title') or a['title'] for a in d['alerts']]
dupes = [t for t in titles if titles.count(t) > 1]
print('Duplicates:', dupes if dupes else 'none')
"
```

Expected: `Duplicates: none`

**Check 3 — Hypercapnia: single-source Caution (cabin only):**

Demo has cabin CO₂ = 7.5 mmHg and personal CO₂ ≈ 900 ppm (below 1000). Expect 1 × Caution.

```bash
curl -s "http://localhost:8000/api/crew/CM-2/detail?scenario=nominal" | python3 -c "
import json, sys
d = json.load(sys.stdin)
co2 = [a for a in d['alerts'] if 'CO' in (a.get('symptom_title') or '')]
print(f'CO2 alerts: {len(co2)}, tier: {co2[0][\"severity\"] if co2 else \"none\"}')
"
```

Expected: `CO2 alerts: 1, tier: caution`

**Check 4 — Hypercapnia: both-source Emergency (stress scenario raises personal CO₂):**

```bash
curl -s "http://localhost:8000/api/crew/CM-2/detail?scenario=stress" | python3 -c "
import json, sys
d = json.load(sys.stdin)
co2 = [a for a in d['alerts'] if 'CO' in (a.get('symptom_title') or '')]
print(f'CO2 alerts: {len(co2)}, tier: {co2[0][\"severity\"] if co2 else \"none\"}, id: {co2[0][\"id\"] if co2 else \"-\"}')
print(f'personal_co2: {d[\"devices\"][\"personal_co2\"][\"current_ppm\"]} ppm')
"
```

Expected: `CO2 alerts: 1` with `id` containing `emerg` or `composite`, severity `warning`.  
If personal CO₂ < 1000 in this run, the check is inconclusive — re-run until > 1000 is observed, or temporarily override the mock value.

**Check 5 — No composite_emergency source tag in responses (source tag is no longer meaningful):**

With the symptom-unit architecture, the `source` field reflects the actual sensor, not the evaluation path. Verify there are no alerts with `source = "composite_emergency"` that are not Emergency-tier.

```bash
curl -s "http://localhost:8000/api/crew/CM-2/detail?scenario=nominal" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for a in d['alerts']:
    print(a['id'], a['severity'], a.get('source',''))
"
```

**Check 6 — Server starts without errors:**

```bash
uvicorn backend.main:app --reload
curl -s http://localhost:8000/api/health
```

Expected: `{"status": "ok", "service": "hmu-prototype"}`

### Success criteria

- [x] Server starts without import or validation errors
- [x] CM-2 demo produces exactly 6 alerts matching the table in Check 1
- [x] No duplicate `symptom_title` values in any crew member's alert list
- [x] Hypercapnia: exactly 1 alert regardless of whether one or both CO₂ sources are active
- [x] Hypercapnia Emergency fires (1 alert, warning severity) when both sources exceed Caution simultaneously
- [x] `_co2_both_caut` suppression flag is absent from the codebase
- [x] PATH 1 / PATH 2 comments are absent from the codebase
- [x] `evaluate_cognitive_risk()` is unchanged and still returns correct output
- [x] Sensor integrity alerts still appear when integrity status is not "ok"
- [ ] No JavaScript errors in the browser (frontend is unchanged — not verified in this session)

---

## Task 2 — Remove suppression flags and post-hoc patches

**Status:** ✅ Complete  
**Prerequisites:** Task 1

### Objective

After Task 1 replaces the evaluation architecture, confirm that all suppression flags and post-hoc patches introduced to work around the PATH 1 / PATH 2 defect have been removed. This task is primarily a code-review and cleanup step.

### Files to review

- `backend/alerts.py`

### Changes required

Verify the following are absent after Task 1:

1. `_co2_both_caut` variable (introduced as a patch in v1.0 QA)
2. Any comment referencing "PATH 1" or "PATH 2" as structural labels
3. Any `if … and not …` suppression constructs that gate PATH 1 alerts based on PATH 2 conditions

If any of these remain, remove them.

### Success criteria

- [x] `grep -n "_co2_both_caut" backend/alerts.py` returns no results
- [x] `grep -n "PATH 1\|PATH 2" backend/alerts.py` returns no results
- [x] No suppression flags of the form `and not _<condition>` in alert firing conditions

---

## Task 3 — Verify no regression against v1.0 alert outputs

**Status:** ✅ Complete  
**Prerequisites:** Tasks 1 and 2

### Objective

Confirm that the refactored alert evaluation produces identical outputs to the patched v1.0 implementation for all scenarios and all crew members. No functional behaviour change is intended by this revision — only architectural improvement.

### Test steps

Run the full crew × scenario matrix and compare alert titles and severities:

```bash
for crew in CM-1 CM-2 CM-3 CM-4; do
  for scenario in nominal exercise stress sleep; do
    echo "=== $crew / $scenario ==="
    curl -s "http://localhost:8000/api/crew/$crew/detail?scenario=$scenario" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for a in d['alerts']:
    print(f'  [{a[\"severity\"]:8}] {a.get(\"symptom_title\") or a[\"title\"]}  (id={a[\"id\"]})')
"
  done
done
```

Verify:

1. CM-2 nominal produces the 6 alerts listed in Task 1 Check 1
2. No scenario × crew combination produces duplicate `symptom_title` values
3. Exercise scenario suppresses Tachycardia Caution and Tachypnoea Caution for HR 120–130 and RR 20–24 ranges (exercise suppression still active)
4. EVA location (`?location=eva`) suppresses cabin CO₂ and cabin temperature alerts

### Success criteria

- [x] All 16 scenario × crew combinations complete without server error
- [x] No duplicate symptom titles in any combination
- [x] Exercise suppression working correctly for HR and RR Caution tiers
- [x] EVA location suppression working correctly for cabin environment alerts
- [x] CM-2 demo alert list matches the 6-alert expected output from Task 1

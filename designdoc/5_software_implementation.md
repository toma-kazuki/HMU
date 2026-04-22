# Software implementation

**Prototype v0.1 — HMU Crew Health Dashboard**

This document describes the actual software as built. It grows alongside the code; sections that have not yet been implemented are not included.

---

## Stack overview

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend | Python 3, FastAPI 0.115+ | Serves the REST API |
| Runtime server | Uvicorn (standard) | ASGI server |
| Data validation | Pydantic v2 | Request and response models |
| AI dialogue | OpenAI Python SDK 1.0+, GPT-4o | Conversational health assistant |
| Frontend | Plain HTML + CSS + vanilla JS | Served as static files by FastAPI |
| Charts | Chart.js 4.4.6 (CDN) | Vitals time-series charts |
| Environment | python-dotenv | `api_key` loaded from `.env` |

---

## Repository layout

```
HMU/
├── backend/
│   ├── main.py          # FastAPI app, route definitions, startup
│   ├── models.py        # Pydantic request/response models
│   ├── alerts.py        # Alert evaluation logic
│   ├── mock_data.py     # Simulated wearable and environmental data
│   └── dialogue.py      # GPT-4o conversational endpoint
├── frontend/
│   ├── index.html       # Single-page application shell
│   ├── app.js           # All frontend logic (vanilla JS)
│   └── styles.css       # Styling
├── designdoc/           # Design documentation
├── .env                 # api_key=sk-... (not committed)
├── .env.example         # Template for .env
└── requirements.txt     # Python dependencies
```

---

## Backend

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check; returns `{"status": "ok"}` |
| `GET` | `/api/overview` | Aggregated overview: all four crew members + shared environmental data |
| `GET` | `/api/crew/{crew_id}/detail` | Full dashboard payload for one crew member |
| `GET` | `/api/dashboard` | Alias for detail; accepts `crew_id`, `scenario`, and `location` (activity status; see below) |
| `POST` | `/api/settings/mode` | Toggle Ground-Supported Mode (demo override) |
| `POST` | `/api/settings/degraded-demo` | Enable/disable simulated sensor degradation |
| `POST` | `/dialogue/command` | Send a message to the GPT-4o health assistant |
| `POST` | `/dialogue/clear-history` | Clear session history for a given crew member |
| `GET` | `/` | Serves `frontend/index.html` |
| `GET` | `/assets/*` | Serves CSS, JS, and other static files |

### Activity status query parameters: `scenario` and `location`

The UI presents **activity status** as *activity profile* + *IVA/EVA*. The API keeps stable field names:

| Parameter | Meaning | Values |
|-----------|---------|--------|
| `scenario` | Activity profile (mock vitals / threshold context) | `nominal` (Rest), `exercise`, `stress`, `sleep` — default `nominal` |
| `location` | Pressure regime | `iva` (in habitat air) or `eva` (suited — e.g. habitat CO₂ alerts suppressed for the crew member) — default `iva` |

`GET /api/overview` returns each crew row with `scenario` and `location` so the overview crew card shows the same **«profile» · IVA or EVA** line as the crew-detail header.

### Query parameter: `scenario` (detail endpoints)

Detail and dashboard endpoints accept `scenario` (and `location` as above) to shift mock-data output.

| `scenario` value | Description |
|------------------|-------------|
| `nominal` | Baseline resting state (default) |
| `exercise` | Elevated heart rate, respiratory rate, activity |
| `stress` | Elevated stress indicators, elevated vitals |
| `sleep` | Suppressed motion, lower HR, sleep scoring active |

### Mock crew roster

Four simulated crew members are defined in `mock_data.py`:

| ID | Display name | Role |
|----|-------------|------|
| CM-1 | (as defined in code) | (as defined in code) |
| CM-2 | (as defined in code) | (as defined in code) |
| CM-3 | (as defined in code) | (as defined in code) |
| CM-4 | (as defined in code) | (as defined in code) |

### Operational modes (derived, not set manually except Ground-Supported)

| Mode | Trigger |
|------|---------|
| `nominal_monitoring` | No emergency or warning alerts; all sensors ok |
| `alert` | At least one emergency or warning alert is active |
| `degraded` | Sensor integrity is `stale` or `lost` |
| `ground_supported` | Manually toggled via `POST /api/settings/mode` |

### Simulated devices (per crew member)

Each `DashboardPayload` includes a `devices` object containing mock readings for the six named devices:

| Device key | Represented device |
|------------|--------------------|
| `bio_monitor` | Astroskin / Bio-Monitor smart garment |
| `oura_ring` | Oura Ring (recovery, HRV, sleep) |
| `thermo_mini` | Thermo-Mini core temperature sensor |
| `actiwatch` | Actiwatch Spectrum (activity, sleep, light) |
| `personal_co2` | Personal CO₂ exposure monitor |
| `evarm` | EVARM individual radiation dosimeter |

### Alert evaluation (`alerts.py`)

Alert severity levels follow the four-tier scheme from `3_requirements.md` (aligned with NASA-STD-3001 Vol. 2 Table 10.3-1):

| Severity | Enum value |
|----------|-----------|
| Emergency | `emergency` |
| Warning | `warning` |
| Caution | `caution` |
| Advisory | `advisory` |

Each `AlertItem` carries: `id`, `severity`, `title`, `message`, `source`, `parameter`, `value`, `threshold`.

#### Alert evaluation paths

Alert evaluation in `alerts.py` uses four distinct logic paths. Paths 2–4 are designed extensions; only Path 1 is fully implemented in v0.1.

**Path 1 — Single-parameter threshold (PARAM_LIMITS)**
Raw sensor field compared against a defined Caution or Warning threshold. Fires a `caution` or `warning` `AlertItem`. Exercise suppression applies here only — high-side Caution for `heart_rate_bpm` (> 120) and `breathing_rate_bpm` (> 20) is skipped when `scenario == "exercise"`. Warning thresholds are never suppressed.

**Path 2 — Composite Emergency (multi-parameter pattern)**
Evaluates combinations of raw fields independently of Path 1. Exercise suppression never applies. Fires a `warning`-class `AlertItem` with the Emergency urgency label. Rules to implement:

| Composite label | Trigger (all conditions must be true simultaneously) |
| :--- | :--- |
| Cardiovascular Decompensation (§5.6) | `heart_rate_bpm` > 120 AND `systolic_mmhg` < 90 AND `spo2_pct` < 94 |
| Hypoxaemia Emergency (§5.1) | `spo2_pct` < 92 AND `heart_rate_bpm` > 130 AND `breathing_rate_bpm` > 20 |
| Hypotension Emergency (§5.5b) | `systolic_mmhg` < 90 AND `heart_rate_bpm` > 120 AND `spo2_pct` < 94 |
| Bradycardia Emergency (§5.4) | `heart_rate_bpm` < 40 AND `systolic_mmhg` < 90 |
| Hypercapnia Emergency (§5.2) | `cabin_co2_mmhg` > 6 AND `personal_co2_ppm` > 1 000 |

Multiple composite alerts can fire simultaneously (e.g. §5.5b and §5.6 share the same three conditions and will both fire). This is intended — each conveys distinct clinical framing.

**Path 3 — Conditional label selection (§5.7 vs §5.8b)**
When `core_body_temp_c` exceeds its threshold, the alert label is determined by secondary conditions before firing:

```python
if core_body_temp_c > threshold:
    if heart_rate_bpm > 100 or breathing_rate_bpm > 18:
        label = "Fever — possible infection"     # §5.7
    else:
        label = "Hyperthermia (heat stress)"     # §5.8b
```

The HR > 100 / RR > 18 disambiguation thresholds are sub-Caution values used only for label selection. They are not PARAM_LIMITS entries and do not independently trigger alerts.

**Path 4 — Score-based composite (§5.10 — score detail panel only)**
§5.10 (Cognitive Performance Risk) uses computed score values (`fatigue_score`, `sleep_score`) alongside raw parameters. It does **not** produce an Alerts panel entry. When the composite condition is met, the advice text in the Fatigue Score and Sleep Score detail panels is escalated to Warning-level advisory. Score values must be available in the evaluator after they are computed, as additional inputs separate from the raw-parameter PARAM_LIMITS check. Full trigger conditions are defined in `8_medical_diagnosis.md §5.10`.

### Dialogue module (`dialogue.py`)

- Model: `gpt-4o`, temperature 0.
- Per-crew in-memory session; last 3 Q&A exchanges are injected as context on every call (`MAX_HISTORY = 3`).
- API key read from `OPENAI_API_KEY` environment variable via `.env`.
- Returns structured JSON with `voice_message` and `visual_message` fields.

---

## Processing pipeline

End-to-end data flow from sensor acquisition to crew display. All sensor input is currently simulated by `mock_data.py`; the processing architecture and API contract are designed to accommodate real sensor integration without structural change.

### Data flow overview

```
[Wearable devices × 6 per crew]      [Shared environmental sensors]
  bio_monitor   (garment vitals)        cabin_co2_mmhg
  oura_ring     (HRV, sleep, SpO₂)     cabin_temp_c
  thermo_mini   (core body temp)        cabin_humidity_pct
  actiwatch     (actigraphy, light)     mission_cumulative_dose_msv
  personal_co2  (breath-zone CO₂)
  evarm         (radiation dose)
        │                                       │
        └──────────────┬────────────────────────┘
                       ▼
           Device data structs  (models.py)
           mock_data.build_wearable()
           mock_data.build_environmental()
                       │
           ┌───────────┴────────────────────┐
           ▼                                ▼
   Score computation               Alert evaluation — Path 1 & 3
   mock_data.build_wearable()      alerts.evaluate_alerts()
   6 synthesized scores            Single-parameter thresholds
           │                       Conditional label: §5.7 vs §5.8b
           │                                │
           ▼                                ▼
   Scores available            Alert evaluation — Path 2
   as evaluator inputs         Composite Emergency rules
           │                   §5.6, §5.1E, §5.5bE, §5.4E, §5.2E
           │                                │
           ▼                                │
   Alert evaluation — Path 4               │
   Score-based composite §5.10             │
   → score-panel advice flags              │
   (no AlertItem generated)                │
           │                               │
           └──────────────┬────────────────┘
                          ▼
                  Mode derivation
                  mock_data.resolve_mode()
                          │
                          ▼
         DashboardPayload / OverviewPayload
         (FastAPI JSON response to frontend)
                          │
           ┌──────────────┴──────────────────────┐
           ▼                                      ▼
   Overview crew board                  Detail modal (per crew)
   • Crew score cards (4 columns)       • Score cards → score detail panel
   • Alert severity indicators          • Alerts panel → alert detail view
   • Mode badge                         • Chat (System AI / Flight Surgeon)
   • Mission health brief (LLM)
```

### Step 1 — Device data models

Raw readings from six wearable devices and one shared environmental sensor are represented as typed Pydantic structs in `models.py`. In the prototype, values are generated by `mock_data.build_wearable()` and `mock_data.build_environmental()`, seeded by crew ID, mission day, `scenario` tag, and the demo-degradation flag.

Every field name used in alert trigger tables in `8_medical_diagnosis.md §5` and in the parameter reference in `7_parameter_logic.md §2–3` maps directly to a field in one of these structs. This 1-to-1 mapping must be maintained when real sensor integration is added.

### Step 2 — Score computation

Six synthesized scores (0–100, higher = better) are computed from device fields before alert evaluation. Path 4 (§5.10 Cognitive Performance Risk) requires score values as inputs, so scores must be fully computed before the composite evaluation pass.

**Computation order (within `mock_data.build_wearable()`):**

| Order | Score | Key inputs | Dependency |
| :--- | :--- | :--- | :--- |
| 1st | Readiness Score | HRV, SpO₂ avg, resting HR, core temp, personal dose | Seeded from sleep + health + stress mock values |
| 2nd | Fatigue Score | HRV, wake episodes, resting HR, body temp deviation, hyperactivity index | Depends on readiness_score |
| 3rd | Health, Sleep, Activity, Stress Management | (see `7_parameter_logic.md §4`) | Independent of each other |

All score formulas and alert thresholds (Caution < 70, Warning < 60) are documented in `7_parameter_logic.md §4–6`. Score alarms are **not** placed in the Alerts panel — they surface as advice text in the score detail panel (see `8_medical_diagnosis.md §4.7`).

### Step 3 — Alert evaluation

Four paths run in sequence in `alerts.evaluate_alerts()`. For the complete rule set see the [Alert evaluation paths](#alert-evaluation-paths) subsection above.

**Execution order and data dependencies:**

| Pass | Path | Input | Output |
| :--- | :--- | :--- | :--- |
| 1st | Path 3 — Conditional label | `core_body_temp_c`, `heart_rate_bpm`, `breathing_rate_bpm` | Chooses §5.7 or §5.8b label before firing |
| 1st | Path 1 — Single-parameter | Raw device fields vs. PARAM_LIMITS; exercise suppression applied | `caution` / `warning` AlertItems |
| 2nd | Path 2 — Composite Emergency | Raw device fields (multi-field AND conditions) | `warning`-class AlertItems with Emergency urgency label |
| 3rd | Path 4 — Score-based composite | Computed scores + raw device fields (§5.10 conditions) | Score-panel advice flags; no AlertItem |

Exercise suppression (scenario = `exercise`) applies only to Path 1 high-side Caution for `heart_rate_bpm` and `breathing_rate_bpm`. Path 2 composite triggers are never suppressed — see `7_parameter_logic.md §3.1` and `8_medical_diagnosis.md §5.1`.

### Step 4 — Mode derivation

After alert evaluation, `mock_data.resolve_mode()` derives the operational mode:

| Priority | Mode | Condition |
| :--- | :--- | :--- |
| 1 (override) | `ground_supported` | Toggled via `POST /api/settings/mode` |
| 2 | `alert` | Any Emergency or Warning `AlertItem` active |
| 3 | `degraded` | Any sensor integrity is `stale` or `lost` |
| 4 (default) | `nominal_monitoring` | None of the above |

### Step 5 — API response and frontend rendering

`DashboardPayload` (per-crew detail) and `OverviewPayload` (four-crew summary) bundle all computed data into a single JSON response. The frontend renders the following panels from these payloads:

| Panel | Primary data source | Design reference |
| :--- | :--- | :--- |
| Mission health brief | LLM via `POST /api/crew/assessment` | — |
| Crew board — score cards | `OverviewPayload.crew[].{health,sleep,fatigue,stress,readiness}_score` | `7_parameter_logic.md §4` |
| Alerts panel | `DashboardPayload.alerts[]` (AlertItems) | `8_medical_diagnosis.md §5` |
| Score detail panel — sensors | `DashboardPayload.wearable` + `devices` | `7_parameter_logic.md §3` |
| Score detail panel — advice | Score value vs. Caution/Warning threshold | `8_medical_diagnosis.md §4.7` |
| Alert detail — related parameters | Per-alert related-param list keyed by alert type | `8_medical_diagnosis.md §6.2` |
| Chat | `POST /dialogue/command` | — |

---

### Design–implementation gaps (v0.1 baseline)

The following features are specified in `7_parameter_logic.md` and `8_medical_diagnosis.md` but are not yet implemented in the prototype. Items are ordered by implementation dependency.

| # | Feature | Design reference | Current state | Required change |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Symptom-level alert title and plain-language gloss | `8_medical_diagnosis.md §5` Alert title / Plain-language gloss | Parameter label only (e.g. "Heart Rate") | Add `symptom_title` and `plain_language_gloss` fields to `AlertItem`; map each PARAM_LIMITS key to its §5 entry |
| 2 | Urgency label in AlertItem | `8_medical_diagnosis.md §5` Urgency column; `7_parameter_logic.md §1` Severity matrix | Not present in `AlertItem` | Add `urgency` field; derive from Severity × display tier (Critical/Moderate/— × Caution/Warning) |
| 3 | Composite Emergency alerts (Path 2) | `8_medical_diagnosis.md §5.1, 5.2, 5.4, 5.5b, 5.6`; `5_software_implementation.md` Path 2 table | Not evaluated | Add composite evaluation block to `alerts.py` after single-parameter pass; all five rules fire independently |
| 4 | Conditional label selection — Fever vs. Heat stress (Path 3) | `8_medical_diagnosis.md §5.7, §5.8b` | Single alert for any `core_body_temp_c` exceedance | Add Path 3 branch in `alerts.py`: if HR > 100 or RR > 18 → §5.7 label, else → §5.8b label |
| 5 | Score-based composite — Cognitive Performance Risk (Path 4) | `8_medical_diagnosis.md §5.10` | Not evaluated | Pass computed `fatigue_score` and `sleep_score` into `evaluate_alerts()`; evaluate §5.10 conditions; return score-panel advice flag (no AlertItem) |
| 6 | Score advice text in score detail panel | `8_medical_diagnosis.md §4.7` | Not shown | Frontend: render per-score advice text in score detail panel when score < 70 or < 60; advice strings defined in §4.7 table |
| 7 | Related-parameter panel in alert detail view | `8_medical_diagnosis.md §6.2` | Trend chart only | Backend: add `related_params` list to each AlertItem (field name + role + display rule); Frontend: render per "Show in alert detail" policy (Always / If alarming; Context entries not shown) |

---

## Frontend

- Single HTML page (`index.html`) with all UI rendered from JS.
- `app.js` polls the backend and updates the DOM.
- Chart.js loaded from CDN; used for vitals time-series charts.
- No build step; files are served directly from `frontend/` by FastAPI's `StaticFiles`.
- Cache-Control headers force no-store on `/` and `/assets/*` during development.

---

## Running the prototype

```bash
# Install dependencies
pip install -r requirements.txt

# Set API key (copy .env.example and fill in key)
cp .env.example .env

# Start server
uvicorn backend.main:app --reload
```

The dashboard is then available at `http://localhost:8000`.

---

## Summary for tooling / implementation

- **Language / framework:** Python 3, FastAPI, Uvicorn, Pydantic v2.
- **Frontend:** Vanilla HTML/CSS/JS; no build toolchain; Chart.js via CDN.
- **Data source:** All data is mock (simulated); no live sensor integration yet.
- **AI:** GPT-4o; in-memory session per crew member; `MAX_HISTORY = 3` exchanges.
- **Modes (four):** `nominal_monitoring`, `alert`, `degraded`, `ground_supported` — names match ConOps.
- **Activity profile keys (four):** `nominal`, `exercise`, `stress`, `sleep` — `scenario` query param on data endpoints; **`location`:** `iva` or `eva`.
- **Alert tiers (four):** `emergency`, `warning`, `caution`, `advisory`.
- **Devices simulated (six):** bio_monitor, oura_ring, thermo_mini, actiwatch, personal_co2, evarm.
- **Entry point:** `uvicorn backend.main:app --reload` → `http://localhost:8000`.

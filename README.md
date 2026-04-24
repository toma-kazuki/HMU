# Health Monitoring Unit (HMU) — Crew Health Dashboard

A prototype of an integrated health monitoring and situational awareness system for long-duration spaceflight missions beyond Low Earth Orbit (LEO). Conceived as a group project in a graduate-level course, this repository contains the full design documentation and a functional software prototype.

> **Not for clinical use.** All physiological data displayed are procedurally generated mock values.

---

## Project background

Long-duration missions expose crew members to compounding stressors — microgravity, radiation, sleep disruption, isolation, and high workload — while communication delays with ground control progressively reduce the availability of real-time medical support. This prototype explores what an onboard, crew-operated health dashboard might look like: one that synthesizes data from multiple wearables and environmental sensors into a single, interpretable interface that supports autonomous medical decision-making.

The design process followed a full systems engineering workflow (problem statement → ConOps → requirements → design → implementation), documented in [`designdoc/`](designdoc/).

---

## Repository structure

```
HMU/
├── backend/              # Python/FastAPI REST API
│   ├── main.py           # App entry point, API routes
│   ├── mock_data.py      # Deterministic mock data generator
│   ├── alerts.py         # Rule-based symptom alert evaluator
│   ├── dialogue.py       # OpenAI-backed chat and assessment endpoints
│   ├── models.py         # Pydantic data models
│   └── roster.py         # Crew registration API
├── frontend/             # Vanilla HTML/CSS/JS single-page app
│   ├── index.html        # Application shell
│   ├── app.js            # All UI logic (~2 500 lines)
│   └── styles.css        # Design system styles
├── data/
│   ├── crew_roster.json  # Persisted crew registration data
│   ├── knowledge/
│   │   └── parameter_symptom.csv   # Parameter–symptom mapping table
│   └── photos/           # Crew avatar images (CM-1 … CM-4)
├── designdoc/            # Full design documentation (Markdown)
│   ├── 1_problemstatement.md
│   ├── 2_conops.md
│   ├── 2_designreferencemission.md
│   ├── 3_requirements.md
│   ├── 4_designapproach.md
│   ├── 5_software_implementation.md
│   ├── 6_visual_design.md
│   ├── 7_parameter_logic.md
│   ├── 8_medical_diagnosis.md
│   └── history/          # Design modification records
├── .env.example          # Environment variable template
├── requirements.txt      # Python dependencies
└── README.md
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12+, FastAPI 0.115+, Uvicorn |
| Data validation | Pydantic v2 |
| AI features | OpenAI Python SDK 1.0+ (GPT-4o) |
| Frontend | Plain HTML + CSS + Vanilla JavaScript |
| Charts | Chart.js 4.4.6 (loaded from CDN) |
| Config | python-dotenv |

---

## Setup and running

### 1. Prerequisites

- Python 3.12 or later
- An [OpenAI API key](https://platform.openai.com/api-keys) (GPT-4o access required for AI assessment and chat features)

### 2. Clone and create a virtual environment

```bash
git clone <repo-url>
cd HMU
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with your OpenAI API key:

```
api_key=sk-...your-key-here...
```

> The key is loaded by `python-dotenv` at startup. Never commit `.env` to version control — it is already listed in `.gitignore`.

### 5. Start the server

```bash
uvicorn backend.main:app --reload
```

Open your browser at **http://localhost:8000**.

The `--reload` flag restarts the server automatically on code changes, which is useful during development.

---

## Using the dashboard

### Welcome screen

On first load you will see the welcome screen. Two paths are available:

- **Current Mission** — goes directly to the dashboard using the most recently registered crew (or a default demo crew if none has been registered).
- **New Mission — Register Crew** — opens the crew registration form where you fill in basic biometric data for each of the four crew members before the mission begins.

### Main dashboard

The main dashboard shows four crew columns side by side, a habitat environment bar at the bottom, and a mission timeline in the top bar.

| Area | What it shows |
|---|---|
| Top bar | Mission phase, day counter, Earth–Mars transit progress, current date/time (UTC) |
| Mission health brief | AI-generated fleet-level assessment |
| Crew columns | Per-crew health score summary and active alerts |
| Habitat bar | Cabin CO₂, temperature, humidity, and cumulative radiation dose |

Click any crew card to open the **detail panel** for that crew member.

### Detail panel

The detail panel contains:

- **Health score cards** — six synthesized scores (Health, Sleep, Activity, Fatigue, Stress, Readiness). Click a score to expand its trend chart and contributing sensors.
- **HMU Intelligence** — AI-generated symptom summary and score-specific assessment.
- **Alerts** — rule-based threshold exceedances, sorted by severity (Emergency → Warning → Caution → Advisory). Click an alert to see its trend chart and related parameters.
- **Recommended Actions** — AI-generated action list when alerts are active.
- **Communication** — chat interface for querying the System AI or sending a message to the Flight Surgeon (simulated, with a ~22 min round-trip delay reflecting Earth–Mars light time).

### Developer panel

Click the **⚙ Developer** button in the top-right corner to reveal testing controls:

| Control | Effect |
|---|---|
| Ground-supported | Simulates a mission phase with real-time ground support |
| Simulate degradation | Randomly marks some sensors as stale or disconnected |
| Alert demo | Activates a pre-scripted alert scenario (CM-2, mission day 360, Transit Return) |
| ⟳ Refresh | Forces a data refresh without waiting for the auto-poll interval |

---

## Demo modes

### Nominal (default)

The dashboard opens in nominal mode. All four crew members show healthy, alert-free values across the full 365-day mission calendar. Scenarios are distributed across the crew to show a realistic mixed-activity picture (Rest, Exercise, Stress, Sleep).

### Alert demo

Enable **Alert demo** in the Developer panel to load a scripted scenario:

- **Mission day 360** — Transit Return leg, day 150/210 (crew inbound from Mars)
- **CM-2 (M. Reyes)** — SpO₂ 88.5 % (WARNING), HR 128 bpm (CAUTION), Systolic BP 168 mmHg (CAUTION), Breathing rate 7.0 br/min (WARNING)
- **All crew** — accumulated fatigue scores reflecting long-duration mission stress
- **Habitat** — cabin CO₂ elevated to 7.5 mmHg (CAUTION)

The mission transit bar turns red and fills from the Mars side to reflect the inbound leg.

---

## Design documentation

All design decisions are documented in [`designdoc/`](designdoc/). Reading order:

1. [`1_problemstatement.md`](designdoc/1_problemstatement.md) — problem definition and motivation
2. [`2_designreferencemission.md`](designdoc/2_designreferencemission.md) — reference mission parameters
3. [`2_conops.md`](designdoc/2_conops.md) — concept of operations
4. [`3_requirements.md`](designdoc/3_requirements.md) — system requirements
5. [`4_designapproach.md`](designdoc/4_designapproach.md) — design approach and trade-offs
6. [`5_software_implementation.md`](designdoc/5_software_implementation.md) — software architecture
7. [`6_visual_design.md`](designdoc/6_visual_design.md) — UI/UX design rationale
8. [`7_parameter_logic.md`](designdoc/7_parameter_logic.md) — sensor parameter definitions and thresholds
9. [`8_medical_diagnosis.md`](designdoc/8_medical_diagnosis.md) — symptom detection logic and alert rules

Design modification records are in [`designdoc/history/`](designdoc/history/).

---

## Key design decisions

**Rule-based alert engine** — Alerts are generated by a deterministic threshold evaluator (`backend/alerts.py`) rather than a machine learning model. This keeps the logic transparent and auditable, which is appropriate for a safety-critical prototype. The symptom-to-parameter mapping is documented in [`data/knowledge/parameter_symptom.csv`](data/knowledge/parameter_symptom.csv).

**Mock data only** — No real sensor hardware is required. `backend/mock_data.py` generates physiologically plausible, deterministic values seeded by crew ID and mission day, so the same day always produces the same readings.

**AI features are optional** — The dashboard renders fully without a valid OpenAI key. AI-generated assessments and chat will return an error message, but all rule-based alerts, scores, and navigation remain functional.

**Single-file frontend** — The entire UI is implemented in one HTML file, one CSS file, and one JavaScript file with no build step or framework. This makes the frontend easy to read and modify without any tooling knowledge beyond a browser and a text editor.

---

## Extending the prototype

Some directions previous contributors have discussed:

- **Real sensor integration** — replace `mock_data.py` with adapters for actual wearable APIs (Oura, Garmin, etc.)
- **Persistent time-series** — store vitals in a database for genuine trend charts instead of mock series
- **Additional crew** — the current crew model is fixed at four members; `roster.py` and the frontend both assume this
- **Offline AI** — swap the OpenAI calls in `dialogue.py` for a locally hosted model for use in communication-denied environments

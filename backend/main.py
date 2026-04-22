"""HMU prototype API — aggregates mock wearable and environmental data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from openai import OpenAIError
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from backend.alerts import evaluate_alerts, evaluate_cognitive_risk
from backend.dialogue import router as dialogue_router, _get_client, SYSTEM_PROMPT
from backend import roster as roster_module
from backend.models import (
    AlertSeverity,
    CrewColumnSummary,
    DashboardPayload,
    ModeOverrideBody,
    OperationalMode,
    OverviewPayload,
)
from backend import mock_data

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(
    title="HMU Health Monitoring Unit (Prototype)",
    description="Mock integrated health dashboard API for long-duration mission concept.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class _NoCacheFrontendMiddleware(BaseHTTPMiddleware):
    """Avoid stale index.html / CSS / JS during development (browser cache)."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path == "/" or path.startswith("/assets"):
            response.headers["Cache-Control"] = "no-store, max-age=0, must-revalidate"
        return response


app.add_middleware(_NoCacheFrontendMiddleware)

app.include_router(dialogue_router)
app.include_router(roster_module.router)


def _crew_ids() -> set[str]:
    return {c["id"] for c in mock_data.CREW_ROSTER}


def build_dashboard_payload(
    crew_member_id: str,
    scenario: str,
    location: Literal["iva", "eva"] = "iva",
) -> DashboardPayload:
    mission_day = mock_data.mission_day_only()
    wearable = mock_data.build_wearable(crew_member_id, mission_day, scenario=scenario)
    environmental = mock_data.build_environmental(mission_day)
    integrity = mock_data.build_integrity(wearable)
    devices = mock_data.build_devices(crew_member_id, mission_day, wearable, scenario=scenario)
    is_sleeping = scenario == "sleep"
    alerts = evaluate_alerts(
        wearable,
        environmental,
        integrity,
        is_sleeping=is_sleeping,
        scenario=scenario,
        location=location,
        devices=devices,
    )

    has_ew = any(
        a.severity in (AlertSeverity.EMERGENCY, AlertSeverity.WARNING) for a in alerts
    )
    mode = mock_data.resolve_mode(has_ew, integrity)

    series = mock_data.vitals_timeseries(
        wearable.heart_rate_bpm,
        wearable.spo2_pct,
        wearable.respiratory_rate_bpm,
    )

    cognitive_risk = evaluate_cognitive_risk(
        fatigue_score=wearable.fatigue_score,
        sleep_score=wearable.sleep_score,
        spo2_pct=devices.bio_monitor.spo2_pct,
        cabin_co2_mmhg=environmental.cabin_co2_mmhg,
        personal_co2_ppm=devices.personal_co2.current_ppm,
    )

    return DashboardPayload(
        mode=mode,
        crew_member_id=crew_member_id,
        display_name=mock_data.crew_display_name(crew_member_id),
        mission_day=mission_day,
        scenario_assumption=scenario,
        location=location,
        wearable=wearable,
        devices=devices,
        environmental=environmental,
        integrity=integrity,
        alerts=alerts,
        vitals_series=series,
        cognitive_risk=cognitive_risk,
    )


@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "hmu-prototype"}


@app.get("/api/overview", response_model=OverviewPayload)
def get_overview():
    mission_day = mock_data.mission_day_only()
    environmental = mock_data.build_environmental(mission_day)
    crew_rows: list[CrewColumnSummary] = []
    per_crew_modes: list[OperationalMode] = []

    for c in mock_data.CREW_ROSTER:
        cid = c["id"]
        scenario = mock_data.scenario_for_crew_id(cid)
        location = mock_data.location_for_crew_id(cid)
        w = mock_data.build_wearable(cid, mission_day, scenario=scenario)
        integrity = mock_data.build_integrity(w)
        dev = mock_data.build_devices(cid, mission_day, w, scenario=scenario)
        is_sleeping = scenario == "sleep"
        alerts = evaluate_alerts(
            w,
            environmental,
            integrity,
            is_sleeping=is_sleeping,
            scenario=scenario,
            location=location,
            devices=dev,
        )
        has_ew = any(
            a.severity in (AlertSeverity.EMERGENCY, AlertSeverity.WARNING) for a in alerts
        )
        mode = mock_data.resolve_mode(has_ew, integrity)
        per_crew_modes.append(mode)
        crew_rows.append(
            CrewColumnSummary(
                crew_member_id=cid,
                display_name=c["display_name"],
                role=c["role"],
                avatar_url=mock_data.avatar_url_for_crew(cid),
                scenario=scenario,
                location=location,
                mode=mode,
                health_score=w.health_score,
                sleep_score=w.sleep_score,
                fatigue_score=w.fatigue_score,
                stress_score=w.stress_management_score,
            )
        )

    agg = mock_data.aggregate_modes(per_crew_modes)
    if mock_data.is_ground_supported():
        agg = OperationalMode.GROUND_SUPPORTED

    ref = mock_data.build_wearable(
        "CM-1", mission_day, scenario=mock_data.scenario_for_crew_id("CM-1")
    )
    ref_integrity = mock_data.build_integrity(ref)
    integ_env = ref_integrity.environmental

    return OverviewPayload(
        mission_day=mission_day,
        mode=agg,
        crew=crew_rows,
        environmental=environmental,
        integrity_environmental=integ_env,
    )


@app.get("/api/crew/{crew_id}/detail", response_model=DashboardPayload)
def get_crew_detail(
    crew_id: str,
    scenario: str = Query(
        "nominal",
        description="nominal | exercise | stress | sleep",
    ),
    location: str = Query("iva", description="iva | eva — EVA suppresses habitat CO₂/temp alerts"),
):
    if crew_id not in _crew_ids():
        raise HTTPException(status_code=404, detail="Unknown crew member")
    if scenario not in ("nominal", "exercise", "stress", "sleep"):
        raise HTTPException(status_code=400, detail="Invalid scenario")
    if location not in ("iva", "eva"):
        raise HTTPException(status_code=400, detail="Invalid location")
    loc: Literal["iva", "eva"] = "eva" if location == "eva" else "iva"
    return build_dashboard_payload(crew_id, scenario, location=loc)


class AssessmentRequest(BaseModel):
    """Lightweight payload sent from the frontend to generate a GPT-4o assessment."""
    display_name: str
    role: str
    mission_day: int
    alerts: list[dict[str, Any]]          # {severity, title, parameter, value, threshold}
    wearable: dict[str, Any]              # key synthesized scores + raw vitals
    environmental: dict[str, Any]         # cabin readings


_ASSESSMENT_PROMPT = """\
You are an AI flight surgeon assistant embedded in the Health Monitoring Unit (HMU).
A crew member's current physiological and environmental data is provided below.
Return ONLY a valid JSON object with exactly two keys:
  "summary"  — 2–3 sentences describing the crew member's current clinical status,
               focusing on what is abnormal or concerning. Be specific (use the
               actual values). If everything is normal, say so concisely.
  "actions"  — a JSON array of 2–4 plain-text strings, each one recommended action
               ordered from highest to lowest priority. Start each item with a
               strong verb (e.g. "Administer", "Notify", "Monitor", "Reduce").
               Be concise; one sentence per action.
Do not include any text outside the JSON object."""


@app.post("/api/crew/assessment")
async def get_crew_assessment(body: AssessmentRequest) -> dict[str, Any]:
    """
    Call GPT-4o to generate a symptom summary and recommended actions
    for the given crew member's current data.
    """
    client = _get_client()

    alert_lines = "\n".join(
        f"  [{a.get('severity','?').upper():9s}] {a.get('title','')} "
        f"— {a.get('parameter','')}: {a.get('value','')} "
        f"(threshold: {a.get('threshold','')})"
        for a in body.alerts
    ) or "  None"

    w = body.wearable
    e = body.environmental
    context = (
        f"Crew: {body.display_name} ({body.role}), Mission Day {body.mission_day}\n\n"
        f"Active alerts ({len(body.alerts)}):\n{alert_lines}\n\n"
        f"Synthesized scores: "
        f"Health {w.get('health_score','?')}/100, "
        f"Sleep {w.get('sleep_score','?')}/100, "
        f"Fatigue {w.get('fatigue_score','?')}/100, "
        f"Stress Mgmt {w.get('stress_management_score','?')}/100, "
        f"Readiness {w.get('readiness_score','?')}/100\n\n"
        f"Raw vitals: "
        f"HR {w.get('heart_rate_bpm','?')} bpm, "
        f"SpO₂ {w.get('spo2_pct','?')} %, "
        f"BP {w.get('systolic_mmhg','?')}/{w.get('diastolic_mmhg','?')} mmHg, "
        f"RR {w.get('respiratory_rate_bpm','?')} br/min\n\n"
        f"Environment: "
        f"CO₂ {e.get('cabin_co2_mmhg','?')} mmHg, "
        f"temp {e.get('cabin_temp_c','?')} °C, "
        f"humidity {e.get('cabin_humidity_pct','?')} %, "
        f"cumul. dose {e.get('mission_cumulative_dose_msv','?')} mSv"
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system",  "content": _ASSESSMENT_PROMPT},
                {"role": "user",    "content": context},
            ],
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {exc}") from exc

    raw = completion.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"summary": raw, "actions": []}

    return {
        "summary": parsed.get("summary", ""),
        "actions": parsed.get("actions", []),
    }


@app.get("/api/dashboard", response_model=DashboardPayload)
def get_dashboard(
    scenario: str = Query(
        "nominal",
        description="nominal | exercise | stress | sleep — adjusts mock wearable context",
    ),
    crew_id: str = Query(
        "CM-1",
        description="Crew member id (CM-1 … CM-4)",
    ),
    location: str = Query("iva", description="iva | eva"),
):
    if crew_id not in _crew_ids():
        raise HTTPException(status_code=404, detail="Unknown crew member")
    if scenario not in ("nominal", "exercise", "stress", "sleep"):
        raise HTTPException(status_code=400, detail="Invalid scenario")
    if location not in ("iva", "eva"):
        raise HTTPException(status_code=400, detail="Invalid location")
    loc: Literal["iva", "eva"] = "eva" if location == "eva" else "iva"
    return build_dashboard_payload(crew_id, scenario, location=loc)


@app.post("/api/settings/mode")
def post_mode_override(body: ModeOverrideBody):
    mock_data.set_ground_supported(body.ground_supported)
    return {"ground_supported": mock_data.is_ground_supported()}


@app.post("/api/settings/degraded-demo")
def post_degraded_demo(
    on: bool = Query(True, description="Enable or disable demo sensor degradation"),
):
    mock_data.set_demo_degraded(on)
    return {"demo_degraded": mock_data.is_demo_degraded()}


@app.post("/api/settings/alert-demo")
def post_alert_demo(
    on: bool = Query(True, description="Enable or disable startup alert demonstration"),
):
    """
    Toggle the alert demonstration scenario.

    When ON (server default):
      CM-2 has SpO₂ 88.5 %, HR 128 bpm, SBP 168 mmHg → EMERGENCY + 2× WARNING
      Cabin CO₂ 7.5 mmHg and cumulative dose 158 mSv   → 2× WARNING
      Mission mode resolves to ALERT.

    When OFF: all values revert to normal nominal mock data.
    """
    mock_data.set_alert_demo(on)
    return {"alert_demo": mock_data.is_alert_demo()}


# Serve uploaded crew photos
_PHOTOS_DIR = Path(__file__).resolve().parent.parent / "data" / "photos"
_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/data/photos", StaticFiles(directory=str(_PHOTOS_DIR)), name="photos")

if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")


@app.get("/")
def serve_index():
    index = FRONTEND_DIR / "index.html"
    if index.is_file():
        return FileResponse(
            index,
            headers={"Cache-Control": "no-store, max-age=0, must-revalidate"},
        )
    return {"detail": "Frontend not built; place index.html in frontend/"}

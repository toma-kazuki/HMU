"""HMU prototype API — aggregates mock wearable and environmental data."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.alerts import evaluate_alerts
from backend.models import (
    AlertSeverity,
    DashboardPayload,
    ModeOverrideBody,
    OperationalMode,
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


@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "hmu-prototype"}


@app.get("/api/dashboard", response_model=DashboardPayload)
def get_dashboard(
    scenario: str = Query(
        "nominal",
        description="nominal | exercise | stress | sleep — adjusts mock wearable context",
    ),
):
    crew, mission_day = mock_data.mission_clock_context()
    wearable = mock_data.build_wearable(crew, mission_day, scenario=scenario)
    environmental = mock_data.build_environmental(mission_day)
    integrity = mock_data.build_integrity(wearable)
    is_sleeping = scenario == "sleep"
    alerts = evaluate_alerts(wearable, environmental, integrity, is_sleeping=is_sleeping)

    has_ew = any(
        a.severity in (AlertSeverity.EMERGENCY, AlertSeverity.WARNING) for a in alerts
    )
    mode = mock_data.resolve_mode(has_ew, integrity)

    series = mock_data.vitals_timeseries(
        wearable.heart_rate_bpm,
        wearable.spo2_pct,
        wearable.respiratory_rate_bpm,
    )

    return DashboardPayload(
        mode=mode,
        crew_member_id=crew,
        mission_day=mission_day,
        wearable=wearable,
        environmental=environmental,
        integrity=integrity,
        alerts=alerts,
        vitals_series=series,
    )


@app.post("/api/settings/mode")
def post_mode_override(body: ModeOverrideBody):
    mock_data.set_ground_supported(body.ground_supported)
    return {"ground_supported": mock_data.is_ground_supported()}


@app.post("/api/settings/degraded-demo")
def post_degraded_demo(on: bool = Query(True, description="Enable or disable demo sensor degradation")):
    mock_data.set_demo_degraded(on)
    return {"demo_degraded": mock_data.is_demo_degraded()}


if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")


@app.get("/")
def serve_index():
    index = FRONTEND_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"detail": "Frontend not built; place index.html in frontend/"}

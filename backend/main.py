"""HMU prototype API — aggregates mock wearable and environmental data."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from backend.alerts import evaluate_alerts
from backend.dialogue import router as dialogue_router
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


def _crew_ids() -> set[str]:
    return {c["id"] for c in mock_data.CREW_ROSTER}


def build_dashboard_payload(crew_member_id: str, scenario: str) -> DashboardPayload:
    mission_day = mock_data.mission_day_only()
    wearable = mock_data.build_wearable(crew_member_id, mission_day, scenario=scenario)
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

    devices = mock_data.build_devices(crew_member_id, mission_day, wearable, scenario=scenario)

    return DashboardPayload(
        mode=mode,
        crew_member_id=crew_member_id,
        display_name=mock_data.crew_display_name(crew_member_id),
        mission_day=mission_day,
        wearable=wearable,
        devices=devices,
        environmental=environmental,
        integrity=integrity,
        alerts=alerts,
        vitals_series=series,
    )


@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "hmu-prototype"}


@app.get("/api/overview", response_model=OverviewPayload)
def get_overview(
    scenario: str = Query(
        "nominal",
        description="Shared mock context for all crew columns",
    ),
):
    mission_day = mock_data.mission_day_only()
    environmental = mock_data.build_environmental(mission_day)
    crew_rows: list[CrewColumnSummary] = []
    per_crew_modes: list[OperationalMode] = []

    for c in mock_data.CREW_ROSTER:
        cid = c["id"]
        w = mock_data.build_wearable(cid, mission_day, scenario=scenario)
        integrity = mock_data.build_integrity(w)
        is_sleeping = scenario == "sleep"
        alerts = evaluate_alerts(w, environmental, integrity, is_sleeping=is_sleeping)
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

    ref = mock_data.build_wearable("CM-1", mission_day, scenario=scenario)
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
):
    if crew_id not in _crew_ids():
        raise HTTPException(status_code=404, detail="Unknown crew member")
    return build_dashboard_payload(crew_id, scenario)


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
):
    if crew_id not in _crew_ids():
        raise HTTPException(status_code=404, detail="Unknown crew member")
    return build_dashboard_payload(crew_id, scenario)


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

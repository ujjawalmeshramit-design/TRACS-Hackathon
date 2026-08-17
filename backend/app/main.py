"""
FastAPI Application — Traffic Risk Heatmap Backend.

This is the entry point that wires everything together:
  - Loads data on startup
  - Defines all API endpoints
  - Enables CORS so the Leaflet.js frontend can call us

API Endpoints:
  GET  /api/junctions          → Get all junctions with live data
  GET  /api/roads              → Get all road segments
  GET  /api/risk-scores        → Get computed risk scores for all junctions
  GET  /api/risk-scores/{id}   → Get risk score for a single junction
  POST /api/simulate-incident  → Trigger or clear a simulated accident
  POST /api/allocate           → Run the greedy police allocation optimizer
  POST /api/override           → Manually set officer count at a junction
  POST /api/route              → Find the fastest emergency route (Dijkstra)
  POST /api/reset              → Reset all data back to the original JSON state
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from contextlib import asynccontextmanager

from app import state
from app.models import (
    Junction,
    Road,
    RiskScoreResponse,
    SimulateIncidentRequest,
    OverridePoliceRequest,
    RouteRequest,
    RouteResponse,
    AllocationResponse,
    ComparisonResponse,
)
from app.scoring import compute_risk_score
from app.allocation import run_allocation, run_comparison
from app.routing import find_shortest_path


# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load data from JSON files when the server starts."""
    state.load_data()
    yield


app = FastAPI(
    title="Traffic Risk Heatmap API",
    description="Backend for AI-Based Traffic Risk Assessment & Police Deployment",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the frontend (running on a different port) to call our API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Allow all origins for hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# GET endpoints — read data
# ---------------------------------------------------------------------------

@app.get("/api/junctions", response_model=list[Junction])
async def get_junctions():
    """Return all junctions with their current live data."""
    return state.get_all_junctions()


@app.get("/api/roads", response_model=list[Road])
async def get_roads():
    """Return all road segments."""
    return state.get_all_roads()


@app.get("/api/risk-scores", response_model=list[RiskScoreResponse])
async def get_all_risk_scores():
    """
    Compute and return risk scores for ALL junctions.

    This is the primary endpoint the heatmap frontend calls to colour
    each junction marker from green (safe) to red (dangerous).
    """
    return [
        compute_risk_score(j) for j in state.get_all_junctions()
    ]


@app.get("/api/risk-scores/{junction_id}", response_model=RiskScoreResponse)
async def get_risk_score(junction_id: str):
    """Compute and return the risk score for a single junction."""
    junction = state.get_junction(junction_id)
    if junction is None:
        raise HTTPException(status_code=404, detail=f"Junction '{junction_id}' not found.")
    return compute_risk_score(junction)


# ---------------------------------------------------------------------------
# POST endpoints — actions
# ---------------------------------------------------------------------------

@app.post("/api/simulate-incident")
async def simulate_incident(req: SimulateIncidentRequest):
    """
    Simulate an accident at a junction (or clear an existing one).

    When activated:
      - Sets has_active_incident = True on the junction
      - The risk score will immediately spike by +50 points
      - The heatmap will turn this junction bright red
    """
    junction = state.get_junction(req.junction_id)
    if junction is None:
        raise HTTPException(status_code=404, detail=f"Junction '{req.junction_id}' not found.")

    junction.has_active_incident = req.activate

    return {
        "message": f"Incident {'activated' if req.activate else 'cleared'} at {junction.name}",
        "junction_id": junction.id,
        "has_active_incident": junction.has_active_incident,
        "updated_risk_score": compute_risk_score(junction).risk_score,
    }


@app.post("/api/allocate", response_model=AllocationResponse)
async def allocate_police():
    """
    Run the greedy police-allocation optimizer.

    This redistributes ALL officers (except manually overridden ones)
    across the city to minimise the overall danger score.

    Returns before/after city-wide risk metrics so the frontend can
    show the improvement.
    """
    return run_allocation()


@app.get("/api/compare", response_model=ComparisonResponse)
async def compare_deployment():
    """
    Compute comparative impact metrics between baseline deployment and AI allocation.

    Evaluates Uncovered High-Risk Locations, Resource Over-concentration,
    and City-wide Average Risk Score reduction.
    """
    return run_comparison()


@app.post("/api/override")
async def override_police(req: OverridePoliceRequest):
    """
    Let a human operator manually set the officer count at a junction.

    The junction will be "locked" — future calls to /api/allocate will
    NOT change this junction's officer count.
    """
    junction = state.get_junction(req.junction_id)
    if junction is None:
        raise HTTPException(status_code=404, detail=f"Junction '{req.junction_id}' not found.")

    junction.active_police = req.officer_count
    state.override_locks.add(req.junction_id)

    return {
        "message": f"Override set: {junction.name} now has {req.officer_count} officers (locked).",
        "junction_id": junction.id,
        "active_police": junction.active_police,
        "is_locked": True,
        "updated_risk_score": compute_risk_score(junction).risk_score,
    }


@app.post("/api/route", response_model=RouteResponse)
async def find_route(req: RouteRequest):
    """
    Find the fastest emergency route between two junctions using Dijkstra.

    The route avoids congested roads by weighting edges by travel TIME
    (distance / speed) rather than just distance.
    """
    result = find_shortest_path(req.source_id, req.target_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No route found from '{req.source_id}' to '{req.target_id}'.",
        )
    return result


@app.post("/api/reset")
async def reset_data():
    """
    Reset all data back to the original JSON state.

    Clears all simulated incidents, resets officer counts to baseline,
    and removes all human overrides. Useful between demo runs.
    """
    state.reset_state()
    return {"message": "All data has been reset to the initial state."}


# ---------------------------------------------------------------------------
# Serve Frontend Static Dashboard at /demo
# ---------------------------------------------------------------------------
frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/demo", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


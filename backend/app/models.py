"""
Pydantic data models for the Traffic Risk Heatmap backend.

These models define the shape of every piece of data flowing through the API:
  - Junction / Road: mirror the JSON files from Member 3.
  - RiskScore: the computed danger score for each junction.
  - Request/Response schemas for every endpoint.

Pydantic automatically validates incoming data at runtime, so if the
frontend sends a bad request, it gets a clear 422 error with details.
"""

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Optional


# ---------------------------------------------------------------------------
# Data models (mirror junctions.json and roads.json)
# ---------------------------------------------------------------------------

class Junction(BaseModel):
    """Represents a single traffic junction in Nagpur."""
    id: str                        # e.g. "J1"
    name: str                      # e.g. "Sadar Junction"
    lat: float                     # Latitude  (≈ 21.x)
    lng: float                     # Longitude (≈ 79.x)
    traffic_volume: int            # Current vehicle count
    max_traffic_volume: int        # Road capacity upper bound
    accident_history: int          # Accidents in the past year
    max_accident_history: int      # Normalization ceiling
    speed_limit: int               # Posted speed limit (km/h)
    current_speed: int             # Live average speed (km/h)
    baseline_police: int           # Static/fixed officer count
    active_police: int             # Currently deployed officers
    has_active_incident: bool      # Is there an active accident?


class Road(BaseModel):
    """Represents a directed road segment connecting two junctions."""
    id: str                        # e.g. "R1"
    source: str                    # Source junction ID
    target: str                    # Target junction ID
    distance_km: float             # Length in kilometres
    current_speed: int             # Current traffic speed on this segment


# ---------------------------------------------------------------------------
# Risk-score response
# ---------------------------------------------------------------------------

class RiskScoreResponse(BaseModel):
    """The computed risk score for one junction, with an explanation."""
    junction_id: str
    junction_name: str
    risk_score: float = Field(..., ge=0, le=100)
    # Breakdown so the frontend can show *why* a score is high
    congestion_component: float    # 0-40
    accident_component: float      # 0-40
    speed_component: float         # 0-20
    police_mitigation: float       # Points subtracted by officers
    incident_penalty: float        # +50 if active incident, else 0
    active_police: int
    has_active_incident: bool


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class SimulateIncidentRequest(BaseModel):
    """Trigger or clear a simulated accident at a junction."""
    junction_id: str
    activate: bool = True          # True = start incident, False = clear


class OverridePoliceRequest(BaseModel):
    """Let a human operator manually set the officer count at a junction."""
    junction_id: str
    officer_count: int = Field(..., ge=0)


class RouteRequest(BaseModel):
    """Request emergency routing between two junctions."""
    source_id: str
    target_id: str


# ---------------------------------------------------------------------------
# Route response
# ---------------------------------------------------------------------------

class RouteResponse(BaseModel):
    """The shortest-time path returned by Dijkstra."""
    path_junction_ids: list[str]   # Ordered list of junction IDs
    path_road_ids: list[str]       # Ordered list of road IDs
    total_distance_km: float
    total_time_minutes: float


# ---------------------------------------------------------------------------
# Comparison & Split models
# ---------------------------------------------------------------------------

class SplitReasoning(BaseModel):
    """Reasoning factors behind scene vs traffic officer ratio."""
    accident_factor: Optional[float] = None
    traffic_factor: Optional[float] = None
    scene_ratio_used: Optional[float] = None


class JunctionAllocation(BaseModel):
    """Detailed officer allocation breakdown for a single junction."""
    junction_id: str
    junction_name: str
    officers_assigned: int
    police_scene_management: int
    traffic_control: int
    is_locked: bool = False
    split_reasoning: Optional[SplitReasoning] = None


# ---------------------------------------------------------------------------
# Allocation response
# ---------------------------------------------------------------------------

class AllocationResponse(BaseModel):
    """Result of running the greedy police-allocation optimizer."""
    total_officers: int
    allocations: list[JunctionAllocation | dict]        # [{junction_id, junction_name, officers_assigned, ...}]
    city_risk_before: float        # Average risk BEFORE reallocation
    city_risk_after: float         # Average risk AFTER reallocation


class ScenarioMetrics(BaseModel):
    """Aggregate KPIs for a deployment scenario."""
    avg_risk_score: float
    uncovered_high_risk_count: int
    overconcentration_officers: int


class ComparisonImprovement(BaseModel):
    """Metrics showing improvement from baseline to AI recommendation."""
    avg_risk_score_drop: float
    avg_risk_score_drop_pct: float
    uncovered_high_risk_reduction: int
    overconcentration_reduction: int


class ComparisonResponse(BaseModel):
    """Full comparison response between baseline and AI recommendation."""
    baseline: ScenarioMetrics
    ai_recommended: ScenarioMetrics
    improvement: ComparisonImprovement



"""
Traffic Risk-Scoring Module.

This is the "AI brain" of the system. It takes the live data for a junction
and produces a single danger score from 0 to 100, along with a full breakdown
so the dashboard can explain *why* a junction is dangerous.

The formula follows the three-step process from the implementation plan:

  Step A — Base Risk (0–100):
    base = (congestion * 40) + (accident * 40) + (speed_drop * 20)

  Step B — Police Mitigation:
    mitigated = max(0, base - 15 * active_police)

  Step C — Incident Penalty:
    final = min(100, mitigated + 50 if has_active_incident)
"""

from app.models import Junction, RiskScoreResponse


# ---------------------------------------------------------------------------
# Weights — tweak these to change how much each factor matters
# ---------------------------------------------------------------------------

W_CONGESTION = 40   # How much traffic congestion affects the score
W_ACCIDENT   = 40   # How much past accident history affects the score
W_SPEED      = 20   # How much current speed drop affects the score
POLICE_REDUCTION = 15   # Risk points reduced per active police officer
INCIDENT_PENALTY = 50   # Flat penalty added when there is a live accident


def compute_risk_score(junction: Junction) -> RiskScoreResponse:
    """
    Compute the risk score for a single junction.

    Returns a RiskScoreResponse with the final score AND a full breakdown
    of each component, so the frontend can render an explainable tooltip.
    """

    # ------------------------------------------------------------------
    # Step A: Calculate Base Risk (out of 100)
    # ------------------------------------------------------------------

    # Congestion ratio: how full is this road? (0.0 = empty, 1.0 = at capacity)
    congestion_ratio = (
        junction.traffic_volume / junction.max_traffic_volume
        if junction.max_traffic_volume > 0
        else 0.0
    )

    # Accident ratio: how dangerous is this junction historically?
    accident_ratio = (
        junction.accident_history / junction.max_accident_history
        if junction.max_accident_history > 0
        else 0.0
    )

    # Speed drop ratio: how much slower than the limit is traffic moving?
    # If current_speed == speed_limit → 0 (no risk)
    # If current_speed == 0           → 1 (maximum risk, traffic stopped)
    speed_risk = (
        1.0 - (junction.current_speed / junction.speed_limit)
        if junction.speed_limit > 0
        else 0.0
    )
    speed_risk = max(0.0, speed_risk)  # Clamp: speed can't exceed limit

    # Weighted sum
    congestion_component = round(congestion_ratio * W_CONGESTION, 2)
    accident_component   = round(accident_ratio * W_ACCIDENT, 2)
    speed_component      = round(speed_risk * W_SPEED, 2)

    base_risk = congestion_component + accident_component + speed_component

    # ------------------------------------------------------------------
    # Step B: Police Mitigation
    # ------------------------------------------------------------------
    police_mitigation = round(POLICE_REDUCTION * junction.active_police, 2)
    mitigated_risk = max(0.0, base_risk - police_mitigation)

    # ------------------------------------------------------------------
    # Step C: Incident Penalty
    # ------------------------------------------------------------------
    incident_penalty = INCIDENT_PENALTY if junction.has_active_incident else 0.0
    final_score = min(100.0, mitigated_risk + incident_penalty)

    return RiskScoreResponse(
        junction_id=junction.id,
        junction_name=junction.name,
        risk_score=round(final_score, 2),
        congestion_component=congestion_component,
        accident_component=accident_component,
        speed_component=speed_component,
        police_mitigation=police_mitigation,
        incident_penalty=incident_penalty,
        active_police=junction.active_police,
        has_active_incident=junction.has_active_incident,
    )

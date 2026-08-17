"""
Greedy Police Allocation Module.

This is the optimizer that answers: "Given N officers and 35 junctions,
where should each officer be stationed to minimise city-wide danger?"

Algorithm (from the implementation plan):
  1. Pool all available officers (sum of baseline_police = 74).
  2. Clear every junction's active_police to 0.
  3. One-by-one, assign each officer to whichever junction currently
     has the HIGHEST risk score.  Each officer reduces that junction's
     score by 15 points, so the algorithm naturally balances itself —
     it won't pile all officers at one spot.
  4. Repeat until the pool is empty.

Junctions that have been manually overridden by a human operator
(tracked in state.override_locks) keep their manually-set count;
those officers are subtracted from the pool before the greedy loop.
"""

from copy import deepcopy
from app import state
from app.scoring import compute_risk_score
from app.models import (
    AllocationResponse,
    JunctionAllocation,
    SplitReasoning,
    ScenarioMetrics,
    ComparisonImprovement,
    ComparisonResponse,
)

# Maximum officers that can be assigned to any single junction.
# Prevents the incident penalty (+50) from hogging the entire police force.
MAX_OFFICERS_PER_JUNCTION = 10


def compute_split(
    total_allocated: int,
    accident_history: int,
    traffic_volume: int,
    city_avg_accidents: float,
    city_avg_traffic: float,
) -> dict:
    """
    Split allocated officers between scene management and traffic control.

    Accident history increases scene management ratio (securing scene).
    Traffic volume increases traffic control ratio (preventing gridlock).
    """
    def clamp(x: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, x))

    if total_allocated <= 0:
        return {
            "police_scene_management": 0,
            "traffic_control": 0,
            "accident_factor": 0.0,
            "traffic_factor": 0.0,
            "scene_ratio_used": 0.5,
        }

    if total_allocated == 1:
        return {
            "police_scene_management": 1,
            "traffic_control": 0,
            "accident_factor": None,
            "traffic_factor": None,
            "scene_ratio_used": 1.0,
        }

    accident_factor = (
        clamp((accident_history - city_avg_accidents) / city_avg_accidents, -1.0, 1.0)
        if city_avg_accidents > 0
        else 0.0
    )
    traffic_factor = (
        clamp((traffic_volume - city_avg_traffic) / city_avg_traffic, -1.0, 1.0)
        if city_avg_traffic > 0
        else 0.0
    )

    scene_ratio = 0.5 + (0.15 * accident_factor) - (0.15 * traffic_factor)
    scene_ratio = clamp(scene_ratio, 0.3, 0.7)

    scene = int(round(total_allocated * scene_ratio))
    traffic = total_allocated - scene

    return {
        "police_scene_management": scene,
        "traffic_control": traffic,
        "accident_factor": round(accident_factor, 2),
        "traffic_factor": round(traffic_factor, 2),
        "scene_ratio_used": round(scene_ratio, 2),
    }


def compute_scenario_metrics(junctions_data: list[dict]) -> ScenarioMetrics:
    """
    Compute aggregate KPIs for a given deployment scenario.
    
    junctions_data: list of dicts with 'risk_score' and 'assigned_officers'.
    """
    if not junctions_data:
        return ScenarioMetrics(
            avg_risk_score=0.0,
            uncovered_high_risk_count=0,
            overconcentration_officers=0,
        )

    avg_risk = sum(j["risk_score"] for j in junctions_data) / len(junctions_data)
    uncovered_high_risk = sum(
        1 for j in junctions_data if j["risk_score"] >= 70 and j["assigned_officers"] == 0
    )
    overconcentration = sum(
        j["assigned_officers"] for j in junctions_data if j["risk_score"] < 40
    )

    return ScenarioMetrics(
        avg_risk_score=round(avg_risk, 1),
        uncovered_high_risk_count=uncovered_high_risk,
        overconcentration_officers=overconcentration,
    )


def compare_scenarios(
    baseline_junctions: list[dict],
    ai_junctions: list[dict],
) -> ComparisonResponse:
    """
    Compare baseline scenario with AI-recommended deployment scenario.
    """
    baseline = compute_scenario_metrics(baseline_junctions)
    ai = compute_scenario_metrics(ai_junctions)

    risk_drop = baseline.avg_risk_score - ai.avg_risk_score
    risk_drop_pct = (
        (risk_drop / baseline.avg_risk_score * 100)
        if baseline.avg_risk_score > 0
        else 0.0
    )

    return ComparisonResponse(
        baseline=baseline,
        ai_recommended=ai,
        improvement=ComparisonImprovement(
            avg_risk_score_drop=round(risk_drop, 1),
            avg_risk_score_drop_pct=round(risk_drop_pct, 1),
            uncovered_high_risk_reduction=baseline.uncovered_high_risk_count - ai.uncovered_high_risk_count,
            overconcentration_reduction=baseline.overconcentration_officers - ai.overconcentration_officers,
        ),
    )


def run_allocation() -> AllocationResponse:
    """
    Execute the greedy allocation and update the in-memory state.

    Returns an AllocationResponse with split details and before/after city-wide risk metrics.
    """
    all_junctions = state.get_all_junctions()
    if not all_junctions:
        return AllocationResponse(
            total_officers=0,
            allocations=[],
            city_risk_before=0.0,
            city_risk_after=0.0,
        )

    # Compute city averages dynamically across all junctions
    city_avg_accidents = sum(j.accident_history for j in all_junctions) / len(all_junctions)
    city_avg_traffic = sum(j.traffic_volume for j in all_junctions) / len(all_junctions)

    # ------------------------------------------------------------------
    # 1. Calculate BEFORE metrics (baseline / current state)
    # ------------------------------------------------------------------
    before_scores = [compute_risk_score(j).risk_score for j in all_junctions]
    city_risk_before = round(sum(before_scores) / len(before_scores), 2)

    # ------------------------------------------------------------------
    # 2. Compute the officer pool
    # ------------------------------------------------------------------
    total_officers = sum(j.baseline_police for j in all_junctions)

    # Subtract officers locked by human overrides
    locked_officers = 0
    for j in all_junctions:
        if j.id in state.override_locks:
            locked_officers += j.active_police  # keep their current count
        else:
            j.active_police = 0  # reset non-locked junctions

    available = total_officers - locked_officers

    # ------------------------------------------------------------------
    # 3. Greedy distribution loop
    # ------------------------------------------------------------------
    for _ in range(available):
        best_junction = None
        best_score = -1.0

        for j in all_junctions:
            if j.id in state.override_locks:
                continue
            if j.active_police >= MAX_OFFICERS_PER_JUNCTION:
                continue  # This junction is already at its officer cap
            score = compute_risk_score(j).risk_score
            if score > best_score:
                best_score = score
                best_junction = j

        if best_junction is None:
            break  # No eligible junctions left

        # Station one officer at the riskiest junction
        best_junction.active_police += 1

    # ------------------------------------------------------------------
    # 4. Calculate AFTER metrics & Split Breakdown
    # ------------------------------------------------------------------
    after_scores = [compute_risk_score(j).risk_score for j in all_junctions]
    city_risk_after = round(sum(after_scores) / len(after_scores), 2)

    # Build the per-junction allocation summary with split reasoning
    allocations: list[JunctionAllocation] = []
    for j in all_junctions:
        split = compute_split(
            total_allocated=j.active_police,
            accident_history=j.accident_history,
            traffic_volume=j.traffic_volume,
            city_avg_accidents=city_avg_accidents,
            city_avg_traffic=city_avg_traffic,
        )

        reasoning = (
            SplitReasoning(
                accident_factor=split["accident_factor"],
                traffic_factor=split["traffic_factor"],
                scene_ratio_used=split["scene_ratio_used"],
            )
            if split["scene_ratio_used"] is not None
            else None
        )

        allocations.append(
            JunctionAllocation(
                junction_id=j.id,
                junction_name=j.name,
                officers_assigned=j.active_police,
                police_scene_management=split["police_scene_management"],
                traffic_control=split["traffic_control"],
                is_locked=j.id in state.override_locks,
                split_reasoning=reasoning,
            )
        )

    return AllocationResponse(
        total_officers=total_officers,
        allocations=allocations,
        city_risk_before=city_risk_before,
        city_risk_after=city_risk_after,
    )


def run_comparison() -> ComparisonResponse:
    """
    Compute comparative impact metrics between baseline deployment and AI allocation.
    Does not mutate live state permanently.
    """
    all_junctions = state.get_all_junctions()
    if not all_junctions:
        return compare_scenarios([], [])

    # 1. Baseline scenario: active_police equals baseline_police
    baseline_list = []
    for j in all_junctions:
        temp_j = deepcopy(j)
        temp_j.active_police = j.baseline_police
        score = compute_risk_score(temp_j).risk_score
        baseline_list.append({
            "risk_score": score,
            "assigned_officers": temp_j.active_police,
        })

    # 2. AI Recommended scenario: simulate greedy allocation non-destructively
    sim_junctions = [deepcopy(j) for j in all_junctions]
    total_officers = sum(j.baseline_police for j in sim_junctions)

    # Locked overrides
    locked_officers = 0
    for j in sim_junctions:
        if j.id in state.override_locks:
            locked_officers += j.active_police
        else:
            j.active_police = 0

    available = total_officers - locked_officers
    for _ in range(available):
        best_j = None
        best_score = -1.0
        for j in sim_junctions:
            if j.id in state.override_locks or j.active_police >= MAX_OFFICERS_PER_JUNCTION:
                continue
            score = compute_risk_score(j).risk_score
            if score > best_score:
                best_score = score
                best_j = j
        if best_j is None:
            break
        best_j.active_police += 1

    ai_list = []
    for j in sim_junctions:
        score = compute_risk_score(j).risk_score
        ai_list.append({
            "risk_score": score,
            "assigned_officers": j.active_police,
        })

    return compare_scenarios(baseline_list, ai_list)

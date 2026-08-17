"""
Dijkstra's Shortest-Path Routing Module.

Used for the "Emergency Routing" stretch goal: given an origin junction
and a destination junction, find the fastest path through the city
considering live traffic speeds.

How it works:
  - Build a weighted graph from roads.json.
  - Edge weight = distance_km / current_speed  (i.e. travel TIME in hours).
  - Run Dijkstra's algorithm to find the path with minimum total time.
  - Return the ordered list of junctions, roads, total distance, and ETA.

Why Dijkstra over A*?
  - A* needs a heuristic (like Haversine distance). For 35 nodes and
    102 edges, plain Dijkstra is already instant (<1ms), so the added
    complexity of A* is unnecessary for this demo.
"""

import heapq
from app import state
from app.models import RouteResponse


from app.scoring import compute_risk_score

# Minimum speed cap to avoid division-by-zero on blocked roads
MIN_SPEED_KMH = 5


def _build_adjacency_list() -> dict[str, list[tuple[str, str, float]]]:
    """
    Build an adjacency list from the current road state, heavily penalizing
    congested and high-risk junctions from the heatmap.

    Returns:
        { source_id: [(target_id, road_id, total_weight_hours), ...], ... }

    Total Weight = Base Travel Time + Heatmap Danger/Congestion Penalty.
    This forces Dijkstra to actively steer emergency vehicles around
    traffic jams, high-risk red intersections, and active accident scenes.
    """
    adj: dict[str, list[tuple[str, str, float]]] = {}

    # Initialize empty lists for all junctions
    for jid in state.junctions:
        adj[jid] = []

    # Add edges with congestion-aware penalties
    for road in state.roads.values():
        speed = max(road.current_speed, MIN_SPEED_KMH)
        base_time_hours = road.distance_km / speed  # base physical travel time

        # Target junction risk penalty from heatmap
        target_j = state.junctions.get(road.target)
        if target_j:
            target_risk = compute_risk_score(target_j).risk_score
            # Congestion delay penalty: quadratic scaling with risk score
            # A safe green junction (risk ~20) adds almost 0 delay
            # A critical red junction (risk ~85) adds up to 15-20 minutes of queue delay
            congestion_penalty_hours = ((target_risk / 100.0) ** 2) * 0.30

            # If there is an active accident incident, add extra 30 min blockage penalty
            if target_j.has_active_incident:
                congestion_penalty_hours += 0.50
        else:
            congestion_penalty_hours = 0.0

        total_weight = base_time_hours + congestion_penalty_hours
        adj[road.source].append((road.target, road.id, total_weight))

    return adj


def find_shortest_path(source_id: str, target_id: str) -> RouteResponse | None:
    """
    Run Dijkstra's algorithm from source to target.

    Returns a RouteResponse with the path, or None if no path exists.
    """
    if source_id not in state.junctions or target_id not in state.junctions:
        return None

    adj = _build_adjacency_list()

    # Dijkstra setup
    # dist[node] = shortest distance (time) from source to node
    dist: dict[str, float] = {jid: float("inf") for jid in state.junctions}
    dist[source_id] = 0.0

    # prev[node] = (previous_node, road_id_used) for path reconstruction
    prev: dict[str, tuple[str, str] | None] = {jid: None for jid in state.junctions}

    # Priority queue: (distance, node_id)
    pq: list[tuple[float, str]] = [(0.0, source_id)]

    visited: set[str] = set()

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_node in visited:
            continue
        visited.add(current_node)

        # Early exit if we reached the target
        if current_node == target_id:
            break

        for neighbor, road_id, weight in adj.get(current_node, []):
            if neighbor in visited:
                continue
            new_dist = current_dist + weight
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                prev[neighbor] = (current_node, road_id)
                heapq.heappush(pq, (new_dist, neighbor))

    # If target was never reached
    if dist[target_id] == float("inf"):
        return None

    # Reconstruct path
    path_junctions: list[str] = []
    path_roads: list[str] = []
    total_distance = 0.0

    current = target_id
    while current != source_id:
        path_junctions.append(current)
        prev_node, road_id = prev[current]
        path_roads.append(road_id)
        # Look up the road to get its distance
        road = state.roads[road_id]
        total_distance += road.distance_km
        current = prev_node

    path_junctions.append(source_id)

    # Reverse to get source -> target order
    path_junctions.reverse()
    path_roads.reverse()

    # Total time in minutes (dist is in hours)
    total_time_minutes = round(dist[target_id] * 60, 2)

    return RouteResponse(
        path_junction_ids=path_junctions,
        path_road_ids=path_roads,
        total_distance_km=round(total_distance, 2),
        total_time_minutes=total_time_minutes,
    )

# Task Specification: Member 5

## Objective: Dijkstra/A* Pathfinding for Emergency Routing

You are responsible for implementing the shortest-path engine used to route emergency vehicles (ambulances, fire engines) around congested junctions.

---

## Task 1: Dijkstra/A* Algorithm Design

You need to write a Python module (`routing.py`) that reads the road network graph and computes the fastest path between two junctions.

### Graph and Weights:
1. **Nodes:** Loaded from [`data/junctions.json`](file:///d:/Hackathon/data/junctions.json).
2. **Edges:** Loaded from [`data/roads.json`](file:///d:/Hackathon/data/roads.json) (which contains bidirectional links).
3. **Edge Cost (Congestion Weights):** Travel time on each road is dynamically weighted by its length and traffic congestion speed:
   $$\text{Weight} = \frac{\text{distance\_km}}{\text{current\_speed}}$$
   *Note: Ensure the algorithm handles divisions by zero if speed drops to 0 (cap minimum speed at e.g., 5 km/h to prevent infinite weight).*

---

## Task 2: FastAPI Integration

The backend team will set up the API endpoints for you. You need to write the core routing function that integrates with the `/api/route` endpoint:

### Interface:
```python
def find_shortest_path(graph_data, source_id: str, target_id: str) -> dict:
    """
    Returns the sequence of node IDs and road IDs representing the path,
    along with total distance and estimated travel time.
    """
    # Your Dijkstra or A* implementation here
    # ...
    return {
        "path_junction_ids": ["J1", "J2", "J3"],
        "path_road_ids": ["R1", "R2"],
        "total_distance_km": 2.9,
        "total_time_minutes": 5.4
    }
```

### Next Steps:
* Review [`data/roads.json`](file:///d:/Hackathon/data/roads.json) to understand the source-target edge properties.
* Write a test script locally to verify your pathfinder outputs correct lists of junctions.
* Work with the backend developer to hook your `find_shortest_path` function into the FastAPI router.

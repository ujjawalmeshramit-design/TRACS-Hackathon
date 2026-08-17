# Backend Technical Guide & Frontend Integration Cheat-Sheet

---

## Part 1: Judge Q&A & Screening Defense Guide

### 1. "What is the Main Bridge API connecting Frontend and Backend?"
* **Primary Heatmap Bridge:** `GET /api/risk-scores`
  * Returns all 35 junctions with coordinates (`lat`, `lng`), final danger scores ($0-100$), and the full 5-part explainable breakdown for map tooltips.
* **Primary Dashboard Bridge:** `POST /api/allocate`
  * Runs the greedy optimizer, returns city-wide risk improvement metrics (`city_risk_before` vs `city_risk_after`), and provides the per-junction officer placement.

---

### 2. "Walk me through your Backend Data Pipelines."
Our backend uses a clean 4-stage modular pipeline architecture built on **Python 3.12 + FastAPI + Pydantic**:

```
[JSON Data] ➔ [1. State Loader] ➔ [2. Risk-Scoring Pipeline] ➔ [3. Allocation Pipeline] ➔ [4. Dijkstra Routing Pipeline]
```

1. **Data Ingestion & State Pipeline (`app/state.py`)**:
   * Uses FastAPI's `lifespan` event to parse `data/junctions.json` (35 nodes) and `data/roads.json` (102 bidirectional edges) into in-memory dictionaries on server boot.
   * Provides $O(1)$ constant-time lookup for any junction or road by ID.
   * Maintains `override_locks` (a Python set) to track junctions manually locked by human dispatchers.

2. **Risk-Scoring Pipeline (`app/scoring.py`)**:
   * Takes raw traffic parameters and evaluates a 3-step explainable formula:
     * **Base Risk:** $(40\% \times \text{Congestion}) + (40\% \times \text{Accident History}) + (20\% \times \text{Speed Drop})$.
     * **Police Mitigation:** Subtracts $15$ points per active officer.
     * **Incident Penalty:** Adds $+50$ points if `has_active_incident` is `true`.
   * Clamps final output between $0$ and $100$.

3. **Personnel Allocation Pipeline (`app/allocation.py`)**:
   * **Greedy Optimization:** Sums total available officers ($74$), clears non-locked active officers, and iteratively places $1$ officer at a time onto whichever junction currently has the highest risk score.
   * **Resource Cap:** Enforces a maximum cap of $10$ officers per junction to prevent a single accident from hogging the entire city's police force.

4. **Emergency Routing Pipeline (`app/routing.py`)**:
   * Implements **Dijkstra's Shortest Path Algorithm** with a `heapq` priority queue.
   * **Edge Weights:** Travel time in hours ($\text{Weight} = \frac{\text{Distance (km)}}{\max(\text{Current Speed (km/h)}, 5)}$).
   * Automatically routes emergency vehicles around congested or slow road segments.

---

### 3. "Where is the AI in your system? Is it Machine Learning?"
> **Winning Answer to tell Judges:**
> *"Our AI is specifically the **Risk-Scoring Model and Optimization Engine**. We deliberately chose a transparent, weighted mathematical model over a black-box machine learning model because police dispatch decisions require **100% auditability and explainability**. Every score from 0 to 100 can be traced back to exact congestion and accident metrics. The allocation engine uses search-based AI (Greedy Optimization) and routing uses search-based AI (Dijkstra's Algorithm)."*

---

### 4. "How do Frontend and Backend communicate?"
* Communication happens over standard **REST APIs** returning **JSON payloads**.
* We enabled **CORS Middleware (`CORSMiddleware`)** in FastAPI allowing all cross-origin requests (`*`) so the Leaflet.js frontend running on localhost or any port can call the backend on port `8000` without browser security blocks.

---

## Part 2: Note to Send to the Frontend Developer

Copy and send this text directly to your Frontend Developer:

```text
Hey! The FastAPI backend is live at http://127.0.0.1:8000. Here is how to wire the dashboard:

1. Heatmap Markers & Colors:
   - Call GET http://127.0.0.1:8000/api/risk-scores
   - Loop over the list and draw Leaflet markers using "lat" and "lng".
   - Color code markers based on "risk_score":
     * 0 to 40  -> Green (Low Risk)
     * 40 to 70 -> Yellow (Medium Risk)
     * 70 to 100-> Red (High Risk)
   - Hover Tooltip: Show the breakdown fields ("congestion_component", "accident_component", "speed_component", "police_mitigation", "incident_penalty").

2. Reallocate Police Button:
   - Call POST http://127.0.0.1:8000/api/allocate
   - Use "city_risk_before" and "city_risk_after" to show the risk reduction banner.
   - Update officer counts on the map from "allocations".

3. Simulate Accident Button:
   - Call POST http://127.0.0.1:8000/api/simulate-incident with JSON: {"junction_id": "J9", "activate": true}
   - Immediately re-fetch GET /api/risk-scores to watch J9 turn bright red (+50 risk spike)!

4. Emergency Routing (Stretch Goal):
   - Call POST http://127.0.0.1:8000/api/route with JSON: {"source_id": "J35", "target_id": "J9"}
   - Draw a Leaflet Polyline connecting the junctions in "path_junction_ids".

Interactive API Docs: http://127.0.0.1:8000/docs
```

---

## Part 3: Team Status & Next Steps

### Member 3 Status:
* **Work Complete!** Member 3 has generated and updated all $35$ junctions and $102$ bidirectional roads in [`data/junctions.json`](file:///d:/Hackathon/data/junctions.json) and [`data/roads.json`](file:///d:/Hackathon/data/roads.json).
* **Next Task for Member 3:** Since their core mock data job is finished, as Team Lead you can assign Member 3 to:
  1. Assist the Frontend Developer with UI styling / Leaflet map setup.
  2. Help prepare pitch slides and demo data scenarios for screening.

### Members 4 & 5 Status:
* **Waiting for their solutions:**
  * Once Member 4 sends their **Split Incident Response** logic (police vs traffic control roles), we will add the split fields to `app/allocation.py`.
  * Once Member 5 sends their **Custom Routing tweaks**, we will integrate them into `app/routing.py`.

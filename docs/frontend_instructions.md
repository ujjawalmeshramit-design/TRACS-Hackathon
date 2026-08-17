# Frontend Integration Guide: Traffic Risk Heatmap & Dashboard

Welcome! The backend API is running live at **`http://127.0.0.1:8000`**.

This document gives you everything you need to build and wire the frontend control room dashboard using **React (or HTML/JS) + Leaflet.js**.

---

## 1. Quick Reference: API Endpoints

| Feature | Method | Endpoint | Payload / Params | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| **All Junctions** | `GET` | `/api/junctions` | None | Array of all 35 Nagpur junctions |
| **All Roads** | `GET` | `/api/roads` | None | Array of all 102 road segments |
| **Heatmap Risk Scores** | `GET` | `/api/risk-scores` | None | Risk scores (0-100) + full breakdown |
| **Single Junction Score** | `GET` | `/api/risk-scores/{id}` | Path param: `junction_id` | Risk score for one junction |
| **Simulate Accident** | `POST` | `/api/simulate-incident` | `{"junction_id": "J9", "activate": true}` | Updated score (+50 penalty) |
| **AI Reallocation** | `POST` | `/api/allocate` | None | Greedy allocation + before/after risk |
| **Manual Override** | `POST` | `/api/override` | `{"junction_id": "J9", "officer_count": 5}` | Locks officer count for junction |
| **Emergency Route** | `POST` | `/api/route` | `{"source_id": "J35", "target_id": "J9"}` | Dijkstra shortest path + travel time |
| **Reset Demo** | `POST` | `/api/reset` | None | Resets all data to clean JSON baseline |

> 💡 **Interactive Swagger Docs:** Open [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs) in your browser to test endpoints interactively!

---

## 2. Step-by-Step UI Component Integration

### Step A: Interactive Heatmap (Leaflet.js)
1. Call `GET http://127.0.0.1:8000/api/risk-scores`.
2. For each item in the response, create a Leaflet CircleMarker using `lat` and `lng`.
3. **Color-Code the Markers based on `risk_score`:**
   * 🟢 **Green (Low Risk):** `risk_score` between `0` and `40`
   * 🟡 **Yellow (Medium Risk):** `risk_score` between `40` and `70`
   * 🔴 **Red (High Risk):** `risk_score` between `70` and `100`
4. **Popup Tooltip:** When a user clicks a marker, render a tooltip showing:
   * Junction Name (`junction_name`)
   * Total Risk Score (`risk_score`)
   * Active Officers Badge (`active_police`)
   * **Score Breakdown:**
     * Congestion: `+congestion_component`
     * Accidents: `+accident_component`
     * Speed Drop: `+speed_component`
     * Police Reduction: `-police_mitigation`
     * Incident Penalty: `+incident_penalty`

---

### Step B: Ranked Junctions Sidebar
1. Sort the list of risk scores in descending order (`highest risk score first`).
2. Render a table or list in the sidebar showing:
   * **Rank** (1 to 35)
   * **Junction Name**
   * **Risk Score** (Badge with green/yellow/red color)
   * **Officers Assigned**
3. **Auto-Flag Unmanned High-Risk Locations:**
   If `risk_score > 70` AND `active_police == 0`, highlight the row in bright red with an alert icon ⚠️ **"HIGH RISK - UNMANNED"**.

---

### Step C: "Simulate Accident" Trigger
1. Add a dropdown of junctions and a **"Simulate Accident"** button.
2. On click, send a `POST` request to `http://127.0.0.1:8000/api/simulate-incident`:
   ```json
   {
     "junction_id": "J9",
     "activate": true
   }
   ```
3. Immediately re-fetch `GET /api/risk-scores`.
4. The target junction score will spike by **+50 points**, instantly turning its marker bright red!

---

### Step D: "Recommend AI Deployment" Button
1. Add a prominent **"Optimize Deployment"** button.
2. On click, send a `POST` request to `http://127.0.0.1:8000/api/allocate`.
3. Display the **Before vs. After Comparison Banner**:
   * *Before Reallocation City Risk:* `city_risk_before`
   * *After Reallocation City Risk:* `city_risk_after`
   * *Total Risk Reduction:* Calculate `city_risk_before - city_risk_after`.
4. Update the officer counts on all map markers and sidebar rows using `allocations`.

---

### Step E: Emergency Vehicle Routing (Stretch Goal)
1. Add origin and destination selectors (e.g. Origin: `J35`, Destination: `J9`) and an **"Find Ambulance Route"** button.
2. On click, send a `POST` request to `http://127.0.0.1:8000/api/route`:
   ```json
   {
     "source_id": "J35",
     "target_id": "J9"
   }
   ```
3. Use the returned `path_junction_ids` to fetch the coordinates of each junction in the path.
4. Render a blue **Leaflet Polyline** connecting the path junctions on the map.
5. Display the ETA card: **Distance:** `total_distance_km` km | **Est. Time:** `total_time_minutes` mins.

---

### Step F: Demo Reset Button
1. Place a **"Reset Demo"** button in the header/settings.
2. On click, send a `POST` request to `http://127.0.0.1:8000/api/reset`.
3. Re-fetch all data to return the dashboard to its clean starting state.

---

## 3. Example Fetch Code (JavaScript)

```javascript
// Fetch Risk Scores and render map markers
async function loadHeatmap() {
  const response = await fetch('http://127.0.0.1:8000/api/risk-scores');
  const data = await response.json();
  
  data.forEach(item => {
    // Determine color
    let color = '#22c55e'; // Green
    if (item.risk_score > 70) color = '#ef4444'; // Red
    else if (item.risk_score > 40) color = '#f59e0b'; // Yellow

    // Render marker (assuming junctions dict has lat/lng)
    const junction = junctions[item.junction_id];
    L.circleMarker([junction.lat, junction.lng], {
      color: color,
      radius: 12,
      fillOpacity: 0.8
    }).addTo(map).bindPopup(`
      <b>${item.junction_name}</b><br/>
      Risk Score: <b>${item.risk_score}/100</b><br/>
      Officers: ${item.active_police}<br/>
      <hr/>
      <small>
        Congestion: +${item.congestion_component}<br/>
        Accidents: +${item.accident_component}<br/>
        Speed Drop: +${item.speed_component}<br/>
        Police Mitigation: -${item.police_mitigation}<br/>
        ${item.has_active_incident ? '<b style="color:red">ACCIDENT PENALTY: +50</b>' : ''}
      </small>
    `);
  });
}
```

# Task Specification: Member 4

## Objective: Split Incident-Response & Before/After Comparison Logic

You are responsible for designing the business logic and algorithms for:
1. **Split Incident-Response Allocation:** How deployed personnel are split between managing the accident scene (police/security) and controlling traffic flow around it.
2. **Before/After Comparison Logic:** Tracking the metrics to prove that the AI-recommended greedy allocation is better than the static baseline deployment.

---

## Task 1: Split Incident-Response Logic

When an accident is simulated, the backend will assign additional officers to that junction. You need to write the logic that splits these officers into two roles:
* **Scene Management (Police):** Officers securing the immediate incident site.
* **Traffic Control:** Officers stationed at the junction to keep traffic moving and prevent congestion.

### Requirements:
1. Define the split ratio or rules (e.g., is it a 50/50 split? Proportional to traffic volume? Or does it depend on the severity of the accident history?).
2. Define the JSON response fields that the backend `/api/allocate` endpoint should return. For example:
   ```json
   {
     "junction_id": "J3",
     "total_allocated": 4,
     "police_scene_management": 2,
     "traffic_control": 2
   }
   ```

---

## Task 2: Before/After Comparison Logic

To show the value of this system to the judges, we need to compare the **Baseline (static)** deployment vs. the **AI-Recommended (dynamic)** deployment.

### Requirements:
1. Design the performance metrics for comparison:
   * **Uncovered High-Risk Locations:** Count of junctions with high risk scores but 0 assigned officers.
   * **Resource Over-concentration:** Count of officers stationed at low-risk junctions where they aren't needed.
   * **City-wide Average Risk Score:** Compare the sum of risk scores across all junctions before vs. after dynamic reallocation.
2. Coordinate with the Frontend Developer to ensure the UI has a toggle switch between the two views and displays these metrics in a side-by-side comparison card.

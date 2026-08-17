# 🚦 TRACS — Traffic Risk Analytics & Control System

> **AI-Powered Real-Time Traffic Management, Dynamic Resource Allocation, and Heat-Aware Emergency Vehicle Routing for Nagpur City.**

---

## 📌 Executive Summary

**TRACS (Traffic Risk Analytics & Control System)** is an integrated urban traffic intelligence platform built to solve severe traffic congestion, reduce road accident risks, and provide priority routing for emergency vehicles.

By combining **real-time risk scoring**, **greedy AI police re-allocation**, and **heat-aware Dijkstra pathfinding**, TRACS empowers city traffic control rooms to transition from reactive traffic handling to proactive, data-driven traffic optimization.

---

## 🔥 Key Features

### 1. 🌐 Interactive Heatmaps & Citywide Risk Monitoring
- Monitors **35 major intersections** across Nagpur City (MG Road, Sitabuldi, Medical Square, Variety Square, etc.).
- Dual-layer visualization: **live glowing heatmap** + **sleek, color-coded risk markers** (🔴 High Risk, 🟡 Medium Risk, 🟢 Low Risk).
- Real-time telemetry including traffic density, speed, weather conditions, and officer coverage.

### 2. ⚡ Greedy AI Police Officer Re-allocation Engine
- Dynamically redistributes police officers from low-risk donor junctions to high-risk bottlenecks and active incident zones.
- Reduces target junction risk by **~14 points per officer deployed**, balancing citywide police coverage.
- Live toast notifications and activity logging tracking officer deployment movements.

### 3. 🚑 Heat-Aware Emergency Vehicle Routing
- Integrates **Dijkstra pathfinding** with live traffic risk weights (`distance × (1 + risk_score/25)`).
- Automatically steers emergency vehicles around red high-congestion heat zones onto clear green corridors.
- **OSRM (Open Source Routing Machine)** integration for turn-by-turn road polyline geometry that follows actual physical streets.

### 4. 🚨 Real-time Accident Simulator
- Simulated traffic collision button elevates junction risk to **96 (Critical High Risk)**.
- Triggers instant timeline updates, map marker color updates, donut chart recalculations, and priority dispatch alerts.

### 5. 📊 Deployment Impact Analytics & Comparative Analysis
- Side-by-side **Before Deployment vs Projected After Deployment** heatmaps showing citywide risk reduction.
- Interactive date range filters (**May 2025, April 2025, March 2025, Q1 2025**).
- Comprehensive junction comparison tables, average risk score trendlines, and key impact summary metrics.

---

## 🛠️ Architecture & Tech Stack

```
           +-------------------------------------------------------+
           |                Web Browser (Client)                   |
           |   (HTML5, Vanilla CSS3, JS ES6+, Leaflet, Chart.js)   |
           +---------------------------+---------------------------+
                                       |
                                       |  HTTP / REST API
                                       v
           +-------------------------------------------------------+
           |                 FastAPI Backend Server                |
           |             (Python 3.12, Uvicorn, Pydantic)          |
           +----+----------------------+----------------------+----+
                |                      |                      |
                v                      v                      v
     +-------------------+   +--------------------+   +--------------------+
     | Risk Scoring      |   | Greedy Police      |   | Heat-Aware Dijkstra|
     | Engine            |   | Allocator          |   | Router             |
     +-------------------+   +--------------------+   +--------------------+
```

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | HTML5, Vanilla CSS3 (Custom CSS Tokens & Animations), JavaScript ES6+ |
| **Mapping & Maps** | Leaflet.js, Leaflet.heat Plugin, OpenStreetMap Tile Layer |
| **Road Geometry** | OSRM (Open Source Routing Machine) API |
| **Data Visualization** | Chart.js (Grouped Bar Charts, Sparklines, Donut Charts) |
| **Backend API** | FastAPI, Uvicorn ASGI Server, Pydantic v2 |
| **Programming Language** | Python 3.12 |

---

## 📁 Directory Structure

```
d:\Hackathon\
├── 📂 frontend/              # Web Application Frontend
│   ├── index.html            # System Overview & Landing Page
│   ├── dashboard.html        # Live Traffic Dashboard & Map View
│   ├── deployment.html       # Officer Deployment & Re-allocation Panel
│   ├── Dispatch.html         # Emergency Vehicle Routing Module
│   ├── analytics.html        # Deployment Impact Analytics
│   ├── app.js                # Main Frontend Interactivity Engine
│   ├── styles.css            # Custom Design System & Utilities
│   └── api-bridge.js         # API Bridge Script for Backend Sync
│
├── 📂 backend/               # FastAPI Server Application
│   ├── requirements.txt      # Python dependencies
│   └── app/                  # Application Package
│       ├── main.py           # Server Entry & Static Files Route (/demo/)
│       ├── models.py         # Pydantic Schemas & Data Validation
│       ├── scoring.py        # Traffic Risk Calculation Engine
│       ├── allocation.py     # Police Officer Optimization Logic
│       ├── routing.py        # Heat-Aware Dijkstra Route Calculation
│       └── state.py          # Central Live State Store
│
├── 📂 data/                  # City Datasets
│   ├── junctions.json        # 35 Nagpur Intersections Dataset
│   └── roads.json            # Road Network Connections & Distances
│
├── .gitignore                # Version Control Exclusions
└── README.md                 # System Documentation
```

---

## 🔌 API Reference

### `GET /api/junctions`
Returns all 35 monitored Nagpur city intersections with telemetry (lat, lng, officers deployed, required, speed, volume).

### `GET /api/risk-scores`
Returns live risk scores, risk levels (`high`, `medium`, `low`), and active incident flags.

### `POST /api/allocate`
Executes the greedy police allocation algorithm, moving officers from low-risk to high-risk junctions, returning before/after metrics.

### `POST /api/route`
Calculates standard vs heat-aware emergency routes given `source_id` and `target_id`.

```json
{
  "source_id": "J1",
  "target_id": "J12"
}
```

### `POST /api/compare`
Returns comparative impact metrics for analytics before and after TRACS deployment.

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/TRACS-Hackathon.git
cd TRACS-Hackathon
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the Backend Server
```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 5. Access the Web Application
Open your web browser and navigate to:
👉 **[http://127.0.0.1:8000/demo/](http://127.0.0.1:8000/demo/)**

- **Overview Page**: `http://127.0.0.1:8000/demo/`
- **Dashboard**: `http://127.0.0.1:8000/demo/dashboard.html`
- **Emergency Dispatch**: `http://127.0.0.1:8000/demo/Dispatch.html`
- **Deployment Control**: `http://127.0.0.1:8000/demo/deployment.html`
- **Analytics Impact**: `http://127.0.0.1:8000/demo/analytics.html`
- **Interactive API Docs (Swagger)**: `http://127.0.0.1:8000/docs`

---

## 🌐 Cloud Deployment Guide (Render.com)

To deploy TRACS live on the cloud:

1. Push your repository to **GitHub**.
2. Go to **[Render.com](https://render.com/)** and create a **New Web Service**.
3. Select your repository and configure:
   - **Environment**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Click **Create Web Service**. Your live production URL will be ready at `https://<your-app>.onrender.com/demo/`.

---

## 🏆 Hackathon Project Information

- **Project Name**: TRACS — Traffic Risk Analytics & Control System
- **Target Location**: Nagpur City, Maharashtra, India
- **Use Cases**: Smart City Traffic Intelligence, Traffic Police Deployment, Emergency Service Routing

---

*Built with ❤️ for Nagpur City Traffic Management.*

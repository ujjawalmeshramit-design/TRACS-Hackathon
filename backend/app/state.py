"""
In-memory state manager for the Traffic Risk Heatmap backend.

Why in-memory (not a database)?
  - This is a hackathon demo — we need speed, not persistence.
  - All data fits comfortably in RAM (35 junctions, 102 roads).
  - On server restart the state resets to the clean JSON baseline,
    which is actually useful for demo resets.

How it works:
  1. On startup, load_data() reads junctions.json and roads.json.
  2. The data is stored in two plain Python dicts keyed by ID.
  3. Every API call reads/writes from these dicts (fast O(1) lookups).
  4. A set of "locked" junction IDs tracks human overrides so the
     greedy allocator doesn't overwrite manual officer placements.
"""

import json
import os
from pathlib import Path
from app.models import Junction, Road

# ---------------------------------------------------------------------------
# Global state containers
# ---------------------------------------------------------------------------

# Dict of junction_id -> Junction object  (e.g. {"J1": Junction(...), ...})
junctions: dict[str, Junction] = {}

# Dict of road_id -> Road object  (e.g. {"R1": Road(...), ...})
roads: dict[str, Road] = {}

# Set of junction IDs where a human operator has manually set the police count.
# The greedy allocator will skip these junctions and not change their counts.
override_locks: set[str] = set()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def get_data_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "data",         # backend/data
        Path(__file__).resolve().parent.parent.parent / "data",  # repo_root/data
        Path.cwd() / "data",
        Path.cwd() / "backend" / "data",
    ]
    for p in candidates:
        if p.exists() and (p / "junctions.json").exists():
            return p
    raise FileNotFoundError("Could not find data directory containing junctions.json")


def load_data() -> None:
    """
    Read junctions.json and roads.json from the data/ folder and populate
    the global state dictionaries.

    Called once at application startup.
    """
    global junctions, roads

    data_dir = get_data_dir()

    junctions_path = data_dir / "junctions.json"
    roads_path = data_dir / "roads.json"

    # Load junctions
    with open(junctions_path, "r", encoding="utf-8") as f:
        raw_junctions = json.load(f)
    junctions = {j["id"]: Junction(**j) for j in raw_junctions}

    # Load roads
    with open(roads_path, "r", encoding="utf-8") as f:
        raw_roads = json.load(f)
    roads = {r["id"]: Road(**r) for r in raw_roads}

    print(f"[State] Loaded {len(junctions)} junctions and {len(roads)} roads from {data_dir}.")


# ---------------------------------------------------------------------------
# Helper accessors
# ---------------------------------------------------------------------------

def get_junction(junction_id: str) -> Junction | None:
    """Return a junction by ID, or None if not found."""
    return junctions.get(junction_id)


def get_all_junctions() -> list[Junction]:
    """Return all junctions as a list."""
    return list(junctions.values())


def get_all_roads() -> list[Road]:
    """Return all roads as a list."""
    return list(roads.values())


def reset_state() -> None:
    """
    Reload all data from disk and clear any overrides.
    Useful for resetting the demo between presentations.
    """
    override_locks.clear()
    load_data()

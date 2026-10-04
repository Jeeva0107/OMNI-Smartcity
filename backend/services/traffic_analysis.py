"""
Traffic Analysis Service
---------------------------------------------------------------------------
Responsibility: Produce system-wide traffic intelligence — overview KPIs,
historical trend data for charts, and short-term predictions.

Real implementation would call a time-series DB (InfluxDB / TimescaleDB)
and a trained prediction model. Until then, mock logic is used.
---------------------------------------------------------------------------
"""
import random, time, collections
from services.junction_service import get_all_junctions


# Rolling 30-minute history buffer (one entry per tick ~4 s)
_HISTORY_MAXLEN = 450          # 30 min × 60 s / 4 s per tick
_history: collections.deque = collections.deque(maxlen=_HISTORY_MAXLEN)


def _snapshot_to_history():
    """Called by the junction ticker — appended after every state update."""
    junctions = get_all_junctions()
    total_veh  = sum(j["vehicles"] for j in junctions)
    critical   = sum(1 for j in junctions if j["status"] == "CRITICAL")
    avg_speed  = round(sum(j["speed"]   for j in junctions) / len(junctions), 1)
    avg_flow   = round(sum(j["flow"]    for j in junctions) / len(junctions), 1)
    _history.append({
        "t":        time.strftime("%H:%M:%S"),
        "vehicles": total_veh,
        "critical": critical,
        "avgSpeed": avg_speed,
        "avgFlow":  avg_flow,
    })


def get_traffic_overview() -> dict:
    """KPI summary consumed by OverviewTab and TrafficIntelligenceTab."""
    junctions = get_all_junctions()
    high_crit  = [j for j in junctions if j["status"] in ("HIGH", "CRITICAL")]
    return {
        "timestamp":          time.strftime("%H:%M:%S"),
        "activeJunctions":    len(junctions),
        "vehiclesMonitored":  sum(j["vehicles"] for j in junctions) + random.randint(1600, 1900),
        "highCongestion":     len(high_crit),
        "activeIncidents":    sum(1 for j in junctions if j["status"] == "CRITICAL"),
        "emergencyCorridors": 1,
        "systemStatus":       "ONLINE",
        "avgCitySpeed":       round(sum(j["speed"] for j in junctions) / len(junctions), 1),
        "avgCityFlow":        round(sum(j["flow"]  for j in junctions) / len(junctions), 1),
    }


def get_traffic_history(window_minutes: int = 10) -> list:
    """
    Return a condensed version of the rolling history for charting.
    window_minutes: how far back to look (max 30).
    Returns up to 60 data points (1 per ~10 s) for smooth chart rendering.
    """
    # Seed with synthetic history if buffer is thin
    if len(_history) < 5:
        _seed_history()

    ticks = list(_history)
    desired = max(5, window_minutes * 15)   # ~15 samples per minute
    subset  = ticks[-desired:] if len(ticks) > desired else ticks
    # Thin to ≤60 points for chart performance
    step    = max(1, len(subset) // 60)
    return subset[::step]


def get_traffic_predictions() -> list:
    """
    Short-term (15-min) AI congestion predictions per junction.
    Real implementation: feed current telemetry into trained ML model.
    """
    junctions = get_all_junctions()
    predictions = []
    for j in junctions:
        # Simple heuristic: if queue is growing, predict worse status
        predicted_status = j["status"]
        confidence       = round(random.uniform(0.78, 0.97), 2)

        if j["queue"] > 20:
            predicted_status = "CRITICAL"
            confidence = round(random.uniform(0.88, 0.97), 2)
        elif j["queue"] > 12:
            predicted_status = "HIGH"
            confidence = round(random.uniform(0.80, 0.92), 2)

        predictions.append({
            "junctionId":      j["id"],
            "junctionName":    j["name"],
            "currentStatus":   j["status"],
            "predictedStatus": predicted_status,
            "predictedIn":     "15 min",
            "confidence":      confidence,
            "recommendation":  j["recommendedReason"],
            "timestamp":       time.strftime("%H:%M:%S"),
        })

    return predictions


# ── Private helpers ───────────────────────────────────────────────────────────
def _seed_history():
    """Fill the history buffer with synthetic data to make charts show up."""
    base_vehicles = 650
    for i in range(60):
        delta = random.randint(-20, 20)
        _history.append({
            "t":        f"synth-{i}",
            "vehicles": max(400, base_vehicles + delta),
            "critical": random.randint(0, 3),
            "avgSpeed": round(random.uniform(22, 42), 1),
            "avgFlow":  round(random.uniform(18, 38), 1),
        })
        base_vehicles = max(400, min(950, base_vehicles + delta))

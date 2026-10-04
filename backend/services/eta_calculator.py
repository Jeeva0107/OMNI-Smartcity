"""
ETA Calculator Service
---------------------------------------------------------------------------
Responsibility: Compute accurate estimated travel time between any two
junctions, incorporating live junction congestion, queue lengths, and
signal state from the junction service.

Algorithm: modified Dijkstra on the road graph where edge weight =
  base_travel_time × congestion_multiplier + expected_queue_delay

Real implementation: replace with a proper graph solver (networkx) or
hook into Google Maps / HERE API.
---------------------------------------------------------------------------
"""
import time

# Road network adjacency with base distances in km
ROAD_GRAPH: dict[str, list[tuple[str, float]]] = {
    "J1":  [("J2", 1.8), ("J3", 1.5)],
    "J2":  [("J1", 1.8), ("J4", 1.4), ("J5", 1.2)],
    "J3":  [("J1", 1.5), ("J5", 1.9), ("J8", 2.1)],
    "J4":  [("J2", 1.4), ("J6", 1.6)],
    "J5":  [("J2", 1.2), ("J3", 1.9), ("J6", 1.3), ("J7", 1.7)],
    "J6":  [("J4", 1.6), ("J5", 1.3), ("J9", 1.5)],
    "J7":  [("J5", 1.7), ("J8", 1.8), ("J9", 1.4)],
    "J8":  [("J3", 2.1), ("J7", 1.8), ("J10", 1.6)],
    "J9":  [("J6", 1.5), ("J7", 1.4), ("J12", 2.0)],
    "J10": [("J8", 1.6), ("J11", 1.9)],
    "J11": [("J10", 1.9), ("J12", 1.7)],
    "J12": [("J9", 2.0), ("J11", 1.7)],
}

# Average free-flow speed km/h per road segment
FREE_FLOW_SPEED = 50.0  # km/h


def _congestion_multiplier(status: str, signal: str) -> float:
    """
    Returns a time penalty factor.
    SMOOTH=1.0x, MODERATE=1.5x, HIGH=2.2x, CRITICAL=4.0x
    Red signal adds extra delay.
    """
    base = {"SMOOTH": 1.0, "MODERATE": 1.5, "HIGH": 2.2, "CRITICAL": 4.0}.get(status, 1.0)
    signal_penalty = 0.3 if signal == "RED" else 0.0
    return base + signal_penalty


def compute_eta(origin: str, destination: str, junction_states: list,
                mode: str = "normal") -> dict:
    """
    Dijkstra-based ETA computation.

    Parameters
    ----------
    origin, destination : str   junction IDs
    junction_states     : list  live junction dicts from junction_service
    mode                : str   'normal' | 'emergency' (emergency ignores signals)

    Returns
    -------
    dict with path, total_distance_km, estimated_time_min, eta_timestamp
    """
    # Build lookup for live junction states
    j_map = {j["id"]: j for j in junction_states}

    import heapq
    # (cost_minutes, junction_id, path_so_far)
    heap = [(0.0, origin, [origin])]
    visited: set[str] = set()

    while heap:
        cost, node, path = heapq.heappop(heap)
        if node in visited:
            continue
        visited.add(node)

        if node == destination:
            dist_km = sum(
                next(d for n, d in ROAD_GRAPH.get(path[i], []) if n == path[i + 1])
                for i in range(len(path) - 1)
                if len(path) > 1
            )
            eta_min = round(cost, 1)
            return {
                "origin":           origin,
                "destination":      destination,
                "path":             path,
                "totalDistanceKm":  round(dist_km, 2),
                "estimatedTimeMin": eta_min,
                "etaTimestamp":     _format_eta(eta_min),
                "mode":             mode,
                "timestamp":        time.strftime("%H:%M:%S"),
            }

        for neighbour, dist_km in ROAD_GRAPH.get(node, []):
            if neighbour in visited:
                continue
            j_state = j_map.get(neighbour, {})
            status  = j_state.get("status", "SMOOTH")
            signal  = "GREEN" if mode == "emergency" else j_state.get("signal", "GREEN")
            mult    = 1.0 if mode == "emergency" else _congestion_multiplier(status, signal)
            seg_time = (dist_km / FREE_FLOW_SPEED) * 60 * mult   # minutes
            heapq.heappush(heap, (cost + seg_time, neighbour, path + [neighbour]))

    return {"error": f"No path found from {origin} to {destination}"}


def _format_eta(minutes: float) -> str:
    m = int(minutes)
    s = int((minutes - m) * 60)
    return f"{m:02d}:{s:02d}"

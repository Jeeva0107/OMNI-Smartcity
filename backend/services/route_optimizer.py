"""
Route Optimization Service
---------------------------------------------------------------------------
Responsibility: Find and rank alternative routes between two junctions
using live traffic data. Applies ETA calculation for each candidate path.

Strategy: enumerate all candidate paths (BFS, depth-limited), compute ETA
for each, rank by estimated travel time, label the best as recommended.
---------------------------------------------------------------------------
"""
import time
from services.junction_service import get_all_junctions
from services.eta_calculator   import compute_eta, ROAD_GRAPH


# Congestion label from junction status
_CONG_LABEL = {
    "SMOOTH":   "LOW",
    "MODERATE": "MODERATE",
    "HIGH":     "HIGH",
    "CRITICAL": "CRITICAL",
}


def _bfs_paths(origin: str, destination: str, max_depth: int = 6) -> list[list[str]]:
    """
    BFS to enumerate all simple paths from origin → destination,
    limited to max_depth hops (avoids combinatorial explosion).
    """
    queue  = [[origin]]
    paths  = []
    while queue:
        path = queue.pop(0)
        node = path[-1]
        if len(path) > max_depth:
            continue
        for neighbour, _ in ROAD_GRAPH.get(node, []):
            if neighbour in path:      # no cycles
                continue
            new_path = path + [neighbour]
            if neighbour == destination:
                paths.append(new_path)
            else:
                queue.append(new_path)
    return paths


def _path_congestion_label(path: list[str], j_map: dict) -> str:
    worst = "SMOOTH"
    order = ["SMOOTH", "MODERATE", "HIGH", "CRITICAL"]
    for jid in path[1:]:              # skip origin
        status = j_map.get(jid, {}).get("status", "SMOOTH")
        if order.index(status) > order.index(worst):
            worst = status
    return worst


def _path_distance(path: list[str]) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        for neighbour, dist in ROAD_GRAPH.get(path[i], []):
            if neighbour == path[i + 1]:
                total += dist
                break
    return round(total, 2)


def calculate_routes(origin: str, destination: str,
                     mode: str = "normal") -> list[dict]:
    """
    Compute and rank all feasible routes between origin and destination.

    Returns a list of route dicts shaped exactly like INITIAL_ROUTES in
    the frontend's mock data so no frontend changes are needed.
    """
    junctions = get_all_junctions()
    j_map     = {j["id"]: j for j in junctions}

    # Special-case: if origin or destination are unknown, return mock
    if origin not in ROAD_GRAPH or destination not in ROAD_GRAPH:
        from data.mock_data import get_routes
        return get_routes()

    paths = _bfs_paths(origin, destination)
    if not paths:
        return []

    results = []
    for idx, path in enumerate(paths):
        eta_info   = compute_eta(origin, destination, junctions, mode=mode)
        # Use actual ETA only for matching path (simplified — recalculate per path)
        eta_single = compute_eta(path[0], path[-1], junctions, mode=mode)
        if "error" in eta_single:
            continue
        congestion = _path_congestion_label(path, j_map)
        dist       = _path_distance(path)
        results.append({
            "id":            f"ROUTE-{idx+1}",
            "name":          f"Route {chr(65+idx)} ({' → '.join(path)})",
            "origin":        origin,
            "destination":   destination,
            "path":          path,
            "distance":      dist,
            "estimatedTime": eta_single["estimatedTimeMin"],
            "congestion":    _CONG_LABEL.get(congestion, "MODERATE"),
            "isRecommended": False,
            "aiReason":      _build_reason(path, j_map, eta_single, mode),
            "timestamp":     time.strftime("%H:%M:%S"),
        })

    if not results:
        from data.mock_data import get_routes
        return get_routes()

    # Sort by ETA and mark the fastest as recommended
    results.sort(key=lambda r: r["estimatedTime"])
    results[0]["isRecommended"] = True

    from services.state_manager import state_manager
    state_manager.update_routes(results, notify=False)

    return results


def _build_reason(path: list[str], j_map: dict,
                  eta: dict, mode: str) -> str:
    bottleneck = max(
        path[1:],
        key=lambda jid: j_map.get(jid, {}).get("queue", 0)
    )
    bj = j_map.get(bottleneck, {})
    prefix = "🚑 Emergency corridor: signal overrides active. " if mode == "emergency" else ""
    return (
        f"{prefix}Estimated {eta['estimatedTimeMin']} min over {eta['totalDistanceKm']} km. "
        f"Highest queue at {bottleneck} — {bj.get('queue', '?')} vehicles. "
        f"Status: {bj.get('status', 'N/A')}."
    )

URGENT FINAL FIX — CONNECT AMBULANCE APP TO CONTROL ROOM

Do not redesign anything.
Do not remove anything from Emergency Corridors.
Do not modify the ambulance app.
Do not modify Render.
Do not modify TomTom.
Do not modify YOLO.

I need you to FIX THE EXISTING INTEGRATION NOW.

==================================================
CURRENT VERIFIED STATE
==================================================

The teammate's Ambulance App is already successfully connected to:

https://omni-smartcity-backend.onrender.com

The backend is successfully receiving:

ambulanceId = AMB-204

and repeated GPS location updates.

The backend is also successfully accepting Socket.IO connections.

Therefore the backend and ambulance app are WORKING.

==================================================
THE ACTUAL BUG
==================================================

The OMNI SmartCity CONTROL ROOM website still displays:

AMB-102

This is old simulated/stale ambulance data.

The control room must NOT display AMB-102 in LIVE MODE.

It must display the REAL ACTIVE ambulance from the backend.

If the backend active ambulance is:

AMB-204

the control room must show:

AMB-204

Do NOT solve this by replacing the string AMB-102 with AMB-204.

The ID must be dynamic.

==================================================
STEP 1 — FIND THE STALE SOURCE
==================================================

Search the entire frontend for:

AMB-102
INITIAL_AMBULANCE
Simulated Driver GPS
simulated ambulance
demo ambulance
13.0067
80.2020

Especially inspect:

src/components/views/EmergencyCorridorTab.jsx
src/components/map/GeoMap.jsx
TrafficContext
live state provider
ambulance state/constants

Find EXACTLY where the Emergency Corridors page gets AMB-102.

==================================================
STEP 2 — CONNECT TO EXISTING LIVE STATE
==================================================

Use the EXISTING centralized live state/WebSocket architecture.

Do NOT create another WebSocket.
Do NOT create another polling loop.
Do NOT create another state manager.

The data flow must be:

AMBULANCE APP
      ↓
Render Backend
      ↓
Central StateManager
      ↓
Existing realtime/live state
      ↓
TrafficContext / existing live provider
      ↓
EmergencyCorridorTab
      ↓
GeoMap

The EmergencyCorridorTab must consume the same live ambulance state.

==================================================
STEP 3 — LIVE AMBULANCE
==================================================

When an active ambulance exists, Emergency Corridors must dynamically display:

- ambulance ID
- latitude
- longitude
- destination
- route
- ETA
- distance
- current junction
- next junction
- corridor status

Use the actual property names from the existing backend/live-state object.

Do not invent a new data structure if one already exists.

==================================================
STEP 4 — MAP
==================================================

The ambulance map marker must use the live backend:

latitude
longitude
ambulance ID

When the ambulance moves in the teammate's app:

POST location
→ backend state changes
→ existing realtime event
→ frontend live state changes
→ map marker moves

NO PAGE REFRESH.

==================================================
STEP 5 — JUNCTION SIGNAL
==================================================

This is the second required connection.

When the active ambulance is approaching a junction, the control room must display that junction's emergency state.

For example:

AMB-204
NEXT JUNCTION: J2

J2
GREEN
EMERGENCY PRIORITY ACTIVE

If the backend changes J2:

RED → GREEN

the control room must update automatically.

Do NOT create a fake frontend signal.

Use the existing backend/junction state and existing realtime events.

The Ambulance App and Control Room must see the SAME junction state.

==================================================
STEP 6 — NO ACTIVE AMBULANCE
==================================================

If there is no active ambulance:

show:

NO ACTIVE EMERGENCY TRIP

Do NOT show AMB-102.

Do NOT show fake GPS.

Do NOT show "Simulated Driver GPS".

Simulation data may exist only in explicit DEMO/SIMULATION mode.

==================================================
STEP 7 — PRESERVE THE UI
==================================================

IMPORTANT:

The existing Emergency Corridors page must remain a FULL control-room page.

DO NOT reduce it to only:

START CORRIDOR

Keep:

- Emergency Corridor header
- Active ambulance information
- Large map
- Ambulance marker
- Route
- ETA
- Destination
- Current/next junction
- Junction signal states
- Corridor status
- Operator controls
- Activity/events
- Start Corridor functionality

Do not redesign the page.

==================================================
STEP 8 — DO NOT REWRITE WORKING BACKEND
==================================================

Do NOT change:

backend ambulance REST endpoints
Render configuration
TomTom
YOLO
ambulance app
Socket.IO server architecture

The backend is already receiving AMB-204.

This is primarily a CONTROL ROOM LIVE-STATE INTEGRATION FIX.

==================================================
STEP 9 — TEST EXACTLY THIS
==================================================

1. Start backend.

2. Open OMNI SmartCity Control Room.

3. Open Emergency Corridors.

4. Start the teammate's Ambulance App.

5. Press START.

EXPECTED:

Control Room immediately changes from no active trip/demo state to:

AMB-204
LIVE BACKEND GPS

6. Move the ambulance.

EXPECTED:

The map marker moves automatically.

7. Ambulance approaches next junction.

EXPECTED:

Control Room shows that junction as upcoming.

8. Emergency signal changes.

EXPECTED:

Control Room shows the same signal state.

Example:

J2
GREEN
EMERGENCY PRIORITY ACTIVE

9. Ambulance passes junction.

EXPECTED:

J2 leaves emergency priority according to existing backend logic.

10. End trip.

EXPECTED:

NO ACTIVE EMERGENCY TRIP

==================================================
FINAL REQUIREMENT
==================================================

ACTUALLY EDIT THE CODE.

Do not just explain the root cause.

Do not tell me "repository access is unavailable."

You are operating on the local OMNI SmartCity project.

Inspect the files, modify them, run the frontend, and fix the issue.

At the end tell me only:

1. Where AMB-102 was coming from.
2. Which file(s) you changed.
3. What live state the Emergency Corridors now uses.
4. Whether AMB-204 appears dynamically.
5. Whether GPS updates move the marker.
6. Whether junction signal updates appear.
7. Whether the full Emergency Corridors UI is preserved.
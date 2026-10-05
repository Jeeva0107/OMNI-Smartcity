FIX THE LIVE AMBULANCE ↔ CONTROL ROOM INTEGRATION — ACTUALLY EDIT THE CODE

I need you to fix the existing OMNI SmartCity project. Do NOT just explain the solution. Inspect the codebase, identify the broken frontend connection, modify the necessary files, run the app/build/tests, and verify the result.

IMPORTANT CONTEXT:

The ambulance app is running on my teammate's device.

The OMNI SmartCity control-room website is running on my laptop.

Both communicate through this Render backend:

https://omni-smartcity-backend.onrender.com

The backend is ALREADY WORKING.

Render logs confirm that the ambulance app is successfully sending:

POST /api/ambulances/location

with:

ambulanceId = AMB-204

and changing latitude/longitude values.

Therefore DO NOT rewrite the backend.

DO NOT modify the ambulance app.

DO NOT modify Render configuration.

The problem is specifically the CONTROL ROOM FRONTEND.

==================================================
CURRENT PROBLEM
==================================================

When my teammate presses START in the Ambulance App:

AMB-204 is successfully created and its GPS is sent to the backend.

BUT the OMNI SmartCity Emergency Corridors page still shows the old simulated ambulance:

AMB-102

with simulated GPS.

That is WRONG.

The Emergency Corridors page must display the REAL ACTIVE AMBULANCE coming from the backend.

==================================================
DESIRED FINAL BEHAVIOR
==================================================

When teammate presses START:

AMBULANCE APP
      ↓
Render Backend
      ↓
Central StateManager / live state
      ↓
Existing WebSocket/live-state mechanism
      ↓
OMNI SmartCity Control Room
      ↓
Emergency Corridors

The control room should automatically show:

AMB-204
LIVE BACKEND GPS
Current location
Destination
Route
ETA
Distance remaining
Current junction
Next junction
Emergency corridor status

NO PAGE REFRESH.

When the ambulance moves in the teammate's app:

→ backend receives new GPS
→ central state updates
→ control room receives update
→ ambulance marker moves automatically.

==================================================
FIRST: INSPECT THE EXISTING ARCHITECTURE
==================================================

Before changing anything, inspect:

- src/
- TrafficContext
- live WebSocket handling
- Emergency Corridors page/component
- ambulance state handling
- existing INITIAL_* data
- existing ambulance objects
- map components
- route components
- junction/signal state components

Trace the actual data flow:

WebSocket/backend event
→ centralized live state
→ ambulance state
→ Emergency Corridors
→ map marker
→ UI

DO NOT create a second architecture.

Reuse the existing live-state/WebSocket architecture already implemented in this project.

==================================================
SEARCH FOR STALE SIMULATION
==================================================

Search the entire frontend for:

AMB-102
INITIAL_AMBULANCE
Simulated Driver GPS
simulated ambulance
demo ambulance
13.0067
80.2020
hardcoded ambulance
hardcoded GPS
hardcoded ambulance route

Identify every place where the Emergency Corridors page is getting stale ambulance information.

REMOVE the stale data from LIVE MODE.

Do NOT simply replace:

AMB-102 → AMB-204

That is NOT the solution.

The ambulance ID must come dynamically from backend state.

If tomorrow the ambulance ID is AMB-305, the control room must automatically show AMB-305.

==================================================
LIVE AMBULANCE STATE
==================================================

Use the actual active ambulance object from the existing centralized live state.

If the existing backend/live-state object exposes fields such as:

ambulance.id
ambulance.latitude
ambulance.longitude
ambulance.routeJunctions
ambulance.corridorApproved
ambulance.active

use those actual fields.

BUT DO NOT ASSUME THESE ARE THE EXACT PROPERTY NAMES.

Inspect the backend response/state and existing frontend types first.

Use the REAL property names already present in this project.

==================================================
EMERGENCY CORRIDORS PAGE
==================================================

When an active ambulance exists:

Display:

AMBULANCE ID
{live ambulance ID}

GPS
{live latitude}, {live longitude}

DATA SOURCE
LIVE BACKEND GPS

DESTINATION
{live destination}

ETA
{live ETA}

ROUTE
{live route}

CURRENT JUNCTION
{live current junction}

NEXT JUNCTION
{live next junction}

CORRIDOR STATUS
{live corridor status}

All values must come from live backend state.

==================================================
MAP
==================================================

The ambulance marker must use the LIVE backend coordinates.

Do NOT use:

13.0067
80.2020

unless those values are actually received from the backend.

The marker must use the current live latitude/longitude.

When a new GPS update arrives:

→ marker moves automatically.

No refresh.

The marker label must use:

liveAmbulance.id

NOT:

AMB-102

NOT:

AMB-204 hardcoded.

==================================================
NO ACTIVE AMBULANCE
==================================================

If there is no active ambulance in the live backend state:

DO NOT show a fake ambulance.

DO NOT show AMB-102.

DO NOT show simulated GPS.

Show:

NO ACTIVE EMERGENCY TRIP

Only use simulated ambulance data when the user explicitly enters DEMO/SIMULATION MODE.

==================================================
JUNCTION + SIGNAL CONNECTION
==================================================

This is extremely important.

The ambulance and junction signals must also be connected.

When the active ambulance approaches an upcoming junction:

the backend/emergency-corridor state should identify that junction.

The Control Room Emergency Corridors page should show the junction's current signal state.

Example:

AMB-204
      ↓
Approaching J2
      ↓
J2 = GREEN
      ↓
EMERGENCY PRIORITY ACTIVE

The junction marker/card should update live.

If the signal changes:

RED → GREEN

the Control Room must update automatically.

Do NOT create a fake local signal state.

Use the existing backend/junction live state.

==================================================
AMBULANCE APP + CONTROL ROOM MUST MATCH
==================================================

Both applications must consume the same backend state.

Architecture:

              RENDER BACKEND
             /              \
            /                \
           ↓                  ↓
  AMBULANCE APP        CONTROL ROOM
                           ↓
                   Emergency Corridors

Do NOT make:

Ambulance App → direct browser connection

Do NOT create:

Website → separate ambulance simulation

Do NOT create:

Website → second WebSocket

Use the existing backend as the single source of truth.

==================================================
REALTIME EVENTS
==================================================

Inspect the existing event system and reuse it.

Look for existing events such as:

ambulance:trip-started
ambulance:location-updated
junction:signal-updated
corridor:status-updated
ambulance:route-changed
ambulance:trip-ended
ambulance:notification

If equivalent event names already exist, USE THOSE instead of creating duplicates.

When a location update arrives:

update ambulance state.

When a junction signal update arrives:

update junction state.

When corridor state changes:

update corridor state.

When route changes:

update route and ETA.

==================================================
AMBULANCE START
==================================================

Test this exact workflow:

1. Start the backend.

2. Open the OMNI SmartCity control room.

3. Open Emergency Corridors.

4. Start the teammate's ambulance app.

5. Press START.

6. Backend should receive the active trip.

7. Control Room should automatically display the active ambulance.

Expected:

AMB-204
LIVE BACKEND GPS

8. Move the ambulance.

Expected:

Control Room marker moves.

9. Ambulance approaches the next junction.

Expected:

Control Room shows the upcoming junction.

10. Emergency priority signal becomes active.

Expected:

Control Room shows:

GREEN
EMERGENCY PRIORITY ACTIVE

11. Ambulance passes the junction.

Expected:

junction leaves emergency priority and returns to normal traffic control state according to the existing system logic.

12. End the trip.

Expected:

Control Room shows:

NO ACTIVE EMERGENCY TRIP

==================================================
CRITICAL RULES
==================================================

DO NOT:

- rewrite backend
- rewrite ambulance app
- create another WebSocket
- create another polling system
- create another state manager
- hardcode AMB-204
- hardcode AMB-102
- hardcode ambulance coordinates
- use simulated GPS in LIVE MODE
- break TomTom integration
- break YOLO integration
- break Junction Control
- break Route Intelligence
- break Activity & Events
- break System Status
- change the existing dark UI unnecessarily

PRESERVE all existing functionality.

==================================================
IF THE WEBSOCKET IS CURRENTLY FAILING
==================================================

Do NOT immediately create another connection.

Inspect the existing live connection.

Verify:

- correct Render backend URL
- correct Socket.IO/WebSocket endpoint
- connection status
- incoming live-state messages
- parsing of the messages
- state update
- Emergency Corridors subscription/consumption

Fix the existing connection if necessary.

The backend is already receiving ambulance REST updates successfully, so don't break the working REST integration.

==================================================
IMPORTANT DATA HONESTY
==================================================

LIVE MODE:

LIVE BACKEND GPS

DEMO MODE:

SIMULATION

Never display:

LIVE

when the data is actually simulated.

==================================================
FINAL VERIFICATION
==================================================

After editing:

1. Run the frontend.
2. Check for compile/runtime errors.
3. Verify Emergency Corridors loads.
4. Verify the existing pages still work.
5. Verify live-state connection.
6. Verify active ambulance rendering.
7. Verify live GPS movement.
8. Verify junction signal updates.
9. Verify corridor status updates.
10. Verify trip end clears the ambulance.

DO NOT STOP AT "I FOUND THE ROOT CAUSE".

ACTUALLY MODIFY THE FILES AND TEST THE IMPLEMENTATION.

At the end give me a concise report:

FILES CHANGED:
...

ROOT CAUSE:
...

LIVE AMBULANCE SOURCE:
...

GPS SOURCE:
...

JUNCTION SIGNAL SOURCE:
...

REALTIME EVENT:
...

TEST RESULT:
...

Confirm:

AMB-102 is NOT used in LIVE MODE.
AMB-204 appears dynamically when the teammate starts the trip.
GPS updates live.
Junction signal changes are reflected.
Emergency corridor state is synchronized.
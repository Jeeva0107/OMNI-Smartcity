Build a premium, production-quality Control Room web application for a smart-city intelligent traffic management platform called:

OMNI SMARTCITY
AI-Powered Intelligent Traffic Management & Emergency Coordination

IMPORTANT:
This is the central control-room dashboard for a broader intelligent traffic-management platform.

DO NOT design this as an ambulance-only application.

The platform should primarily manage and understand city traffic using computer vision, traffic intelligence, route optimization and junction coordination.

Emergency ambulance management is ONE IMPORTANT MODULE within the platform, not the entire focus.

The UI must look like a real-world intelligent transportation / city traffic operations center suitable for a competition final presentation.

==================================================
CORE CONCEPT
==================================================

OMNI SMARTCITY continuously analyzes traffic conditions across multiple junctions and provides intelligent recommendations to improve traffic flow.

The platform should support:

1. Live traffic monitoring
2. YOLO-based vehicle detection
3. Vehicle tracking
4. Traffic density estimation
5. Queue estimation
6. Traffic-flow analysis
7. Congestion identification
8. Route intelligence
9. Traffic-aware route optimization
10. Junction monitoring
11. Signal coordination recommendations
12. Emergency corridor management for ambulances
13. Predictive junction preparation
14. Safety validation
15. Operator approval and override
16. Event/activity monitoring

The emergency ambulance system should appear as a major capability under the broader traffic-management platform.

==================================================
DESIGN PHILOSOPHY
==================================================

The interface must feel:

- Premium
- Professional
- Intelligent
- Modern
- Operational
- Clear
- High-information but not cluttered
- Suitable for a real traffic control center
- Suitable for a competition jury

DO NOT make it look like:

- A generic admin dashboard
- A student project
- A simple CRUD application
- A generic AI SaaS website
- A cyberpunk interface
- A gaming UI
- An ambulance-only application

Avoid excessive:
- gradients
- glowing elements
- rounded cards
- huge icons
- emojis
- bright colors
- decorative animations

Use subtle, purposeful animations only.

==================================================
VISUAL STYLE
==================================================

Use a dark-first premium interface.

Background:

#090B0D
#0E1114
#14181C

Surface:

#181D21
#1D2328
#242A30

Text:

#F4F5F2
#B8BEC4
#737B82

Accent:

Warm amber / orange for important system actions.

Success:

Muted green.

Warning:

Amber.

Critical:

Red.

Do not use purple as the main accent.

Use Inter / Geist / equivalent modern typography.

Use Lucide icons or another professional icon library.

Use thin borders, subtle shadows and restrained corner radius.

==================================================
APPLICATION STRUCTURE
==================================================

Create a fixed left navigation sidebar.

LOGO:

OMNI
SMARTCITY

Subtitle:

INTELLIGENT TRAFFIC CONTROL

Navigation:

⌂ Overview

🗺 Live Traffic

🧠 Traffic Intelligence

↗ Route Intelligence

🚦 Junction Control

🚑 Emergency Corridors

📹 Camera Analytics

📋 Activity & Events

-----------------------

⚙ Settings

● System Status

The selected navigation item must be visually highlighted.

==================================================
1. OVERVIEW
==================================================

This is the main command center.

The operator should understand the overall city traffic situation immediately.

Header:

CITY TRAFFIC OVERVIEW

Subtitle:

Real-time traffic intelligence and coordinated traffic management

Show summary metrics:

ACTIVE JUNCTIONS
24

VEHICLES MONITORED
1,842

HIGH CONGESTION
4

ACTIVE INCIDENTS
2

EMERGENCY CORRIDORS
1

SYSTEM STATUS
ONLINE

==================================================
LIVE CITY MAP
==================================================

Make the map the visual centerpiece.

DO NOT use an empty rectangle saying "Map".

Create a realistic stylized city road network using SVG/canvas/map library.

Show:

- Roads
- Junctions
- Traffic density
- Camera locations
- Ambulance when active
- Hospitals
- Recommended routes
- Traffic hotspots

Traffic colors:

GREEN = smooth
AMBER = moderate
RED = congested
GRAY = normal/inactive

Junction markers should be clickable.

Clicking a junction opens:

Junction ID
Traffic level
Vehicle count
Queue length
Signal state
Traffic flow
Recommended action

==================================================
TRAFFIC OVERVIEW PANEL
==================================================

Show:

Traffic Flow

SMOOTH
MODERATE
HIGH
CRITICAL

Use a clean horizontal visualization.

Show congestion hotspots:

J2
HIGH

J5
HIGH

J7
MODERATE

J9
LOW

==================================================
ACTIVE EVENTS
==================================================

Show important events:

Traffic congestion detected
J5

Accident/incident reported
J8

Emergency vehicle approaching
J2

Signal optimization recommended
J4

Each event should have:

time
location
severity
status

==================================================
2. LIVE TRAFFIC
==================================================

This section focuses on current traffic conditions.

Show a large city traffic map.

Allow filtering by:

All
Low
Moderate
High
Critical

Show:

Vehicle count
Traffic density
Queue length
Average flow
Average speed

Example:

Junction J5

Vehicles:
38

Queue:
17

Average speed:
19 km/h

Traffic:
HIGH

Flow:
21 vehicles/min

==================================================
3. TRAFFIC INTELLIGENCE
==================================================

This is the analytical brain of the platform.

Show:

Traffic density trends

Vehicle flow trends

Congestion hotspots

Queue growth

Average speed

Traffic prediction

Create clean charts.

DO NOT overload the page with charts.

Use 3–4 useful visualizations.

Example:

TRAFFIC DENSITY
Last 30 minutes

VEHICLE FLOW
Last 30 minutes

TOP CONGESTED JUNCTIONS

J5
J2
J8
J11

PREDICTED CONGESTION

J5
HIGH in 10 min

==================================================
YOLO COMPUTER VISION
==================================================

Show that traffic intelligence is powered by computer vision.

Section:

COMPUTER VISION STATUS

YOLO ENGINE
● ONLINE

VEHICLE TRACKING
● ONLINE

CAMERA FEED
● ONLINE

Show vehicle classification:

Cars
124

Motorcycles
67

Buses
14

Trucks
21

Emergency vehicles
1

The frontend should use mock data initially.

Create a service abstraction so actual Flask + YOLO APIs can be connected later.

==================================================
4. ROUTE INTELLIGENCE
==================================================

This should NOT be limited to ambulances.

The route engine should demonstrate intelligent route selection based on:

- Distance
- Traffic
- Queue
- Predicted travel time
- Junction congestion

Example:

ROUTE INTELLIGENCE

Origin:
Junction J1

Destination:
Junction J9

Available routes:

ROUTE A
4.8 km
16 min
HIGH CONGESTION

ROUTE B
5.6 km
9 min
LOW CONGESTION
RECOMMENDED

ROUTE C
5.1 km
12 min
MODERATE

Highlight:

AI RECOMMENDED ROUTE

Reason:

Lower predicted travel time due to reduced congestion and queue density.

Important:

Do not claim the system is training a new AI model.

Represent this as an AI-assisted route optimization engine using traffic data.

==================================================
5. JUNCTION CONTROL
==================================================

Show all monitored junctions.

Example:

J1
NORMAL
Traffic: LOW

J2
OPTIMIZING
Traffic: HIGH

J5
CONGESTED
Traffic: HIGH

J7
NORMAL
Traffic: LOW

Clicking a junction opens detailed information.

Show:

Traffic level
Vehicle count
Queue length
Average speed
Current signal
Recommended signal
Pedestrian status
Downstream capacity

==================================================
SIGNAL COORDINATION
==================================================

The platform should recommend signal changes to improve traffic flow.

Example:

Junction J5

Current:

RED

Recommended:

GREEN

Reason:

High queue detected on north approach.

Expected result:

Reduced queue buildup.

Buttons:

[ APPLY RECOMMENDATION ]

[ HOLD ]

[ OVERRIDE ]

Signal transitions must look realistic.

Never jump directly:

RED → GREEN

Instead simulate:

RED
↓
YELLOW
↓
ALL RED
↓
GREEN

==================================================
6. EMERGENCY CORRIDORS
==================================================

This is ONE MAJOR FEATURE within Omni SmartCity.

Do NOT make the whole dashboard revolve around this section.

When an ambulance emergency is active:

Show:

AMBULANCE A-102

Current location

Destination

Speed

ETA

Recommended route

Upcoming junctions

Traffic conditions

Emergency corridor status

Example:

J2 → J5 → J7 → Hospital

The system should:

1. Receive ambulance GPS
2. Receive destination
3. Analyze current traffic
4. Compare possible routes
5. Select a low-delay route
6. Predict ambulance arrival at each junction
7. Identify traffic conditions ahead
8. Prepare relevant junctions
9. Perform safety validation
10. Request operator approval
11. Coordinate the emergency corridor
12. Restore normal traffic after the ambulance passes

Show:

J2
READY

J5
PREPARING

J7
SCHEDULED

The ambulance corridor should visually move with the ambulance.

==================================================
TRAFFIC CLEARANCE
==================================================

Within Emergency Corridors, show:

TRAFFIC CLEARANCE PLAN

J2
Queue: 17
Action: Prepare emergency phase

J5
Queue: 24
Action: Clear conflicting movement

J7
Queue: 8
Action: Prepare green

This demonstrates that the system is not simply giving an ambulance directions.

It is coordinating traffic along the selected route.

==================================================
7. CAMERA ANALYTICS
==================================================

Create a professional camera monitoring interface.

Grid:

Camera J1
Camera J2
Camera J5
Camera J7

Each camera tile should show:

LIVE

Vehicle count

Traffic level

YOLO status

Clicking a camera opens a larger view.

If an actual video source is unavailable, use realistic placeholder traffic footage or a simulated feed.

Make the component ready for actual video integration later.

==================================================
8. ACTIVITY & EVENTS
==================================================

Create a professional activity timeline.

Examples:

10:42:11
Traffic congestion detected
J5

10:42:15
Route optimization completed

10:42:19
Signal recommendation generated
J5

10:43:02
Emergency vehicle detected
J2

10:43:04
Emergency corridor calculated

10:43:07
Safety validation passed

10:43:10
Operator approved corridor

Filters:

ALL
TRAFFIC
AI
SIGNAL
EMERGENCY
SYSTEM

==================================================
EMERGENCY CORRIDOR — OPERATOR APPROVAL
==================================================

The AI must recommend actions.

The operator must retain control.

Show:

AI RECOMMENDATION

Recommended route:
J2 → J5 → J7

Predicted ETA:
08:12

Safety:
PASSED

Then:

[ APPROVE CORRIDOR ]

[ MODIFY ]

[ REJECT ]

==================================================
SAFETY VALIDATION
==================================================

Before a signal recommendation is executed, display:

✓ Signal conflict check
✓ Minimum phase duration
✓ Yellow transition
✓ All-red clearance
✓ Pedestrian conflict check
✓ Downstream capacity

Status:

SAFE TO EXECUTE

If a conflict occurs:

⚠ CONFLICT DETECTED

Disable approval until resolved.

==================================================
SYSTEM STATUS
==================================================

Create a system status page/panel.

Show:

Backend
● ONLINE

YOLO Engine
● ONLINE

Vehicle Tracking
● ONLINE

Traffic Feed
● ONLINE

Route Engine
● ONLINE

Signal Engine
● ONLINE

GPS Service
● ONLINE

Database
● ONLINE

Last synchronization:
2 seconds ago

==================================================
SIMULATION MODE
==================================================

Because the backend and real-world infrastructure may not be available during development, create a hidden/discreet Simulation Controls section accessible through Settings.

Allow:

Start simulated traffic
Trigger congestion
Trigger ambulance
Move ambulance
Change traffic density
Trigger route calculation
Approve corridor
Complete emergency

This is ONLY for demonstrating the system.

Do not label the main product as "Simulation".

==================================================
MOCK DATA ARCHITECTURE
==================================================

Keep all mock data in a separate service/data layer.

Do not hard-code values directly into UI components.

Prepare interfaces for future Flask APIs:

GET /api/traffic
GET /api/junctions
GET /api/cameras
GET /api/routes
GET /api/ambulance
GET /api/corridor
GET /api/events

POST /api/emergency/start
POST /api/route/recalculate
POST /api/signal/recommend
POST /api/corridor/approve
POST /api/corridor/reject

The frontend should work completely using mock data even if the backend is unavailable.

==================================================
TECHNICAL ARCHITECTURE
==================================================

Use a clean component architecture.

Separate:

components
pages
services
data
hooks
utils

Do not mix business logic into visual components.

Create:

trafficService
routeService
junctionService
emergencyService
cameraService
eventService

Initially these return mock data.

Later they can call Flask APIs.

==================================================
IMPORTANT AI POSITIONING
==================================================

The AI should have multiple meaningful roles:

1. Computer vision
   YOLO detects and tracks vehicles.

2. Traffic intelligence
   Vehicle data is converted into traffic density, queue and flow information.

3. Route optimization
   Routes are compared using traffic-aware travel time.

4. Prediction
   The system predicts traffic/arrival conditions.

5. Signal recommendation
   The system recommends junction-level traffic actions.

6. Emergency coordination
   When an ambulance is active, the system coordinates a dynamic emergency corridor.

Do NOT make AI just a decorative label.

==================================================
MAIN USER JOURNEY
==================================================

The entire dashboard should tell this story:

CITY TRAFFIC
↓
Traffic is continuously monitored
↓
YOLO detects vehicles
↓
Traffic conditions are estimated
↓
Congestion is identified
↓
Route Intelligence compares routes
↓
Junction Control recommends traffic actions
↓
Emergency vehicle appears
↓
System switches to Emergency Corridor mode
↓
AI calculates a low-delay route
↓
Upcoming junctions are identified
↓
Traffic clearance is planned
↓
Safety checks are performed
↓
Operator approves
↓
Signals are coordinated
↓
Ambulance passes
↓
Signals return to normal
↓
Event is recorded

==================================================
PREMIUM UI REQUIREMENTS
==================================================

Make the website visually impressive for a final-round competition presentation.

Use:

- refined dark interface
- professional typography
- sophisticated map
- clear data hierarchy
- animated live indicators
- smooth route animation
- signal-state transitions
- polished modals
- excellent spacing
- meaningful charts
- responsive layout
- clear status indicators

The UI must be understandable within 5 seconds.

A jury should immediately understand:

WHAT IS HAPPENING
WHERE IS THE TRAFFIC
WHAT IS THE AI RECOMMENDING
WHAT ACTION IS REQUIRED
WHAT HAPPENS AFTER APPROVAL

Do not make the interface dependent on reading paragraphs.

==================================================
FINAL PRIORITY
==================================================

The most important parts of the application are:

1. Overview
2. Live Traffic + Map
3. YOLO/Traffic Intelligence
4. Route Intelligence
5. Junction Control
6. Emergency Corridor
7. Safety Validation
8. Activity Log

Build these completely and make them interactive.

The emergency ambulance feature is a major capability, but the overall product must clearly remain:

OMNI SMARTCITY
AI-POWERED INTELLIGENT TRAFFIC MANAGEMENT PLATFORM

not an ambulance-only application.

Make the final result look premium, realistic, highly polished and presentation-ready.
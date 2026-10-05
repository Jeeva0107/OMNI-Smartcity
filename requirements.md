REMOVE JUNCTION MARKER OVERLAY FROM OVERVIEW AND LIVE TRAFFIC ONLY

Look at the current OMNI SmartCity UI.

The Overview and Live Traffic pages currently display a Leaflet map with a large set of permanent junction markers/labels such as:

J1 Kathipara Flyover Junction
J3 Koyambedu Junction (CMBT)
J7 RGGGH / Chennai Central Junction
J12 Chennai Port Gate (Rajaji Salai)
J8 Saidapet Signal (Anna Salai)
J11 Vadapalani Junction
J18 Porur Junction
J4 Madhya Kailash Junction (Adyar)
J5 Tidel Park Junction (Taramani)
etc.

REMOVE THIS JUNCTION-MARKER OVERLAY FROM:

1. Overview
2. Live Traffic

IMPORTANT:

Remove ONLY the visual junction marker/label layer from these two pages.

DO NOT remove:
- the underlying junction data
- junction IDs
- Junction Control
- Emergency Corridors
- Route Intelligence
- backend junction state
- TomTom traffic data
- junction signal state
- emergency corridor logic
- routing logic
- any other functionality

The junctions must still exist in the backend and remain available to pages that actually need them.

==================================================
OVERVIEW
==================================================

Overview should NOT render the permanent J1/J3/J4/J5/etc. junction marker labels.

Keep the map itself and its existing traffic/network visualization.

If Overview has other useful live traffic visualization, preserve it.

==================================================
LIVE TRAFFIC
==================================================

Live Traffic should NOT render the permanent junction-marker overlay either.

Remove the visual layer that creates labels such as:

"J1 Kathipara Flyover Junction"
"J3 Koyambedu Junction (CMBT)"
etc.

Do not remove the actual live traffic data.

==================================================
IMPLEMENTATION
==================================================

Inspect the map components and identify the component/layer responsible for rendering the junction markers.

It may be a Leaflet Marker / CircleMarker / Tooltip / custom junction layer.

Find the actual source rather than hiding the markers with CSS.

Disable/remove that junction layer ONLY when the map is rendered inside:

- Overview
- Live Traffic

If the same reusable map component is used elsewhere, add an explicit prop/configuration such as:

showJunctionMarkers={false}

for Overview and Live Traffic.

For pages that need junction markers, keep:

showJunctionMarkers={true}

Do NOT globally delete the junction marker functionality.

==================================================
DO NOT BREAK
==================================================

Preserve:

- TomTom LIVE traffic
- map
- traffic colors/flow
- camera data
- YOLO
- Junction Control
- Emergency Corridors
- Route Intelligence
- ambulance live GPS
- emergency junction highlighting where required

IMPORTANT:

Emergency Corridors may still show relevant upcoming/current junctions because those are part of the emergency workflow.

Junction Control may still show junction-specific information.

Only Overview and Live Traffic should lose the permanent junction-marker overlay.

==================================================
FINAL CHECK
==================================================

Open Overview:
→ map remains
→ traffic visualization remains
→ NO J1/J3/J4/J5/J7/J8/J11/J12/etc. permanent labels.

Open Live Traffic:
→ map remains
→ live traffic remains
→ NO permanent junction labels.

Open Junction Control:
→ junction functionality still works.

Open Emergency Corridors:
→ emergency junction functionality still works.

Do not redesign the pages.

Actually edit the code and test the affected routes.
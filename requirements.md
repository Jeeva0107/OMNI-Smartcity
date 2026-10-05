Fix the Junction Control LOW AI CONFIDENCE alert behavior.

CURRENT PROBLEM:
The Junction Control page previously had a large red alert banner at the top saying:

LOW AI CONFIDENCE ALERT:
[affected junctions]
HUMAN REVIEW REQUIRED • CLICK JUNCTION TO INSPECT & OVERRIDE

That entire section has now disappeared.

I NEED IT BACK, BUT IT MUST BE DYNAMIC.

REQUIRED BEHAVIOR:

1. The red LOW AI CONFIDENCE ALERT banner must appear automatically whenever AT LEAST ONE junction has low AI confidence.

2. The banner must NOT always be visible.

3. If there are no low-confidence junctions, the entire red alert banner should be hidden.

4. Use the SAME confidence value/scale already used by Junction Control.

IMPORTANT:
The confidence values were previously displayed incorrectly as values such as:

0.985286%
0.99916%
0.996925%

We have already investigated that the underlying values may be on a 0–1 scale.

Do not blindly assume the scale.
Use the normalized confidence value produced by the existing confidence logic.

The final logical thresholds must be:

HIGH:
>= 70%

MEDIUM:
40%–69%

LOW:
< 40%

If the internal value is 0–1, equivalent thresholds are:

HIGH >= 0.70
MEDIUM >= 0.40 and < 0.70
LOW < 0.40

Do NOT mix 0–1 and 0–100 scales.

==================================================
LOW CONFIDENCE BANNER
==================================================

Restore a red warning banner above the Junction Analysis section.

Example:

⚠ LOW AI CONFIDENCE ALERT

J1  34%
J5  28%
J9  19%

HUMAN REVIEW REQUIRED • CLICK JUNCTION TO INSPECT & OVERRIDE

Only include junctions whose normalized confidence is <40%.

Do NOT list high-confidence junctions in this banner.

==================================================
INTERACTION
==================================================

Each low-confidence junction shown in the banner must be clickable.

Clicking:

J5 — 28%

must open/select:

J5 — Junction Analysis

The page should show:

LOW CONFIDENCE — HUMAN REVIEW REQUIRED

and provide:

- Override AI Decision
- Switch to Normal/Fallback Timing
- Restore AI Control

==================================================
JUNCTION STATUS
==================================================

Each junction's confidence badge should also reflect its state:

>=70%:
normal/high-confidence styling

40–69%:
warning styling

<40%:
critical/red styling

Do not make every junction red.

==================================================
TOP-LEVEL ALERT
==================================================

The alert should be derived from the live junction state.

Pseudo-logic:

const lowConfidenceJunctions =
  junctions.filter(j => normalizeConfidence(j.confidence) < 0.40);

if (lowConfidenceJunctions.length > 0) {
    showLowConfidenceBanner = true;
} else {
    showLowConfidenceBanner = false;
}

Use the project's existing confidence normalization helper if one exists.
Do not create a second competing confidence calculation.

==================================================
LIVE UPDATES
==================================================

The banner must update automatically when real-time telemetry changes.

Example:

J5 confidence:
85% → no banner

J5 confidence:
34% → banner appears immediately

J5 confidence:
34% → 72% → banner disappears automatically

J7:
80% → 25% → banner appears and J7 is added

Multiple low-confidence junctions must all be listed.

==================================================
IMPORTANT DATA RULE
==================================================

Do not fabricate low-confidence values just to make the banner appear.

Use the actual confidence values from the existing live state.

For testing only, use the existing simulation/developer mechanism if one already exists.

Do not modify:
- TomTom
- ambulance backend
- Socket.IO
- Emergency Corridors
- Route Intelligence
- YOLO
- backend architecture

Do not redesign the rest of the Junction Control page.

Keep the existing dark control-room UI.

==================================================
FINAL VERIFICATION
==================================================

Test these cases:

CASE 1:
All junctions >=70%

Expected:
No red LOW AI CONFIDENCE banner.

CASE 2:
One junction <40%

Expected:
Red banner appears.
That junction is listed.
Clicking it opens its Junction Analysis.

CASE 3:
Three junctions <40%

Expected:
All three appear in the banner.

CASE 4:
Low-confidence junction recovers above 40%

Expected:
It disappears from the low-confidence list.

CASE 5:
Low-confidence junction recovers above 70%

Expected:
It returns to normal/high-confidence styling.

CASE 6:
Backend/live telemetry updates confidence

Expected:
The banner updates without page refresh.

After implementing, report:
- files changed
- confidence normalization used
- threshold used
- how the banner is conditionally rendered
- how clicking a low-confidence junction works
- test results for all six cases.
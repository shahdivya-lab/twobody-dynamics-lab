# Two-Body Dynamics Lab — 5-minute voice-over script

18 scenes plus a closing scene. Narration script for the video walkthrough submitted with the assignment.

- Save each scene as its own file: `scene_01.mp3`, `scene_02.mp3`, …
- Leave about half a second of silence at the start and end of each file.
- Read numbers as written.
- At default speed (slider in the middle) one orbit takes about 20 seconds. Where a scene names a speed, it is the “1 s = …” readout next to the Speed slider.

---

### Scene 01 — Introduction

**Audio file:** `scene_01.mp3` · **Length:** about 21 s (51 words)

**Narration**

> This is the Two-Body Dynamics Lab. It simulates two bodies under Newtonian gravity, using the Velocity Verlet method in SI units. The computed path is drawn next to the exact Kepler orbit, so every result can be checked against theory. It covers Earth satellites, planets, comets, binary stars and transfer orbits.

**On screen**

1. Open the page; the default scenario, Earth around the Sun, loads. Click Dismiss on the hint bar if shown.
2. Press Play if the run is paused.

**Viewer should notice:** Earth’s solid path lies on the dashed orbit.

---

### Scene 02 — Layout

**Audio file:** `scene_02.mp3` · **Length:** about 18 s (45 words)

**Narration**

> At the top are the scenario menu, run status, Help and Settings. The orbit view fills the middle, with the toolbar below. The side panel has Scenario, Setup, Orbit and View. The analysis dock at the bottom holds diagnostics, graphs, experiments, comparisons and a report.

**On screen**

1. Hover over the scenario menu, the status, Help and Settings.
2. Hover along the toolbar.
3. Click the side-panel tabs Scenario, Setup, Orbit, View, then back to Scenario.
4. Hover over the dock tabs.

**Viewer should notice:** Each side-panel tab shows different content.

---

### Scene 03 — Playback and energy error

**Audio file:** `scene_03.mp3` · **Length:** about 21 s (52 words)

**Narration**

> Play, Step and plus one hundred advance the run. Reset returns to time zero; Restart applies the Setup values first. At default speed one orbit takes about twenty seconds. The green pill shows the energy error, which stays tiny. Click the pill to open Settings, with the resolution and the timestep mode.

**On screen**

1. Scenario menu at the top → Two-body experiments → Elliptical orbit.
2. Click Play, then Pause. Click Step, then +100. Click Reset, then Play.
3. Drag the Speed slider right, left, then back to the middle.
4. Point at the ΔE pill.

**Viewer should notice:** The probe jumps with +100; the speed readout changes; ΔE stays green.

---

### Scene 04 — Orbit view

**Audio file:** `scene_04.mp3` · **Length:** about 22 s (54 words)

**Narration**

> The solid line is the computed path, the dashed line the exact Kepler orbit; they agree to about seven parts in a million. The diamond marks periapsis and the square apoapsis. Drag to pan, scroll to zoom, click a chip for body details. Under View you can also show velocity, acceleration and force arrows.

**On screen**

1. Elliptical orbit running. Scroll to zoom in on the path, then click Fit.
2. Point at the diamond and the square.
3. View → Vectors → tick Velocity.
4. Click the Sun chip at the top left of the view.

**Viewer should notice:** No gap between solid and dashed lines. The velocity arrow is longest at periapsis.

---

### Scene 05 — Setup and Orbit tabs

**Audio file:** `scene_05.mp3` · **Length:** about 20 s (48 words)

**Narration**

> Setup holds masses, radii, separation and launch velocity; press Apply to start from them. The Orbit tab lists the osculating elements. A value that does not exist shows N/A, never an invented number. Inclination and node only turn the plane for display; they do not change the motion.

**On screen**

1. Side panel → Setup. Scroll past the fields. Click Set circular speed, then Apply.
2. Side panel → Orbit. Scroll through Osculating elements.

**Viewer should notice:** After Apply the orbit becomes a circle; e reads near zero.

---

### Scene 06 — View tab

**Audio file:** `scene_06.mp3` · **Length:** about 17 s (42 words)

**Narration**

> View switches between realistic and simplified rendering, and enlarged or true scale. Physics always uses the true radii. It also sets the frame, the camera, the path length and the inset, which shows the orbit plane in 3D or the ground track.

**On screen**

1. Scenario menu at the top → Binary systems → Earth–Moon. Play.
2. View → Rendering → Simplified, then Realistic. Scale → True scale, then Enlarged.
3. Frame → Centred on body 1, then Barycentric. Inset → Orbit plane (3D), then Off.

**Viewer should notice:** In true scale Earth and the Moon become tiny.

---

### Scene 07 — Two-body experiments

**Audio file:** `scene_07.mp3` · **Length:** about 20 s (48 words)

**Narration**

> Circular, elliptical and parabolic orbits differ only in launch speed. At escape speed the probe never returns. In radial fall, Earth and Moon start at rest and collide after about four point eight days, at nearly ten kilometres per second. A banner reports the contact time and speed.

**On screen**

1. Scenario menu at the top → Two-body experiments → Circular orbit, then Elliptical orbit, then Parabolic escape; about 3 seconds each.
2. Scenario menu at the top → Two-body experiments → Radial fall. Play; wait about 10 seconds for the collision banner.

**Viewer should notice:** Circle, ellipse, open curve; then a straight fall and a “Collision at t = …” banner.

---

### Scene 08 — Low and medium Earth orbit

**Audio file:** `scene_08.mp3` · **Length:** about 15 s (37 words)

**Narration**

> Earth satellites. Low Earth orbit at four hundred twenty kilometres, like the ISS, takes about ninety-three minutes; each pass shifts west. GPS-like medium orbits take half a sidereal day, so their ground track repeats after two orbits.

**On screen**

1. Scenario menu at the top → Earth satellites → Low Earth orbit. Set speed to about 1 s = 15 min; run 8 seconds; point at the ground track.
2. Scenario menu at the top → Earth satellites → Medium Earth orbit. Run about 5 seconds.

**Viewer should notice:** Ground-track passes step west.

---

### Scene 09 — Geostationary versus geosynchronous

**Audio file:** `scene_09.mp3` · **Length:** about 16 s (40 words)

**Narration**

> A geostationary satellite stays over one point, seventy-four degrees east, and passes all four checks. Incline it twenty-nine degrees and the track becomes a figure-eight: geosynchronous, not geostationary. The Orbit tab shows each check with a tick or a cross.

**On screen**

1. Scenario menu at the top → Earth satellites → Geostationary orbit. Play 8 seconds. Side panel → Orbit → Earth-orbit checks.
2. Scenario menu at the top → Earth satellites → Geosynchronous orbit. Play 15 seconds. Point at the figure-eight and the verdict.

**Viewer should notice:** Verdicts: “Geostationary”, then “Geosynchronous, not geostationary (inclined)”.

---

### Scene 10 — Polar and sun-synchronous orbits

**Audio file:** `scene_10.mp3` · **Length:** about 18 s (44 words)

**Narration**

> A polar orbit passes over every region. The sun-synchronous orbit needs Earth’s bulge, J2, a separate analytic model. Without J2 the node’s local time drifts; with J2 it stays at twenty-two hundred. The node now turns about one degree a day, matching the Sun.

**On screen**

1. Scenario menu at the top → Earth satellites → Polar orbit. Play 3 seconds.
2. Scenario menu at the top → Earth satellites → Sun-synchronous orbit. Side panel → Orbit; tick “Apply Earth oblateness drift”.
3. Set speed to about 1 s = 12 h; run until the clock shows about 10 days.
4. Point at Node local time, two-body and with J2.

**Viewer should notice:** Two-body: 22:00 → later. With J2: 22:00 → 22:00.

---

### Scene 11 — Elliptical and transfer Earth orbits

**Audio file:** `scene_11.mp3` · **Length:** about 16 s (40 words)

**Narration**

> Tundra and Molniya orbits linger over the north near apogee. In the transfer orbit, the apogee burn fires automatically. The plane change is computed but not simulated, because the motion is two-dimensional. The equatorial orbit’s track stays on the equator.

**On screen**

1. Scenario menu at the top → Earth satellites → Molniya orbit. Play 4 seconds.
2. Scenario menu at the top → Earth satellites → Geostationary transfer orbit. Play; wait about 10 seconds for the burn message.
3. Scenario menu at the top → Earth satellites → Circular equatorial orbit. Play 3 seconds.

**Viewer should notice:** A long thin ellipse; the GTO turns circular at GEO radius.

---

### Scene 12 — Solar System

**Audio file:** `scene_12.mp3` · **Length:** about 18 s (45 words)

**Narration**

> Solar System. The Sun–Jupiter barycentre lies just outside the Sun. Planet periods match Kepler’s third law within zero point zero seven percent. Halley’s comet is on a long ellipse; Borisov, an interstellar comet, passes once on a hyperbola. Comet tails are drawn for orientation only.

**On screen**

1. Scenario menu at the top → Solar System → Sun–Jupiter barycentre. Play 3 seconds.
2. Scenario menu at the top → Solar System → Planetary orbits compared. Point at the period table.
3. Scenario menu at the top → Solar System → Comet: elliptical orbit, then Comet: hyperbolic flyby; 3 seconds each.

**Viewer should notice:** The Sun circles a point outside itself. The two period columns agree.

---

### Scene 13 — Earth to Mars

**Audio file:** `scene_13.mp3` · **Length:** about 15 s (36 words)

**Narration**

> The Earth to Mars Hohmann transfer takes two hundred fifty-nine days. The Orbit tab shows formula and applied burns side by side: two point nine four five and two point six four nine kilometres per second.

**On screen**

1. Scenario menu at the top → Solar System → Earth → Mars transfer. Play at default speed; wait about 20 seconds.
2. Side panel → Orbit → Transfer.

**Viewer should notice:** The spacecraft moves from the Earth circle to the Mars circle.

---

### Scene 14 — Binary systems

**Audio file:** `scene_14.mp3` · **Length:** about 18 s (43 words)

**Narration**

> Binary systems. Alpha Centauri’s measured period matches the observed seventy-nine point seven six years. The Earth–Moon barycentre is inside Earth; Pluto and Charon orbit a point in empty space. In the mass ratio series, the period stays the same as the masses change.

**On screen**

1. Scenario menu at the top → Binary systems → α Centauri AB. Play 22 seconds. Dock → Diagnostics → Measured period.
2. Scenario menu at the top → Binary systems → Pluto–Charon. Play; zoom in on Pluto.

**Viewer should notice:** Measured period near 79.76 years. Pluto circles empty space.

---

### Scene 15 — Hohmann LEO to GEO

**Audio file:** `scene_15.mp3` · **Length:** about 15 s (37 words)

**Narration**

> A Hohmann transfer from three hundred kilometres to GEO uses two burns. The applied values match the formula to about four significant figures, and the arrival radius matches the target to two parts in a hundred thousand.

**On screen**

1. Scenario menu at the top → Transfer orbits → Hohmann transfer: LEO → GEO.
2. Side panel → Orbit → Transfer. Set speed to about 1 s = 15 min. Play; wait about 25 seconds for both burns.
3. Point at Δv₁ and Δv₂ formula / applied.

**Viewer should notice:** Two burn messages; formula and applied values agree.

---

### Scene 16 — Diagnostics, graphs and guided experiments

**Audio file:** `scene_16.mp3` · **Length:** about 16 s (38 words)

**Narration**

> The dock shows diagnostics and graphs. Five guided experiments follow theory, measurement and your own conclusion. In escape velocity, the measured bracket closes on the formula, about forty-two kilometres per second. You write the observations and conclusion yourself.

**On screen**

1. Dock → Diagnostics, then Graphs.
2. Scenario menu at the top → Two-body experiments → Circular orbit. Dock → Guided experiments → 1. Escape velocity → Load the suggested setup.
3. Drag Tangential speed to about 1.40 v_c, then 1.43 v_c. Point at the comparison table.

**Viewer should notice:** Bound at 1.40, unbound at 1.43; the theory value lies in between.

---

### Scene 17 — Sweep, compare, save and report

**Audio file:** `scene_17.mp3` · **Length:** about 14 s (35 words)

**Narration**

> The velocity sweep runs many integrations against the exact line. Compare runs a what-if beside the original. Saved keeps setups, and Report builds a summary of the current run that you can copy or download.

**On screen**

1. Dock → Velocity sweep → Run sweep.
2. Dock → Compare → What-if: Tangential velocity × 1.1 → Run what-if.
3. Dock → Saved → Save current. Dock → Report → Refresh.

**Viewer should notice:** Sweep markers sit on the line; two orbits drawn together.

---

### Scene 18 — Scope and closing

**Audio file:** `scene_18.mp3` · **Length:** about 20 s (50 words)

**Narration**

> The motion is exact two-body gravity in two dimensions. J2 is analytic, and enlarged bodies are only visual. There is no drag, no third body and no relativity. The energy error is always shown live. That is the Two-Body Dynamics Lab: one simulator, checked against exact theory as it runs.

**On screen**

1. Click Help; point at the Model section. Close Help.
2. Scenario menu at the top → Solar System → Earth around the Sun. Play; click Fit; hold 3 seconds.

**Viewer should notice:** Earth on its orbit, as at the start.

---

## Recording checklist

| Done | File | Scene | Length |
|---|---|---|---|
| ☐ | scene_01.mp3 | Introduction | 21 s |
| ☐ | scene_02.mp3 | Layout | 18 s |
| ☐ | scene_03.mp3 | Playback and energy error | 21 s |
| ☐ | scene_04.mp3 | Orbit view | 22 s |
| ☐ | scene_05.mp3 | Setup and Orbit tabs | 20 s |
| ☐ | scene_06.mp3 | View tab | 17 s |
| ☐ | scene_07.mp3 | Two-body experiments | 20 s |
| ☐ | scene_08.mp3 | Low and medium Earth orbit | 15 s |
| ☐ | scene_09.mp3 | Geostationary versus geosynchronous | 16 s |
| ☐ | scene_10.mp3 | Polar and sun-synchronous orbits | 18 s |
| ☐ | scene_11.mp3 | Elliptical and transfer Earth orbits | 16 s |
| ☐ | scene_12.mp3 | Solar System | 18 s |
| ☐ | scene_13.mp3 | Earth to Mars | 15 s |
| ☐ | scene_14.mp3 | Binary systems | 18 s |
| ☐ | scene_15.mp3 | Hohmann LEO to GEO | 15 s |
| ☐ | scene_16.mp3 | Diagnostics, graphs and guided experiments | 16 s |
| ☐ | scene_17.mp3 | Sweep, compare, save and report | 14 s |
| ☐ | scene_18.mp3 | Scope and closing | 20 s |

**Total narration:** 320 s (about 5 min 20 s) in 18 files.

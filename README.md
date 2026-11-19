# Two-Body Dynamics Lab

A browser-based simulator and teaching lab for the two-body problem. It integrates Newtonian gravity between two point masses with the Velocity Verlet method in SI units, and draws the computed path next to the exact Kepler conic so every result can be checked against theory.

**ME206 course project** · Team: Divya Rahul Shah, Armaan Dixit, Om Mohan Pawar

- **Live app:** <https://shahdivya-lab.github.io/twobody-dynamics-lab/>
- **Repository:** <https://github.com/shahdivya-lab/twobody-dynamics-lab>
- **Video walkthrough:** <https://youtu.be/nlsZROdMAS8> (6 min 41 s)

---

## Contents

1. [Quick start](#1-quick-start)
2. [Requirements](#2-requirements)
3. [Repository layout](#3-repository-layout)
4. [Running the validation](#4-running-the-validation)
5. [Rebuilding the app from source](#5-rebuilding-the-app-from-source)
6. [Using the app](#6-using-the-app)
7. [Physics model](#7-physics-model)
8. [Validation results](#8-validation-results)
9. [Scenarios](#9-scenarios)
10. [Limitations](#10-limitations)
11. [Data sources](#11-data-sources)

---

## 1. Quick start

The whole app is one self-contained file, `index.html`. No installation or build step is needed to run it.

**Option A: open the file**

1. Download or clone this repository.
2. Double-click `index.html`. It opens in your default browser.

**Option B: local web server** (recommended if your browser restricts local files)

```bash
cd twobody-dynamics-lab
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

**Option C: live link.** Open the GitHub Pages link at the top of this file.

The app starts with Earth orbiting the Sun. Use the scenario menu at the top to load any of the 28 scenarios, and press **Space** to play or pause.

## 2. Requirements

| Purpose | Requirement |
|---|---|
| Run the app | A current desktop browser. Tested in Google Chrome; it uses only standard web APIs. Nothing to install. |
| Run the validation script | [Node.js](https://nodejs.org) 18 or newer (tested with Node 24). No npm packages. |
| Rebuild `index.html` from `src/` | [Python](https://www.python.org) 3.8 or newer (tested with Python 3.13). No packages. |

The app uses only HTML, CSS and plain JavaScript. It has no frameworks and no external dependencies apart from the IBM Plex fonts, loaded from Google Fonts. Without internet access the browser falls back to system fonts and everything else still works.

## 3. Repository layout

```
twobody-dynamics-lab/
├── index.html              The complete app (built from src/). Open this to run.
├── README.md
├── src/
│   ├── core.js             Physics core: Velocity Verlet integrator, orbital elements, collisions. No DOM.
│   ├── missions.js         Reference data (planets, Earth constants), 28 scenarios, J2 model,
│   │                       Hohmann transfers and burn logic, ground-track geometry. No DOM.
│   ├── render.js           Procedural planet textures and sphere shading (visual only).
│   ├── ui.js               The application: views, controls, graphs, experiments, sweep, compare, report.
│   ├── shell.html          HTML and CSS skeleton with placeholders for the scripts.
│   └── build.py            Builds index.html from the files above.
├── validation/
│   ├── validate.js         Checks the physics against closed-form results (see section 8).
│   └── results.txt         Output of the last validation run.
└── docs/
    └── voiceover_script.md Scene-by-scene script used for the video walkthrough.
```

`core.js` and `missions.js` contain all of the physics and have no dependence on the browser. The validation script loads exactly these files, so the numbers in section 8 come from the same code the app runs.

## 4. Running the validation

```bash
cd twobody-dynamics-lab
node validation/validate.js
```

It takes about 20 seconds and prints a table of 24 checks with the measured value, the reference value and PASS or FAIL. The exit code is 0 only if every check passes. A saved run is in [`validation/results.txt`](validation/results.txt).

## 5. Rebuilding the app from source

Edit the files in `src/`, then run:

```bash
python src/build.py
```

This writes `index.html` in the repository root. The build only inserts the scripts into `shell.html`; there is no minification or transpiling. Running it on the unchanged sources reproduces the committed `index.html` byte for byte.

## 6. Using the app

| Area | What it holds |
|---|---|
| **Top bar** | Scenario menu (5 categories, 28 scenarios), run status and simulated time, Help (shortcuts, model notes, guided tour), Settings (integration resolution, adaptive or fixed timestep). |
| **Orbit view** | Computed path (solid) and exact Kepler conic (dashed), periapsis and apoapsis markers, velocity, acceleration and force vectors, barycentre. Drag to pan, scroll or pinch to zoom, click a body for its details. An inset shows the orbit plane in 3D or the ground track for Earth orbits. |
| **Toolbar** | Play/Pause, Step, +100 steps, Reset, Restart, speed (logarithmic), clock, live energy-error indicator, zoom, Fit, Centre. |
| **Side panel** | **Scenario** (description, parameters, equations), **Setup** (masses, radii, separation, radial and tangential velocity, orbital plane), **Orbit** (osculating elements, Earth-orbit checks, J2 model, transfer burns), **View** (rendering, scale, layers, reference frame, camera). |
| **Analysis dock** | **Diagnostics** (conserved quantities), **Graphs** (separation, speed, energy error vs time), **Guided experiments** (5 lab exercises with theory vs measurement), **Velocity sweep**, **Compare** and what-if runs, **Saved** setups, **Report** (copy or download). |

Keyboard: **Space** play or pause; in the orbit view, arrow keys pan, **+** / **−** zoom, **0** fits the view; **Esc** closes menus.

## 7. Physics model

**Equations of motion.** Two point masses $m_1, m_2$ attract with the Newtonian force $F = G m_1 m_2 / r^2$ along the line of centres, with $G = 6.67430\times10^{-11}$ m³ kg⁻¹ s⁻². Each body's acceleration is computed separately, so the bodies orbit their common barycentre and total momentum stays zero.

**Integrator.** Velocity Verlet (kick, drift, kick), second order and symplectic:

```
v(t + dt/2) = v(t) + a(t) dt/2
x(t + dt)   = x(t) + v(t + dt/2) dt
v(t + dt)   = v(t + dt/2) + a(t + dt) dt/2
```

**Timestep.** Two modes, selectable under Settings:

- **Adaptive, time-symmetric (default).** $\Delta t$ is the mean of the local timescale $2\pi\sqrt{r^3/\mu}/N$ at both ends of the step, found with two fixed-point passes. Because the rule is time-symmetric, the scheme stays reversible and shows no secular energy drift, even for eccentric orbits.
- **Fixed.** $\Delta t = T/N$, where $T$ is the orbital period (or the dynamical time for open orbits).

$N$ (steps per orbit) is set with the Resolution slider.

**Analytic reference.** From the initial state the app computes the osculating elements: specific energy $\varepsilon = v^2/2 - \mu/r$, angular momentum $h$, eccentricity vector, $a$, $p$, $r_p$, $r_a$ and $T = 2\pi\sqrt{a^3/\mu}$, with $\mu = G(m_1+m_2)$. It then draws the exact conic $r = p/(1 + e\cos\nu)$. The orbit is classified as circular, elliptical, parabolic, hyperbolic or radial using stated tolerances.

**Collisions.** Contact is detected with the true radii, including a body passing through contact distance within one step. The step is then undone and repeated with shorter steps, so contact time and speed are resolved accurately.

**Transfers.** Hohmann burns are instantaneous velocity changes applied between integration steps. The second burn fires when the radial velocity changes sign at apoapsis (outbound) or periapsis (inbound).

**Extended model, kept separate.** For Earth orbits an optional analytic J2 model gives the secular drift of the node and perigee:

$$\dot\Omega = -\tfrac32\, n J_2 \left(\tfrac{R_\oplus}{p}\right)^2 \cos i, \qquad \dot\omega = \tfrac34\, n J_2 \left(\tfrac{R_\oplus}{p}\right)^2 (5\cos^2 i - 1)$$

It is used only for the 3D inset, the ground track and the node readouts. It never feeds back into the integration, which stays pure two-body.

**Dimensions.** The motion is computed in the orbital plane (2D). Inclination and node only rotate that plane for the 3D view and the ground track.

## 8. Validation results

Output of `node validation/validate.js` (Node 24.22.1). Values are measured by running the app's own `core.js` and `missions.js`.

| Check | Measured | Reference | Result |
|---|---|---|---|
| Convergence order (error ratio per halving of Δt, fixed step) | 4.00, 4.00 | 4.00 (second order) | PASS |
| Time reversibility, fixed step (position error / r₀) | 1.6 × 10⁻¹³ | < 10⁻¹⁰ | PASS |
| Energy drift, orbit 1 → 200 at the same phase, e = 0 | 2.8 × 10⁻¹⁴ | < 10⁻⁹ | PASS |
| Energy drift, orbit 1 → 200 at the same phase, e = 0.64 | 2.8 × 10⁻¹² | < 10⁻⁹ | PASS |
| Energy drift, orbit 1 → 200 at the same phase, e = 0.91 | 6.5 × 10⁻¹⁰ | < 10⁻⁹ | PASS |
| Computed path vs exact conic over 3 orbits (max relative radius error) | 8.4 × 10⁻⁶ | < 10⁻⁵ | PASS |
| Measured period vs Kepler III, e = 0.44 | 7.0 × 10⁻⁶ | < 10⁻⁵ | PASS |
| Radial fall, Earth–Moon: contact time | 4.8169 d | 4.8169 d (closed form) | PASS |
| Radial fall, Earth–Moon: contact speed | 9.8662 km/s | 9.8661 km/s | PASS |
| GEO radius | 42,164.2 km | 42,164.2 km | PASS |
| GEO period − sidereal day | −2.9 × 10⁻¹¹ s | \|x\| < 10⁻⁶ s | PASS |
| Hohmann LEO 300 km → GEO: Δv₁ applied / formula | 2.4257 / 2.4257 km/s | agree to 10⁻³ | PASS |
| Hohmann LEO 300 km → GEO: Δv₂ applied / formula | 1.4668 / 1.4668 km/s | agree to 10⁻³ | PASS |
| Hohmann LEO 300 km → GEO: transfer time | 5.276 / 5.275 h | agree to 10⁻³ | PASS |
| Hohmann LEO 300 km → GEO: arrival radius / r₂ | 1.000019 | 1 within 10⁻⁴ | PASS |
| Hohmann Earth → Mars: Δv₁, Δv₂ applied / formula | 2.9449 / 2.9448, 2.6491 / 2.6490 km/s | agree to 10⁻³ | PASS |
| Hohmann Earth → Mars: transfer time | 258.96 / 258.87 d | agree to 10⁻³ | PASS |
| Hohmann Earth → Mars: arrival radius / r₂ | 1.000008 | 1 within 10⁻⁴ | PASS |
| J2: sun-synchronous inclination at 705 km / 500 km | 98.21° / 97.40° | 98.2° (Landsat 8/9) / 97.4° | PASS |
| J2: node drift at 705 km, i = 98.2° | 0.98465 °/d | 0.98565 °/d required (within 1 %) | PASS |
| Kepler III vs observed sidereal periods (worst planet: Neptune) | 0.072 % | < 0.1 % | PASS |
| α Centauri AB period | 79.76 yr | 79.76 yr (observed) | PASS |

All 24 checks pass. Momentum stays at about 10⁻¹³ of its natural scale throughout.

**Note on energy error.** With Velocity Verlet the energy error oscillates within each orbit and is largest near periapsis: up to 8 × 10⁻⁶ for e = 0.64 and 4 × 10⁻⁵ for e = 0.91 at 2,000 steps per orbit. It does not grow. The table therefore compares energy at the same orbital phase in orbit 1 and orbit 200. The app shows the current relative energy error live in the toolbar, and raising the resolution reduces the oscillation as Δt².

## 9. Scenarios

| Category | Scenarios |
|---|---|
| Two-body experiments | Circular orbit · Elliptical orbit (e = 0.44) · Parabolic escape · Radial fall (Earth and Moon from rest) |
| Earth satellites | Low Earth orbit (ISS-like, 420 km, 51.6°) · Medium Earth orbit (GPS) · Geostationary (INSAT-3DR, 74° E) · Geosynchronous inclined (NavIC IGSO, 29°) · Polar (Iridium-like) · Sun-synchronous (Landsat 8/9, 705 km, 98.2°) · Highly elliptical (Tundra) · Molniya · Geostationary transfer orbit (Kourou, apogee burn) · Circular equatorial (AstroSat-like) |
| Solar System | Earth around the Sun · Sun–Jupiter barycentre · Planetary orbits compared · Comet 1P/Halley · Interstellar comet 2I/Borisov · Solar escape · Earth → Mars Hohmann transfer (also Mercury, Venus, Jupiter) |
| Binary systems | Equal-mass binary · α Centauri AB · Sirius A and B · Earth–Moon · Pluto–Charon · Mass ratio series |
| Transfer orbits | Hohmann LEO → GEO (altitudes editable) · Geostationary transfer orbit · Earth → Mars |

Five guided experiments are built in: escape velocity, orbit shape and launch speed, effect of mass, motion about the barycentre, and radial versus tangential launch. Each one compares theory with measurement and leaves the observations and conclusion to the student.

## 10. Limitations

- **Two bodies only.** No third bodies, atmospheric drag, radiation pressure or relativity. The computed lunar month is 27.28 d, against the real 27.32 d, because the Sun's perturbation is not modelled.
- **Planar dynamics.** Motion is integrated in 2D. Plane changes cannot be flown; for the GTO the plane-change Δv is computed but not simulated.
- **J2 is first-order and secular.** It has no short-period terms and does not affect the integrated trajectory.
- **Simplified display models.** The Sun's apparent motion uses a mean, circular orbit. Coastlines are coarse polygons. Body textures, comet tails and the star background are visual only.
- **Enlarged bodies.** Bodies can be drawn larger than true scale for visibility. Physics and collisions always use the true radii, which are shown numerically.
- **Fixed-step mode.** Eccentric orbits precess slowly in fixed-step mode. The default adaptive mode reduces this by about 2,000×.

## 11. Data sources

- Planetary mean elements and sidereal periods: JPL, *Approximate Positions of the Planets* (J2000 mean elements).
- Earth: equatorial radius 6,378,137 m, J₂ = 1.08262668 × 10⁻³, sidereal day 86,164.0905 s, obliquity 23.4393°.
- α Centauri AB orbit and masses: Akeson et al. (2021), *The Astronomical Journal* 162, 14.
- Comets 1P/Halley (q = 0.586 AU, e = 0.967, i = 162°) and 2I/Borisov (q = 2.0065 AU, e = 3.3565): published orbital elements, values as listed in `src/missions.js`.
- Satellite examples (ISS, GPS, INSAT-3DR, NavIC, Iridium, Landsat 8/9, Tundra, Molniya, AstroSat): typical published orbit parameters. They are used as illustrative examples, not as tracked ephemerides.

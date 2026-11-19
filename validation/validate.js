// Validation of the Two-Body Dynamics Lab physics against closed-form results.
// Runs the same core.js and missions.js that the browser app uses, without a browser.
//
// Usage:  node validation/validate.js            (about 10-30 s)
// Output: a table of checks with the measured value, the reference value and PASS/FAIL.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

// ---- load the app's physics files into one context (they are written for the browser, not as modules)
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const ctx = { Math, console, Float64Array };
vm.createContext(ctx);
vm.runInContext(src('core.js') + '\n' + src('missions.js') + `
;this.L = {G, TAU, elements, Sim, SC, hohmann, missionInit, missionStep, j2Rates, ssoIncl,
  SSO_RATE, TSID, PLANETS, MSUN, MEARTH, MMOON, REQ, RMOON, AU, DAY, YR, D2R, muOf, visViva};`, ctx);
const L = ctx.L;

const rows = [];
function check(name, measured, reference, ok, note = '') {
  rows.push({ name, measured, reference, result: ok ? 'PASS' : 'FAIL', note });
}
const sci = (x, d = 2) => Number(x).toExponential(d);
const fix = (x, d = 4) => Number(x).toFixed(d);

// A Sun + 1,000 kg probe at 1 AU, tangential launch at k times circular speed (e = |k^2 - 1|).
function probe(k) {
  const mu = L.muOf(L.MSUN, 1000), r0 = L.AU;
  return { m1: L.MSUN, R1: 1, m2: 1000, R2: 1, r0, vr: 0, vt: k * Math.sqrt(mu / r0), th: 0 };
}

// 1. Order of convergence (fixed step): position error after one period, halving dt each time.
{
  const errs = [];
  for (const N of [500, 1000, 2000]) {
    const s = new L.Sim(probe(1.2), N, false, 16);
    const x0 = s.rx, y0 = s.ry;
    for (let i = 0; i < N; i++) s.step();
    errs.push(Math.hypot(s.rx - x0, s.ry - y0) / s.c.r0);
  }
  const r1 = errs[0] / errs[1], r2 = errs[1] / errs[2];
  check('Velocity Verlet convergence order (error ratio per halving of dt)', `${fix(r1, 2)}, ${fix(r2, 2)}`, '4.00 (second order)',
    Math.abs(r1 - 4) < 0.1 && Math.abs(r2 - 4) < 0.1, `errors ${errs.map(e => sci(e)).join(', ')}`);
}

// 2. Time reversibility (fixed step): run forward, reverse velocities, run back.
{
  const s = new L.Sim(probe(1.2), 2000, false, 16), x0 = s.rx, y0 = s.ry, n = 3000;
  for (let i = 0; i < n; i++) s.step();
  for (const k of ['vx1', 'vy1', 'vx2', 'vy2']) s[k] = -s[k];
  for (let i = 0; i < n; i++) s.step();
  const e = Math.hypot(s.rx - x0, s.ry - y0) / s.c.r0;
  check('Time reversibility, fixed step (position error / r0)', sci(e), '< 1e-10', e < 1e-10);
}

// 3. Energy and momentum conservation over 200 orbits, adaptive time-symmetric step, 2,000 steps per orbit.
//    Velocity Verlet's energy error oscillates within each orbit (largest near periapsis) but should not grow.
//    Secular drift is therefore measured at the same orbital phase (apoapsis) in orbit 1 and orbit 200.
for (const [e, k] of [[0, 1], [0.64, Math.sqrt(1.64)], [0.91, Math.sqrt(1.91)]]) {
  const s = new L.Sim(probe(k), 2000, true, 16), T = s.el0.T, apo = [];
  for (let n = 0; n < 200; n++) { while (s.t < (n + 0.5) * T) s.step(); apo.push(s.diag().drift); }
  const growth = Math.abs(apo[199] - apo[0]), P = s.diag().Prel;
  check(`Energy drift, orbit 1 to orbit 200 (same phase), e = ${e}`, sci(growth), '< 1e-9', growth < 1e-9,
    `bounded oscillation within an orbit up to ${sci(s.maxDrift)}; relative momentum ${sci(P)}`);
}

// 4. Computed path against the exact Kepler conic over 3 orbits (e = 0.44).
{
  const s = new L.Sim(probe(1.2), 2000, true, 16), el = s.el0;
  let worst = 0;
  while (s.t < 3 * el.T) {
    s.step();
    const th = Math.atan2(s.ry, s.rx), rc = el.p / (1 + el.e * Math.cos(th - el.w));
    worst = Math.max(worst, Math.abs(s.r - rc) / rc);
  }
  check('Computed path vs exact conic, 3 orbits (max |r - r_conic| / r)', sci(worst), '< 1e-5', worst < 1e-5);
}

// 5. Measured period (from the swept angle) against Kepler's third law.
{
  const s = new L.Sim(probe(1.2), 2000, true, 16), T = s.el0.T;
  while (s.revs < 2) s.step();
  const rel = Math.abs(s.Tmeas - T) / T;
  check('Measured period vs Kepler III, e = 0.44 (relative difference)', sci(rel), '< 1e-5', rel < 1e-5,
    'period from linear interpolation of the swept-angle crossing');
}

// 6. Radial fall of Earth and Moon from rest: contact time and speed against the closed form.
{
  const c = L.SC.radial.make(), s = new L.Sim(c, 2000, true, 16);
  while (!s.collided && s.t < 30 * L.DAY) s.step();
  const mu = s.mu, r0 = c.r0, x = (c.R1 + c.R2) / r0;
  const tc = Math.sqrt(r0 ** 3 / (2 * mu)) * (Math.acos(Math.sqrt(x)) + Math.sqrt(x * (1 - x)));
  const vc = Math.sqrt(2 * mu * (1 / (c.R1 + c.R2) - 1 / r0));
  const et = Math.abs(s.hitT - tc) / tc, ev = Math.abs(s.hitV - vc) / vc;
  check('Radial fall: contact time (days)', fix(s.hitT / L.DAY, 4), fix(tc / L.DAY, 4), et < 1e-6, `relative difference ${sci(et)}`);
  check('Radial fall: contact speed (km/s)', fix(s.hitV / 1e3, 4), fix(vc / 1e3, 4), ev < 1e-4, `relative difference ${sci(ev)}`);
}

// 7. Geostationary orbit: radius and period.
{
  const c = L.SC.geo.make(), s = new L.Sim(c, 2000, true, 16);
  check('GEO: orbital radius (km)', fix(c.r0 / 1e3, 1), '42164.2', Math.abs(c.r0 / 1e3 - 42164.2) < 0.5);
  check('GEO: period - sidereal day (s)', sci(s.el0.T - L.TSID), '|x| < 1e-6', Math.abs(s.el0.T - L.TSID) < 1e-6);
}

// 8. Hohmann transfers flown by the integrator against the formulas.
function flyTransfer(id, opt) {
  const sc = L.SC[id], c = sc.make(opt), s = new L.Sim(c, 2000, true, 16), tr = sc.transfer(c, opt), ms = L.missionInit(tr);
  while (!(ms.b1 && ms.b2) && s.t < tr.t1 + 3 * tr.tt) { s.step(); L.missionStep(s, ms); }
  const b1 = ms.burns[0], b2 = ms.burns[1];
  return { tr, b1, b2, s };
}
for (const [id, label] of [['hohmann', 'LEO 300 km -> GEO'], ['mars-transfer', 'Earth -> Mars']]) {
  const { tr, b1, b2, s } = flyTransfer(id);
  if (!b1 || !b2) { check(`Hohmann ${label}: both burns fired`, 'no', 'yes', false); continue; }
  const d1 = Math.abs(b1.dv - Math.abs(tr.dv1)) / Math.abs(tr.dv1), d2 = Math.abs(b2.dv - Math.abs(tr.dv2)) / Math.abs(tr.dv2);
  const tt = b2.t - b1.t, dt = Math.abs(tt - tr.tt) / tr.tt, dr = Math.abs(b2.r - tr.r2) / tr.r2;
  check(`Hohmann ${label}: dv1 applied / formula (km/s)`, `${fix(b1.dv / 1e3)} / ${fix(Math.abs(tr.dv1) / 1e3)}`, 'agree to 1e-3', d1 < 1e-3, `relative difference ${sci(d1)}`);
  check(`Hohmann ${label}: dv2 applied / formula (km/s)`, `${fix(b2.dv / 1e3)} / ${fix(Math.abs(tr.dv2) / 1e3)}`, 'agree to 1e-3', d2 < 1e-3, `relative difference ${sci(d2)}`);
  const unit = id === 'hohmann' ? 3600 : L.DAY, un = id === 'hohmann' ? 'h' : 'd';
  check(`Hohmann ${label}: transfer time measured / formula (${un})`, `${fix(tt / unit, 3)} / ${fix(tr.tt / unit, 3)}`, 'agree to 1e-3', dt < 1e-3, `relative difference ${sci(dt)}`);
  check(`Hohmann ${label}: arrival radius / r2`, fix(b2.r / tr.r2, 6), '1 within 1e-4', dr < 1e-4);
}

// 9. Sun-synchronous orbit (extended analytic J2 model, not the integrator).
{
  const mu = L.muOf(L.MEARTH, 2600), a705 = L.REQ + 705e3;
  const iReq705 = L.ssoIncl(mu, a705, 0) / L.D2R, iReq500 = L.ssoIncl(mu, L.REQ + 500e3, 0) / L.D2R;
  const dO = L.j2Rates(mu, a705, 0, 98.2 * L.D2R).dO / L.D2R * L.DAY, need = L.SSO_RATE / L.D2R * L.DAY;
  check('J2: inclination for sun-synchrony at 705 km (deg)', fix(iReq705, 2), '98.2 (Landsat 8/9)', Math.abs(iReq705 - 98.2) < 0.1);
  check('J2: inclination for sun-synchrony at 500 km (deg)', fix(iReq500, 2), '97.4', Math.abs(iReq500 - 97.4) < 0.1);
  check('J2: node drift at 705 km, 98.2 deg / required (deg/day)', `${fix(dO, 5)} / ${fix(need, 5)}`, 'within 1 %', Math.abs(dO / need - 1) < 0.01);
}

// 10. Kepler's third law across the planets (formula vs observed sidereal period).
{
  let worst = 0, who = '';
  for (const P of Object.values(L.PLANETS)) {
    const T = L.TAU * Math.sqrt((P.a * L.AU) ** 3 / (L.G * (L.MSUN + P.m))) / L.DAY, d = Math.abs(T / P.P - 1);
    if (d > worst) { worst = d; who = P.n; }
  }
  check('Kepler III vs observed sidereal periods, largest difference (%)', fix(worst * 100, 3), '< 0.1', worst < 1e-3, `worst: ${who}`);
}

// 11. alpha Centauri AB: simulated period against the observed 79.76 yr (Akeson et al. 2021).
{
  const s = new L.Sim(L.SC['alpha-cen'].make(), 2000, true, 16);
  check('alpha Centauri AB: period (yr)', fix(s.el0.T / L.YR, 2), '79.76 (observed)', Math.abs(s.el0.T / L.YR - 79.76) < 0.05);
}

// ---- report
const w = [0, 0, 0];
for (const r of rows) { w[0] = Math.max(w[0], r.name.length); w[1] = Math.max(w[1], String(r.measured).length); w[2] = Math.max(w[2], String(r.reference).length); }
console.log(`Two-Body Dynamics Lab: validation (node ${process.version})\n`);
console.log(`${'Check'.padEnd(w[0])}  ${'Measured'.padEnd(w[1])}  ${'Reference'.padEnd(w[2])}  Result  Note`);
for (const r of rows) console.log(`${r.name.padEnd(w[0])}  ${String(r.measured).padEnd(w[1])}  ${String(r.reference).padEnd(w[2])}  ${r.result.padEnd(6)}  ${r.note}`);
const fails = rows.filter(r => r.result === 'FAIL').length;
console.log(`\n${rows.length - fails} of ${rows.length} checks passed.`);
process.exitCode = fails ? 1 : 0;

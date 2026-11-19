// ───────── Missions, reference data and extended models. Pure functions, no DOM. ─────────
// The two-body solver (core) is never modified by this file. Extended models here are analytic
// (J2 secular rates) or explicit impulsive manoeuvres applied between integration steps.
const AU=1.495978707e11,DAY=86400,YR=3.15576e7,LY=9.4607304725808e15,D2R=Math.PI/180;
const MSUN=1.98847e30,RSUN=6.957e8,MEARTH=5.9722e24,REQ=6378137,MMOON=7.342e22,RMOON=1.7374e6;
const J2=1.08262668e-3,TSID=86164.0905,WE=TAU/TSID,OBL=23.4393*D2R,TROP=365.24219*DAY,SSO_RATE=TAU/TROP;
const clamp1=x=>Math.max(-1,Math.min(1,x));
const muOf=(m1,m2)=>G*(m1+m2);
const aFromT=(mu,T)=>Math.cbrt(mu*(T/TAU)**2);
const visViva=(mu,r,a)=>Math.sqrt(mu*(2/r-1/a));

// Appearance and rotation data. obl: tilt of the spin axis relative to the orbital plane drawn.
const KINDS={
 generic:{n:'Generic sphere'},sun:{n:'Sun',lum:1,rot:25.38*DAY,obl:7.25},star:{n:'Star',lum:1},wd:{n:'White dwarf',lum:1},
 mercury:{n:'Mercury',rot:58.646*DAY,obl:.03},venus:{n:'Venus',rot:-243.025*DAY,obl:177.36,atm:'#f3e6c0'},
 earth:{n:'Earth',rot:TSID,obl:23.44,atm:'#7fb6ff'},moon:{n:'Moon',tidal:1,obl:1.54},mars:{n:'Mars',rot:88642.66,obl:25.19,atm:'#e9b08c'},
 jupiter:{n:'Jupiter',rot:35730,obl:3.13},saturn:{n:'Saturn',rot:38018,obl:26.73,rings:1},uranus:{n:'Uranus',rot:-62064,obl:97.77},
 neptune:{n:'Neptune',rot:57996,obl:28.32},pluto:{n:'Pluto',tidal:1,obl:0},charon:{n:'Charon',tidal:1,obl:0},
 comet:{n:'Comet nucleus'},craft:{n:'Spacecraft'}};
const PLANETS={ // JPL J2000 mean elements: a in AU; observed sidereal period in days; equatorial radius in m
 mercury:{n:'Mercury',m:3.3011e23,R:2.4397e6,a:.38709927,e:.20563593,P:87.969,c:'#a39b92'},
 venus:{n:'Venus',m:4.8675e24,R:6.0518e6,a:.72333566,e:.00677672,P:224.701,c:'#e6d3a3'},
 earth:{n:'Earth',m:MEARTH,R:REQ,a:1.00000261,e:.01671123,P:365.256,c:'#4f8fd6'},
 mars:{n:'Mars',m:6.4171e23,R:3.3962e6,a:1.52371034,e:.0933941,P:686.98,c:'#c1653a'},
 jupiter:{n:'Jupiter',m:1.8982e27,R:7.1492e7,a:5.202887,e:.04838624,P:4332.59,c:'#c9a27c'},
 saturn:{n:'Saturn',m:5.6834e26,R:6.0268e7,a:9.53667594,e:.05386179,P:10759.22,c:'#d8c08a'},
 uranus:{n:'Uranus',m:8.681e25,R:2.5559e7,a:19.18916464,e:.04725744,P:30688.5,c:'#9fd6df'},
 neptune:{n:'Neptune',m:1.02413e26,R:2.4764e7,a:30.06992276,e:.00859048,P:60182,c:'#4f74d9'}};
function guessKind(name){const n=String(name||'').toLowerCase();
  for(const k of['sun','earth','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','charon'])if(n.includes(k))return k;
  if(/sirius b/.test(n))return'wd';if(/comet|borisov|halley/.test(n))return'comet';if(/probe|craft|sat|iss|station/.test(n))return'craft';
  if(/α cen|alpha|star|sirius/.test(n))return'star';return'generic'}

// ───────── geometry: orbital plane ↔ reference (equatorial) frame ─────────
// The in-plane x-axis is the ascending node. A vector in the plane maps to the reference frame by Rz(Ω)·Rx(i).
const rotZ=(a,[x,y,z])=>{const c=Math.cos(a),s=Math.sin(a);return[c*x-s*y,s*x+c*y,z]};
const rotX=(a,[x,y,z])=>{const c=Math.cos(a),s=Math.sin(a);return[x,c*y-s*z,s*y+c*z]};
function planeToRef(cfg,v,dO=0,dw=0,sg=1){let p=dw?rotZ(sg*dw,v):v;p=rotX(cfg.inc*D2R,p);return rotZ(cfg.raan*D2R+dO,p)}
function refToPlane(cfg,v){return rotX(-cfg.inc*D2R,rotZ(-cfg.raan*D2R,v))}
function planeMatrix(cfg){ // columns: images of the in-plane x, y, z axes in the reference frame
  const X=planeToRef(cfg,[1,0,0]),Y=planeToRef(cfg,[0,1,0]),Z=planeToRef(cfg,[0,0,1]);
  return[[X[0],Y[0],Z[0]],[X[1],Y[1],Z[1]],[X[2],Y[2],Z[2]]]}
// Effective inclination and node: a clockwise in-plane orbit (h < 0) is the same plane traversed the other way.
function effPlane(cfg,h){const n=planeToRef(cfg,[0,0,h<0?-1:1]),i=Math.acos(clamp1(n[2]));
  return{i,O:Math.sin(i)<1e-9?cfg.raan*D2R:Math.atan2(n[0],-n[1]),sg:h<0?-1:1}}

// ───────── Sun direction (mean motion, circular apparent orbit) and Earth rotation ─────────
const sunLon=(t,l0=0)=>l0*D2R+SSO_RATE*t;
function sunRef(t,l0){const l=sunLon(t,l0);return[Math.cos(l),Math.sin(l)*Math.cos(OBL),Math.sin(l)*Math.sin(OBL)]}
function sunRA(t,l0){const l=sunLon(t,l0);return Math.atan2(Math.sin(l)*Math.cos(OBL),Math.cos(l))}
const earthAngle=(cfg,t)=>(cfg.gst0||0)*D2R+WE*t;

// ───────── J2 secular model (extended, analytic). Not used by the integrator. ─────────
function j2Rates(mu,a,e,i){if(!(a>0)||!(e<1))return null;const n=Math.sqrt(mu/a**3),p=a*(1-e*e),k=n*J2*(REQ/p)**2;
  return{dO:-1.5*k*Math.cos(i),dw:.75*k*(5*Math.cos(i)**2-1),n}}
function ssoIncl(mu,a,e){const n=Math.sqrt(mu/a**3),p=a*(1-e*e),c=-SSO_RATE/(1.5*n*J2*(REQ/p)**2);return Math.abs(c)<=1?Math.acos(c):null}
const CRIT_INC=Math.acos(Math.sqrt(1/5)); // 63.43°: apsidal drift vanishes

// Sub-satellite point from an in-plane relative position at time t. j2: {dO, dw} rates or null.
function subPoint(cfg,x,y,t,sg,j2){const p=planeToRef(cfg,[x,y,0],j2?j2.dO*t:0,j2?j2.dw*t:0,sg),r=Math.hypot(...p);
  let lon=Math.atan2(p[1],p[0])-earthAngle(cfg,t);lon=((lon+Math.PI)%TAU+TAU)%TAU-Math.PI;return{lat:Math.asin(p[2]/r),lon}}
// Mean local solar time of the ascending node: measured from the mean Sun, which moves uniformly (no equation of time).
function ltan(cfg,el,t,j2){const pl=effPlane(cfg,el.h),O=pl.O+(j2?j2.dO*t:0),l0=cfg.sun0||0;
  return(((12+(O-sunLon(t,l0))/(15*D2R))%24)+24)%24}

// Earth-orbit checks. Tolerances are stated so the classification is reproducible.
const GEO_TOL={T:1e-3,e:1e-3,i:.1};
function earthChecks(cfg,el){
  const pl=effPlane(cfg,el.h),iDeg=pl.i/D2R,T=el.T,ratio=T?T/TSID:null;
  const geosync=ratio!=null&&Math.abs(ratio-1)<GEO_TOL.T,circ=el.e<GEO_TOL.e,equ=iDeg<GEO_TOL.i,pro=iDeg<90;
  const hp=el.radial?null:el.rp-REQ,ha=el.ra!=null?el.ra-REQ:null;
  let regime='Escape trajectory';
  if(el.kind==='bound'){regime=el.e>.25?'Highly elliptical':ha<2e6?'Low Earth orbit':geosync?'Geosynchronous':Math.abs(el.a-42164e3)<5e5?'GEO radius':hp>2e6&&ha<35586e3?'Medium Earth orbit':'High Earth orbit'}
  const inc=iDeg<1?'equatorial':Math.abs(iDeg-90)<=10?(Math.abs(iDeg-90)<1?'polar':'near-polar'):iDeg>179?'equatorial, retrograde':iDeg>90?'retrograde':'inclined';
  let verdict;
  if(!geosync)verdict='Not geosynchronous';
  else if(circ&&equ&&pro)verdict='Geostationary';
  else verdict='Geosynchronous, not geostationary ('+[!circ&&'eccentric',!equ&&'inclined',!pro&&'retrograde'].filter(Boolean).join(', ')+')';
  return{iDeg,ratio,geosync,circ,equ,pro,hp,ha,regime,inc,verdict,O:pl.O};
}

// ───────── Hohmann transfer between coplanar circular orbits ─────────
function hohmann(mu,r1,r2){const at=(r1+r2)/2,v1=Math.sqrt(mu/r1),v2=Math.sqrt(mu/r2),vd=visViva(mu,r1,at),va=visViva(mu,r2,at);
  return{at,v1,v2,vd,va,dv1:vd-v1,dv2:v2-va,tt:Math.PI*Math.sqrt(at**3/mu),e:Math.abs(r2-r1)/(r1+r2)}}
// Impulse on the relative velocity, shared between the bodies so total momentum stays zero.
// For a spacecraft the share given to the central body is of order m₂/M and is negligible.
function setRelVel(sim,vx,vy){const c=sim.c,M=sim.M,dx=vx-(sim.vx2-sim.vx1),dy=vy-(sim.vy2-sim.vy1);
  sim.sample();sim.vx1-=c.m2/M*dx;sim.vy1-=c.m2/M*dy;sim.vx2+=c.m1/M*dx;sim.vy2+=c.m1/M*dy;
  const e=sim.energy();sim.E0=e.E;sim.Eref=Math.abs(e.E)>1e-6*Math.abs(e.U)?Math.abs(e.E):Math.abs(e.U);sim.L0=sim.angmom();sim.sample();return Math.hypot(dx,dy)}
// Mission state: {tr, b1, b2, burns[], prevVr}. Called after every integration step.
function missionInit(tr){return tr?{tr,b1:!!tr.onTransfer,b2:false,burns:[],prevVr:null,active:true}:null}
function missionStep(sim,ms){
  if(!ms||!ms.active||sim.collided)return null;const tr=ms.tr,rx=sim.rx,ry=sim.ry,r=sim.r,vx=sim.vx2-sim.vx1,vy=sim.vy2-sim.vy1,h=rx*vy-ry*vx,sg=h<0?-1:1;
  const tx=-ry/r*sg,ty=rx/r*sg;let ev=null;
  if(!ms.b1&&sim.t>=tr.t1){const v=tr.vd,dv=setRelVel(sim,tx*v,ty*v);ms.b1=true;ms.burns.push({t:sim.t,x:rx,y:ry,dv,label:'Δv₁'});ms.prevVr=null;ev='b1'}
  else if(ms.b1&&!ms.b2&&tr.arrive){
    const vr=(rx*vx+ry*vy)/r,out=tr.r2>tr.r1;
    if(ms.prevVr!=null&&(out?ms.prevVr>0&&vr<=0:ms.prevVr<0&&vr>=0)){const v=Math.sqrt(sim.mu/r),dv=setRelVel(sim,tx*v,ty*v);ms.b2=true;ms.burns.push({t:sim.t,x:rx,y:ry,dv,label:'Δv₂',r});ev='b2'}
    ms.prevVr=vr}
  return ev;
}

// ───────── scenario catalog ─────────
const CATS=[['tb','Two-body experiments'],['earth','Earth satellites'],['solar','Solar System'],['binary','Binary systems'],['transfer','Transfer orbits']];
const SUN={n1:'Sun',m1:MSUN,R1:RSUN,c1:'#ffb648',k1:'sun'};
const EARTH={n1:'Earth',m1:MEARTH,R1:REQ,c1:'#4f8fd6',k1:'earth'};
const base=o=>({inc:0,raan:0,gst0:0,sun0:0,vr:0,th:0,...o});
function sat(name,hp,ha,inc,o={}){ // perigee/apogee altitudes in km, started at perigee; o.w = argument of perigee (deg)
  const m=o.m||1000,mu=muOf(MEARTH,m),rp=REQ+hp*1e3,ra=REQ+ha*1e3,a=(rp+ra)/2;
  return base({...EARTH,n2:name,m2:m,R2:o.R||5,c2:o.c||'#e8e2d0',k2:'craft',r0:rp,vt:visViva(mu,rp,a),inc,raan:o.raan||0,th:o.w||0,gst0:o.gst0||0,sun0:o.sun0||0})}
function satT(name,T,e,inc,o={}){const mu=muOf(MEARTH,o.m||1000),a=aFromT(mu,T);return sat(name,(a*(1-e)-REQ)/1e3,(a*(1+e)-REQ)/1e3,inc,o)}
const sunProbe=(n,vt,o={})=>base({...SUN,n2:n,m2:1000,R2:2,c2:'#c9a6ff',k2:'craft',r0:AU,vt,...o});
const vcSun=r=>Math.sqrt(muOf(MSUN,1000)/r);

const SCENARIOS=[
 // Two-body experiments
 {id:'circ',cats:['tb'],name:'Circular orbit',short:'Tangential launch at exactly circular speed',
  make:()=>sunProbe('Probe',vcSun(AU)),frame:'bary',
  learn:{what:'A tangential launch at the circular speed keeps the separation constant. Here a 1,000 kg probe orbits the Sun at 1 AU.',why:'The reference case for all other orbits: e = 0 and constant speed.',ic:'r₀ = 1 AU, v_r = 0, v_t = √(μ/r₀) ≈ 29.8 km/s.',eq:['v_c = √(μ/r)','T = 2π √(r³/μ)'],obs:'The computed path lies on the dashed Kepler circle and e stays at zero to rounding error.'}},
 {id:'ellipse',cats:['tb'],name:'Elliptical orbit',short:'20 % faster than circular speed',
  make:()=>sunProbe('Probe',1.2*vcSun(AU)),frame:'bary',
  learn:{what:'A launch between circular and escape speed gives an ellipse. With v_t = 1.2 v_c the start point becomes periapsis and e = 0.44.',why:'Shows how a single velocity change sets the orbit shape.',ic:'r₀ = 1 AU, v_r = 0, v_t = 1.2 √(μ/r₀).',eq:['e = |k² − 1|, k = v_t / v_c','r_a = r₀ (1 + e)/(1 − e)','r² dθ/dt = h = constant'],obs:'Speed is greatest at periapsis and least at apoapsis. The equal-area law shows as fast motion near the Sun.'}},
 {id:'parabolic',cats:['tb'],name:'Parabolic escape',short:'Launch at exactly the escape speed',
  make:()=>base({...SUN,n2:'Probe',m2:1000,R2:1.5,c2:'#c9a6ff',k2:'craft',r0:AU,vt:Math.sqrt(2*muOf(MSUN,1000)/AU)}),frame:'bary',
  learn:{what:'A tangential launch at v = √(2μ/r₀) has zero specific energy: the boundary between bound and unbound motion.',why:'Defines the escape speed. Any faster launch escapes with speed to spare; any slower one returns.',ic:'r₀ = 1 AU, v_t = √(2μ/r₀) ≈ 42.1 km/s.',eq:['ε = v²/2 − μ/r = 0','e = 1','v → 0 as r → ∞'],obs:'The speed keeps falling as the probe recedes and tends to zero. Energy drift is reported against the potential energy because E₀ ≈ 0.'}},
 {id:'radial',cats:['tb'],name:'Radial fall',short:'Earth and Moon released from rest',
  make:()=>base({n1:'Earth',m1:MEARTH,R1:REQ,c1:'#4f8fd6',k1:'earth',n2:'Moon',m2:MMOON,R2:RMOON,c2:'#d9d4c7',k2:'moon',r0:3.84399e8,vt:0,inc:23.44}),frame:'bary',
  learn:{what:'With no tangential velocity, angular momentum is zero and the bodies fall straight together.',why:'The degenerate limit of an ellipse with e → 1. It isolates the effect of tangential velocity.',ic:'Earth and Moon at 384,399 km, both at rest in the barycentric frame (thought experiment).',eq:['h = r₀ v_t = 0','t_contact = √(r₀³/2μ) [acos √x + √(x(1−x))], x = (R₁+R₂)/r₀','v_impact = √(2μ(1/(R₁+R₂) − 1/r₀))'],obs:'Contact after about 4.8 days at about 9.9 km/s. Compare with the guided experiment Radial vs tangential.'}},
 // Earth satellites
 {id:'leo',cats:['earth'],name:'Low Earth orbit',short:'420 km, 51.6°, like the ISS',example:'International Space Station (altitude varies around 410–420 km with reboosts and drag)',
  make:()=>sat('ISS-like',420,420,51.64,{m:4.2e5,R:55,raan:30}),frame:'b1',trail:3,inset:'ground',
  learn:{what:'Low Earth orbit lies below about 2,000 km altitude. This one is circular at 420 km and inclined 51.6°, similar to the ISS.',why:'Low cost to reach, short signal delay and fine imaging resolution. Used by crewed stations, Earth observation and large constellations. Drag lowers real LEO orbits; it is not modelled here.',ic:'Circular speed at r = R⊕ + 420 km, perpendicular to the radius.',eq:['r = R⊕ + h','v = √(μ/r) ≈ 7.66 km/s','T = 2π √(r³/μ) ≈ 93.0 min'],obs:'Earth turns about 23° per orbit, so each ground-track pass is shifted west. The track reaches 51.6° N and S, equal to the inclination.'}},
 {id:'meo',cats:['earth'],name:'Medium Earth orbit',short:'GPS: half a sidereal day, 55°',example:'GPS satellites (a ≈ 26,560 km, i = 55°)',
  make:()=>satT('GPS-like',TSID/2,0,55,{m:2000,R:3}),frame:'b1',trail:2,inset:'ground',
  learn:{what:'Medium Earth orbit lies between LEO and GEO. GPS satellites orbit at about 20,200 km altitude in six planes inclined 55°.',why:'Each satellite sees a large part of Earth, so 24–31 satellites give global coverage with at least four in view.',ic:'Radius chosen so the period is exactly half a sidereal day.',eq:['T = T_sid / 2 = 11 h 58 min','a = ∛(μ T² / 4π²) ≈ 26,560 km'],obs:'The ground track repeats after two orbits, one sidereal day.'}},
 {id:'geo',cats:['earth'],name:'Geostationary orbit',short:'Circular, equatorial, one sidereal day',example:'Weather and communication satellites, e.g. INSAT-3DR near 74° E',
  make:()=>satT('GEO satellite',TSID,0,0,{m:2000,R:4,gst0:-74}),frame:'b1',trail:1,inset:'ground',
  learn:{what:'A geostationary orbit is circular, equatorial and prograde, with a period of one sidereal day (23 h 56 min 4.09 s). The satellite stays above one point on the equator.',why:'Ground antennas can point at it permanently. Used for communications and weather observation.',ic:'Orbital radius 42,164 km measured from Earth’s centre. Subtracting the equatorial radius (6,378 km) gives the altitude of 35,786 km. Circular speed 3.075 km/s, i = 0°.',eq:['r = ∛(μ T_sid² / 4π²) = 42,164 km','h = r − R⊕ = 35,786 km','v = 2π r / T_sid = 3.075 km/s'],obs:'In the orbit view Earth turns beneath the satellite at the same rate, so the satellite stays over the same longitude. The ground track is a single point. Orbit → Earth-orbit checks shows all four conditions met.',note:'Altitude is measured from Earth’s surface; orbital radius and distance from Earth’s centre are the same quantity. They differ by Earth’s radius.'}},
 {id:'geosync',cats:['earth'],name:'Geosynchronous orbit',short:'One sidereal day, inclined 29°',example:'NavIC (IRNSS) inclined geosynchronous satellites, i ≈ 29°',
  make:()=>satT('IGSO satellite',TSID,0,29,{m:1400,R:3,gst0:-55}),frame:'b1',trail:1,inset:'ground',
  learn:{what:'Any orbit with a period of one sidereal day is geosynchronous. This one is circular but inclined 29°, like NavIC’s inclined geosynchronous satellites.',why:'The satellite returns to the same position in the sky every day while covering higher latitudes than a geostationary one.',ic:'Same radius and speed as GEO (42,164 km, 3.075 km/s). Only the orbital plane differs.',eq:['T = T_sid','Geostationary also needs e = 0, i = 0°, prograde'],obs:'The ground track is a figure-eight between 29° N and 29° S, centred on 55° E. Orbit → Earth-orbit checks reports geosynchronous but not geostationary.'}},
 {id:'polar',cats:['earth'],name:'Polar orbit',short:'780 km, 86.4°, like Iridium',example:'Iridium constellation (780 km, i = 86.4°)',
  make:()=>sat('Iridium-like',780,780,86.4,{m:860,R:4,raan:60}),frame:'b1',trail:5,inset:'plane',
  learn:{what:'A polar orbit has an inclination near 90°, so the satellite passes over or near both poles.',why:'Earth rotates beneath the orbit, so a polar satellite eventually passes over every region. Iridium uses 66 satellites in six near-polar planes.',ic:'Circular at 780 km, i = 86.4°.',eq:['v = √(μ/r) ≈ 7.46 km/s','Westward shift per orbit Δλ = 360° · T / T_sid ≈ 25°'],obs:'The orbit-plane view shows the plane almost perpendicular to the equator. Switch the inset to the ground track to see successive passes shift west.'}},
 {id:'sso',cats:['earth'],name:'Sun-synchronous orbit',short:'705 km, 98.2°, like Landsat 8/9',example:'Landsat 8 and 9 (705 km, i ≈ 98.2°, 10:00 descending node)',
  make:o=>{const alt=o&&o.alt||705,mu=muOf(MEARTH,2600),a=REQ+alt*1e3,i=ssoIncl(mu,a,0);return sat('Landsat-like',alt,alt,o&&o.alt?i/D2R:98.2,{m:2600,R:5,raan:150})},defOpt:{},frame:'b1',trail:2,inset:'plane',ctl:'sso',
  learn:{what:'A sun-synchronous orbit crosses each latitude at the same local solar time. Landsat 8 and 9 fly at 705 km and cross the equator southbound near 10:00.',why:'Constant illumination makes images comparable across days and years.',ic:'Circular at 705 km. The inclination is chosen so Earth’s equatorial bulge (J2) turns the orbital plane eastward by 360° per year, matching the Sun’s apparent motion.',eq:['Ω̇ = −(3/2) n J2 (R⊕/p)² cos i','Required Ω̇ = 360° / 365.2422 d = 0.9856°/day','cos i = −Ω̇_req / [(3/2) n J2 (R⊕/p)²]'],obs:'Two-body motion keeps the plane fixed, so the node’s local time drifts by about 4 minutes per day. Turn on the J2 model under Orbit: the node now follows the Sun and the local time stays constant.',note:'Sun-synchrony is a perturbation effect. The two-body solver alone cannot produce it; the J2 model here is analytic and separate from the integration.'}},
 {id:'heo',cats:['earth'],name:'Highly elliptical orbit',short:'Tundra: e ≈ 0.27, 63.4°, one sidereal day',example:'Tundra orbit used by the Sirius satellite radio satellites',
  make:()=>satT('Tundra satellite',TSID,.2684,63.4,{m:3800,R:5,w:270,gst0:6}),frame:'b1',trail:1,inset:'ground',
  learn:{what:'A highly elliptical orbit has a low perigee and a high apogee. This Tundra orbit has e ≈ 0.27, i = 63.4° and a one-sidereal-day period.',why:'The satellite moves slowly near apogee (equal areas in equal times), so it stays high over one region for many hours.',ic:'Started at perigee with the vis-viva speed. Argument of perigee 270° places apogee over the northern hemisphere.',eq:['v² = μ (2/r − 1/a)','r_p = a(1 − e), r_a = a(1 + e)','v_p / v_a = (1 + e)/(1 − e)'],obs:'The ground track is a closed loop at high northern latitude, where the satellite lingers. It is geosynchronous but not geostationary.'}},
 {id:'molniya',cats:['earth'],name:'Molniya orbit',short:'e ≈ 0.74, 63.4°, half a sidereal day',example:'Molniya communication satellites (USSR/Russia)',
  make:()=>satT('Molniya satellite',TSID/2,.74,63.4,{m:1600,R:4,w:270,gst0:-90}),frame:'b1',trail:2,inset:'ground',ctl:'j2',
  learn:{what:'Molniya orbits are highly eccentric (e ≈ 0.74), inclined 63.4°, with a period of half a sidereal day. Perigee is near 530 km and apogee near 39,800 km.',why:'Developed for communications at high northern latitudes, where geostationary satellites sit low on the horizon. Each satellite spends about 8 of its 12 hours near apogee.',ic:'Started at perigee with argument of perigee 270°, so apogee is over the northern hemisphere.',eq:['T = T_sid / 2','ω̇ ∝ (5 cos² i − 1) = 0 at i = 63.43°'],obs:'With the J2 model on, the apsidal drift ω̇ is almost zero at 63.4°, so apogee stays in the north. Change the inclination under Setup and watch ω̇ under Orbit.'}},
 {id:'gto',cats:['earth','transfer'],name:'Geostationary transfer orbit',short:'250 × 35,786 km ellipse with apogee burn',example:'Launch to GTO from Kourou (i ≈ 6°); from Cape Canaveral i ≈ 27°',
  make:()=>sat('GEO satellite in GTO',250,35786,6,{m:3500,R:4,w:180}),frame:'b1',trail:0,inset:'plane',
  transfer:c=>{const mu=muOf(c.m1,c.m2),rp=REQ+250e3,r2=42164e3;return{kind:'apogee',onTransfer:true,r1:rp,r2,arrive:true,mu}},
  guides:()=>[{r:42164e3,label:'GEO'}],
  learn:{what:'A geostationary transfer orbit is an ellipse with perigee in LEO and apogee at GEO altitude. Launchers release GEO satellites into it.',why:'The satellite’s own engine circularises at apogee, usually removing the remaining inclination at the same time.',ic:'Perigee 250 km, apogee 35,786 km, started at perigee. Inclination 6°, typical of launches from Kourou.',eq:['a = (r_p + r_a)/2','Δv (in-plane) = v_GEO − v_a','Δv (with plane change Δi) = √(v_a² + v_GEO² − 2 v_a v_GEO cos Δi)'],obs:'The apogee burn fires automatically when the satellite reaches apoapsis (toggle under Orbit). The 2D solver cannot change the orbital plane, so the plane-change cost is computed but not simulated.'}},
 {id:'equatorial',cats:['earth'],name:'Circular equatorial orbit',short:'650 km in the equatorial plane',example:'Near-equatorial science missions such as AstroSat (≈ 650 km, i ≈ 6°)',
  make:()=>sat('Equatorial satellite',650,650,0,{m:1500,R:4}),frame:'b1',trail:3,inset:'ground',
  learn:{what:'An orbit in Earth’s equatorial plane at constant altitude.',why:'It passes regularly over equatorial ground stations, and a launch from a near-equatorial site needs little plane change to reach it.',ic:'Circular at 650 km, i = 0°.',eq:['v = √(μ/r) ≈ 7.53 km/s','T ≈ 97.7 min'],obs:'The ground track stays on the equator and moves east, because the satellite circles faster than Earth rotates.'}},
 // Solar System
 {id:'sun-earth',cats:['solar'],name:'Earth around the Sun',short:'Perihelion, a = 1.000 AU, e = 0.0167',example:'Earth (J2000 mean elements)',
  make:()=>{const a=1.49598023e11,e=.0167086,r=a*(1-e);return base({...SUN,n2:'Earth',m2:MEARTH,R2:REQ,c2:'#4f8fd6',k2:'earth',r0:r,vt:visViva(muOf(MSUN,MEARTH),r,a)})},frame:'bary',
  learn:{what:'Earth’s orbit, started at perihelion with a = 1.00000102 AU and e = 0.0167086.',why:'The baseline for heliocentric motion: one sidereal year, nearly circular.',ic:'r₀ = a(1 − e) = 0.9833 AU; v_t from vis-viva with μ = G(M☉ + M⊕).',eq:['v² = μ (2/r − 1/a)','T = 2π √(a³/μ) = 365.25 d'],obs:'The Sun moves around the barycentre by about 450 km, well inside its radius. Earth’s day/night side follows the Sun direction.'}},
 {id:'sun-jupiter',cats:['solar','binary'],name:'Sun–Jupiter barycentre',short:'Barycentre just outside the Sun',example:'Jupiter (a = 5.2029 AU, e = 0.0484)',
  make:()=>{const P=PLANETS.jupiter,a=P.a*AU,r=a*(1-P.e);return base({...SUN,n2:'Jupiter',m2:P.m,R2:P.R,c2:P.c,k2:'jupiter',r0:r,vt:visViva(muOf(MSUN,P.m),r,a)})},frame:'bary',
  learn:{what:'Jupiter is massive enough that the Sun–Jupiter barycentre lies just outside the Sun: 1.02 to 1.12 solar radii from its centre, depending on Jupiter’s distance.',why:'Shows that the Sun also orbits. This reflex motion is how many exoplanets are detected.',ic:'Jupiter at perihelion with a = 5.2029 AU, e = 0.0484.',eq:['d☉ = r · M_J / (M☉ + M_J)','T = 2π √(a³/μ) ≈ 11.86 yr'],obs:'Follow the Sun (View → Camera follow) and zoom in: the Sun circles a point outside its own surface.'}},
 {id:'planets',cats:['solar'],name:'Planetary orbits compared',short:'Kepler’s third law across the planets',
  make:o=>{const P=PLANETS[o&&o.p||'mars'],a=P.a*AU;return base({...SUN,n2:P.n,m2:P.m,R2:P.R,c2:P.c,k2:o&&o.p||'mars',r0:a,vt:Math.sqrt(muOf(MSUN,P.m)/a)})},defOpt:{p:'mars'},frame:'bary',ctl:'planet',
  guides:()=>Object.values(PLANETS).map(P=>({r:P.a*AU,label:P.n})),
  learn:{what:'Circular approximations of the planetary orbits at their mean distances. The selected planet is simulated; the others are reference circles.',why:'Kepler’s third law: T² ∝ a³. The table compares the period from the formula with the observed sidereal period.',ic:'Selected planet at its semi-major axis with the circular speed.',eq:['T = 2π √(a³ / G(M☉ + m))','v_c = √(μ/a)'],obs:'Outer planets move more slowly and take far longer per orbit. Differences from the observed periods come from rounding of a and from the planets’ small masses.'}},
 {id:'halley',cats:['solar'],name:'Comet: elliptical orbit',short:'1P/Halley, e = 0.967, retrograde',example:'1P/Halley (q = 0.586 AU, e = 0.967, i = 162°)',
  make:()=>{const q=.58597*AU,e=.96714,a=q/(1-e),m=2.2e14;return base({...SUN,n2:'1P/Halley',m2:m,R2:5.5e3,c2:'#9fe8dc',k2:'comet',r0:q,vt:visViva(muOf(MSUN,m),q,a),inc:162.26,raan:58.42})},frame:'bary',
  learn:{what:'Halley’s comet on a highly eccentric ellipse: perihelion 0.586 AU, aphelion about 35 AU, period about 75 years. Its inclination of 162° means it orbits retrograde.',why:'Typical of short-period comets: brief fast passage near the Sun, long slow stretch far away.',ic:'Started at perihelion with the vis-viva speed for a = q/(1 − e) = 17.8 AU.',eq:['a = q / (1 − e)','v_q = √(μ (1 + e)/q)','T = 2π √(a³/μ)'],obs:'The comet spends a small fraction of its period inside Jupiter’s distance. The tail is drawn pointing away from the Sun for orientation only.'}},
 {id:'borisov',cats:['solar'],name:'Comet: hyperbolic flyby',short:'2I/Borisov, e = 3.36',example:'2I/Borisov, interstellar comet (q = 2.007 AU, e = 3.357)',
  make:()=>{const q=2.00652*AU,e=3.3565,r=6*AU,m2=1e12,mu=muOf(MSUN,m2),a=q/(1-e),v=visViva(mu,r,a),vt=Math.sqrt(mu*q*(1+e))/r;return base({...SUN,n2:'2I/Borisov',m2,R2:400,c2:'#8ff0e0',k2:'comet',r0:r,vr:-Math.sqrt(v*v-vt*vt),vt,th:130,inc:44.05,raan:308.15})},frame:'bary',
  learn:{what:'An interstellar comet on an open hyperbola: it passed the Sun once and is leaving the Solar System.',why:'Positive specific energy relative to the Sun shows the object was never bound.',ic:'Inbound at 6 AU, with radial and tangential speeds chosen to reproduce q = 2.0065 AU and e = 3.3565. The nucleus mass is not measured; 10¹² kg is assumed and has no visible effect.',eq:['ε = v²/2 − μ/r > 0','v∞ = √(2ε) ≈ 32.3 km/s','r_p = a (1 − e), a < 0'],obs:'The path bends by only about 35° because the comet is fast. The speed far from the Sun tends to v∞.'}},
 {id:'escape',cats:['solar'],name:'Solar escape',short:'1.2 × escape speed at 1 AU',example:'Illustrative. Voyager 1 recedes at about 17 km/s after gravity assists.',
  make:()=>sunProbe('Probe',1.2*Math.sqrt(2)*vcSun(AU)),frame:'bary',
  learn:{what:'A trajectory with positive energy relative to the Sun: the spacecraft never returns.',why:'Real missions reach solar escape speed with gravity assists from the giant planets rather than launch energy alone.',ic:'Departure at 1 AU, tangential, at 1.2 times the local escape speed (illustrative).',eq:['v_esc = √(2μ/r) = 42.1 km/s at 1 AU','v∞ = √(v² − v_esc²) ≈ 27.9 km/s'],obs:'The speed falls quickly at first, then levels off near v∞.'}},
 {id:'mars-transfer',cats:['solar','transfer'],name:'Earth → Mars transfer',short:'Hohmann, 259 days, heliocentric Δv',
  make:o=>{const P=PLANETS[o&&o.p||'mars'],r1=PLANETS.earth.a*AU;return base({...SUN,n2:'Spacecraft',m2:1000,R2:3,c2:'#e8e2d0',k2:'craft',r0:r1,vt:vcSun(r1),th:300})},defOpt:{p:'mars'},frame:'bary',ctl:'target',
  transfer:(c,o)=>{const P=PLANETS[o&&o.p||'mars'],mu=muOf(c.m1,c.m2),r1=c.r0,r2=P.a*AU,H=hohmann(mu,r1,r2),T1=TAU*Math.sqrt(r1**3/mu);return{kind:'hohmann',r1,r2,mu,...H,t1:T1*((360-c.th)%360)/360,arrive:true,target:P.n}},
  guides:(c,o)=>[{r:PLANETS.earth.a*AU,label:'Earth orbit'},{r:PLANETS[o&&o.p||'mars'].a*AU,label:PLANETS[o&&o.p||'mars'].n+' orbit'}],
  learn:{what:'A Hohmann transfer from Earth’s orbit to Mars’s orbit: half an ellipse touching both circles.',why:'The minimum-energy two-impulse route between coplanar circular orbits. Real Mars missions use similar, slightly faster trajectories of about 7 months.',ic:'The spacecraft starts on Earth’s orbit. Δv₁ at the departure point raises aphelion to Mars’s distance; Δv₂ at aphelion matches Mars’s circular speed.',eq:['a_t = (r₁ + r₂)/2','Δv₁ = √(μ/r₁) (√(2r₂/(r₁+r₂)) − 1)','Δv₂ = √(μ/r₂) (1 − √(2r₁/(r₁+r₂)))','t = π √(a_t³/μ)'],obs:'Compare applied and predicted Δv under Orbit → Transfer. Assumes circular, coplanar orbits and instantaneous burns. The planets are reference circles only; their gravity and the departure from Earth’s own gravity are not modelled.'}},
 // Binary systems
 {id:'equal-binary',cats:['binary'],name:'Equal-mass binary',short:'Two 1 M☉ stars, e = 0.3',example:'Illustrative',
  make:()=>{const m=MSUN,a=AU,e=.3,r=a*(1-e);return base({n1:'Star A',m1:m,R1:RSUN,c1:'#ffd27a',k1:'star',n2:'Star B',m2:m,R2:RSUN,c2:'#ffc66a',k2:'star',r0:r,vt:visViva(muOf(m,m),r,a)})},frame:'bary',
  learn:{what:'Two stars of equal mass orbiting their common centre of mass.',why:'With equal masses the barycentre lies midway and the two orbits are mirror images.',ic:'Relative orbit a = 1 AU, e = 0.3, started at periastron.',eq:['r₁/r₂ = m₂/m₁ = 1','T = 2π √(a³ / G(m₁ + m₂))'],obs:'Both stars trace identical ellipses, point-symmetric about the barycentre.'}},
 {id:'alpha-cen',cats:['binary'],name:'α Centauri AB',short:'1.08 + 0.91 M☉, e = 0.52, 79.8 yr',example:'α Cen A and B (Akeson et al. 2021)',
  make:()=>{const a=23.299*AU,e=.51947,r=a*(1-e),m1=1.0788*MSUN,m2=.9092*MSUN;return base({n1:'α Cen A',m1,R1:1.2175*RSUN,c1:'#ffe08a',k1:'star',n2:'α Cen B',m2,R2:.8591*RSUN,c2:'#ff9d5c',k2:'star',r0:r,vt:visViva(muOf(m1,m2),r,a)})},frame:'bary',
  learn:{what:'The two Sun-like stars of α Centauri, at periastron. a = 23.3 AU, e = 0.52.',why:'A well-measured unequal-mass binary: the simulated period can be checked against the observed 79.76 years.',ic:'Masses 1.0788 and 0.9092 M☉; v_t from vis-viva.',eq:['T = 2π √(a³ / G(m₁+m₂))','r₁ / r₂ = m₂ / m₁ = 0.84'],obs:'Measured period under Diagnostics should match 79.76 yr closely.'}},
 {id:'sirius',cats:['binary'],name:'Sirius A and B',short:'Main-sequence star with a white dwarf',example:'Sirius A (2.063 M☉) and white dwarf Sirius B (1.018 M☉)',
  make:()=>{const a=19.77*AU,e=.5914,r=a*(1-e),m1=2.063*MSUN,m2=1.018*MSUN;return base({n1:'Sirius A',m1,R1:1.711*RSUN,c1:'#cfe0ff',k1:'star',n2:'Sirius B',m2,R2:5.84e6,c2:'#eef4ff',k2:'wd',r0:r,vt:visViva(muOf(m1,m2),r,a)})},frame:'bary',
  learn:{what:'Sirius B is a white dwarf about the size of Earth but with the mass of the Sun, orbiting Sirius A every 50 years.',why:'Radius and mass are unrelated in gravity: only the masses set the orbit. Here the bodies differ in radius by a factor of 200.',ic:'a = 19.77 AU, e = 0.591, started at periastron.',eq:['T = 2π √(a³ / G(m₁+m₂)) ≈ 50.1 yr'],obs:'Switch View → Scale to true scale and zoom in: Sirius B is far smaller than Sirius A.'}},
 {id:'earth-moon',cats:['binary'],name:'Earth–Moon',short:'Moon at perigee, e = 0.055',example:'The Moon (a = 384,399 km)',
  make:()=>{const a=3.84399e8,e=.0549,r=a*(1-e);return base({n1:'Earth',m1:MEARTH,R1:REQ,c1:'#4f8fd6',k1:'earth',n2:'Moon',m2:MMOON,R2:RMOON,c2:'#d9d4c7',k2:'moon',r0:r,vt:visViva(muOf(MEARTH,MMOON),r,a),inc:23.44})},frame:'bary',trail:2,
  learn:{what:'The Moon at perigee, with a = 384,399 km and e = 0.0549. The orbital plane is taken as the ecliptic, 23.44° from Earth’s equator.',why:'A planet–moon pair with mass ratio 0.0123: the barycentre is about 4,670 km from Earth’s centre, inside Earth.',ic:'v_t from vis-viva at perigee.',eq:['T = 2π √(a³ / G(M⊕ + M☾)) = 27.28 d','d⊕ = r · M☾ / (M⊕ + M☾)'],obs:'The Moon keeps one face toward Earth. Its phase follows the Sun direction. The real sidereal month is 27.32 d because the Sun perturbs the orbit.'}},
 {id:'pluto-charon',cats:['binary'],name:'Pluto–Charon',short:'Barycentre outside Pluto',example:'Pluto and Charon (a = 19,596 km, 6.39 d)',
  make:()=>{const m1=1.303e22,m2=1.586e21,a=1.9596e7;return base({n1:'Pluto',m1,R1:1.1883e6,c1:'#d8b896',k1:'pluto',n2:'Charon',m2,R2:6.06e5,c2:'#a9a6a2',k2:'charon',r0:a,vt:Math.sqrt(muOf(m1,m2)/a)})},frame:'bary',
  learn:{what:'Charon has 12 % of Pluto’s mass, so the barycentre lies about 2,130 km from Pluto’s centre, roughly 940 km above its surface.',why:'A double-body system: both bodies visibly orbit a point in empty space, and both are tidally locked.',ic:'Circular, a = 19,596 km.',eq:['d_P = a · m_C / (m_P + m_C) ≈ 2,130 km','height above Pluto = d_P − R_P ≈ 940 km','T ≈ 6.39 d'],obs:'Pluto’s bright plain (Tombaugh Regio) always faces away from Charon.'}},
 {id:'ratio',cats:['binary'],name:'Mass ratio series',short:'Vary m₂/m₁ at fixed total mass',
  make:o=>{const q=o&&o.q||.3,M=2*MSUN,m1=M/(1+q),m2=M*q/(1+q);return base({n1:'Star A',m1,R1:RSUN,c1:'#ffd27a',k1:'star',n2:'Star B',m2,R2:RSUN*Math.max(.15,Math.cbrt(q)),c2:'#ff9d5c',k2:'star',r0:AU,vt:Math.sqrt(muOf(m1,m2)/AU)})},defOpt:{q:.3},frame:'bary',ctl:'q',
  learn:{what:'Two stars with total mass 2 M☉ on a circular relative orbit at 1 AU. Only the mass ratio changes.',why:'Separates what depends on the total mass (period) from what depends on the ratio (who moves how far).',ic:'Circular relative orbit; masses m₁ = M/(1+q), m₂ = Mq/(1+q).',eq:['r₁ = a q/(1+q), r₂ = a/(1+q)','T unchanged as q varies'],obs:'As q falls the heavier star barely moves while the period stays the same.'}},
 // Transfer orbits
 {id:'hohmann',cats:['transfer'],name:'Hohmann transfer: LEO → GEO',short:'300 km to 35,786 km, two burns',
  make:o=>{const h1=o&&o.h1||300;return sat('Spacecraft',h1,h1,0,{m:3000,R:4,w:300})},defOpt:{h1:300,h2:35786},frame:'b1',trail:0,inset:'',ctl:'hohmann',
  transfer:(c,o)=>{const mu=muOf(c.m1,c.m2),r1=c.r0,r2=REQ+(o&&o.h2||35786)*1e3,H=hohmann(mu,r1,r2),T1=TAU*Math.sqrt(r1**3/mu);return{kind:'hohmann',r1,r2,mu,...H,t1:T1*((360-c.th)%360)/360,arrive:true,target:'final orbit'}},
  guides:(c,o)=>[{r:c.r0,label:'Initial orbit'},{r:REQ+(o&&o.h2||35786)*1e3,label:'Final orbit'}],
  learn:{what:'A Hohmann transfer between two coplanar circular orbits uses two tangential impulses: one to enter an ellipse, one to leave it.',why:'It is the minimum two-impulse transfer between coplanar circles when r₂/r₁ < 11.94.',ic:'Starts on a 300 km circular orbit. Δv₁ at the departure point raises apoapsis to r₂; after half the transfer ellipse, Δv₂ circularises.',eq:['a_t = (r₁ + r₂)/2','Δv₁ = √(μ/r₁) (√(2r₂/(r₁+r₂)) − 1)','Δv₂ = √(μ/r₂) (1 − √(2r₁/(r₁+r₂)))','t = π √(a_t³/μ)'],obs:'The burns fire automatically. Compare applied and predicted Δv under Orbit → Transfer. Change the altitudes in the scenario controls.'}}
];
const SC=Object.fromEntries(SCENARIOS.map(s=>[s.id,s]));
if(typeof module!=='undefined')module.exports={AU,DAY,YR,LY,D2R,MSUN,RSUN,MEARTH,REQ,MMOON,RMOON,J2,TSID,WE,OBL,TROP,SSO_RATE,KINDS,PLANETS,guessKind,
  planeToRef,refToPlane,planeMatrix,effPlane,sunRef,sunRA,earthAngle,j2Rates,ssoIncl,CRIT_INC,subPoint,ltan,earthChecks,GEO_TOL,hohmann,setRelVel,missionInit,missionStep,CATS,SCENARIOS,SC,aFromT,visViva,muOf,rotX,rotZ};

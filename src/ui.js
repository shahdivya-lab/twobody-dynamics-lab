// ───────── Application: state, drawing, panels. Uses core (Sim), missions (scenarios, J2) and Art (rendering). ─────────
const $=id=>document.getElementById(id),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const REFC='#c39bff',calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let storeOK=true;
const store={get(k,d){try{const v=localStorage.getItem('tbl.'+k);return v==null?d:JSON.parse(v)}catch(e){storeOK=false;return d}},
  set(k,v){try{localStorage.setItem('tbl.'+k,JSON.stringify(v));return true}catch(e){storeOK=false;return false}}};

// ───────── formatting ─────────
const SUP={'-':'⁻',0:'⁰',1:'¹',2:'²',3:'³',4:'⁴',5:'⁵',6:'⁶',7:'⁷',8:'⁸',9:'⁹'};
function sci(x,d=4){if(x==null||!isFinite(x))return'N/A';if(x===0)return'0';const a=Math.abs(x);
  if(a>=1e-3&&a<1e7){const v=Number(x.toPrecision(Math.max(d+1,Math.min(7,Math.floor(Math.log10(a))+1))));return a>=1e3?v.toLocaleString('en-US',{maximumFractionDigits:10}):String(v)}
  const[m,e]=x.toExponential(d).split('e');return m+'×10'+String(+e).replace(/./g,ch=>SUP[ch])}
const fDist=m=>{const a=Math.abs(m);return a>=1e15?sci(m/LY)+' ly':a>=1.5e9?sci(m/AU)+' AU':a>=1e3?sci(m/1e3)+' km':sci(m)+' m'};
const fTime=s=>{const a=Math.abs(s);return a<120?sci(s)+' s':a<7200?sci(s/60)+' min':a<2*DAY?sci(s/3600)+' h':a<2*YR?sci(s/DAY)+' d':sci(s/YR)+' yr'};
const fSpd=v=>Math.abs(v)>=1e3?sci(v/1e3)+' km/s':sci(v)+' m/s';
const fMass=m=>m>=1e28?sci(m/MSUN)+' M☉':m>=1e22?sci(m/MEARTH)+' M⊕':sci(m)+' kg';
const fAcc=a=>sci(a)+' m/s²',fNum=x=>sci(x,5),fJ=x=>sci(x)+' J',fDeg=r=>sci(r/D2R,4)+'°';
const fHM=h=>{const m=Math.round(h*60)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const fLat=r=>`${Math.abs(r/D2R).toFixed(2)}° ${r>=0?'N':'S'}`,fLon=r=>`${Math.abs(r/D2R).toFixed(2)}° ${r>=0?'E':'W'}`;
const na='<span class="na">N/A</span>';
const dual=(x,u,f)=>x==null||!isFinite(x)?na:`${sci(x)} ${u}`+(f&&Math.abs(x)>=1e3?`<i>${f(x)}</i>`:'');
const fIn=x=>String(Number(x.toPrecision(9))).replace('e+','e');
function parseNum(s){s=String(s).trim().replace(/[,\s_]/g,'').replace(/−/g,'-').replace(/[×x*]10\^?\(?([-+]?\d+)\)?/i,'e$1');return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)?Number(s):NaN}
const rgba=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let toastT;function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3400)}
const last={};function set(id,html){if(last[id]!==html){last[id]=html;const e=$(id);if(e)e.innerHTML=html}}

// ───────── explanations on demand ─────────
const TIPS={
 mass:['Mass','Sets the gravitational pull. Each body accelerates in proportion to the other body’s mass.'],
 radius:['Physical radius','Used to detect collisions and to draw the body. It does not change the gravity.'],
 kind:['Appearance','Visual only: texture, lighting and rotation. Mass, radius and motion are unaffected.'],
 r0:['Initial separation','Distance between the two centres at t = 0. For Earth orbits this is the orbital radius, not the altitude: altitude = radius − 6,378 km.'],
 vr:['Radial velocity','Speed of body 2 directly away from body 1 (positive) or toward it (negative). On its own it gives straight-line motion with no orbit.'],
 vt:['Tangential velocity','Speed of body 2 at right angles to the line between the bodies. It carries the angular momentum that makes an orbit. Positive is counter-clockwise in the view.'],
 th:['Position angle u₀','Angle of body 2 from the in-plane x-axis at t = 0. The x-axis is the ascending node, so for Earth orbits this is the argument of latitude.'],
 inc:['Inclination','Tilt of the orbital plane relative to body 1’s equator (or the reference plane). 0° is equatorial, 90° polar, above 90° retrograde.'],
 raan:['Ascending node Ω','Direction, in the reference plane, where the orbit crosses it going north.'],
 gst0:['Earth rotation angle','Angle of the Greenwich meridian from the reference x-axis at t = 0. It sets the longitude beneath the satellite. Display and ground track only.'],
 e:['Eccentricity','Shape of the path: 0 circle, 0–1 ellipse, 1 parabola, above 1 hyperbola.'],
 eps:['Specific orbital energy','ε = v²/2 − μ/r. Negative: bound. Zero: escape boundary. Positive: unbound.'],
 h:['Specific angular momentum','h = r × v. Constant in two-body motion. Zero means straight-line motion through the centre.'],
 a:['Semi-major axis','Half the long axis of the ellipse; sets the period. Negative for a hyperbola, undefined for a parabola.'],
 rp:['Periapsis','Closest approach of the centres. For Earth orbits the altitude is this radius minus 6,378 km.'],
 ra:['Apoapsis','Greatest separation on a bound orbit.'],
 T:['Orbital period','T = 2π √(a³/μ), bound orbits only.'],
 vesc:['Escape velocity','√(2μ/r₀): the slowest launch at r₀ that never returns.'],
 vcirc:['Circular velocity','√(μ/r₀): the tangential speed that keeps the separation constant.'],
 iEff:['Inclination of the motion','If body 2 moves clockwise in the plane, the effective inclination is 180° − i.'],
 com:['Centre of mass','The barycentre. It stays fixed because no external force acts.'],
 P:['Total momentum','Zero in the barycentric start state. Any value shown is rounding error.'],
 L:['Angular momentum','Total m (r × v). Conserved by two-body gravity, so drift measures numerical error.'],
 K:['Kinetic energy','½ m v² summed over both bodies.'],U:['Potential energy','−G m₁ m₂ / r.'],E:['Total energy','K + U, conserved in exact two-body motion.'],
 drift:['Energy error','(E − E₀) relative to the starting energy. Pure numerical error; raise the resolution to reduce it. Reset at each transfer burn.'],
 tmeas:['Measured period','Time for the line between the bodies to sweep 360°, taken from the integration.'],
 res:['Integration resolution','Steps per orbit (or per dynamical time on open paths). More steps: smaller Δt and smaller error.'],
 dtmode:['Timestep mode','Adaptive shortens Δt near close approach and stays time-symmetric. Fixed uses one Δt throughout.'],
 scale:['Scale','Enlarged draws small bodies at a minimum size. True scale draws every disc at its physical radius; bodies under a pixel are marked with a ring.'],
 frame:['Reference frame','Barycentric: origin at the centre of mass. Centred on a body: paths are drawn relative to it. None of the frames rotate.'],
 j2:['J2 secular model','Earth’s equatorial bulge turns the orbital plane and the perigee slowly. These first-order analytic rates are applied to the 3D inset, ground track and node readouts. The integration stays two-body.'],
 ltan:['Local time of ascending node','Mean local solar time at the ascending node: 12 h plus the angle from the mean Sun to the node, at 15° per hour.'],
 a1:['Acceleration','G × (other body’s mass) / r².']};
const tipBtn=k=>`<button type="button" class="tip" data-tip="${k}" aria-label="About ${TIPS[k][0]}">i</button>`;
const tipBox=$('tipBox');let tipFor=null;
function showTip(b){const t=TIPS[b.dataset.tip];if(!t)return;tipFor=b;tipBox.innerHTML=`<b>${t[0]}</b>${esc(t[1])}`;tipBox.hidden=false;
  const r=b.getBoundingClientRect(),w=tipBox.offsetWidth,h=tipBox.offsetHeight;tipBox.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';tipBox.style.top=(r.top-h-8<8?r.bottom+8:r.top-h-8)+'px'}
const hideTip=()=>{tipBox.hidden=true;tipFor=null};
document.addEventListener('pointerover',e=>{const b=e.target.closest&&e.target.closest('.tip');if(b)showTip(b)});
document.addEventListener('pointerout',e=>{if(e.target.closest&&e.target.closest('.tip'))hideTip()});
document.addEventListener('focusin',e=>{if(e.target.classList&&e.target.classList.contains('tip'))showTip(e.target)});
document.addEventListener('focusout',e=>{if(e.target.classList&&e.target.classList.contains('tip'))hideTip()});
addEventListener('scroll',()=>{if(tipFor&&document.activeElement===tipFor)showTip(tipFor);else hideTip()},true);

// ───────── setup form ─────────
const KOPT=Object.entries(KINDS).map(([k,v])=>`<option value="${k}">${v.n}</option>`).join('');
const FIELDS={fB1:[['n1','Name','',0],['k1','Appearance','',3,'kind'],['m1','Mass','kg',1,'mass'],['R1','Radius','m',1,'radius'],['c1','Colour','',2]],
  fB2:[['n2','Name','',0],['k2','Appearance','',3,'kind'],['m2','Mass','kg',1,'mass'],['R2','Radius','m',1,'radius'],['c2','Colour','',2]],
  fIC:[['r0','Separation','m',1,'r0'],['vr','Radial','m/s',1,'vr'],['vt','Tangential','m/s',1,'vt'],['th','Position u₀','deg',1,'th']],
  fPl:[['inc','Inclination','deg',1,'inc'],['raan','Node Ω','deg',1,'raan'],['gst0','Earth angle','deg',1,'gst0']]};
const NUM=['m1','R1','m2','R2','r0','vr','vt','th','inc','raan','gst0'],PLABEL={m1:'Mass of body 1',m2:'Mass of body 2',r0:'Separation',vr:'Radial velocity',vt:'Tangential velocity'},PUNIT={m1:'kg',m2:'kg',r0:'m',vr:'m/s',vt:'m/s'};
for(const[box,fs]of Object.entries(FIELDS))$(box).innerHTML=fs.map(([id,l,u,t,tip])=>
  `<div class="f" id="row_${id}"><label for="${id}">${l}${tip?tipBtn(tip):''}</label>${t===2?`<input type="color" id="${id}">`:t===3?`<select id="${id}">${KOPT}</select>`:`<input type="text" id="${id}" ${t?'inputmode="decimal" autocomplete="off" spellcheck="false"':'maxlength="24"'}>`}<span class="u">${u}</span><small id="${id}H"></small><small class="err" id="${id}E" role="alert"></small></div>`).join('');
const HINT={m1:m=>m>=1e22?fMass(m):'',m2:m=>m>=1e22?fMass(m):'',R1:fDist,R2:fDist,
  r0:r=>fDist(r)+($('k1').value==='earth'?` · altitude ${fDist(r-REQ)}`:''),vr:v=>v<0?fSpd(v)+' inward':v>0?fSpd(v)+' outward':'none',
  vt:v=>v===0?'none':fSpd(v)+(v<0?' clockwise':' counter-clockwise'),th:()=>'',inc:v=>v>90?'retrograde':v===90?'polar':'',raan:()=>'',gst0:()=>''};
const normCfg=c=>({inc:0,raan:0,gst0:0,sun0:0,...c,k1:c.k1||guessKind(c.n1),k2:c.k2||guessKind(c.n2)});
function clearErrs(){for(const k of NUM){$(k+'E').textContent='';$(k).classList.remove('bad')}}
function writeForm(c){for(const k of['n1','n2','c1','c2','k1','k2'])$(k).value=c[k];for(const k of NUM)$(k).value=fIn(c[k]||0);clearErrs();hints();formMsg('')}
function hints(){for(const k of NUM){const v=parseNum($(k).value);$(k+'H').textContent=isFinite(v)?HINT[k](v):''}
  $('row_gst0').hidden=$('k1').value!=='earth';
  const m1=parseNum($('m1').value),m2=parseNum($('m2').value),r=parseNum($('r0').value);
  $('vHint').textContent=m1>0&&m2>0&&r>0?`At this separation: circular ${fSpd(Math.sqrt(G*(m1+m2)/r))}, escape ${fSpd(Math.sqrt(2*G*(m1+m2)/r))}`:''}
function formMsg(t,err){const m=$('formMsg');m.textContent=t;m.className=err?'err':''}
function validate(c){const errs={};
  for(const k of NUM)if(!isFinite(c[k]))errs[k]='Enter a number, for example 5.972e24';
  for(const k of['m1','m2'])if(!errs[k]&&!(c[k]>0))errs[k]='Mass must be greater than zero';
  for(const k of['R1','R2'])if(!errs[k]&&!(c[k]>0))errs[k]='Radius must be greater than zero';
  if(!errs.inc&&(c.inc<0||c.inc>180))errs.inc='Use a value from 0° to 180°';
  if(!errs.r0&&!(c.r0>0))errs.r0='Separation must be greater than zero';
  else if(!errs.r0&&!errs.R1&&!errs.R2&&c.r0<=c.R1+c.R2)errs.r0=`The bodies overlap. Use more than R₁ + R₂ = ${sci(c.R1+c.R2)} m`;
  if(!Object.keys(errs).length&&!isFinite(G*(c.m1+c.m2)/c.r0+c.vr*c.vr+c.vt*c.vt))errs.vt='Values too large to compute';
  return errs}
function readForm(){const c={...cfg};for(const k of NUM)c[k]=parseNum($(k).value);const errs=validate(c);
  for(const k of NUM){$(k+'E').textContent=errs[k]||'';$(k).classList.toggle('bad',!!errs[k])}
  c.n1=$('n1').value.trim()||'Body 1';c.n2=$('n2').value.trim()||'Body 2';for(const k of['c1','c2','k1','k2'])c[k]=$(k).value;
  const n=Object.keys(errs).length;if(n){formMsg(`${n} field${n>1?'s need':' needs'} fixing.`,1);$(Object.keys(errs)[0]).focus();return null}return c}
const sameCfg=(a,b)=>!!a&&!!b&&NUM.every(k=>a[k]===b[k]);

// ───────── state ─────────
let cfg,sim,scn=SC['sun-earth'],scnOpt={},scnBase=null,expName='',ref=null,ms=null,arcEl=null,running=!calm,wantRun=!calm,accT=0,lag=false,j2On=false,spinNote=false;
const VO={render:'real',scale:'enlarged',daynight:1,labels:1,trail:1,conic:1,aps:1,guides:1,vel:1,acc:0,force:0,sep:1,grid:1,axes:0,trailLen:0,inset:''};
const VO0={...VO};
const view={k:1,x:0,y:0,frame:'bary',follow:'',keep:true,anim:null};
const resN=()=>Math.round(10**+$('res').value),adaptive=()=>$('dtMode').value==='a';
const dtNext=()=>sim.adaptive?Math.min(sim.dtFixed,TAU*Math.sqrt(sim.r**3/sim.mu)/sim.N):sim.dtFixed;
const rate=()=>10**+$('speed').value*sim.tref/20;
const isEarth=()=>cfg.k1==='earth';
const isCentral=()=>{const k=KINDS[cfg.k1]||{};return!k.lum&&!['craft','comet','generic'].includes(cfg.k1)&&cfg.m2/cfg.m1<.05};
const j2Active=()=>j2On&&isEarth();
const pristine=()=>sameCfg(cfg,scnBase);
const mkRef=()=>{if(ref)ref.sim=new Sim(ref.cfg,resN(),adaptive(),24000)};
function syncRef(){if(!ref)return;const R=ref.sim;let n=0;while(R.t<sim.t&&!R.collided&&!R.failed&&n++<40000)R.step()}
const GTN=20000,gt={t:new Float64Array(GTN),x:new Float64Array(GTN),y:new Float64Array(GTN),la:new Float64Array(GTN),lo:new Float64Array(GTN),g:new Uint32Array(GTN),gen:1,key:'',n:0,s:0,next:0};
function gtPush(){if(sim.t<gt.next)return;const i=(gt.s+gt.n)%GTN;if(gt.n<GTN)gt.n++;else gt.s=(gt.s+1)%GTN;gt.g[i]=0;gt.t[i]=sim.t;gt.x[i]=sim.rx;gt.y[i]=sim.ry;gt.next=sim.t+sim.tref/360}
const evQ=[];
function adv(){sim.step();if(ms){const ev=missionStep(sim,ms);if(ev){arcEl=elements(cfg.m1,cfg.m2,sim.rx,sim.ry,sim.vx2-sim.vx1,sim.vy2-sim.vy1,cfg.r0);gt.next=0;evQ.push(ev)}}gtPush()}

function apply(c,opt={}){
  cfg=normCfg(c);sim=new Sim(cfg,resN(),adaptive(),24000);accT=0;mkRef();
  expName=opt.name||(pristine()?scn.name:scn.name+' (edited)');
  ms=pristine()&&scn.transfer?missionInit(scn.transfer(cfg,scnOpt)):null;
  arcEl=sim.el0;gt.n=gt.s=gt.next=0;gtPush();pin=null;$('banner').hidden=true;formMsg('');evQ.length=0;
  if(opt.fit!==false){view.keep=true;syncKeep();fit(opt.snap?0:1)}
  xOnApply();updSpeed();buildOrbitPane();refresh(true);renderScnParams();legend();
  if(!xp||xp.key!==xpKey())xpDirty=true;if(dTab==='explore'){xpDirty?sweep():xpDraw()}if(dTab==='report')report();wiSync();
  $('scnName').textContent=expName;chips();
}
function setRun(r){running=r&&!sim.collided&&!sim.failed;$('bRun').textContent=running?'Pause':'Play';$('bRun').classList.toggle('pri',!running);$('bRun').setAttribute('aria-pressed',running);status()}
function status(){const s=$('status'),st=sim.collided?'Collision':sim.failed?'Stopped':running?'Running':sim.t===0?'Ready':'Paused';
  s.className='status'+(running?' run':sim.collided||sim.failed?' err':'');set('stTxt',st);set('stT',(sim.t?'t = '+fTime(sim.t):'')+(running&&lag?' · CPU-limited':''))}
function loadScenario(id,opt,o={}){
  scn=SC[id];scnOpt={...(scn.defOpt||{}),...(opt||{})};const c=normCfg(scn.make(scnOpt));scnBase=c;writeForm(c);
  VO.trailLen=scn.trail??0;$('trailLen').value=String(VO.trailLen);view.frame=scn.frame||'bary';$('frame').value=view.frame;view.follow='';$('follow').value='';
  VO.inset=innerWidth<640?'':scn.inset!==undefined?scn.inset:(c.k1==='earth'&&c.m2<1e7?'plane':'');syncInset();j2On=false;
  $('scnCat').textContent=CATS.find(x=>x[0]===scn.cats[0])[1];apply(c);renderScn();setRun(o.run??wantRun);
}

// ───────── camera ─────────
const cv=$('cv'),ctx=cv.getContext('2d');let W=10,Hh=10,dpr=1,stars=null;
function resize(){const r=cv.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=Math.max(50,r.width);Hh=Math.max(50,r.height);cv.width=W*dpr;cv.height=Hh*dpr;mkStars();
  const cp=W<760||Hh<460;if(cp&&!$('view').classList.contains('compact'))$('legend').open=false;$('view').classList.toggle('compact',cp)}
function mkStars(){stars=document.createElement('canvas');stars.width=W*dpr;stars.height=Hh*dpr;const g=stars.getContext('2d');g.scale(dpr,dpr);g.fillStyle='#030406';g.fillRect(0,0,W,Hh);
  let s=20261117;const rnd=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;
  for(let i=0,n=Math.round(W*Hh/2600);i<n;i++){const x=rnd()*W,y=rnd()*Hh,m=rnd(),t=rnd();g.fillStyle=`rgba(${t>.82?'255,228,205':t<.18?'195,212,255':'226,232,245'},${(.06+m*.26).toFixed(2)})`;g.fillRect(x,y,m>.985?1.6:1,m>.985?1.6:1)}}
new ResizeObserver(()=>{const first=W===10;resize();if(first&&sim)fit(0)}).observe(cv);
function frameOf(S){const c=S.c,f=view.frame;
  return f==='b1'?{sc:[0,1],o:[S.x1,S.y1,S.vx1,S.vy1],F:[S.b1x,S.b1y,S.b1u,S.b1w]}:f==='b2'?{sc:[-1,0],o:[S.x2,S.y2,S.vx2,S.vy2],F:[S.b2x,S.b2y,S.b2u,S.b2w]}:{sc:[-c.m2/S.M,c.m1/S.M],o:[0,0,0,0],F:null}}
function extent(S,el,pts){const sc=frameOf(S).sc,r0=S.c.r0;
  for(const s of sc){pts.push([s*S.rx,s*S.ry],[s*r0*el.dx,s*r0*el.dy]);
    if(el.radial){const L=el.ra?Math.min(el.ra,4*r0):2*r0;pts.push([s*L*el.dx,s*L*el.dy])}
    else if(el.kind==='bound')for(let i=0;i<120;i++){const p=conicPt(el,i/120*TAU);if(Math.hypot(p[0],p[1])<25*r0)pts.push([s*p[0],s*p[1]])}
    else{const lim=conicLimit(el,1.6*Math.max(r0,el.rp));for(let i=-8;i<=8;i++){const p=conicPt(el,lim*i/8);pts.push([s*p[0],s*p[1]])}}}}
const showRef=()=>ref&&$('refShow').checked;
function fit(animate=1){const pts=[[0,0]];extent(sim,arcEl||sim.el0,pts);if(showRef())extent(ref.sim,ref.sim.el0,pts);
  if(scn.transfer&&scn.guides){const[ox,oy]=frameOf(sim).o;for(const g of scn.guides(cfg,scnOpt))pts.push([sim.x1-ox+g.r,sim.y1-oy+g.r],[sim.x1-ox-g.r,sim.y1-oy-g.r])}
  let x0=1/0,x1=-1/0,y0=1/0,y1=-1/0;for(const[x,y]of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  const m=Math.max(x1-x0,y1-y0)*1e-3,bw=Math.max(x1-x0,m),bh=Math.max(y1-y0,m),tk=.8*Math.min(W/bw,Hh/bh),tx=(x0+x1)/2,ty=(y0+y1)/2;
  if(animate&&!calm&&W>10)view.anim={type:'fit',tk,tx,ty,n:0};else{view.k=tk;view.x=tx;view.y=ty;view.anim=null}}
function zoomAt(f,sx=W/2,sy=Hh/2){const wx=view.x+(sx-W/2)/view.k,wy=view.y-(sy-Hh/2)/view.k;view.k*=f;view.x=wx-(sx-W/2)/view.k;view.y=wy+(sy-Hh/2)/view.k}
function zoomTo(f,sx=W/2,sy=Hh/2){if(calm)return zoomAt(f,sx,sy);const a=view.anim,k0=a&&a.type==='zoom'?a.tk:view.k;
  view.anim={type:'zoom',tk:k0*f,wx:view.x+(sx-W/2)/view.k,wy:view.y-(sy-Hh/2)/view.k,sx,sy,n:0}}
function camTick(){const a=view.anim;if(!a)return;const done=++a.n>=14,t=done?1:.28;view.k=Math.exp(Math.log(view.k)+(Math.log(a.tk)-Math.log(view.k))*t);
  if(a.type==='zoom'){if(view.follow){}else{view.x=a.wx-(a.sx-W/2)/view.k;view.y=a.wy+(a.sy-Hh/2)/view.k}}else{view.x+=(a.tx-view.x)*t;view.y+=(a.ty-view.y)*t}if(done)view.anim=null}
function userMoved(){view.keep=false;syncKeep()}
function syncKeep(){$('tgKeep').checked=view.keep}
const ptrs=new Map();let pinch=0,downAt=null,hover=null,pin=null,hits=[];
const hitTest=(x,y)=>{for(const h of hits)if(Math.hypot(x-h.x,y-h.y)<=Math.max(h.r,12))return h.i;return null};
cv.addEventListener('pointerdown',e=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}ptrs.set(e.pointerId,[e.offsetX,e.offsetY]);downAt=[e.offsetX,e.offsetY,0];pinch=0});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);
  if(!p){hover=hitTest(e.offsetX,e.offsetY);cv.classList.toggle('pt',hover!=null);return}
  if(ptrs.size===1){const dx=e.offsetX-p[0],dy=e.offsetY-p[1];if(downAt)downAt[2]+=Math.abs(dx)+Math.abs(dy);
    if(downAt&&downAt[2]>4){cv.classList.add('drag');view.anim=null;if(view.follow){view.follow='';$('follow').value=''}view.x-=dx/view.k;view.y+=dy/view.k;userMoved()}}
  ptrs.set(e.pointerId,[e.offsetX,e.offsetY]);
  if(ptrs.size===2){const[a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);view.anim=null;if(pinch)zoomAt(d/pinch,(a[0]+b[0])/2,(a[1]+b[1])/2);pinch=d;userMoved()}});
const up=e=>{if(ptrs.has(e.pointerId)&&ptrs.size===1&&downAt&&downAt[2]<=4&&e.type==='pointerup'){pin=hitTest(e.offsetX,e.offsetY);chips()}ptrs.delete(e.pointerId);pinch=0;if(!ptrs.size)cv.classList.remove('drag')};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('pointerleave',()=>{hover=null});
cv.addEventListener('wheel',e=>{e.preventDefault();const f=Math.exp(-e.deltaY*(e.deltaMode?.05:.0016));view.follow?zoomTo(f):zoomTo(f,e.offsetX,e.offsetY);userMoved()},{passive:false});
cv.addEventListener('keydown',e=>{const s=60/view.k,m={ArrowLeft:[-s,0],ArrowRight:[s,0],ArrowUp:[0,s],ArrowDown:[0,-s]}[e.key];
  if(m){e.preventDefault();view.anim=null;view.x+=m[0];view.y+=m[1];userMoved()}else if(e.key==='+'||e.key==='=')zBtn(1.5);else if(e.key==='-')zBtn(1/1.5);else if(e.key==='0')$('zFit').click()});
const zBtn=f=>{zoomTo(f);userMoved()};
$('zIn').onclick=()=>zBtn(1.5);$('zOut').onclick=()=>zBtn(1/1.5);
$('zFit').onclick=()=>{view.keep=true;syncKeep();fit()};
$('zBary').onclick=()=>{view.follow='';$('follow').value='';view.anim=calm?null:{type:'fit',tk:view.k,tx:0,ty:0,n:0};if(calm)view.x=view.y=0};

// ───────── drawing helpers ─────────
let penX=NaN,penY=NaN;
function begin(){ctx.beginPath();penX=penY=NaN}
function seg(ax,ay,bx,by){const x0=-30,y0=-30,x1=W+30,y1=Hh+30;
  if(!(ax>=x0&&ax<=x1&&ay>=y0&&ay<=y1&&bx>=x0&&bx<=x1&&by>=y0&&by<=y1)){if(!isFinite(ax+ay+bx+by))return;const dx=bx-ax,dy=by-ay;let t0=0,t1=1,p,q,t;
    for(let i=0;i<4;i++){if(i===0){p=-dx;q=ax-x0}else if(i===1){p=dx;q=x1-ax}else if(i===2){p=-dy;q=ay-y0}else{p=dy;q=y1-ay}
      if(p===0){if(q<0)return}else{t=q/p;if(p<0){if(t>t1)return;if(t>t0)t0=t}else{if(t<t0)return;if(t<t1)t1=t}}}
    bx=ax+t1*dx;by=ay+t1*dy;ax+=t0*dx;ay+=t0*dy}
  if(ax!==penX||ay!==penY)ctx.moveTo(ax,ay);ctx.lineTo(bx,by);penX=bx;penY=by}
function arc(f,n0,n1,a,b,d){const nm=(n0+n1)/2,m=f(nm),pad=30+Math.hypot(a[0]-m[0],a[1]-m[1])+Math.hypot(b[0]-m[0],b[1]-m[1]);
  if(Math.max(a[0],b[0],m[0])<-pad||Math.min(a[0],b[0],m[0])>W+pad||Math.max(a[1],b[1],m[1])<-pad||Math.min(a[1],b[1],m[1])>Hh+pad)return;
  if(d>=40||(d>=5&&Math.hypot(m[0]-(a[0]+b[0])/2,m[1]-(a[1]+b[1])/2)<.3)){seg(a[0],a[1],m[0],m[1]);seg(m[0],m[1],b[0],b[1]);return}
  arc(f,n0,nm,a,m,d+1);arc(f,nm,n1,m,b,d+1)}
function arrow(g,x,y,dx,dy,col,w=1.8,dash){const L=Math.hypot(dx,dy);if(L<1.5)return;const ux=dx/L,uy=dy/L,hd=Math.min(8,L*.45);
  g.strokeStyle=g.fillStyle=col;g.lineWidth=w;if(dash)g.setLineDash(dash);g.beginPath();g.moveTo(x,y);g.lineTo(x+dx-ux*hd*.6,y+dy-uy*hd*.6);g.stroke();g.setLineDash([]);
  g.beginPath();g.moveTo(x+dx,y+dy);g.lineTo(x+dx-ux*hd-uy*hd*.45,y+dy-uy*hd+ux*hd*.45);g.lineTo(x+dx-ux*hd+uy*hd*.45,y+dy-uy*hd-ux*hd*.45);g.fill()}
function tag(g,t,x,y,col='#d9dee5',al='left'){g.textAlign=al;const w=g.measureText(t).width;g.fillStyle='rgba(6,8,10,.78)';g.fillRect(al==='center'?x-w/2-4:al==='right'?x-w-4:x-4,y-8,w+8,16);g.fillStyle=col;g.fillText(t,x,y)}
function nice(x){const p=10**Math.floor(Math.log10(x)),f=x/p;return(f<1.5?1:f<3.5?2:f<7.5?5:10)*p}
function gridUnit(raw){return raw>=LY*.05?['ly',LY]:raw>=AU*.02?['AU',AU]:raw>=500?['km',1e3]:['m',1]}
const tick=(v,st=v)=>{const a=Math.abs(v);return a===0?'0':a>=1e5||a<1e-3?sci(v,Math.max(1,Math.min(8,Math.ceil(Math.log10(a/Math.abs(st))-1e-9)))):String(Number(v.toPrecision(9)))};
const MX=(a)=>{const c=Math.cos(a),s=Math.sin(a);return[[1,0,0],[0,c,-s],[0,s,c]]};
function ringIdx(S,t){let lo=0,hi=S.n-1;while(lo<hi){const m=(lo+hi)>>1;if(S.bt[(S.start+m)%S.cap]<t)lo=m+1;else hi=m}return lo}
let sizeTxt='',scaleTxt='',frameNo=0;

// body orientation (view → body frame), rotation angle and light direction in view coordinates
function bodyM(i){const k=cfg['k'+(i+1)];return i===0&&isCentral()?planeMatrix(cfg):MX(((KINDS[k]||{}).obl||0)*D2R)}
function bodyTheta(i,M,px,py,qx,qy){const k=cfg['k'+(i+1)],K=KINDS[k]||{};
  if(K.tidal){const dx=qx-px,dy=qy-py,n=Math.hypot(dx,dy)||1,d=[dx/n,dy/n,0],p=[M[0][0]*d[0]+M[0][1]*d[1],M[1][0]*d[0]+M[1][1]*d[1]];return Math.atan2(p[1],p[0])}
  if(k==='earth'&&i===0&&isCentral())return earthAngle(cfg,sim.t);
  if(!K.rot)return 0;const per=TAU*rate()/60/Math.abs(K.rot);if(running&&per>.6){spinNote=true;return 0}return TAU*sim.t/K.rot}
function bodyLight(i,P){const k=cfg['k'+(i+1)];if((KINDS[k]||{}).lum)return null;if(!VO.daynight)return[0,0,1];
  const j=1-i,kj=cfg['k'+(j+1)];if((KINDS[kj]||{}).lum){const dx=P[j][2]-P[i][2],dy=P[j][3]-P[i][3],n=Math.hypot(dx,dy)||1;return[dx/n,dy/n,0]}
  if(isEarth())return refToPlane(cfg,sunRef(sim.t,cfg.sun0));const v=[-.45,.55,.7],n=Math.hypot(...v);return v.map(x=>x/n)}

function draw(){
  ctx.setTransform(dpr,0,0,dpr,0,0);if(stars)ctx.drawImage(stars,0,0,W,Hh);
  const k=view.k,X=x=>W/2+(x-view.x)*k,Y=y=>Hh/2-(y-view.y)*k;
  ctx.font='11px "IBM Plex Mono",monospace';ctx.textBaseline='middle';
  const[un,uf]=gridUnit(90/k),step=nice(90/k/uf)*uf;
  if(VO.grid){ctx.lineWidth=1;ctx.fillStyle='#55606c';
    const gx0=Math.ceil((view.x-W/2/k)/step),gx1=Math.floor((view.x+W/2/k)/step),gy0=Math.ceil((view.y-Hh/2/k)/step),gy1=Math.floor((view.y+Hh/2/k)/step);
    for(let i=gx0;i<=gx1&&i-gx0<80;i++){const x=Math.round(X(i*step))+.5;ctx.strokeStyle=i===0?'rgba(140,160,190,.26)':'rgba(140,160,190,.07)';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,Hh);ctx.stroke();ctx.textAlign='center';if(x>60&&x<W-30)ctx.fillText(tick(i*step/uf,step/uf),x,Hh-42)}
    for(let j=gy0;j<=gy1&&j-gy0<80;j++){const y=Math.round(Y(j*step))+.5;ctx.strokeStyle=j===0?'rgba(140,160,190,.26)':'rgba(140,160,190,.07)';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.textAlign='left';if(y>90&&y<Hh-60)ctx.fillText(tick(j*step/uf,step/uf),6,y)}}
  if(VO.axes){const ox=X(0),oy=Y(0);ctx.lineWidth=1.2;arrow(ctx,Math.min(Math.max(ox,20),W-20)-0,oy,W-30-ox,0,'rgba(205,215,230,.7)',1.1);arrow(ctx,ox,Math.min(Math.max(oy,20),Hh-20),0,30-oy,'rgba(205,215,230,.7)',1.1);
    ctx.fillStyle='#c7d0dc';ctx.textAlign='right';ctx.fillText(isEarth()&&isCentral()?'x  (ascending node)':'x',W-34,oy-10);ctx.textAlign='left';ctx.fillText('y',ox+8,34)}
  const drawSys=(S,cols,isRef,el)=>{const fr=frameOf(S),sc=fr.sc,c=S.c;
    if(VO.conic){ctx.setLineDash(isRef?[1.5,5]:[5,4]);ctx.lineWidth=isRef?1.1:1.2;const rmax=1e4*Math.max(c.r0,el.rp||c.r0),lim=el.radial?0:conicLimit(el,rmax);
      const b1x=isRef?0:(arcEl!==S.el0?S.x1-fr.o[0]:0),b1y=isRef?0:(arcEl!==S.el0?S.y1-fr.o[1]:0),moving=!isRef&&arcEl!==S.el0;
      for(let i=0;i<2;i++){const s=sc[i];if(!s)continue;ctx.strokeStyle=rgba(cols[i],isRef?.5:.6);begin();
        // after a burn the arc is drawn about body 1's current position (spacecraft case, m₂ ≪ m₁)
        const cx=moving&&i===1?b1x:0,cy=moving&&i===1?b1y:0,ss=moving&&i===1?1:s;if(moving&&i===0)continue;
        if(el.radial){const L=el.ra||rmax;seg(X(cx),Y(cy),X(cx+ss*L*el.dx),Y(cy+ss*L*el.dy))}
        else{const f=nu=>{const p=conicPt(el,nu);return[X(cx+ss*p[0]),Y(cy+ss*p[1])]};for(let q=0;q<16;q++){const n0=-lim+q*lim/8,n1=n0+lim/8;arc(f,n0,n1,f(n0),f(n1),0)}}
        ctx.stroke()}
      ctx.setLineDash([])}
    if(VO.trail&&S.n>1){const n=S.n,cap=S.cap,st=S.start,bt=S.bt,[ox,oy,ovx,ovy]=fr.o,F=fr.F,j0=VO.trailLen?ringIdx(S,S.t-VO.trailLen*S.tref):0,bands=isRef?1:6;
      const hseg=(x0,y0,u0,w0,x1,y1,u1,w1,dt)=>{const ax=X(x0),ay=Y(y0),bx=X(x1),by=Y(y1);if(Math.hypot(u0-u1,w0-w1)*dt*k<2.4){seg(ax,ay,bx,by);return}
        arc(s=>{const s2=s*s,s3=s2*s,a=2*s3-3*s2+1,b=(s3-2*s2+s)*dt,cc=3*s2-2*s3,d=(s3-s2)*dt;return[X(a*x0+b*u0+cc*x1+d*u1),Y(a*y0+b*w0+cc*y1+d*w1)]},0,1,[ax,ay],[bx,by],5)};
      for(let i=0;i<2;i++){if(!sc[i])continue;const A=i?[S.b2x,S.b2y,S.b2u,S.b2w]:[S.b1x,S.b1y,S.b1u,S.b1w],get=(m,q)=>A[m][q]-(F?F[m][q]:0);
        ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=isRef?1.4:1.7;if(isRef)ctx.setLineDash([2,4]);
        for(let b=0;b<bands;b++){const a0=j0+Math.floor((n-j0)*b/bands),a1=Math.min(n-1,j0+Math.floor((n-j0)*(b+1)/bands));if(a1<=a0&&b<bands-1)continue;
          ctx.strokeStyle=rgba(cols[i],isRef?.85:.18+.82*(b+1)/bands);begin();
          let q=(st+a0)%cap,x0=get(0,q),y0=get(1,q),u0=get(2,q),w0=get(3,q),t0=bt[q];
          for(let j=a0+1;j<=a1;j++){q=(st+j)%cap;const x1=get(0,q),y1=get(1,q),u1=get(2,q),w1=get(3,q),t1=bt[q];hseg(x0,y0,u0,w0,x1,y1,u1,w1,t1-t0);x0=x1;y0=y1;u0=u1;w0=w1;t0=t1}
          if(b===bands-1)hseg(x0,y0,u0,w0,(i?S.x2:S.x1)-ox,(i?S.y2:S.y1)-oy,(i?S.vx2:S.vx1)-ovx,(i?S.vy2:S.vy1)-ovy,S.t-t0);
          ctx.stroke()}
        ctx.setLineDash([]);ctx.lineCap='butt'}}};
  const fr=frameOf(sim),sc=fr.sc,[ox,oy,ovx,ovy]=fr.o,col=[cfg.c1,cfg.c2],el=arcEl,b1s=[X(sim.x1-ox),Y(sim.y1-oy)];
  if(VO.guides&&scn.guides){ctx.setLineDash([2,5]);ctx.lineWidth=1;ctx.font='11px "IBM Plex Sans",sans-serif';
    for(const g of scn.guides(cfg,scnOpt)){const r=g.r*k;if(r<2||r>8*Math.max(W,Hh))continue;ctx.strokeStyle='rgba(170,182,198,.38)';ctx.beginPath();ctx.arc(b1s[0],b1s[1],r,0,TAU);ctx.stroke();
      if(VO.labels&&r>18&&g.r>1.3*cfg.R1){const a=-.85;ctx.fillStyle='#8792a0';ctx.textAlign='left';ctx.fillText(g.label,b1s[0]+r*Math.cos(a)+4,b1s[1]+r*Math.sin(a)-6)}}
    ctx.setLineDash([]);ctx.font='11px "IBM Plex Mono",monospace'}
  if(showRef())drawSys(ref.sim,[REFC,REFC],true,ref.sim.el0);
  drawSys(sim,col,false,el);
  if(VO.aps&&!el.radial&&el.e>CIRC_TOL&&el.kind!=='para'){const moving=arcEl!==sim.el0,lead=Math.abs(sc[1])>=Math.abs(sc[0])?1:0,wide=el.kind!=='bound'||(el.rp+el.ra)*k*Math.max(Math.abs(sc[0]),Math.abs(sc[1]))>70;
    for(let i=0;i<2;i++){const s=moving?(i?1:0):sc[i];if(!s||(el.kind==='bound'&&(el.rp+el.ra)*k*Math.abs(s)<14))continue;const cx=moving?sim.x1-ox:0,cy=moving?sim.y1-oy:0;
      const mk=(nu,ap,d)=>{const p=conicPt(el,nu),x=X(cx+s*p[0]),y=Y(cy+s*p[1]);if(x<-20||x>W+20||y<-20||y>Hh+20)return;ctx.lineWidth=1.3;ctx.strokeStyle=col[i];ctx.fillStyle=ap?'#05070a':col[i];ctx.beginPath();
        if(ap)ctx.rect(x-4,y-4,8,8);else{ctx.moveTo(x,y-5.5);ctx.lineTo(x+5.5,y);ctx.lineTo(x,y+5.5);ctx.lineTo(x-5.5,y);ctx.closePath()}ctx.fill();ctx.stroke();
        if(VO.labels&&i===lead&&wide){const alt=isEarth()&&isCentral()?` · ${fDist(d-REQ)} alt.`:'';tag(ctx,`${ap?'Apoapsis':'Periapsis'} ${fDist(d)}${alt}`,x+10,y+(ap?-12:12),'#aab5c3')}};
      mk(0,0,el.rp);if(el.kind==='bound'&&el.e<1)mk(Math.PI,1,el.ra)}}
  if(ms)for(const b of ms.burns){const x=X(sim.x1-ox+b.x),y=Y(sim.y1-oy+b.y);if(x<-20||x>W+20||y<-20||y>Hh+20)continue;ctx.fillStyle='#ffb35c';ctx.beginPath();ctx.moveTo(x,y-6);ctx.lineTo(x+5,y+3);ctx.lineTo(x-5,y+3);ctx.closePath();ctx.fill();
    if(VO.labels)tag(ctx,`${b.label} ${fSpd(b.dv)}`,x+9,y-11,'#ffcf96')}
  const pos=[[X(sim.x1-ox),Y(sim.y1-oy),sim.x1,sim.y1],[X(sim.x2-ox),Y(sim.y2-oy),sim.x2,sim.y2]],bc=[X(-ox),Y(-oy)];
  if(VO.sep){const p1=pos[0],p2=pos[1],sl=Math.hypot(p1[0]-p2[0],p1[1]-p2[1])||1,nx=-(p2[1]-p1[1])/sl,ny=(p2[0]-p1[0])/sl;ctx.strokeStyle='rgba(190,204,224,.38)';ctx.lineWidth=1;ctx.setLineDash([2,4]);begin();seg(p1[0],p1[1],p2[0],p2[1]);ctx.stroke();ctx.setLineDash([]);
    const mx=(p1[0]+p2[0])/2+nx*14,my=(p1[1]+p2[1])/2+ny*14;if(sl>110&&mx>0&&mx<W&&my>0&&my<Hh)tag(ctx,'r = '+fDist(sim.r),mx,my,'#b5c0cf','center')}
  const bcIn=[0,1].some(i=>Math.hypot(bc[0]-pos[i][0],bc[1]-pos[i][1])<Math.max(8,(i?cfg.R2:cfg.R1)*k));
  if(bc[0]>-20&&bc[0]<W+20&&bc[1]>-20&&bc[1]<Hh+20){ctx.strokeStyle='#e8ecf2';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(bc[0]-7,bc[1]);ctx.lineTo(bc[0]+7,bc[1]);ctx.moveTo(bc[0],bc[1]-7);ctx.lineTo(bc[0],bc[1]+7);ctx.stroke();ctx.beginPath();ctx.arc(bc[0],bc[1],3,0,TAU);ctx.stroke();
    if(VO.labels&&!bcIn){ctx.fillStyle='#8792a0';ctx.textAlign='left';ctx.fillText('barycentre',bc[0]+10,bc[1]+12)}}
  // bodies
  spinNote=false;const R=[cfg.R1,cfg.R2],K=[0,1].map(i=>KINDS[cfg['k'+(i+1)]]||KINDS.generic),rT=R.map(r=>r*k);
  const mn=[0,1].map(i=>{const kk=cfg['k'+(i+1)];return VO.scale==='true'?0:kk==='craft'?0:K[i].lum?8.5:kk==='comet'?3.5:6.5});
  const rp=[Math.max(rT[0],mn[0]),Math.max(rT[1],mn[1])];
  if(VO.scale!=='true'){if(R[0]>R[1]&&rp[1]>rp[0]*.75&&rT[1]<rp[1])rp[1]=Math.max(rT[1],Math.min(mn[1],Math.max(3,rp[0]*.6)));if(R[1]>R[0]&&rp[0]>rp[1]*.75&&rT[0]<rp[0])rp[0]=Math.max(rT[0],Math.min(mn[0],Math.max(3,rp[1]*.6)))}
  const d=sim.diagCache;
  if(VO.force&&d){const L=Math.min(200,46*d.F/sim.F0),ux=sim.rx/sim.r,uy=-sim.ry/sim.r;arrow(ctx,pos[0][0],pos[0][1],ux*L,uy*L,'#ff7a9c');arrow(ctx,pos[1][0],pos[1][1],-ux*L,-uy*L,'#ff7a9c')}
  if(VO.acc&&d){const aR=sim.A0||1;for(let i=0;i<2;i++){const ax=i?sim.ax2:sim.ax1,ay=i?sim.ay2:sim.ay1,a=Math.hypot(ax,ay),L=Math.min(180,62*a/aR);if(L>1.5)arrow(ctx,pos[i][0],pos[i][1],ax/a*L,-ay/a*L,'#ffb35c',1.6,[4,3])}}
  if(VO.vel){const f=64/sim.vref;for(let i=0;i<2;i++){let vx=((i?sim.vx2:sim.vx1)-ovx)*f,vy=-((i?sim.vy2:sim.vy1)-ovy)*f;const L=Math.hypot(vx,vy);if(L>220){vx*=220/L;vy*=220/L}arrow(ctx,pos[i][0],pos[i][1],vx,vy,'#6fd6a8')}}
  if(showRef()){const Rs=ref.sim,f2=frameOf(Rs),[rx,ry]=f2.o;for(let i=0;i<2;i++){const x=X((i?Rs.x2:Rs.x1)-rx),y=Y((i?Rs.y2:Rs.y1)-ry);if(x<-20||x>W+20||y<-20||y>Hh+20)continue;
    ctx.strokeStyle=REFC;ctx.lineWidth=1.5;ctx.fillStyle='rgba(5,7,10,.6)';ctx.beginPath();ctx.arc(x,y,i?4.5:6,0,TAU);ctx.fill();ctx.stroke();if(VO.labels){ctx.fillStyle=REFC;ctx.textAlign='left';ctx.fillText('B · '+(i?ref.cfg.n2:ref.cfg.n1),x+10,y+12)}}}
  hits=[];const ord=rp[0]>=rp[1]?[0,1]:[1,0];
  for(const i of ord){const[x,y]=pos[i],r=rp[i],kk=cfg['k'+(i+1)];hits.push({x,y,r:Math.max(r,8),i});
    if(x<-r-80||x>W+r+80||y<-r-80||y>Hh+r+80)continue;
    if(VO.scale==='true'&&r<1.2){ctx.fillStyle=col[i];ctx.fillRect(x-.75,y-.75,1.5,1.5);ctx.strokeStyle=rgba(col[i],.8);ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.beginPath();ctx.arc(x,y,7,0,TAU);ctx.stroke();ctx.setLineDash([])}
    else{const M=bodyM(i),o=pos[1-i],th=bodyTheta(i,M,pos[i][2],pos[i][3],o[2],o[3]),L=bodyLight(i,pos);let tail=null;
      if(kk==='comet'&&K[1-i].lum){const dx=x-o[0],dy=y-o[1],n=Math.hypot(dx,dy)||1,rAU=sim.r/AU;tail={dx:dx/n,dy:dy/n,len:rAU<5?Math.min(170,70/rAU):0}}
      Art.draw(ctx,{kind:kk,col:col[i],x,y,r,dpr,M,theta:th,L,real:VO.render==='real',slot:'b'+i,night:!!VO.daynight,velAng:Math.atan2((i?sim.vy2:sim.vy1)-ovy,(i?sim.vx2:sim.vx1)-ovx),tail})}
    if(pin===i||hover===i){ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.setLineDash(pin===i?[]:[3,3]);ctx.beginPath();ctx.arc(x,y,Math.min(Math.max(r,6),400)+6,0,TAU);ctx.stroke();ctx.setLineDash([])}
    if(VO.labels){ctx.font='12px "IBM Plex Sans",sans-serif';ctx.fillStyle='#eef1f5';ctx.textAlign='left';ctx.shadowColor='#000';ctx.shadowBlur=4;const rl=Math.max(r,4)*.71;ctx.fillText(i?cfg.n2:cfg.n1,Math.min(x+rl+7,W-80),Math.max(y-rl-7,14));ctx.shadowBlur=0;ctx.font='11px "IBM Plex Mono",monospace'}}
  const bw=step*k,bx=12,by=Hh-26;ctx.strokeStyle='#a5afbc';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(bx,by-4);ctx.lineTo(bx,by);ctx.lineTo(bx+bw,by);ctx.lineTo(bx+bw,by-4);ctx.stroke();
  const ex=Math.max(rp[0]/rT[0],rp[1]/rT[1]);
  sizeTxt=VO.scale==='true'?'True scale: discs at physical radius':ex>1.01?`Small bodies enlarged up to ×${sci(ex,1)}`:'All bodies at true scale';if(spinNote)sizeTxt+=' · rotation not animated at this speed';
  scaleTxt=`${tick(step/uf)} ${un} per grid square`+(W<520?'':` · ${view.frame==='bary'?'barycentric frame':'centred on '+(view.frame==='b1'?cfg.n1:cfg.n2)}`);
  const bi=pin!=null?pin:hover,card=$('bodyCard');
  if(bi==null){if(!card.hidden)card.hidden=true}else{card.hidden=false;const[x,y]=pos[bi];card.style.left=Math.max(8,Math.min(W-258,x+18))+'px';card.style.top=Math.max(8,Math.min(Hh-200,y+18))+'px';if(card.dataset.i!==String(bi)||frameNo%10===0)bodyCard(bi,rp[bi],rT[bi])}
}
function bodyCard(i,rp,rt){const d=sim.diagCache,c=$('bodyCard'),kk=cfg['k'+(i+1)],nm=i?cfg.n2:cfg.n1;if(!d)return;
  if(c.dataset.i!==String(i)||c.dataset.k!==kk+cfg['c'+(i+1)]){c.innerHTML=`<div class="h"><canvas width="112" height="112"></canvas><div><b>${esc(nm)}</b><span class="muted">${KINDS[kk].n} · body ${i+1}${pin===i?' · selected':''}</span></div></div><dl id="bcDl"></dl><p id="bcP"></p>`;
    c.dataset.i=i;c.dataset.k=kk+cfg['c'+(i+1)];Art.portrait(c.querySelector('canvas'),kk,cfg['c'+(i+1)])}
  const alt=i===1&&isEarth()&&isCentral()?`<dt>Altitude</dt><dd>${fDist(d.r-REQ)}</dd>`:'';
  c.querySelector('#bcDl').innerHTML=`<dt>Mass</dt><dd>${fMass(i?cfg.m2:cfg.m1)}</dd><dt>Radius</dt><dd>${fDist(i?cfg.R2:cfg.R1)}</dd><dt>Distance to ${esc(i?cfg.n1:cfg.n2)}</dt><dd>${fDist(d.r)}</dd>${alt}<dt>Speed</dt><dd>${fSpd(i?d.v2:d.v1)}</dd><dt>From barycentre</dt><dd>${fDist(i?d.d2:d.d1)}</dd><dt>Acceleration</dt><dd>${fAcc(i?d.a2:d.a1)}</dd>`;
  c.querySelector('#bcP').textContent=VO.scale==='true'||rp<=rt*1.01?'Drawn at physical size.':`Drawn ×${sci(rp/rt,2)} larger than physical size.`}
function chips(){$('chips').innerHTML=[0,1].map(i=>`<button type="button" data-i="${i}" aria-pressed="${pin===i}"><i class="dot" style="background:${cfg['c'+(i+1)]}"></i>${esc(i?cfg.n2:cfg.n1)}</button>`).join('')}
$('chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;pin=pin===i?null:i;chips()});

// ───────── inset: orbital plane in 3D, and ground track ─────────
const ins={az:-1.05,el:.42,zoom:1},ic=$('insCv'),ig=ic.getContext('2d');let nightCv=null;
function syncInset(){const v=VO.inset;$('inset').hidden=!v;$('insSel').value=v;$$('#inset .t').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===v))}
$$('#inset .t').forEach(b=>b.onclick=()=>{VO.inset=b.dataset.v;syncInset()});
$('insClose').onclick=()=>{VO.inset='';syncInset()};
{let dr=null;ic.addEventListener('pointerdown',e=>{dr=[e.clientX,e.clientY];try{ic.setPointerCapture(e.pointerId)}catch(_){}});
 ic.addEventListener('pointermove',e=>{if(!dr)return;ins.az-=(e.clientX-dr[0])*.01;ins.el=Math.max(-1.45,Math.min(1.45,ins.el+(e.clientY-dr[1])*.01));dr=[e.clientX,e.clientY]});
 ic.addEventListener('pointerup',()=>dr=null);ic.addEventListener('pointercancel',()=>dr=null);
 ic.addEventListener('wheel',e=>{e.preventDefault();ins.zoom=Math.max(.3,Math.min(8,ins.zoom*Math.exp(-e.deltaY*.0015)))},{passive:false})}
const j2Now=()=>{if(!j2Active()||arcEl.kind!=='bound')return null;const pl=effPlane(cfg,arcEl.h);return j2Rates(sim.mu,arcEl.a,arcEl.e,pl.i)};
function drawInset(){const w=ic.clientWidth,h=ic.clientHeight;if(!w)return;if(ic.width!==Math.round(w*dpr)){ic.width=Math.round(w*dpr);ic.height=Math.round(h*dpr)}
  const g=ig;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.font='10.5px "IBM Plex Sans",sans-serif';g.textBaseline='middle';
  if(VO.inset==='ground')return drawGround(g,w,h);drawPlane(g,w,h)}
function drawPlane(g,w,h){const el=arcEl,sg=el.h<0?-1:1,j=j2Now(),t=sim.t,dO=j?j.dO*t:0,dw=j?j.dw*t:0,toRef=(x,y)=>planeToRef(cfg,[x,y,0],dO,dw,sg);
  const Rext=el.kind==='bound'&&!el.radial?el.ra:2.5*Math.max(cfg.r0,el.rp||0),s=.4*Math.min(w,h)/Math.max(Rext,cfg.R1*1.5)*ins.zoom,cx=w/2,cy=h/2+4;
  const ca=Math.cos(ins.az),sa=Math.sin(ins.az),ce=Math.cos(ins.el),se=Math.sin(ins.el),R_=[-sa,ca,0],U_=[-se*ca,-se*sa,ce],F_=[ce*ca,ce*sa,se];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],P=v=>[cx+s*dot(v,R_),cy-s*dot(v,U_),dot(v,F_)];
  const poly=(pts,fill,stroke,dash)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.setLineDash(dash||[]);g.stroke();g.setLineDash([])}};
  const Rp=Math.max(1.12*Rext,1.7*cfg.R1),eqPts=[],orPts=[];for(let q=0;q<72;q++){const a=q/72*TAU;eqPts.push(P([Rp*Math.cos(a),Rp*Math.sin(a),0]));orPts.push(P(toRef(Rp*Math.cos(a),Rp*Math.sin(a))))}
  poly(eqPts,'rgba(90,150,215,.07)','rgba(90,150,215,.38)');poly(orPts,rgba(cfg.c2,.06),rgba(cfg.c2,.32));
  const pl=effPlane(cfg,el.h),O=pl.O+dO,nh=[Math.cos(O),Math.sin(O),0],a1=P(nh.map(x=>x*Rp)),a2=P(nh.map(x=>-x*Rp));
  if(pl.i>1e-6&&pl.i<Math.PI-1e-6){g.strokeStyle='rgba(220,226,234,.5)';g.setLineDash([4,3]);g.beginPath();g.moveTo(a2[0],a2[1]);g.lineTo(a1[0],a1[1]);g.stroke();g.setLineDash([]);g.fillStyle='#c9d1dc';g.textAlign='left';g.fillText('ascending node',a1[0]+4,a1[1])}
  g.fillStyle='#7f9bbf';g.textAlign='left';const le=eqPts.reduce((a,b)=>b[0]>a[0]?b:a);g.fillText(isEarth()?'equator':'reference plane',Math.min(le[0]+4,w-70),le[1]+10);
  const lim=el.radial?0:el.kind==='bound'&&el.e<1?Math.PI:conicLimit(el,2.5*Math.max(cfg.r0,el.rp)),pts=[];
  if(el.radial){for(let q=0;q<=40;q++){const r=(el.ra||2.5*cfg.r0)*q/40;pts.push(P(toRef(r*el.dx,r*el.dy)))}}else for(let q=0;q<=180;q++){const nu=-lim+2*lim*q/180,p=conicPt(el,nu);pts.push(P(toRef(p[0],p[1])))}
  const path=(front)=>{g.beginPath();let on=false;for(let q=1;q<pts.length;q++){const a=pts[q-1],b=pts[q],f=(a[2]+b[2])/2>=0;if(f===front){if(!on){g.moveTo(a[0],a[1]);on=true}g.lineTo(b[0],b[1])}else on=false}g.stroke()};
  g.lineWidth=1.5;g.strokeStyle=rgba(cfg.c2,.4);path(false);
  const rB=Math.max(3,cfg.R1*s),M=[[R_[0],U_[0],F_[0]],[R_[1],U_[1],F_[1]],[R_[2],U_[2],F_[2]]],kk=cfg.k1,K=KINDS[kk]||{};
  let L=null;if(!K.lum){if(isEarth()&&VO.daynight){const sv=sunRef(t,cfg.sun0);L=[dot(sv,R_),dot(sv,U_),dot(sv,F_)]}else L=[-.4,.5,.77]}
  Art.draw(g,{kind:kk,col:cfg.c1,x:cx,y:cy,r:rB,dpr,M,theta:isEarth()?earthAngle(cfg,t):0,L,real:VO.render==='real',slot:'ins',night:!!VO.daynight});
  const NP=P([0,0,Math.max(rB/s*1.6,Rext*.32)]),N0=P([0,0,cfg.R1]);g.strokeStyle='#e7ebf0';g.lineWidth=1.2;g.beginPath();g.moveTo(N0[0],N0[1]);g.lineTo(NP[0],NP[1]);g.stroke();g.fillStyle='#e7ebf0';g.textAlign='center';g.fillText('N',NP[0],NP[1]-8);
  g.lineWidth=1.7;g.strokeStyle=rgba(cfg.c2,.95);path(true);
  if(!el.radial&&pl.i>.002){const wv=el.w+sg*dw,rn=el.p/(1+el.e*Math.cos(-wv)),Pn=nh.map(x=>x*rn),e1=[-Math.sin(O),Math.cos(O),0],o1=planeToRef(cfg,[0,sg,0],dO,0,1);
    let wv2=o1.map((x,q)=>x-dot(o1,e1)*e1[q]);const wn=Math.hypot(...wv2)||1;wv2=wv2.map(x=>x/wn);const ra=.24*Rext,A=[];
    for(let q=0;q<=24;q++){const tt=pl.i*q/24;A.push(P(Pn.map((x,m)=>x+ra*(Math.cos(tt)*e1[m]+Math.sin(tt)*wv2[m]))))}
    g.strokeStyle='#ffd27a';g.lineWidth=1.3;g.beginPath();A.forEach((p,q)=>q?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
    const m=P(Pn.map((x,q)=>x+ra*1.45*(Math.cos(pl.i/2)*e1[q]+Math.sin(pl.i/2)*wv2[q])));g.fillStyle='#ffd27a';g.textAlign='center';g.fillText('i = '+(pl.i/D2R).toFixed(1)+'°',m[0],m[1])}
  if(isEarth()){const sv=sunRef(t,cfg.sun0),S1=P(sv.map(x=>x*Rext*1.25)),S0=P(sv.map(x=>x*Rext*.95));arrow(g,S0[0],S0[1],S1[0]-S0[0],S1[1]-S0[1],'#ffcf5a',1.4);g.fillStyle='#ffcf5a';g.textAlign='center';g.fillText('Sun',S1[0]+(S1[0]-S0[0])*.3,S1[1]+(S1[1]-S0[1])*.3)}
  const sp=P(toRef(sim.rx,sim.ry));g.fillStyle=cfg.c2;g.beginPath();g.arc(sp[0],sp[1],3.5,0,TAU);g.fill();g.strokeStyle='#fff';g.lineWidth=1;g.stroke();
  set('insNote',`Motion is computed in the orbital plane and rotated by i and Ω for this view. Drag to rotate.${j?` J2: Ω̇ ${sci(j.dO/D2R*DAY,3)}°/d, ω̇ ${sci(j.dw/D2R*DAY,3)}°/d.`:''}`)}
function drawGround(g,w,h){if(!isEarth()){g.fillStyle='#8d96a2';g.textAlign='center';g.fillText('Ground tracks need Earth as body 1.',w/2,h/2);set('insNote','Load an Earth-satellite scenario or set body 1’s appearance to Earth.');return}
  const mw=w,mh=w/2,y0=(h-mh)/2,t=sim.t,th=earthAngle(cfg,t),j=j2Now(),sg=arcEl.h<0?-1:1,LX=lon=>(lon/D2R+180)/360*mw,LY=lat=>y0+(90-lat/D2R)/180*mh;
  g.drawImage(Art.earthMap(),0,y0,mw,mh);
  if(VO.daynight){if(!nightCv){nightCv=document.createElement('canvas');nightCv.width=120;nightCv.height=60}const nx=nightCv.getContext('2d'),im=nx.createImageData(120,60),sv=sunRef(t,cfg.sun0),ls=Math.atan2(sv[1],sv[0])-th,ds=Math.asin(sv[2]);
    for(let y=0;y<60;y++){const la=(90-(y+.5)*3)*D2R;for(let x=0;x<120;x++){const lo=((x+.5)*3-180)*D2R,cz=Math.sin(la)*Math.sin(ds)+Math.cos(la)*Math.cos(ds)*Math.cos(lo-ls),i=(y*120+x)*4;im.data[i+2]=12;im.data[i+3]=cz<-.1?150:cz<.05?150*(.05-cz)/.15:0}}
    nx.putImageData(im,0,0);g.imageSmoothingEnabled=true;g.drawImage(nightCv,0,y0,mw,mh)}
  g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;for(let la=-60;la<=60;la+=30){const y=LY(la*D2R);g.beginPath();g.moveTo(0,y);g.lineTo(mw,y);g.stroke()}for(let lo=-150;lo<=150;lo+=30){const x=LX(lo*D2R);g.beginPath();g.moveTo(x,y0);g.lineTo(x,y0+mh);g.stroke()}
  const tW=VO.trailLen?VO.trailLen*sim.tref:Infinity;g.lineWidth=1.6;g.lineJoin='round';let px=null,py=null,plon=null;g.beginPath();
  const key=[j?1:0,sg,cfg.inc,cfg.raan,cfg.gst0,sim.t===0?Math.random():0].join();if(key!==gt.key||!gt.n){gt.key=key;gt.gen++}
  for(let q=0;q<gt.n;q++){const i=(gt.s+q)%GTN;if(t-gt.t[i]>tW)continue;if(gt.g[i]!==gt.gen){const sp=subPoint(cfg,gt.x[i],gt.y[i],gt.t[i],sg,j);gt.la[i]=sp.lat;gt.lo[i]=sp.lon;gt.g[i]=gt.gen}
    const lo=gt.lo[i],x=LX(lo),y=LY(gt.la[i]);if(px==null||Math.abs(lo-plon)>Math.PI)g.moveTo(x,y);else g.lineTo(x,y);px=x;py=y;plon=lo}
  g.strokeStyle=rgba(cfg.c2,.9);g.stroke();
  const cp=subPoint(cfg,sim.rx,sim.ry,t,sg,j),cx=LX(cp.lon),cy=LY(cp.lat);g.strokeStyle='#fff';g.lineWidth=1.2;g.beginPath();g.arc(cx,cy,4,0,TAU);g.moveTo(cx-8,cy);g.lineTo(cx-5,cy);g.moveTo(cx+5,cy);g.lineTo(cx+8,cy);g.stroke();
  set('insNote',`Sub-satellite point ${fLat(cp.lat)}, ${fLon(cp.lon)}.${j?' J2 drift applied.':''} Night side shaded from the mean Sun.`)}

// ───────── strip charts ─────────
const gHover={};
for(const id of['g0','g1','g2']){const c=$(id);c.addEventListener('pointermove',e=>{gHover[id]=e.offsetX});c.addEventListener('pointerleave',()=>{gHover[id]=null})}
function nearIdx(S,t){let j=ringIdx(S,t);if(j>0&&Math.abs(S.bt[(S.start+j-1)%S.cap]-t)<Math.abs(S.bt[(S.start+j)%S.cap]-t))j--;return(S.start+j)%S.cap}
function graph(id,key,color,fmt,minRel,hv){const c=$(id),w=c.clientWidth,h=c.clientHeight,g=c.getContext('2d');if(!w)return;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.font='10.5px "IBM Plex Mono",monospace';
  const arr=sim[key],n=sim.n,cap=sim.cap,st=sim.start,L=78,Rr=6,T=6,B=28,pw=w-L-Rr,ph=h-T-B;
  if(n<3){g.fillStyle='#606974';g.textAlign='center';g.fillText('No data yet. Press Play.',w/2,h/2);return}
  const t0=sim.bt[st],t1=sim.bt[(st+n-1)%cap],dt=t1-t0||1;let lo=1/0,hi=-1/0;for(let j=0;j<n;j++){const v=arr[(st+j)%cap];if(v<lo)lo=v;if(v>hi)hi=v}
  const R2=ref&&ref.sim.n>2?ref.sim:null;if(R2)for(let j=0;j<R2.n;j++){const q=(R2.start+j)%R2.cap,t=R2.bt[q];if(t<t0||t>t1)continue;const v=R2[key][q];if(v<lo)lo=v;if(v>hi)hi=v}
  const mid=(lo+hi)/2,rg=Math.max(hi-lo,minRel(Math.max(Math.abs(lo),Math.abs(hi))))*1.16;lo=mid-rg/2;hi=mid+rg/2;
  const X=t=>L+(t-t0)/dt*pw,Y=v=>T+(hi-v)/rg*ph;
  g.strokeStyle='#1e242b';g.lineWidth=1;g.fillStyle='#7c8693';g.textAlign='right';g.textBaseline='middle';
  for(let i=0;i<=2;i++){const v=lo+rg*i/2,y=Math.round(Y(v))+.5;g.beginPath();g.moveTo(L,y);g.lineTo(w-Rr,y);g.stroke();g.fillText(fmt(v,rg),L-6,y)}
  g.textBaseline='alphabetic';g.textAlign='left';g.fillText(fTime(t0),L,h-14);g.textAlign='right';g.fillText(fTime(t1),w-Rr,h-14);g.textAlign='center';g.fillStyle='#5a636e';g.fillText('simulation time',L+pw/2,h-2);
  g.save();g.beginPath();g.rect(L,T-2,pw,ph+4);g.clip();
  if(R2){g.beginPath();let f=true;for(let j=0;j<R2.n;j++){const q=(R2.start+j)%R2.cap,t=R2.bt[q];if(t<t0||t>t1)continue;const x=X(t),y=Y(R2[key][q]);f?g.moveTo(x,y):g.lineTo(x,y);f=false}g.setLineDash([4,3]);g.strokeStyle=REFC;g.lineWidth=1.3;g.stroke();g.setLineDash([])}
  g.beginPath();for(let j=0;j<n;j++){const q=(st+j)%cap,x=X(sim.bt[q]),y=Y(arr[q]);j?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle=color;g.lineWidth=1.5;g.lineJoin='round';g.stroke();
  g.restore();const lv=arr[(st+n-1)%cap];g.fillStyle=color;g.beginPath();g.arc(X(t1),Y(lv),2.6,0,TAU);g.fill();
  const hx=gHover[id];if(hx!=null&&hx>=L&&hx<=w-Rr){const q=nearIdx(sim,t0+(hx-L)/pw*dt),x=X(sim.bt[q]),y=Y(arr[q]);
    g.strokeStyle='rgba(217,222,229,.35)';g.beginPath();g.moveTo(x+.5,T);g.lineTo(x+.5,T+ph);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(x,y,3,0,TAU);g.fill();
    const lines=['t = '+fTime(sim.bt[q]),hv(arr[q])];if(R2&&R2.bt[(R2.start+R2.n-1)%R2.cap]>=sim.bt[q])lines.push('B: '+hv(R2[key][nearIdx(R2,sim.bt[q])]));
    const bw=Math.max(...lines.map(s=>g.measureText(s).width))+12,bx=x+bw+10>w?x-bw-8:x+8;g.fillStyle='rgba(23,27,32,.96)';g.strokeStyle='#313840';g.beginPath();g.rect(bx,T+2,bw,lines.length*14+6);g.fill();g.stroke();
    g.textAlign='left';lines.forEach((s,i)=>{g.fillStyle=i===2?REFC:i?'#fff':'#8d96a2';g.fillText(s,bx+6,T+14+i*14)})}}
const axFmt=(u,f)=>(v,rg)=>{const d=Math.max(3,Math.min(7,Math.ceil(Math.log10(Math.max(Math.abs(v),1e-300)/rg))+2));return String(Number((v/f).toPrecision(d)))+' '+u};
function graphs(){if(dTab!=='graphs')return;const d=sim.diagCache,ru=sim.rMax>=1.5e9?['AU',AU]:sim.rMax>=1e3?['km',1e3]:['m',1],vu=d.v>=1e3||sim.vref>=1e3?['km/s',1e3]:['m/s',1],en=sim.Eref===Math.abs(sim.E0)?'|E₀|':'|U₀|';
  graph('g0','br','#5aa8e8',axFmt(...ru),m=>m*2e-3,fDist);graph('g1','bv','#6fd6a8',axFmt(...vu),m=>m*2e-3,fSpd);graph('g2','bd','#e8b04a',v=>Math.abs(v)<1e-17?'0':v.toExponential(1),()=>2e-12,v=>'ΔE/'+en+' = '+v.toExponential(2));
  set('g0v',fDist(d.r));set('g1v',fSpd(d.v));set('g2v',`E = ${sci(d.E)} J`);set('g2t',`(E − E₀)/${en}`);
  set('showing',`<span><i></i>A · ${esc(expName)}</span>`+(ref?`<span><i class="r"></i>B · ${esc(ref.name)}</span>`:''))}

// ───────── side panel: scenario description and orbit readouts ─────────
const STABS=[['scn','Scenario'],['setup','Setup'],['orbit','Orbit'],['view','View']];let sTab='scn';
$('sTabs').innerHTML=STABS.map(([k,l])=>`<button class="tab" role="tab" id="st-${k}" aria-controls="s-${k}" type="button">${l}</button>`).join('');
function showSTab(k){sTab=k;for(const[t]of STABS){$('s-'+t).hidden=t!==k;const b=$('st-'+t);b.setAttribute('aria-selected',t===k);b.tabIndex=t===k?0:-1}if(sim)refresh()}
$('sTabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)showSTab(b.id.slice(3))});
function renderScn(){const L=scn.learn,cats=scn.cats.map(c=>CATS.find(x=>x[0]===c)[1]).join(' · ');
  $('scTitle').textContent=scn.name;$('scMeta').textContent=cats+(scn.example?` · Example: ${scn.example}`:'');
  $('scLearn').innerHTML=`<h3>What it is</h3><p>${L.what}</p><h3>Why it is used</h3><p>${L.why}</p><h3>Initial conditions</h3><p>${L.ic}</p><h3>Equations</h3><div class="eq">${L.eq.map(esc).join('<br>')}</div><h3>What to observe</h3><p>${L.obs}</p>${L.note?`<p class="note">${L.note}</p>`:''}`;
  scnCtl();renderScnParams()}
function renderScnParams(){if(!sim)return;const el=sim.el0,c=cfg,pl=effPlane(c,el.h),v0=Math.hypot(c.vr,c.vt),E=isEarth()&&isCentral(),rows=[];
  const rad=(r,lab)=>r==null?[lab,na]:[lab,E?`${fDist(r-REQ)} altitude<i>${fDist(r)} from Earth’s centre</i>`:fDist(r)];
  if(E)rows.push(['Initial altitude',`${fDist(c.r0-REQ)}<i>radius ${fDist(c.r0)}</i>`]);else rows.push(['Initial separation',fDist(c.r0)]);
  rows.push(['Inclination',`${(pl.i/D2R).toFixed(2)}°<i>${pl.i/D2R>90?'retrograde':'prograde'}</i>`],['Eccentricity',sci(el.e,4)],['Orbital period',el.T?`${fTime(el.T)}<i>${sci(el.T)} s</i>`:na+'<i>unbound</i>'],
    ['Speed at start',fSpd(v0)],rad(el.radial?0:el.rp,E?'Perigee':'Periapsis'),rad(el.ra,E?'Apogee':'Apoapsis'),['Classification',el.label]);
  $('scParams').innerHTML=(pristine()?'':'<tr><td colspan="2" class="note" style="color:var(--warn)">Values for the edited setup.</td></tr>')+rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}
function scnCtl(){const box=$('scCtl'),k=scn.ctl;let h='';
  if(k==='planet')h=`<h3>Planet</h3><div class="row"><select id="cPlanet">${Object.entries(PLANETS).map(([k,p])=>`<option value="${k}"${scnOpt.p===k?' selected':''}>${p.n}</option>`).join('')}</select></div><div class="tw" style="margin-top:8px"><table><thead><tr><th>Planet</th><th>a (AU)</th><th>T formula</th><th>T observed</th></tr></thead><tbody>${Object.values(PLANETS).map(p=>{const T=TAU*Math.sqrt((p.a*AU)**3/(G*(MSUN+p.m)));return`<tr><td>${p.n}</td><td>${p.a.toFixed(4)}</td><td>${sci(T/DAY,5)} d</td><td>${sci(p.P,5)} d</td></tr>`}).join('')}</tbody></table></div>`;
  else if(k==='q')h=`<h3>Mass ratio</h3><label class="row muted" for="cQ">q = m₂/m₁ <output class="mono" id="cQo">${scnOpt.q}</output></label><input type="range" id="cQ" min="0.02" max="1" step="0.01" value="${scnOpt.q}">`;
  else if(k==='hohmann')h=`<h3>Transfer altitudes</h3><div class="f"><label for="cH1">Initial</label><input type="text" id="cH1" value="${scnOpt.h1}"><span class="u">km</span></div><div class="f"><label for="cH2">Final</label><input type="text" id="cH2" value="${scnOpt.h2}"><span class="u">km</span></div><div class="row"><button class="btn sm" id="cHgo" type="button">Load transfer</button><span class="msg" id="cHm"></span></div>`;
  else if(k==='target')h=`<h3>Target planet</h3><div class="row"><select id="cTgt">${['mercury','venus','mars','jupiter'].map(p=>`<option value="${p}"${scnOpt.p===p?' selected':''}>${PLANETS[p].n}</option>`).join('')}</select></div>`;
  else if(k==='sso')h=`<h3>Altitude</h3><div class="f"><label for="cAlt">Altitude</label><input type="text" id="cAlt" value="${scnOpt.alt||705}"><span class="u">km</span></div><div class="row"><button class="btn sm" id="cSso" type="button">Load with sun-synchronous inclination</button><button class="btn sm" id="cJ2" type="button">${j2On?'Turn J2 off':'Turn J2 on'}</button></div><p class="note" id="cSsoM"></p>`;
  else if(k==='j2')h=`<div class="row" style="margin-top:10px"><button class="btn sm" id="cJ2" type="button">${j2On?'Turn J2 off':'Turn J2 on'}</button></div>`;
  box.innerHTML=h;
  const on=(id,ev,f)=>{const e=$(id);if(e)e.addEventListener(ev,f)};
  on('cPlanet','change',e=>loadScenario(scn.id,{p:e.target.value}));
  on('cQ','input',e=>$('cQo').textContent=e.target.value);on('cQ','change',e=>loadScenario(scn.id,{q:+e.target.value}));
  on('cTgt','change',e=>loadScenario(scn.id,{p:e.target.value}));
  on('cHgo','click',()=>{const a=parseNum($('cH1').value),b=parseNum($('cH2').value);if(!(a>=100&&b>=100&&a<1e6&&b<1e6&&a!==b))return $('cHm').textContent='Use two different altitudes from 100 to 1,000,000 km.';loadScenario(scn.id,{h1:a,h2:b})});
  on('cSso','click',()=>{const a=parseNum($('cAlt').value);if(!(a>=200&&a<=6000))return $('cSsoM').textContent='Use an altitude from 200 to 6,000 km.';const i=ssoIncl(G*(MEARTH+2600),REQ+a*1e3,0);if(i==null)return $('cSsoM').textContent='No sun-synchronous inclination exists at this altitude.';loadScenario(scn.id,{alt:a});$('cSsoM').textContent=`i = ${(i/D2R).toFixed(2)}° from the J2 formula.`});
  on('cJ2','click',()=>{j2On=!j2On;buildOrbitPane();scnCtl();toast(j2On?'J2 secular drift on: applied to the 3D inset, ground track and node readouts.':'J2 off: pure two-body.')})}
function buildOrbitPane(){
  for(const k in last)if(/^(o[A-Z]|ec[A-Z]|j(dO|Req|Sso|Ireq|dW|Lt2|LtJ)|tr[A-Z])/.test(k))delete last[k];
  const r=(id,l,t)=>`<dt>${l}${t?tipBtn(t):''}</dt><dd id="${id}"></dd>`;
  $('oEl').innerHTML=r('oClass','Classification')+r('oE','Eccentricity e','e')+r('oA','Semi-major axis a','a')+r('oEps','Specific energy ε','eps')+r('oH','Specific ang. momentum h','h')+r('oRp','Periapsis','rp')+r('oRa','Apoapsis','ra')+r('oT','Period','T')+r('oVp','Speed at periapsis')+r('oVa','Speed at apoapsis')+r('oVc','Circular speed at r₀','vcirc')+r('oVe','Escape speed at r₀','vesc')+r('oI','Inclination','iEff')+r('oNode','Ascending node Ω','raan')+r('oW','Argument of periapsis ω')+r('oU','Position angle u');
  $('oEarth').innerHTML=isEarth()&&isCentral()?`<h3>Earth-orbit checks</h3><dl class="dl">${r('ecT','Sidereal day')}${r('ecR','Period / sidereal day')}${r('ecReg','Regime')}${r('ecInc','Plane')}</dl><ul class="chk" id="ecChk"></ul><div class="verdict" id="ecV"></div><p class="note">Tolerances: period within ${GEO_TOL.T*100} %, e below ${GEO_TOL.e}, i below ${GEO_TOL.i}°.</p>`:'';
  $('oJ2').innerHTML=isEarth()&&isCentral()?`<h3>J2 secular model ${tipBtn('j2')}</h3><label class="row"><input type="checkbox" id="j2On"${j2On?' checked':''}>Apply Earth oblateness drift (extended model)</label><dl class="dl" style="margin-top:6px">${r('jdO','Node drift Ω̇')}${r('jReq','Needed for sun-synchrony')}${r('jSso','Sun-synchronous')}${r('jIreq','Inclination for sun-synchrony')}${r('jdW','Perigee drift ω̇')}${r('jLt2','Node local time, two-body','ltan')}${r('jLtJ','Node local time, with J2','ltan')}</dl><p class="note">Rates from the first-order formulas with J2 = 1.0826×10⁻³ and R⊕ = 6,378.137 km. The integration and all values above stay two-body.</p>`:'';
  const tr=ms&&ms.tr,sTr=scn.transfer;
  $('oTr').innerHTML=sTr?`<h3>Transfer</h3>`+(ms?`<label class="row"><input type="checkbox" id="trArr"${tr.arrive?' checked':''}>Apply ${tr.kind==='apogee'?'apogee':'arrival'} burn</label><dl class="dl" style="margin-top:6px">${r('trR','Radii r₁ → r₂')}${tr.kind==='hohmann'?r('trA','Transfer a_t')+r('trD1','Δv₁ formula / applied')+r('trTt','Transfer time formula / measured'):''}${r('trD2','Δv₂ formula / applied')}${tr.kind==='hohmann'?r('trDt','Total Δv'):r('trPc','Δv with plane change')}${r('trArrR','Arrival radius / r₂')}</dl><p class="note">Instantaneous burns, coplanar circular orbits. Burns change the relative velocity between integration steps.</p>`:'<p class="note" style="color:var(--warn)">Burns are off because the setup differs from the scenario. Reload the scenario to enable them.</p>'):'';
  const j=$('j2On');if(j)j.onchange=()=>{j2On=j.checked;scnCtl();refresh()};const a=$('trArr');if(a)a.onchange=()=>{ms.tr.arrive=a.checked}}

// ───────── diagnostics ─────────
const ROWS={dBody:[['sR','Separation r'],['sV','Relative speed'],['sV1','Speed of body 1'],['sV2','Speed of body 2'],['sD1','Body 1 to barycentre'],['sD2','Body 2 to barycentre'],['sA1','Acceleration of body 1','a1'],['sA2','Acceleration of body 2','a1'],['sF','Gravitational force']],
  dCons:[['sCom','Centre of mass','com'],['sP','Total momentum |P|','P'],['sL','Angular momentum L','L'],['nL','L drift']],
  dEn:[['sK','Kinetic K','K'],['sU','Potential U','U'],['sEt','Total E','E'],['sVir','K / |U|'],['nD','Energy error now','drift'],['nDm','Largest energy error']],
  dSim:[['nT','Simulation time'],['nSt','Steps'],['nDt','Current Δt'],['nMode','Timestep'],['nTm','Measured period','tmeas'],['nRev','Revolutions'],['nBuf','Stored samples']]};
for(const[id,rows]of Object.entries(ROWS))$(id).innerHTML=rows.map(([i,l,t])=>`<dt>${l}${t?tipBtn(t):''}</dt><dd id="${i}"></dd>`).join('');
const yn=b=>b?'<span class="y">✓</span>':'<span class="n">✗</span>';
function refresh(force){
  const d=sim.diagCache=sim.diag(),el=d.el;if(force){sim.F0=d.F;sim.vref=Math.max(d.v,d.vcirc);sim.A0=Math.max(d.a1,d.a2)}
  const sgn=el.kind==='bound'?'bound':el.kind==='para'?'escape boundary':'unbound';
  set('hClass',el.label);set('hSub',`e ${sci(el.e,4)} · ε ${el.kind==='bound'?'&lt;':el.kind==='para'?'≈':'&gt;'} 0, ${sgn}${el.radial?' · h ≈ 0':''}`);
  const ad=Math.max(Math.abs(d.drift),sim.maxDrift),cls=ad<1e-3?'g':ad<1e-2?'w':'c';$('stab').className='pill '+cls;set('stab',`ΔE ${ad.toExponential(1)}${cls==='g'?'':' · raise resolution'}`);
  set('clock',fTime(sim.t));set('dtO',fTime(dtNext()));status();set('hSize',sizeTxt);set('hScale',scaleTxt);
  while(evQ.length){const ev=evQ.shift(),b=ms.burns[ms.burns.length-1];toast(`${b.label} applied: ${fSpd(b.dv)} at t = ${fTime(b.t)}.`);buildOrbitPane()}
  if(sim.collided&&$('banner').hidden){$('banner').hidden=false;$('banner').textContent=`Collision at t = ${fTime(sim.hitT)}: separation reached R₁ + R₂ = ${fDist(cfg.R1+cfg.R2)} at ${fSpd(sim.hitV)}. Press Reset to run again.`;setRun(false)}
  if(sim.failed&&$('banner').hidden){$('banner').hidden=false;$('banner').textContent='The integration produced non-finite values. Press Reset and raise the resolution.';setRun(false)}
  if(sTab==='orbit'){const pl=effPlane(cfg,el.h),E=isEarth()&&isCentral(),alt=r=>E&&r!=null?`<i>altitude ${fDist(r-REQ)}</i>`:'';
    set('oClass',el.label);set('oE',sci(el.e,6));set('oA',el.a==null?na+'<i>undefined for a parabola</i>':dual(el.a,'m',fDist));set('oEps',`${sci(el.eps)} J/kg`);set('oH',`${sci(el.h)} m²/s`);
    set('oRp',el.radial?'0<i>radial path</i>':dual(el.rp,'m',fDist)+alt(el.rp));set('oRa',el.ra==null?na+'<i>unbound</i>':dual(el.ra,'m',fDist)+alt(el.ra));set('oT',el.T==null?na:dual(el.T,'s',fTime));
    set('oVp',el.radial?na:fSpd(Math.abs(el.h)/el.rp));set('oVa',el.ra==null?na:fSpd(Math.abs(el.h)/el.ra));set('oVc',fSpd(d.vcirc));set('oVe',fSpd(d.vesc));
    set('oI',`${(pl.i/D2R).toFixed(3)}°<i>${pl.i/D2R>90?'retrograde':'prograde'}${pl.sg<0?', clockwise in plane':''}</i>`);set('oNode',(pl.i>1e-6?((pl.O/D2R%360+360)%360).toFixed(2)+'°':na+'<i>equatorial</i>'));
    set('oW',el.e>CIRC_TOL&&!el.radial?((pl.sg*el.w/D2R%360+360)%360).toFixed(2)+'°':na);set('oU',((pl.sg*Math.atan2(sim.ry,sim.rx)/D2R%360+360)%360).toFixed(2)+'°');
    if(E){const ch=earthChecks(cfg,el);set('ecT','86,164.09 s<i>23 h 56 min 4.09 s</i>');set('ecR',ch.ratio==null?na:ch.ratio.toFixed(6));set('ecReg',ch.regime);set('ecInc',ch.inc);
      set('ecChk',`<li>${yn(ch.geosync)}<span>Period equals the sidereal day</span><span>${ch.ratio==null?'–':ch.ratio.toFixed(5)}</span></li><li>${yn(ch.circ)}<span>Circular</span><span>e ${sci(el.e,2)}</span></li><li>${yn(ch.equ)}<span>Equatorial</span><span>i ${ch.iDeg.toFixed(2)}°</span></li><li>${yn(ch.pro)}<span>Prograde</span><span>${ch.pro?'yes':'no'}</span></li>`);set('ecV',ch.verdict);
      const j=el.kind==='bound'?j2Rates(sim.mu,arcEl.a,arcEl.e,effPlane(cfg,arcEl.h).i):null,dd=x=>sci(x/D2R*DAY,4)+'°/day';
      if(j){const ir=ssoIncl(sim.mu,arcEl.a,arcEl.e),ok=Math.abs(j.dO/SSO_RATE-1)<.01;set('jdO',dd(j.dO));set('jReq',dd(SSO_RATE));set('jSso',ok?'yes, within 1 %':'no');set('jIreq',ir==null?na+'<i>none at this altitude</i>':(ir/D2R).toFixed(2)+'°');
        set('jdW',dd(j.dw)+(Math.abs(cfg.inc-CRIT_INC/D2R)<.5?'<i>near the critical inclination 63.43°</i>':''));set('jLt2',`${fHM(ltan(cfg,el,0,null))} → ${fHM(ltan(cfg,el,sim.t,null))}`);set('jLtJ',`${fHM(ltan(cfg,el,0,j))} → ${fHM(ltan(cfg,el,sim.t,j))}`)}
      else for(const id of['jdO','jReq','jSso','jIreq','jdW','jLt2','jLtJ'])set(id,na)}
    if(ms){const tr=ms.tr,b1=ms.burns.find(b=>b.label==='Δv₁'),b2=ms.burns.find(b=>b.label==='Δv₂'),mu=sim.mu;
      set('trR',`${fDist(tr.r1)} → ${fDist(tr.r2)}`);if(tr.kind==='hohmann'){set('trA',fDist(tr.at));set('trD1',`${fSpd(Math.abs(tr.dv1))} / ${b1?fSpd(b1.dv):'pending'}`);set('trTt',`${fTime(tr.tt)} / ${b1&&b2?fTime(b2.t-b1.t):'pending'}`);set('trDt',fSpd(Math.abs(tr.dv1)+Math.abs(tr.dv2)))}
      const at=(tr.r1+tr.r2)/2,va=Math.sqrt(mu*(2/tr.r2-1/at)),vg=Math.sqrt(mu/tr.r2),dv2=tr.kind==='hohmann'?Math.abs(tr.dv2):vg-va;set('trD2',`${fSpd(dv2)} / ${b2?fSpd(b2.dv):tr.arrive?'pending':'off'}`);
      if(tr.kind==='apogee'){const di=cfg.inc*D2R;set('trPc',`${fSpd(Math.sqrt(va*va+vg*vg-2*va*vg*Math.cos(di)))}<i>removing i = ${cfg.inc}°, not simulated</i>`)}set('trArrR',b2?sci(b2.r/tr.r2,7):'pending')}}
  if(dTab==='diag'){set('sR',dual(d.r,'m',fDist));set('sV',dual(d.v,'m/s',fSpd));set('sV1',dual(d.v1,'m/s',fSpd));set('sV2',dual(d.v2,'m/s',fSpd));set('sD1',dual(d.d1,'m',fDist));set('sD2',dual(d.d2,'m',fDist));
    set('sA1',fAcc(d.a1));set('sA2',fAcc(d.a2));set('sF',`${sci(d.F)} N`);set('sCom',`(${sci(d.comx,2)}, ${sci(d.comy,2)}) m`);set('sP',`${sci(d.P,2)} kg·m/s<i>${sci(d.Prel,1)} of μ·v</i>`);set('sL',`${sci(d.L)} kg·m²/s`);set('nL',d.Ldrift.toExponential(2));
    set('sK',fJ(d.K));set('sU',fJ(d.U));set('sEt',fJ(d.E));set('sVir',sci(d.K/Math.abs(d.U),5));set('nD',d.drift.toExponential(2));set('nDm',sim.maxDrift.toExponential(2)+(ms&&ms.burns.length?'<i>baseline reset at each burn</i>':''));
    set('nT',`${sci(sim.t)} s<i>${fTime(sim.t)}</i>`);set('nSt',sim.steps.toLocaleString('en-US'));set('nDt',fTime(dtNext()));set('nMode',sim.adaptive?'adaptive':'fixed');
    set('nTm',sim.Tmeas==null?na+'<i>after one revolution</i>':dual(sim.Tmeas,'s',fTime)+(sim.el0.T&&!(ms&&ms.burns.length)?`<i>${((sim.Tmeas/sim.el0.T-1)*100).toExponential(1)} % from formula</i>`:''));set('nRev',String(sim.revs));set('nBuf',`${sim.n.toLocaleString('en-US')} of ${sim.cap.toLocaleString('en-US')}`)}
  graphs();if(dTab==='exp')xRefresh(d);if(dTab==='compare')cmpRefresh();if(dTab==='explore'&&xp)xpDraw();
}

// ───────── transport, menus, view controls ─────────
function updSpeed(){set('speedO','1 s = '+fTime(rate()));set('resO',`${resN().toLocaleString('en-US')} steps per ${sim.el0.T&&sim.tref===sim.el0.T?'orbit':'dynamical time'}`)}
$('speed').oninput=updSpeed;
$('res').oninput=$('dtMode').onchange=()=>{sim.setRes(resN(),adaptive());if(ref)ref.sim.setRes(resN(),adaptive());updSpeed();refresh();set('dtO',fTime(dtNext()))};
$('bRun').onclick=()=>{if(running){wantRun=false;return setRun(false)}if(sim.collided||sim.failed)return toast('This run has ended. Press Reset or Restart.');wantRun=true;setRun(true)};
const stepN=n=>{wantRun=false;setRun(false);for(let i=0;i<n;i++)adv();syncRef();refresh()};
$('bStep').onclick=()=>stepN(1);$('bStep100').onclick=()=>stepN(100);
$('bReset').onclick=()=>{writeForm(cfg);apply(cfg,{fit:false,name:expName});wantRun=false;setRun(false)};
$('bRestart').onclick=()=>{const c=readForm();if(c){apply(c);setRun(true)}};
$('bApply').onclick=()=>{const c=readForm();if(c){apply(c);setRun(running);toast('Applied. Running from t = 0.')}};
$('s-setup').addEventListener('input',e=>{if(!e.target.id||e.target.classList.contains('tip'))return;hints();if(['c1','c2','k1','k2'].includes(e.target.id)){cfg[e.target.id]=e.target.value;if(e.target.id[0]==='k'){buildOrbitPane();legend()}chips();return}formMsg('Unapplied changes. Press Apply.')});
$('s-setup').addEventListener('change',e=>{if(['k1','k2'].includes(e.target.id)){cfg[e.target.id]=e.target.value;buildOrbitPane();hints()}});
$('s-setup').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')$('bApply').click()});
const fillV=f=>{const m1=parseNum($('m1').value),m2=parseNum($('m2').value),r=parseNum($('r0').value);if(!(m1>0&&m2>0&&r>0))return formMsg('Enter valid masses and separation first.',1);$('vr').value='0';$('vt').value=fIn(Math.sqrt(f*G*(m1+m2)/r));hints();formMsg('Unapplied changes. Press Apply.')};
$('bCirc').onclick=()=>fillV(1);$('bEsc').onclick=()=>fillV(2);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!$('tour').hidden)tourEnd();closePops();hideTip();pin=null}
  if(e.code==='Space'&&!/INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY/.test(e.target.tagName)){e.preventDefault();$('bRun').click()}});
// popovers
const POPS=[['scnBtn','scnPop'],['bSet','setPop'],['bHelp','helpPop']];
function closePops(ex){for(const[b,p]of POPS)if(p!==ex){$(p).hidden=true;$(b).setAttribute('aria-expanded','false')}}
for(const[b,p]of POPS)$(b).addEventListener('click',e=>{e.stopPropagation();const open=$(p).hidden;closePops();$(p).hidden=!open;$(b).setAttribute('aria-expanded',open);if(open&&p==='scnPop'){scnCatSel=scn.cats[0];scnMenu();setTimeout(()=>{const c=$('scnList').querySelector('[aria-current="true"]')||$('scnList').querySelector('button');c&&c.focus()},0)}});
document.addEventListener('click',e=>{if(!e.target.closest('.pop'))closePops()});
$('stab').onclick=e=>{e.stopPropagation();closePops();$('setPop').hidden=false;$('bSet').setAttribute('aria-expanded','true')};
let scnCatSel='solar';
function scnMenu(){$('scnCats').innerHTML=CATS.map(([k,l])=>`<button type="button" role="tab" data-c="${k}" aria-selected="${k===scnCatSel}">${l}</button>`).join('');
  $('scnList').innerHTML=SCENARIOS.filter(s=>s.cats.includes(scnCatSel)).map(s=>`<li><button type="button" data-id="${s.id}"${s.id===scn.id?' aria-current="true"':''}><b>${s.name}</b><span>${s.short}</span></button></li>`).join('')}
$('scnCats').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();scnCatSel=b.dataset.c;scnMenu()});
$('scnList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;closePops();loadScenario(b.dataset.id);showSTab('scn');toast(`Loaded ${SC[b.dataset.id].name}.`)});
// view tab
function legend(){const it=[];const L=(svg,t)=>it.push(`<li>${svg}${t}</li>`);
  if(VO.trail)L('<svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#cfd6e0" stroke-width="2"/></svg>','computed path');
  if(VO.conic)L('<svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#cfd6e0" stroke-width="1.3" stroke-dasharray="4 3"/></svg>','predicted Kepler orbit');
  if(VO.vel)L('<svg width="20" height="8"><path d="M0 4H15M20 4l-6-3v6z" stroke="#6fd6a8" fill="#6fd6a8" stroke-width="1.6"/></svg>','velocity');
  if(VO.acc)L('<svg width="20" height="8"><path d="M0 4H15M20 4l-6-3v6z" stroke="#ffb35c" fill="#ffb35c" stroke-width="1.5" stroke-dasharray="4 3"/></svg>','acceleration');
  if(VO.force)L('<svg width="20" height="8"><path d="M0 4H15M20 4l-6-3v6z" stroke="#ff7a9c" fill="#ff7a9c" stroke-width="1.6"/></svg>','gravity force');
  L('<svg width="20" height="12"><path d="M4 6h12M10 0v12" stroke="#fff" stroke-width="1.1"/><circle cx="10" cy="6" r="3" fill="none" stroke="#fff"/></svg>','barycentre');
  if(VO.aps)L('<svg width="20" height="10"><path d="M5 0l5 5-5 5-5-5z" fill="#cfd6e0"/><rect x="12.5" y="1.5" width="7" height="7" fill="none" stroke="#cfd6e0" stroke-width="1.3"/></svg>','periapsis, apoapsis');
  if(VO.guides&&scn.guides)L('<svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#aab5c3" stroke-width="1" stroke-dasharray="2 4"/></svg>','reference orbit');
  if(scn.transfer)L('<svg width="20" height="10"><path d="M10 1l5 8H5z" fill="#ffb35c"/></svg>','burn');
  if(ref)L('<svg width="20" height="10"><line x1="0" y1="5" x2="11" y2="5" stroke="#c39bff" stroke-width="1.5" stroke-dasharray="1.5 3"/><circle cx="16" cy="5" r="3.2" fill="none" stroke="#c39bff" stroke-width="1.4"/></svg>','reference B');
  $('legList').innerHTML=it.join('')}
function syncView(){$$('#s-view [data-t]').forEach(c=>c.checked=!!VO[c.dataset.t]);$$('#s-view .seg').forEach(s=>s.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',VO[s.dataset.o]===b.dataset.v)));$('trailLen').value=String(VO.trailLen);syncKeep();syncInset();legend()}
$('s-view').addEventListener('change',e=>{const t=e.target;if(t.dataset.t){VO[t.dataset.t]=t.checked?1:0;legend()}else if(t.id==='trailLen')VO.trailLen=+t.value;else if(t.id==='frame'){view.frame=t.value;view.keep=true;syncKeep();fit(0)}
  else if(t.id==='follow'){view.follow=t.value}else if(t.id==='tgKeep')view.keep=t.checked;else if(t.id==='insSel'){VO.inset=t.value;syncInset()}});
$('s-view').addEventListener('click',e=>{const b=e.target.closest('.seg button');if(!b)return;VO[b.closest('.seg').dataset.o]=b.dataset.v;syncView()});
$('bDefaults').onclick=()=>{$('speed').value=0;$('res').value=3.3;$('dtMode').value='a';Object.assign(VO,VO0);ref=null;refSync();closePops();loadScenario('sun-earth',null,{run:!calm});syncView();showSTab('scn');toast('Default scenario and settings restored. Saved experiments are kept.')};

// ───────── analysis dock ─────────
const DTABS=[['diag','Diagnostics'],['graphs','Graphs'],['exp','Guided experiments'],['explore','Velocity sweep'],['compare','Compare'],['lib','Saved'],['report','Report']];let dTab='diag';
$('dTabs').innerHTML=DTABS.map(([k,l])=>`<button class="tab" role="tab" id="dt-${k}" aria-controls="d-${k}" type="button">${l}</button>`).join('')+'<span class="grow"></span><button class="btn sm" id="dockMax" type="button" aria-pressed="false" style="align-self:center">Expand</button>';
function showDTab(k){dTab=k;for(const[t]of DTABS){$('d-'+t).hidden=t!==k;const b=$('dt-'+t);b.setAttribute('aria-selected',t===k);b.tabIndex=t===k?0:-1}
  if(k==='explore'){xpDirty?sweep():xpDraw()}if(k==='lib')libRender();if(k==='report')report();if(k==='compare'){refSync();wiSync()}if(sim)refresh();store.set('dtab',k)}
$('dTabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)showDTab(b.id.slice(3))});
for(const id of['dTabs','sTabs'])$(id).addEventListener('keydown',e=>{const tabs=$$('#'+id+' .tab'),i=tabs.indexOf(document.activeElement),d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d&&i>=0){e.preventDefault();const n=tabs[(i+d+tabs.length)%tabs.length];n.click();n.focus()}});
$('dockMax').onclick=()=>{const t=document.body.classList.toggle('tall');$('dockMax').textContent=t?'Collapse':'Expand';$('dockMax').setAttribute('aria-pressed',t)};

// ───────── guided experiments ─────────
let xi=0;const bracket={key:'',lo:null,hi:null},notes=store.get('notes',{});
const go=(vr,vt,extra={})=>{const c={...cfg,...extra,vr,vt};writeForm(c);apply(c);setRun(true)};
const vc=()=>Math.sqrt(G*(cfg.m1+cfg.m2)/cfg.r0);
const recede=()=>sim.rx*(sim.vx2-sim.vx1)+sim.ry*(sim.vy2-sim.vy1)>0;
const EQ=(...l)=>`<div class="eq">${l.join('<br>')}</div>`;
const EXPS=[
 {k:'Escape velocity',t:'Escape velocity',obj:'Find the launch speed at which a bound orbit becomes an escape, and compare it with the formula.',
  th:`<p>The relative motion has specific energy ε = v²/2 − μ/r with μ = G(m₁ + m₂). It stays bound while ε &lt; 0.</p>${EQ('v_esc = √(2μ/r₀) = √2 · v_c')}`,
  setup:()=>({vr:0,vt:vc()}),chg:'Raise the tangential speed in small steps. Each change restarts the run.',look:'Does the path close? Does the separation turn around? Narrow the gap between the fastest bound run and the slowest unbound run.',
  ctl:`<label for="x1s">Tangential speed <output id="x1o"></output></label><input type="range" id="x1s" min="0.8" max="1.8" step="0.001" value="1"><div class="row"><button class="btn sm" data-n="-0.01">−1 %</button><button class="btn sm" data-n="-0.001">−0.1 %</button><button class="btn sm" data-n="0.001">+0.1 %</button><button class="btn sm" data-n="0.01">+1 %</button><button class="btn sm" data-act="bclr">Clear bracket</button></div>`,
  sl:{x1s:v=>go(0,v*vc())},so:{x1s:v=>`${(+v).toFixed(3)} v_c = ${fSpd(v*vc())}`},
  meas:d=>{const b=bracket;return[['Launch speed',fSpd(Math.hypot(cfg.vr,cfg.vt))],['Separation is',recede()?'increasing':'decreasing'],['Largest separation',fDist(sim.rMax)],['Fastest bound run',b.lo==null?na:fSpd(b.lo)],['Slowest unbound run',b.hi==null?na:fSpd(b.hi)]]},
  rows:d=>{const b=bracket,est=b.lo!=null&&b.hi!=null?(b.lo+b.hi)/2:null;return[{q:'Escape velocity',th:d.vesc,me:est,f:fSpd,n:est==null?'needs one bound and one unbound run':`bracket ±${fSpd((b.hi-b.lo)/2)}`},
    {q:'Outcome',th:sim.el0.kind==='bound'?'returns':sim.el0.kind==='para'?'boundary':'escapes',me:sim.collided?'collided':sim.revs>=1?'returned':sim.r>20*cfg.r0&&recede()?'beyond 20 r₀, receding':'not yet decided',ag:sim.revs>=1?sim.el0.kind==='bound':sim.r>20*cfg.r0&&recede()&&sim.el0.kind==='bound'?null:sim.r>20*cfg.r0&&recede()?true:null}]}},
 {k:'Eccentricity',t:'Orbit shape and launch speed',obj:'Show that with masses and separation fixed, the launch speed alone sets the orbit’s shape.',
  th:`<p>For a tangential launch at k times circular speed:</p>${EQ('e = |k² − 1|')}<p>Below k = 1 the start is apoapsis; above, periapsis. At k = √2 the orbit becomes a parabola.</p>`,
  setup:()=>({vr:0,vt:vc()}),chg:'Move the tangential speed from below circular to above escape speed.',look:'How does the shape change as k passes 1 and then √2? Where is the start point on the orbit?',
  ctl:`<label for="x2s">Tangential speed <output id="x2o"></output></label><input type="range" id="x2s" min="0.05" max="2" step="0.005" value="1"><div class="row"><button class="btn sm" data-k="0.6">0.6 v_c</button><button class="btn sm" data-k="1">Circular</button><button class="btn sm" data-k="1.2">1.2 v_c</button><button class="btn sm" data-k="1.38">1.38 v_c</button><button class="btn sm" data-k="1.7">1.7 v_c</button></div>`,
  sl:{x2s:v=>go(0,v*vc())},so:{x2s:v=>`${(+v).toFixed(3)} v_c = ${fSpd(v*vc())}`},
  meas:d=>[['k = v_t / v_c',(Math.abs(cfg.vt)/d.vcirc).toFixed(4)],['e from state vector',sci(d.el.e,6)],['Classification',d.el.label],['Smallest separation',fDist(sim.rMin)],['Largest separation',fDist(sim.rMax)],['Revolutions',String(sim.revs)]],
  rows:d=>{const pure=cfg.vr===0,k=Math.abs(cfg.vt)/d.vcirc,o=cfg.r0*k*k/(2-k*k),full=sim.revs>=1,w=full?null:'after one revolution';
   return[{q:'Eccentricity',th:pure?Math.abs(k*k-1):null,me:full?(sim.rMax-sim.rMin)/(sim.rMax+sim.rMin):sim.el0.kind!=='bound'?d.el.e:null,f:fNum,n:pure?(full?'from r_min and r_max':sim.el0.kind!=='bound'?'from the state vector':w):'formula needs v_r = 0'},
    {q:'Periapsis',th:pure?(k<1?o:cfg.r0):sim.el0.rp,me:full||k>=1?sim.rMin:null,f:fDist,n:pure&&k<1&&o<cfg.R1+cfg.R2?'inside R₁ + R₂: collision expected':full||k>=1?'':w},
    {q:'Apoapsis',th:sim.el0.ra,me:sim.el0.ra==null?null:full||k<=1?sim.rMax:null,f:fDist,n:sim.el0.ra==null?'unbound':full||k<=1?'':w}]}},
 {k:'Effect of mass',t:'Effect of mass',obj:'Measure how the masses change each body’s acceleration, the period and the motion about the barycentre.',
  th:`<p>Each body’s acceleration depends on the other body’s mass; the period depends on the total mass.</p>${EQ('a₁ = G m₂ / r²,  a₂ = G m₁ / r²','T = 2π √(a³ / G(m₁+m₂))')}`,
  setup:()=>({vr:0,vt:vc()}),chg:'Scale either mass. The separation stays fixed.',look:'Which acceleration changes when you change m₁? What happens to the period when the total mass doubles?',
  ctl:`<div class="row"><button class="btn sm" data-b="m1" data-f="0.5">m₁ × ½</button><button class="btn sm" data-b="m1" data-f="2">m₁ × 2</button><button class="btn sm" data-b="m1" data-f="10">m₁ × 10</button></div><div class="row"><button class="btn sm" data-b="m2" data-f="0.5">m₂ × ½</button><button class="btn sm" data-b="m2" data-f="2">m₂ × 2</button><button class="btn sm" data-b="m2" data-f="10">m₂ × 10</button><button class="btn sm" data-b="m2" data-f="1000">m₂ × 1000</button></div><label class="row"><input type="checkbox" id="x3c" checked>Reset tangential speed to the new circular speed</label>`,
  meas:d=>[['Mass of body 1',fMass(cfg.m1)],['Mass of body 2',fMass(cfg.m2)],['Separation',fDist(d.r)],['Revolutions',String(sim.revs)]],
  rows:d=>[{q:'Orbital period',th:sim.el0.T,me:sim.Tmeas,f:fTime,n:sim.Tmeas==null?'after one revolution':''},{q:'Acceleration of body 1',th:G*cfg.m2/d.r**2,me:d.a1,f:fAcc},{q:'Acceleration of body 2',th:G*cfg.m1/d.r**2,me:d.a2,f:fAcc},
   {q:'Body 1 to barycentre',th:d.r*cfg.m2/sim.M,me:d.d1,f:fDist},{q:'Body 2 to barycentre',th:d.r*cfg.m1/sim.M,me:d.d2,f:fDist}]},
 {k:'Binary stars',t:'Motion about the barycentre',obj:'Investigate how two comparable masses both move around their common centre of mass.',
  th:`<p>Both bodies trace conics of the same shape and period, scaled inversely with mass:</p>${EQ('r₁ / r₂ = v₁ / v₂ = m₂ / m₁ = q')}`,
  setup:()=>{const M=cfg.m1+cfg.m2;return{m1:M/1.5,m2:M/3,vr:0,vt:Math.sqrt(G*M/cfg.r0)}},chg:'Move the mass ratio toward 1. Total mass and separation stay fixed.',look:'Compare the two paths as q grows. Try Centred on body 1 under View → Frame.',
  ctl:`<label for="x4s">Mass ratio q = m₂/m₁ <output id="x4o"></output></label><input type="range" id="x4s" min="0.01" max="1" step="0.01" value="0.5"><div class="row"><label for="x4k">Launch speed</label><select id="x4k"><option value="1">circular</option><option value="0.7">0.7 v_c</option><option value="1.25">1.25 v_c</option></select></div><div class="row"><button class="btn sm" data-q="1">Equal masses</button><button class="btn sm" data-q="0.5">q = 0.5</button><button class="btn sm" data-q="0.1">q = 0.1</button></div>`,
  sl:{x4s:v=>x4(+v)},so:{x4s:v=>(+v).toFixed(2)},
  meas:d=>[['Mass ratio q',sci(cfg.m2/cfg.m1,5)],['Barycentre offset',`${sci(Math.hypot(d.comx,d.comy),2)} m`],['Revolutions',String(sim.revs)]],
  rows:d=>{const q=cfg.m2/cfg.m1;return[{q:'|r₁| / |r₂|',th:q,me:d.d1/d.d2,f:fNum},{q:'|v₁| / |v₂|',th:q,me:d.v2>0?d.v1/d.v2:null,f:fNum},{q:'Period',th:sim.el0.T,me:sim.Tmeas,f:fTime,n:sim.Tmeas==null?'after one revolution':''}]}},
 {k:'Radial vs tangential',t:'Radial versus tangential launch',obj:'Compare the same speed pointed along the line of centres and across it.',
  th:`<p>Angular momentum per unit mass is h = r₀ v_t. With h = 0 nothing prevents a collision; any sideways speed creates a periapsis:</p>${EQ('r_p = h² / μ(1 + e)')}`,
  setup:()=>({vr:0,vt:0}),chg:'Launch the cases below from the same separation.',look:'Which launches collide, which close, which escape?',
  ctl:`<div class="row"><button class="btn sm" data-v="0,0">From rest</button><button class="btn sm" data-v="-0.5,0">Inward 0.5 v_c</button><button class="btn sm" data-v="1.2,0">Outward 1.2 v_c</button><button class="btn sm" data-v="1.5,0">Outward 1.5 v_c</button></div><div class="row"><button class="btn sm" data-v="0,0.5">Tangential 0.5 v_c</button><button class="btn sm" data-v="0,1">Tangential 1.0 v_c</button><button class="btn sm" data-v="0,1.5">Tangential 1.5 v_c</button><button class="btn sm" data-v="-1.5,0.8">Inbound flyby</button></div>`,
  meas:d=>[['h now',`${sci(d.el.h)} m²/s`],['Path',d.el.label],['Status',sim.collided?'collided':running?'running':'paused'],['Smallest separation',fDist(sim.rMin)],['Largest separation',fDist(sim.rMax)]],
  rows:d=>{const e0=sim.el0,Rs=cfg.R1+cfg.R2,mu=sim.mu,r0=cfg.r0,v0=Math.hypot(cfg.vr,cfg.vt),x=Rs/r0,rest=v0===0,tff=Math.sqrt(r0**3/(2*mu))*(Math.acos(Math.sqrt(x))+Math.sqrt(x*(1-x))),hits=e0.radial?(e0.kind==='bound'||cfg.vr<0):e0.rp<Rs,passed=sim.rMin<d.r*.999&&recede();
   return[{q:'Angular momentum h',th:r0*cfg.vt,me:d.el.h,f:v=>sci(v)+' m²/s'},{q:'Collision',th:hits?'yes':'no',me:sim.collided?'yes':passed||sim.revs>=1?'no':'not yet',ag:sim.collided?hits:passed||sim.revs>=1?!hits:null},
    {q:'Time to contact',th:e0.radial&&rest?tff:null,me:sim.hitT,f:fTime,n:e0.radial&&rest?'':'formula for release from rest'},{q:'Impact speed',th:hits?Math.sqrt(v0*v0+2*mu*(1/Rs-1/r0)):null,me:sim.hitV,f:fSpd,n:hits?'':'no impact predicted'},
    {q:'Closest approach',th:e0.radial?null:e0.rp,me:!e0.radial&&(passed||sim.revs>=1)?sim.rMin:null,f:fDist,n:e0.radial?'radial path':passed||sim.revs>=1?'':'not reached yet'}]}}];
function x4(q){const M=cfg.m1+cfg.m2,k=+$('x4k').value;go(0,k*Math.sqrt(G*M/cfg.r0),{m1:M/(1+q),m2:M*q/(1+q)})}
$('xTabs').innerHTML=EXPS.map((x,i)=>`<button class="btn sm" role="tab" type="button" data-i="${i}">${i+1}. ${x.k}</button>`).join('');
$('xTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)xShow(+b.dataset.i)});
function xShow(i){xi=i;const x=EXPS[i];$$('#xTabs button').forEach((b,j)=>{b.setAttribute('aria-selected',i===j);b.classList.toggle('pri',i===j)});
  $('xTitle').textContent=x.t;$('xObj').textContent=x.obj;$('xTheory').innerHTML=x.th;$('xChg').textContent=x.chg;$('xLook').textContent=x.look;$('xCtl').innerHTML=x.ctl;
  const n=notes[i]||{};$('xObs').value=n.obs||'';$('xConc').value=n.conc||'';xSync();last.xMeas=last.xInit=null;lastCmp='';if(sim)xRefresh(sim.diagCache)}
function xSync(){const x=EXPS[xi];if(!cfg)return;if($('x1s'))$('x1s').value=Math.abs(cfg.vt)/vc();if($('x2s'))$('x2s').value=Math.abs(cfg.vt)/vc();if($('x4s'))$('x4s').value=Math.min(1,cfg.m2/cfg.m1);
  for(const id in x.so||{})$(id.replace('s','o')).textContent=x.so[id]($(id).value)}
function xOnApply(){const key=[cfg.m1,cfg.m2,cfg.r0].join();if(bracket.key!==key){bracket.key=key;bracket.lo=bracket.hi=null}
  if(xi===0&&dTab==='exp'){const v=Math.hypot(cfg.vr,cfg.vt),kd=sim.el0.kind;if(kd==='bound'&&(bracket.lo==null||v>bracket.lo))bracket.lo=v;if(kd==='hyper'&&(bracket.hi==null||v<bracket.hi))bracket.hi=v}xSync()}
let lastCmp='';
function cmpRows(d){return EXPS[xi].rows(d).map(r=>{const num=v=>typeof v==='number'&&isFinite(v),f=r.f||fNum,c=v=>v==null||(typeof v==='number'&&!isFinite(v))?null:typeof v==='number'?f(v):v;
  return{q:r.q,th:c(r.th),me:c(r.me),diff:num(r.th)&&num(r.me)&&r.th!==0?((r.me-r.th)/Math.abs(r.th)*100):null,n:r.n||'',ag:r.ag}})}
function xRefresh(d){if(!d)return;const x=EXPS[xi];
  set('xInit',`<dt>System</dt><dd>${esc(cfg.n1)} + ${esc(cfg.n2)}</dd><dt>Masses</dt><dd>${fMass(cfg.m1)}, ${fMass(cfg.m2)}</dd><dt>Separation r₀</dt><dd>${fDist(cfg.r0)}</dd><dt>Radial velocity</dt><dd>${fSpd(cfg.vr)}</dd><dt>Tangential velocity</dt><dd>${fSpd(cfg.vt)} = ${(cfg.vt/d.vcirc).toFixed(3)} v_c</dd>`);
  set('xMeas',x.meas(d).map(([l,v])=>`<dt>${l}</dt><dd>${v}</dd>`).join(''));
  const h=cmpRows(d).map(r=>`<tr><td>${r.q}${r.n?`<i>${r.n}</i>`:''}</td><td>${r.th??na}</td><td>${r.me??na}</td><td>${r.diff!=null?(Math.abs(r.diff)<1e-9?'0':r.diff.toPrecision(3))+' %':r.ag==null?'–':r.ag?'agrees':'differs'}</td></tr>`).join('');
  if(h!==lastCmp){lastCmp=h;$('xCmp').tBodies[0].innerHTML=h}}
$('xCtl').addEventListener('input',e=>{const f=(EXPS[xi].so||{})[e.target.id];if(f)$(e.target.id.replace('s','o')).textContent=f(e.target.value)});
$('xCtl').addEventListener('change',e=>{const f=(EXPS[xi].sl||{})[e.target.id];if(f)f(+e.target.value);if(e.target.id==='x4k')x4(Math.min(1,cfg.m2/cfg.m1))});
$('xCtl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ds=b.dataset;
  if(ds.act==='bclr'){bracket.lo=bracket.hi=null;xRefresh(sim.diagCache)}else if(ds.n)go(0,Math.abs(cfg.vt||vc())*(1+ +ds.n));else if(ds.k)go(0,ds.k*vc());
  else if(ds.b){const c={...cfg,[ds.b]:cfg[ds.b]*ds.f},nv=Math.sqrt(G*(c.m1+c.m2)/c.r0);if(!isFinite(nv))return;$('x3c').checked?go(0,nv,c):go(cfg.vr,cfg.vt,c)}
  else if(ds.q)x4(+ds.q);else if(ds.v){const[a,t]=ds.v.split(',').map(Number);go(a*vc(),t*vc())}});
$('xSetup').onclick=()=>{const s=EXPS[xi].setup();go(s.vr,s.vt,s);toast('Suggested setup loaded.')};
for(const[id,k]of[['xObs','obs'],['xConc','conc']])$(id).addEventListener('input',e=>{(notes[xi]=notes[xi]||{})[k]=e.target.value;store.set('notes',notes)});
// lab log
const logRows=[];const COLS=['n','experiment','system','observation','conclusion','body1','body2','m1_kg','m2_kg','r0_m','vr0_m_s','vt0_m_s','inclination_deg','class','eccentricity','eps_J_per_kg','h_m2_per_s','a_m','periapsis_m','apoapsis_m','T_formula_s','T_measured_s','r_min_m','r_max_m','t_sim_s','r_now_m','v_rel_now_m_s','max_abs_dE_rel','steps_per_period','timestep_mode','collided','t_contact_s','comparison'];
const g6=x=>x==null||!isFinite(x)?'':Number(x.toPrecision(8));
$('bRec').onclick=()=>{const d=sim.diag(),e=d.el,cr=cmpRows(d);
  logRows.push({n:logRows.length+1,experiment:EXPS[xi].t,system:expName,observation:$('xObs').value.trim(),conclusion:$('xConc').value.trim(),body1:cfg.n1,body2:cfg.n2,m1_kg:g6(cfg.m1),m2_kg:g6(cfg.m2),r0_m:g6(cfg.r0),vr0_m_s:g6(cfg.vr),vt0_m_s:g6(cfg.vt),inclination_deg:g6(cfg.inc),class:e.label,eccentricity:g6(e.e),eps_J_per_kg:g6(e.eps),h_m2_per_s:g6(e.h),a_m:g6(e.a),periapsis_m:g6(e.rp),apoapsis_m:g6(e.ra),T_formula_s:g6(sim.el0.T),T_measured_s:g6(sim.Tmeas),r_min_m:g6(sim.rMin),r_max_m:g6(sim.rMax),t_sim_s:g6(sim.t),r_now_m:g6(d.r),v_rel_now_m_s:g6(d.v),max_abs_dE_rel:g6(Math.max(sim.maxDrift,Math.abs(d.drift))),steps_per_period:sim.N,timestep_mode:sim.adaptive?'adaptive':'fixed',collided:sim.collided,t_contact_s:g6(sim.hitT),
    comparison:cr.map(r=>`${r.q}: theory ${r.th??'N/A'}, measured ${r.me??'N/A'}${r.diff!=null?`, difference ${r.diff.toPrecision(3)} %`:''}`).join(' | '),cmp:cr});
  drawLog();$('recMsg').textContent=`Recorded as entry ${logRows.length}.`;$('logMsg').textContent=''};
function drawLog(){const s=x=>x===''?'N/A':typeof x==='number'?sci(x,4):esc(x);
  $('log').tBodies[0].innerHTML=logRows.length?logRows.map(r=>`<tr><td>${r.n}</td><td>${esc(r.experiment)}</td><td>${esc(r.system)}</td><td title="${esc(r.observation)}">${esc(r.observation)||'<span class="na">none</span>'}</td><td>${s(r.m1_kg)}</td><td>${s(r.m2_kg)}</td><td>${s(r.r0_m)}</td><td>${s(r.vr0_m_s)}</td><td>${s(r.vt0_m_s)}</td><td>${r.class}</td><td>${s(r.eccentricity)}</td><td>${s(r.T_formula_s)}</td><td>${s(r.T_measured_s)}</td><td>${s(r.r_min_m)}</td><td>${s(r.r_max_m)}</td><td>${s(r.t_sim_s)}</td><td>${s(r.max_abs_dE_rel)}</td></tr>`).join(''):'<tr><td class="empty" colspan="17">No runs recorded. Run an experiment, write your observations and press Record run in log.</td></tr>';
  if(!$('csvOut').hidden)$('csvOut').value=csv()}
const csvLine=a=>a.map(v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',');
const csv=()=>[COLS.join(','),...logRows.map(r=>csvLine(COLS.map(c=>r[c])))].join('\n');
const showCsv=()=>{const t=$('csvOut');t.hidden=false;t.value=csv();t.focus();t.select()};
$('bShow').onclick=()=>{const t=$('csvOut');if(t.hidden)showCsv();else t.hidden=true};
$('bClear').onclick=()=>{logRows.length=0;drawLog();$('logMsg').textContent='Log cleared.'};
async function copyText(txt,ok,el,fb){try{await navigator.clipboard.writeText(txt);el.textContent=ok}catch(e){if(fb)fb();el.textContent='Clipboard blocked.'+(fb?' The text is selected below; copy it with Ctrl/Cmd+C.':'')}}
$('bCopy').onclick=()=>{if(!logRows.length)return $('logMsg').textContent='Nothing to export. Record a run first.';copyText(csv(),`Copied ${logRows.length} row${logRows.length>1?'s':''}.`,$('logMsg'),showCsv)};
let dl=null;try{if(window.claude&&claude.use)claude.use('downloads').then(d=>{if(d){dl=d;$('bDl').hidden=false;$('repDl').hidden=false}}).catch(()=>{})}catch(e){}
async function saveFile(fn,data,el,fb){try{await dl.save({filename:fn,data});el.textContent='Saved.'}catch(e){const c=e&&e.code;el.textContent=c==='declined'?'Save cancelled.':'The download did not go through.';if(c!=='declined'&&fb)fb()}}
$('bDl').onclick=()=>{if(!logRows.length)return $('logMsg').textContent='Nothing to export. Record a run first.';saveFile('two-body-lab-log.csv',csv(),$('logMsg'),showCsv)};

// ───────── velocity sweep ─────────
let xp=null,xpDirty=true,xpSel=null,xpHov=null;const xpKey=()=>[cfg.m1,cfg.m2,cfg.R1,cfg.R2,cfg.r0,cfg.vr].join();
function sweep(){const a=parseNum($('xpMin').value),b=parseNum($('xpMax').value),n=+$('xpN').value;
  if(!(a>=0)||!(b>a)||b>20){$('xpMsg').textContent='Use a range such as 0 to 2, with To larger than From and at most 20.';return}
  const v0=vc(),pts=[],t0=performance.now();
  for(let i=0;i<n;i++){const k=a+(b-a)*i/(n-1),c={...cfg,vt:k*v0},S=new Sim(c,500,true,64),el=S.el0;let st=0;
    while(!S.collided&&!S.failed&&st++<24000&&(el.kind==='bound'&&!el.radial?S.revs<1:S.t<3*S.tref))S.step();
    pts.push({k,vt:c.vt,el,collided:S.collided,eNum:S.collided?null:el.kind==='bound'&&!el.radial?(S.revs>=1?(S.rMax-S.rMin)/(S.rMax+S.rMin):null):S.diag().el.e,drift:S.maxDrift,steps:S.steps})}
  xp={key:xpKey(),a,b,pts,vc:v0,kEsc:Math.sqrt(Math.max(0,2-(cfg.vr/v0)**2)),kCirc:cfg.vr===0?1:null};xpDirty=false;xpSel=null;const cnt=t=>pts.filter(p=>p.el.kind===t).length;
  $('xpMsg').textContent=`${n} runs in ${Math.round(performance.now()-t0)} ms: ${cnt('bound')} bound, ${cnt('para')} parabolic, ${cnt('hyper')} unbound, ${pts.filter(p=>p.collided).length} collided.`;
  $('xpB').innerHTML=`<dt>Circular speed</dt><dd>${fSpd(v0)}</dd><dt>Escape (ε = 0)</dt><dd>${xp.kEsc.toFixed(4)} v_c = ${fSpd(xp.kEsc*v0)}</dd><dt>v_r held at</dt><dd>${fSpd(cfg.vr)}</dd><dt>r₀ held at</dt><dd>${fDist(cfg.r0)}</dd>`;xpInfo(null);xpDraw()}
function xpGeom(c){const w=c.clientWidth,h=c.clientHeight,L=48,R=12,T=22,B=36,eMax=Math.max(1.5,Math.min(60,Math.max(...xp.pts.map(p=>p.el.e))))*1.08;return{w,h,L,T,pw:w-L-R,ph:h-T-B,X:k=>L+(k-xp.a)/(xp.b-xp.a)*(w-L-R),Y:e=>T+(1-Math.min(e,eMax)/eMax)*(h-T-B),eMax}}
function xpDraw(){const c=$('xpCv');if(!xp||!c.clientWidth)return;const g=c.getContext('2d'),q=xpGeom(c),{w,h,L,T,pw,ph,X,Y}=q;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.font='11px "IBM Plex Mono",monospace';g.textBaseline='middle';const xe=Math.max(L,Math.min(L+pw,X(xp.kEsc)));
  g.fillStyle='rgba(90,168,232,.07)';g.fillRect(L,T,xe-L,ph);g.save();g.beginPath();g.rect(xe,T,L+pw-xe,ph);g.clip();g.strokeStyle='rgba(255,122,156,.12)';for(let x=xe-ph;x<L+pw;x+=10){g.beginPath();g.moveTo(x,T+ph);g.lineTo(x+ph,T);g.stroke()}g.restore();
  g.textAlign='center';g.fillStyle='#7fb8e6';if(xe-L>80)g.fillText('bound: ellipse',(L+xe)/2,T+10);g.fillStyle='#f59ab2';if(L+pw-xe>100)g.fillText('unbound: hyperbola',(xe+L+pw)/2,T+10);
  g.strokeStyle='#1e242b';g.fillStyle='#7c8693';g.lineWidth=1;g.textAlign='right';const ys=nice(q.eMax/5);for(let e=0;e<=q.eMax;e+=ys){const y=Math.round(Y(e))+.5;g.beginPath();g.moveTo(L,y);g.lineTo(L+pw,y);g.stroke();g.fillText(String(Number(e.toPrecision(4))),L-6,y)}
  g.textAlign='center';const xs=nice((xp.b-xp.a)/8);for(let k=Math.ceil(xp.a/xs)*xs;k<=xp.b+1e-9;k+=xs)g.fillText(String(Number(k.toPrecision(4))),X(k),T+ph+11);
  g.fillStyle='#5a636e';g.fillText('tangential launch speed / circular speed',L+pw/2,h-6);g.save();g.translate(11,T+ph/2);g.rotate(-Math.PI/2);g.fillText('eccentricity',0,0);g.restore();
  const y1=Math.round(Y(1))+.5;g.strokeStyle='rgba(232,176,74,.5)';g.setLineDash([4,4]);g.beginPath();g.moveTo(L,y1);g.lineTo(L+pw,y1);g.stroke();
  const vline=(k,t,cl)=>{if(k==null||k<xp.a||k>xp.b)return;const x=Math.round(X(k))+.5;g.strokeStyle=cl;g.beginPath();g.moveTo(x,T);g.lineTo(x,T+ph);g.stroke();g.fillStyle=cl;g.textAlign=x>L+pw-150?'right':'left';g.fillText(t,x+(x>L+pw-150?-5:5),T+26)};
  vline(xp.kCirc,'circular','#6fd6a8');vline(xp.kEsc,'escape, e = 1','#e8b04a');g.setLineDash([]);
  const kc=Math.abs(cfg.vt)/xp.vc;if(kc>=xp.a&&kc<=xp.b){const x=Math.round(X(kc))+.5;g.fillStyle='#fff';g.textAlign='center';g.fillText('▲ current',x,T+ph+23)}
  g.beginPath();for(let i=0;i<=400;i++){const k=xp.a+(xp.b-xp.a)*i/400,e=elements(cfg.m1,cfg.m2,cfg.r0,0,cfg.vr,k*xp.vc,cfg.r0).e,x=X(k),y=Y(e);i?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle='#d9dee5';g.lineWidth=1.5;g.stroke();
  xp.pts.forEach((p,i)=>{const x=X(p.k),y=Y(p.eNum??p.el.e),kd=p.el.kind,cl=p.collided?'#f0625d':kd==='bound'?'#5aa8e8':kd==='para'?'#e8b04a':'#f59ab2',s=i===xpSel||i===xpHov?5.5:3.8;
    g.strokeStyle=cl;g.fillStyle=i===xpSel?'#fff':cl;g.lineWidth=1.5;g.beginPath();
    if(p.collided||p.eNum==null){g.moveTo(x-s,y-s);g.lineTo(x+s,y+s);g.moveTo(x+s,y-s);g.lineTo(x-s,y+s);g.stroke()}else if(kd==='bound'){g.arc(x,y,s,0,TAU);g.fill()}
    else if(kd==='para'){g.moveTo(x,y-s-1);g.lineTo(x+s+1,y);g.lineTo(x,y+s+1);g.lineTo(x-s-1,y);g.closePath();g.fill()}else{g.moveTo(x,y-s-1);g.lineTo(x+s,y+s);g.lineTo(x-s,y+s);g.closePath();g.fill()}
    if(i===xpSel||i===xpHov){g.strokeStyle='#fff';g.lineWidth=1;g.beginPath();g.arc(x,y,s+4,0,TAU);g.stroke()}});
  g.textAlign='left';g.fillStyle='#7c8693';g.fillText('line: exact   ● bound  ▲ unbound  ◆ parabolic  ✕ collided or incomplete',L,9)}
function xpNear(e){if(!xp)return null;const q=xpGeom($('xpCv'));let best=null,bd=16;xp.pts.forEach((p,i)=>{const d=Math.abs(q.X(p.k)-e.offsetX);if(d<bd){bd=d;best=i}});return best}
function xpInfo(i){const p=i==null?null:xp.pts[i];$('xpLoad').disabled=!p;
  $('xpInfo').innerHTML=p?`<dt>v_t</dt><dd>${fSpd(p.vt)} (${p.k.toFixed(3)} v_c)</dd><dt>Class</dt><dd>${p.el.label}</dd><dt>e exact</dt><dd>${sci(p.el.e,6)}</dd><dt>e integrated</dt><dd>${p.eNum==null?(p.collided?'collided':'incomplete'):sci(p.eNum,6)}</dd><dt>ε</dt><dd>${sci(p.el.eps)} J/kg</dd><dt>Periapsis</dt><dd>${p.el.radial?'0':fDist(p.el.rp)}</dd><dt>Apoapsis</dt><dd>${p.el.ra==null?'none':fDist(p.el.ra)}</dd><dt>Period</dt><dd>${p.el.T==null?'none':fTime(p.el.T)}</dd><dt>Run</dt><dd>${p.steps.toLocaleString('en-US')} steps, |ΔE| ${p.drift.toExponential(1)}</dd>`:'<dt class="muted">Hover or click a marker.</dt><dd></dd>'}
const xc=$('xpCv');xc.addEventListener('pointermove',e=>{const i=xpNear(e);if(i!==xpHov){xpHov=i;xpInfo(i??xpSel);xpDraw()}});xc.addEventListener('pointerleave',()=>{xpHov=null;xpInfo(xpSel);xpDraw()});
xc.addEventListener('click',e=>{const i=xpNear(e);if(i!=null){xpSel=i;xpInfo(i);xpDraw()}});
xc.addEventListener('keydown',e=>{if(!xp)return;const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();xpSel=Math.max(0,Math.min(xp.pts.length-1,(xpSel??-1)+d));xpInfo(xpSel);xpDraw()}else if(e.key==='Enter'&&xpSel!=null)$('xpLoad').click()});
$('xpRun').onclick=sweep;$('xpLoad').onclick=()=>{const p=xp.pts[xpSel??xpHov];if(!p)return;go(cfg.vr,p.vt);toast(`Loaded v_t = ${fSpd(p.vt)}.`)};
$('xpCsv').onclick=()=>{if(!xp)return;copyText(['vt_m_s,vt_over_vc,class,e_exact,e_integrated,eps_J_per_kg,periapsis_m,apoapsis_m,period_s,collided,max_abs_dE_rel',...xp.pts.map(p=>csvLine([g6(p.vt),g6(p.k),p.el.label,g6(p.el.e),g6(p.eNum),g6(p.el.eps),g6(p.el.rp),g6(p.el.ra),g6(p.el.T),p.collided,g6(p.drift)]))].join('\n'),`Copied ${xp.pts.length} rows.`,$('xpMsg'))};

// ───────── compare and what-if ─────────
function setRef(c,name){ref=c?{cfg:normCfg({...c}),name,sim:null}:null;mkRef();if(ref)syncRef();refSync();legend();view.keep=true;syncKeep();fit();refresh()}
function refSync(){const s=$('refSel'),lib=library();s.innerHTML=`<option value="">${ref?esc(ref.name):'None'}</option>`+SCENARIOS.map(p=>`<option value="s${p.id}">Scenario · ${esc(p.name)}</option>`).join('')+lib.map(l=>`<option value="l${l.id}">Saved · ${esc(l.name)}</option>`).join('');
  for(const id of['refSwap','refClr'])$(id).disabled=!ref;last.cmpBody=null}
$('refSel').onchange=e=>{const v=e.target.value;if(!v)return;if(v[0]==='s'){const s=SC[v.slice(1)];setRef(s.make(s.defOpt||{}),s.name)}else{const l=library().find(x=>'l'+x.id===v);if(l)setRef(l.cfg,l.name)}toast('Reference B set.')};
$('refCur').onclick=()=>{setRef(cfg,expName);toast('Current run stored as reference B.')};$('refClr').onclick=()=>setRef(null);$('refShow').onchange=()=>fit();
$('refSwap').onclick=()=>{if(!ref)return;const a={cfg,name:expName},b=ref;ref={cfg:{...a.cfg},name:a.name,sim:null};writeForm(b.cfg);apply({...b.cfg},{name:b.name});refSync();legend();setRun(true)};
function cmpRefresh(){set('cmpA',esc(expName));set('cmpB',ref?esc(ref.name):'none');const A=sim,B=ref&&ref.sim,rows=[
  ['Classification',S=>S.el0.label],['Eccentricity',S=>S.el0.e,fNum],['Period, formula',S=>S.el0.T,fTime],['Period, measured',S=>S.Tmeas,fTime],['Initial speed',S=>Math.hypot(S.c.vr,S.c.vt),fSpd],['Initial tangential velocity',S=>S.c.vt,fSpd],
  ['Total energy E₀',S=>S.E0,fJ],['Specific energy ε',S=>S.el0.eps,v=>sci(v)+' J/kg'],['Periapsis',S=>S.el0.radial?0:S.el0.rp,fDist],['Apoapsis',S=>S.el0.ra,fDist],['Semi-major axis',S=>S.el0.a,fDist],['Separation now',S=>S.r,fDist],['Largest energy error',S=>S.maxDrift,v=>v.toExponential(1)]];
  const cell=(S,g,f)=>{if(!S)return na;const v=g(S);return v==null||(typeof v==='number'&&!isFinite(v))?na:f?f(v):v};
  set('cmpBody',rows.map(([l,g,f])=>{const a=g(A),b=B?g(B):null,num=typeof a==='number'&&typeof b==='number'&&isFinite(a)&&isFinite(b);return`<tr><td>${l}</td><td>${cell(A,g,f)}</td><td>${cell(B,g,f)}</td><td>${num&&a!==0?(a===b?'same':'×'+sci(b/a,4)):!B?'–':!f&&a===b?'same':'–'}</td></tr>`}).join('')+(B?'':'<tr><td class="empty" colspan="4">No reference. Choose one above, or press Use current as B and then change a parameter.</td></tr>'))}
function wiSync(){if(!cfg)return;const p=$('wiP').value;$('wiU').textContent=PUNIT[p];if(document.activeElement!==$('wiV'))$('wiV').value=fIn(cfg[p]);$('wiMsg').textContent=''}
$('wiP').onchange=()=>{$('wiV').value=fIn(cfg[$('wiP').value]);wiSync()};
$('wiF').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=$('wiP').value,f=+b.dataset.f;$('wiV').value=fIn(f?cfg[p]*f:cfg[p]);$('wiMsg').textContent=f&&cfg[p]===0?'The current value is zero; type a value instead.':''});
$('wiRun').onclick=()=>{const p=$('wiP').value,v=parseNum($('wiV').value),c={...cfg,[p]:v},errs=validate(c);
  if(!isFinite(v))return $('wiMsg').textContent='Enter a number, for example 3.2e4.';if(Object.keys(errs).length)return $('wiMsg').textContent=Object.values(errs)[0]+'.';if(v===cfg[p])return $('wiMsg').textContent='That is the current value.';
  ref={cfg:{...cfg},name:expName+' (original)',sim:null};writeForm(c);apply(c,{name:`What-if: ${PLABEL[p].toLowerCase()} ${sci(v)} ${PUNIT[p]}`});refSync();legend();setRun(true);toast('What-if running. A is modified, B is the original.')};

// ───────── saved experiments ─────────
let memLib=[];
const library=()=>{const l=storeOK?store.get('lib',memLib):memLib;return Array.isArray(l)?l.filter(x=>x&&x.id&&x.cfg&&!Object.keys(validate(normCfg(x.cfg))).length):[]};
const libWrite=l=>{memLib=l;store.set('lib',l)};
function libSave(name){const l=library();if(l.length>=12){toast('The library holds 12 experiments. Delete one first.');return false}
  l.unshift({id:Date.now().toString(36)+Math.floor(Math.random()*1e4),name:(name||expName||'Experiment').slice(0,60),cfg:{...cfg},scn:scn.id,opt:scnOpt});libWrite(l);libRender();refSync();return true}
$('libSave').onclick=()=>{if(libSave($('libName').value.trim())){$('libName').value='';$('libMsg').textContent='Saved.'}};
$('bSaveQ').onclick=()=>{const c=readForm();if(!c)return;if(!sameCfg(c,cfg)){apply(c);setRun(running)}if(libSave())toast('Saved. Open it from Saved in the lower panel.')};
function libRender(){const l=library();$('libLead').textContent=`Up to 12 configurations, stored ${storeOK?'in this browser':'for this visit only (this browser blocks storage)'}. Edit a title to rename. ${l.length} of 12 used.`;
  $('libList').innerHTML=l.length?'<div class="libgrid">'+l.map(x=>{const c=normCfg(x.cfg),S=new Sim(c,500,true,64).el0;return`<div class="lib" data-id="${x.id}"><input type="text" value="${esc(x.name)}" maxlength="60" aria-label="Name"><div class="meta">${esc(c.n1)} + ${esc(c.n2)} · ${S.label}, e ${sci(S.e,3)}<br>r₀ ${fDist(c.r0)} · v_t ${fSpd(c.vt)}${c.inc?` · i ${c.inc}°`:''}</div><div class="row"><button class="btn sm pri" data-a="load">Load</button><button class="btn sm" data-a="cmp">Compare as B</button><button class="btn sm danger" data-a="del">Delete</button></div></div>`}).join('')+'</div>'
   :'<p class="muted" style="margin-top:12px">Nothing saved yet. Set up a run and press Save current.</p>'}
$('libList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.closest('.lib').dataset.id,l=library(),x=l.find(y=>y.id===id);if(!x)return;
  if(b.dataset.a==='load'){if(x.scn&&SC[x.scn]){scn=SC[x.scn];scnOpt=x.opt||scn.defOpt||{};scnBase=normCfg(scn.make(scnOpt));renderScn()}writeForm(normCfg(x.cfg));apply(normCfg(x.cfg),{name:x.name});setRun(true);toast(`Loaded ${x.name}.`)}
  else if(b.dataset.a==='cmp'){setRef(x.cfg,x.name);showDTab('compare')}else{libWrite(l.filter(y=>y.id!==id));libRender();refSync();toast(`Deleted ${x.name}.`)}});
$('libList').addEventListener('change',e=>{if(e.target.tagName!=='INPUT')return;const id=e.target.closest('.lib').dataset.id,l=library(),x=l.find(y=>y.id===id);if(!x)return;x.name=e.target.value.trim().slice(0,60)||x.name;e.target.value=x.name;libWrite(l);refSync();$('libMsg').textContent='Renamed.'});

// ───────── report ─────────
const PAPER_CSS=`.paper{font:13.5px/1.5 Georgia,"Times New Roman",serif;color:#1c1f26;max-width:820px;margin:0 auto}.paper h1{font-size:22px;margin:0 0 2px;font-weight:400}.paper h2{font:600 12.5px/1.3 system-ui,sans-serif;color:#4a5164;border-bottom:1px solid #c9c5b8;padding-bottom:3px;margin:18px 0 6px}.paper h3{font-size:15px;margin:14px 0 4px;font-weight:600}.paper p{margin:0 0 6px}.paper .meta{color:#5a6071;font:12px system-ui,sans-serif}.paper table{border-collapse:collapse;width:100%;font:12px system-ui,sans-serif;margin:4px 0 8px}.paper th,.paper td{border:0;border-bottom:1px solid #dcd8cc;padding:4px 7px;text-align:right;background:none;color:#1c1f26;font-family:system-ui,sans-serif;font-size:12px}.paper th{font-weight:600;color:#4a5164}.paper td:first-child,.paper th:first-child{text-align:left}.paper .q{border-left:3px solid #c9c5b8;padding:2px 0 2px 10px;margin:4px 0 8px;white-space:pre-wrap}.paper .none{color:#8a8f9c;font-style:italic}`;
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:PAPER_CSS}));
function reportBody(){const d=sim.diag(),e0=sim.el0,v=x=>x==null||(typeof x==='number'&&!isFinite(x))?'N/A':x,row=(a,...b)=>`<tr><td>${a}</td>${b.map(x=>`<td>${v(x)}</td>`).join('')}</tr>`,pl=effPlane(cfg,e0.h),E=isEarth()&&isCentral();
  let h=`<h1>Two-Body Dynamics Lab: experiment report</h1><p class="meta">${esc(expName)} · ${esc(new Date().toLocaleString())} · Newtonian point masses, Velocity Verlet, G = 6.67430×10⁻¹¹ m³ kg⁻¹ s⁻²</p>
  <h2>System and initial conditions</h2><table><tr><th></th><th>${esc(cfg.n1)}</th><th>${esc(cfg.n2)}</th></tr>${row('Mass',sci(cfg.m1)+' kg',sci(cfg.m2)+' kg')}${row('Radius',sci(cfg.R1)+' m',sci(cfg.R2)+' m')}</table>
  <table>${row('Initial separation r₀',`${sci(cfg.r0)} m (${fDist(cfg.r0)})`)}${E?row('Initial altitude',fDist(cfg.r0-REQ)):''}${row('Radial velocity',`${sci(cfg.vr)} m/s`)}${row('Tangential velocity',`${sci(cfg.vt)} m/s`)}${row('Inclination, node',`${(pl.i/D2R).toFixed(3)}°, ${cfg.raan}°`)}${row('Circular velocity at r₀',fSpd(d.vcirc))}${row('Escape velocity at r₀',fSpd(d.vesc))}</table>
  <h2>Orbit from the initial conditions</h2><table>${row('Classification',e0.label)}${row('Eccentricity',sci(e0.e,6))}${row('Specific orbital energy',sci(e0.eps)+' J/kg')}${row('Semi-major axis',e0.a==null?null:fDist(e0.a))}${row('Periapsis',e0.radial?'0 (radial)':fDist(e0.rp)+(E?` (altitude ${fDist(e0.rp-REQ)})`:''))}${row('Apoapsis',e0.ra==null?null:fDist(e0.ra)+(E?` (altitude ${fDist(e0.ra-REQ)})`:''))}${row('Period, formula',e0.T==null?null:fTime(e0.T))}${E?row('Earth-orbit classification',earthChecks(cfg,e0).verdict):''}</table>
  <h2>Integration at the time of this report</h2><table>${row('Simulation time',fTime(sim.t))}${row('Steps',sim.steps.toLocaleString('en-US'))}${row('Timestep',sim.adaptive?'adaptive, time-symmetric':'fixed')}${row('Resolution',sim.N+' steps per period')}${row('Period, measured',sim.Tmeas==null?null:fTime(sim.Tmeas))}${row('Smallest separation',fDist(sim.rMin))}${row('Largest separation',fDist(sim.rMax))}${row('Largest energy error',Math.max(sim.maxDrift,Math.abs(d.drift)).toExponential(2))}${row('Outcome',sim.collided?`collision at ${fTime(sim.hitT)}, ${fSpd(sim.hitV)}`:'no collision')}${ms&&ms.burns.length?row('Burns',ms.burns.map(b=>`${b.label} ${fSpd(b.dv)} at ${fTime(b.t)}`).join('; ')):''}${j2Active()?row('Extended model','J2 secular drift applied to plane geometry and node readouts'):''}</table>`;
  if(ref){const B=ref.sim,b=B.el0;h+=`<h2>Comparison</h2><table><tr><th></th><th>A · ${esc(expName)}</th><th>B · ${esc(ref.name)}</th></tr>${row('Classification',e0.label,b.label)}${row('Eccentricity',sci(e0.e,6),sci(b.e,6))}${row('Period',e0.T==null?null:fTime(e0.T),b.T==null?null:fTime(b.T))}${row('Initial speed',fSpd(Math.hypot(cfg.vr,cfg.vt)),fSpd(Math.hypot(ref.cfg.vr,ref.cfg.vt)))}${row('Total energy',fJ(sim.E0),fJ(B.E0))}${row('Periapsis',e0.radial?'0':fDist(e0.rp),b.radial?'0':fDist(b.rp))}</table>`}
  h+='<h2>Lab log</h2>';if(!logRows.length)h+='<p class="none">No runs recorded.</p>';
  for(const r of logRows)h+=`<h3>Entry ${r.n}: ${esc(r.experiment)}</h3><p class="meta">${esc(r.system)} · ${esc(r.class)}, e = ${v(r.eccentricity)} · v_t = ${v(r.vt0_m_s)} m/s · t = ${r.t_sim_s===''?'N/A':fTime(r.t_sim_s)} · max |ΔE| = ${v(r.max_abs_dE_rel)}</p><table><tr><th>Quantity</th><th>Theory</th><th>Measured</th><th>Difference</th></tr>${r.cmp.map(c=>row(c.q,c.th,c.me,c.diff!=null?c.diff.toPrecision(3)+' %':c.ag==null?'–':c.ag?'agrees':'differs')).join('')}</table><p><b>Observations.</b></p><p class="q${r.observation?'':' none'}">${esc(r.observation)||'None written.'}</p><p><b>Conclusion.</b></p><p class="q${r.conclusion?'':' none'}">${esc(r.conclusion)||'None written.'}</p>`;
  return h+'<h2>Model limits</h2><p>Planar point-mass Newtonian gravity, no third bodies, drag or relativity. Second-order integration; energy is conserved only approximately and the measured error is reported above.</p>'}
function report(){$('paper').innerHTML=reportBody();$('repMsg').textContent=''}
$('repRefresh').onclick=()=>{report();$('repMsg').textContent='Updated.'};$('repCopy').onclick=()=>{report();copyText($('paper').innerText,'Copied as plain text.',$('repMsg'))};
$('repDl').onclick=()=>{report();saveFile('two-body-lab-report.html','<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Two-Body Dynamics Lab report</title><style>body{margin:32px;background:#fff}'+PAPER_CSS+'</style></head><body><div class="paper">'+reportBody()+'</div></body></html>',$('repMsg'))};

// ───────── tour and first-visit hint ─────────
const TOUR=[['scnBtn','Scenarios','Choose a system by category. Each loads real parameters and stays editable.'],['view','Orbit view','Solid line: the computed path. Dashed: the predicted Kepler orbit. Drag to pan, scroll to zoom, click a body for details.'],
  ['tools','Playback','Play, step and reset. Speed changes how fast you watch, not the physics. The ΔE indicator reports the numerical energy error.'],['side','Side panel','Scenario notes, initial conditions, live orbital elements and display options.'],['dock','Analysis','Diagnostics, graphs, guided experiments, velocity sweeps, comparisons, saved runs and a report.']];
let tourI=-1;
function tourPlace(){if(tourI<0)return;const t=$(TOUR[tourI][0]),r=t.getBoundingClientRect(),hole=$('tourHole'),c=$('tourCard'),p=4;
  hole.style.left=r.left-p+'px';hole.style.top=r.top-p+'px';hole.style.width=r.width+2*p+'px';hole.style.height=r.height+2*p+'px';
  const cw=c.offsetWidth,ch=c.offsetHeight;let x=r.right+12,y=r.top;if(x+cw>innerWidth-10){x=r.left-cw-12;if(x<10){x=Math.max(10,Math.min(innerWidth-cw-10,r.left+r.width/2-cw/2));y=r.bottom+12;if(y+ch>innerHeight-10)y=Math.max(10,r.top-ch-12)}}
  c.style.left=x+'px';c.style.top=Math.max(10,Math.min(innerHeight-ch-10,y))+'px'}
function tourGo(i){tourI=i;const[id,t,p]=TOUR[i];$('tour').hidden=false;$('tourN').textContent=`${i+1} of ${TOUR.length}`;$('tourT').textContent=t;$('tourP').textContent=p;$('tourBack').disabled=i===0;$('tourNext').textContent=i===TOUR.length-1?'Finish':'Next';
  $(id).scrollIntoView({block:'nearest'});tourPlace();setTimeout(tourPlace,60);$('tourNext').focus({preventScroll:true})}
function tourEnd(){tourI=-1;$('tour').hidden=true;hintOff()}
function hintOff(){$('hint').hidden=true;store.set('seen',1)}
$('bTour').onclick=()=>{closePops();tourGo(0)};$('hintTour').onclick=()=>{hintOff();tourGo(0)};$('hintX').onclick=hintOff;
$('tourNext').onclick=()=>tourI>=TOUR.length-1?tourEnd():tourGo(tourI+1);$('tourBack').onclick=()=>tourGo(Math.max(0,tourI-1));$('tourSkip').onclick=tourEnd;
addEventListener('resize',tourPlace);addEventListener('scroll',tourPlace,true);

// ───────── main loop ─────────
let lastT=0;
function frame(now){requestAnimationFrame(frame);const dtR=Math.min(.05,(now-lastT)/1000||0);lastT=now;
  if(running){accT+=rate()*dtR;const t0=performance.now();let n=0;lag=false;while(accT>0&&!sim.collided&&!sim.failed){adv();accT-=sim.lastDt;if(++n%256===0&&performance.now()-t0>11){accT=0;lag=true;break}}syncRef();if(sim.collided||sim.failed)setRun(false)}
  camTick();
  if(view.follow){const[ox,oy]=frameOf(sim).o,i=view.follow==='b1'?0:1;view.x=(i?sim.x2:sim.x1)-ox;view.y=(i?sim.y2:sim.y1)-oy}
  else if(view.keep&&running&&!view.anim){const[ox,oy]=frameOf(sim).o;let it=0;const out=()=>{for(const[x,y]of[[sim.x1-ox,sim.y1-oy],[sim.x2-ox,sim.y2-oy]]){const sx=W/2+(x-view.x)*view.k,sy=Hh/2-(y-view.y)*view.k;if(sx<40||sx>W-40||sy<70||sy>Hh-50)return true}return false};while(out()&&it++<12)zoomAt(.985)}
  draw();if(VO.inset&&frameNo%2===0)drawInset();
  if(++frameNo%6===0||!sim.diagCache)refresh()}
if(innerWidth<640)$('legend').open=false;
drawLog();xShow(0);scnMenu();showSTab('scn');showDTab(DTABS.some(t=>t[0]===store.get('dtab','diag'))?store.get('dtab','diag'):'diag');
loadScenario('sun-earth',null,{run:!calm});syncView();chips();refSync();
if(!store.get('seen',0))$('hint').hidden=false;
requestAnimationFrame(frame);

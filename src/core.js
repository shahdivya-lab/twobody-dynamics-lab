// ───────── Physics core: no DOM. Everything in SI. Two-body Newtonian gravity, Velocity Verlet. ─────────
const G=6.6743e-11,TAU=2*Math.PI,EPS_TOL=5e-5,H_TOL=1e-6,CIRC_TOL=1e-4;
const SV=['x1','y1','vx1','vy1','x2','y2','vx2','vy2','ax1','ay1','ax2','ay2','rx','ry','r','t','steps'];
// Osculating elements of the relative orbit r = r2 - r1, v = v2 - v1. r0 sets the scale for tolerances.
function elements(m1,m2,rx,ry,vx,vy,r0){
  const mu=G*(m1+m2),r=Math.hypot(rx,ry),v2=vx*vx+vy*vy,eps=v2/2-mu/r,h=rx*vy-ry*vx,rv=rx*vx+ry*vy;
  const ex=((v2-mu/r)*rx-rv*vx)/mu,ey=((v2-mu/r)*ry-rv*vy)/mu,e=Math.hypot(ex,ey),p=h*h/mu;
  const epsN=eps*r0/mu,radial=Math.abs(h)/Math.sqrt(mu*r0)<H_TOL;
  const kind=epsN<-EPS_TOL?'bound':epsN>EPS_TOL?'hyper':'para';
  const a=kind==='para'?null:-mu/(2*eps);
  const rp=radial?0:p/(1+e),ra=kind==='bound'?a*(1+e):null,T=kind==='bound'?TAU*Math.sqrt(a*a*a/mu):null;
  let label;
  if(radial)label=kind==='bound'?'Radial, bound':kind==='para'?'Radial, parabolic':'Radial, unbound';
  else label=kind==='bound'?(e<CIRC_TOL?'Circular':'Elliptical'):kind==='para'?'Parabolic':'Hyperbolic';
  return{mu,r,v:Math.sqrt(v2),eps,h,e,ex,ey,p,a,rp,ra,T,kind,radial,label,epsN,w:Math.atan2(ey,ex),dx:rx/r,dy:ry/r};
}
// Point on the analytic relative conic at true anomaly nu (focus at the origin).
function conicPt(el,nu){const r=el.p/(1+el.e*Math.cos(nu));return[r*Math.cos(nu+el.w),r*Math.sin(nu+el.w)]}
// Largest |nu| to draw: pi for closed orbits, otherwise where r reaches rmax.
function conicLimit(el,rmax){if(el.kind==='bound'&&el.e<1)return Math.PI;return Math.acos(Math.max(-1,Math.min(1,(el.p/rmax-1)/el.e)))}
class Sim{
  constructor(c,N,adaptive,cap){
    const M=c.m1+c.m2,th=c.th*Math.PI/180,cx=Math.cos(th),sy=Math.sin(th);
    const rx=c.r0*cx,ry=c.r0*sy,vx=c.vr*cx-c.vt*sy,vy=c.vr*sy+c.vt*cx,f1=-c.m2/M,f2=c.m1/M;
    Object.assign(this,{c,M,mu:G*M,t:0,steps:0,lastDt:0,collided:false,failed:false,
      x1:f1*rx,y1:f1*ry,vx1:f1*vx,vy1:f1*vy,x2:f2*rx,y2:f2*ry,vx2:f2*vx,vy2:f2*vy,
      swept:0,revs:0,lastCross:0,Tmeas:null,rMin:c.r0,rMax:c.r0,maxDrift:0,hitT:null,hitV:null});
    this.acc();
    this.el0=elements(c.m1,c.m2,rx,ry,vx,vy,c.r0);
    const dyn=TAU*Math.sqrt(c.r0**3/this.mu),T=this.el0.T;
    this.tref=T&&T<1e3*dyn?T:dyn;
    const e=this.energy();this.E0=e.E;this.U0=e.U;
    this.Eref=Math.abs(e.E)>1e-6*Math.abs(e.U)?Math.abs(e.E):Math.abs(e.U);
    this.L0=this.angmom();this.Lscale=c.m1*c.m2/M*Math.sqrt(this.mu*c.r0);
    this.setRes(N,adaptive);
    cap=this.cap=cap||8000;this.n=0;this.start=0; // sample buffer for trails and graphs; does not affect the integration
    for(const k of['bt','b1x','b1y','b2x','b2y','b1u','b1w','b2u','b2w','br','bv','bd'])this[k]=new Float64Array(cap);
    this.sx=rx;this.sy=ry;this.st=0;this.sample();
  }
  setRes(N,adaptive){this.N=N;this.adaptive=adaptive;this.dtFixed=this.tref/N}
  acc(){ // Newton: equal and opposite forces along the line of centres; each body's acceleration computed separately
    const dx=this.x2-this.x1,dy=this.y2-this.y1,r2=dx*dx+dy*dy,r=Math.sqrt(r2),k=G/(r2*r);
    this.rx=dx;this.ry=dy;this.r=r;
    this.ax1=k*this.c.m2*dx;this.ay1=k*this.c.m2*dy;this.ax2=-k*this.c.m1*dx;this.ay2=-k*this.c.m1*dy;
  }
  energy(){const c=this.c,K=.5*c.m1*(this.vx1**2+this.vy1**2)+.5*c.m2*(this.vx2**2+this.vy2**2),U=-G*c.m1*c.m2/this.r;return{K,U,E:K+U}}
  angmom(){const c=this.c;return c.m1*(this.x1*this.vy1-this.y1*this.vx1)+c.m2*(this.x2*this.vy2-this.y2*this.vx2)}
  sample(){
    const i=(this.start+this.n)%this.cap;
    if(this.n<this.cap)this.n++;else this.start=(this.start+1)%this.cap;
    const d=(this.energy().E-this.E0)/this.Eref;if(Math.abs(d)>this.maxDrift)this.maxDrift=Math.abs(d);
    this.b1u[i]=this.vx1;this.b1w[i]=this.vy1;this.b2u[i]=this.vx2;this.b2w[i]=this.vy2;
    this.bt[i]=this.t;this.b1x[i]=this.x1;this.b1y[i]=this.y1;this.b2x[i]=this.x2;this.b2y[i]=this.y2;
    this.br[i]=this.r;this.bv[i]=Math.hypot(this.vx2-this.vx1,this.vy2-this.vy1);this.bd[i]=d;
    this.sx=this.rx;this.sy=this.ry;this.st=this.t;
  }
  vv(dt){ // Velocity Verlet: half kick, drift, new forces, half kick
    const h=dt/2;
    this.vx1+=this.ax1*h;this.vy1+=this.ay1*h;this.vx2+=this.ax2*h;this.vy2+=this.ay2*h;
    this.x1+=this.vx1*dt;this.y1+=this.vy1*dt;this.x2+=this.vx2*dt;this.y2+=this.vy2*dt;
    this.acc();
    this.vx1+=this.ax1*h;this.vy1+=this.ay1*h;this.vx2+=this.ax2*h;this.vy2+=this.ay2*h;
  }
  save(){const o={};for(const k of SV)o[k]=this[k];return o}
  step(dtSub){
    if(this.collided||this.failed)return;
    const tau=r=>TAU*Math.sqrt(r*r*r/this.mu)/this.N,l0=tau(this.r),base=Math.min(this.dtFixed,l0);
    const px=this.rx,py=this.ry,sv=this.save();
    let dt=dtSub||this.dtFixed;
    if(!dtSub&&this.adaptive){ // time-symmetric step: dt is the mean of the local timescale at both ends of the step.
      dt=base;               // Two fixed-point passes make the choice reversible, which removes secular energy drift.
      for(let i=0;i<2;i++){this.vv(dt);const l1=tau(this.r);Object.assign(this,sv);dt=Math.min(this.dtFixed,(l0+(isFinite(l1)?l1:l0))/2)}
    }
    this.vv(dt);this.t+=dt;this.steps++;this.lastDt=dt;
    const rx=this.rx,ry=this.ry,r=this.r;
    if(!isFinite(r)||!isFinite(this.vx1)){this.failed=true;return}
    // collision: true radii, including a pass through contact distance within the step
    const Rs=this.c.R1+this.c.R2;let hit=r<Rs;
    if(!hit){const dx=rx-px,dy=ry-py,L=dx*dx+dy*dy;if(L>0){const u=-(px*dx+py*dy)/L;if(u>0&&u<1){const qx=px+u*dx,qy=py+u*dy;hit=qx*qx+qy*qy<Rs*Rs}}}
    if(hit&&dt>1e-4*base){ // undo and approach the contact point with shorter steps, so contact time and speed are resolved
      Object.assign(this,sv);return this.step(dt/4)}
    // swept angle gives a measured period, independent of the analytic one
    const d=Math.atan2(px*ry-py*rx,px*rx+py*ry);this.swept+=d;
    const k=Math.floor(Math.abs(this.swept)/TAU);
    if(k>this.revs){const tc=this.t-dt*(Math.abs(this.swept)-k*TAU)/Math.abs(d);this.Tmeas=tc-this.lastCross;this.lastCross=tc;this.revs=k}
    if(r<this.rMin)this.rMin=r;if(r>this.rMax)this.rMax=r;
    if(hit){this.collided=true;this.hitT=this.t;this.hitV=Math.hypot(this.vx2-this.vx1,this.vy2-this.vy1);this.sample();return}
    const mx=rx-this.sx,my=ry-this.sy;
    if(mx*mx+my*my>9e-6*r*r||this.t-this.st>this.tref/250)this.sample();
  }
  diag(){
    const c=this.c,vx=this.vx2-this.vx1,vy=this.vy2-this.vy1,el=elements(c.m1,c.m2,this.rx,this.ry,vx,vy,c.r0),en=this.energy(),L=this.angmom();
    const px=c.m1*this.vx1+c.m2*this.vx2,py=c.m1*this.vy1+c.m2*this.vy2,red=c.m1*c.m2/this.M;
    return{el,...en,L,r:this.r,v:el.v,v1:Math.hypot(this.vx1,this.vy1),v2:Math.hypot(this.vx2,this.vy2),
      comx:(c.m1*this.x1+c.m2*this.x2)/this.M,comy:(c.m1*this.y1+c.m2*this.y2)/this.M,
      P:Math.hypot(px,py),Prel:Math.hypot(px,py)/(red*Math.max(el.v,Math.sqrt(this.mu/c.r0))),
      drift:(en.E-this.E0)/this.Eref,Ldrift:(L-this.L0)/Math.max(Math.abs(this.L0),1e-6*this.Lscale),
      F:G*c.m1*c.m2/(this.r*this.r),a1:Math.hypot(this.ax1,this.ay1),a2:Math.hypot(this.ax2,this.ay2),
      d1:Math.hypot(this.x1,this.y1),d2:Math.hypot(this.x2,this.y2),vesc:Math.sqrt(2*this.mu/c.r0),vcirc:Math.sqrt(this.mu/c.r0)};
  }
}
if(typeof module!=='undefined')module.exports={G,TAU,elements,conicPt,conicLimit,Sim,CIRC_TOL};

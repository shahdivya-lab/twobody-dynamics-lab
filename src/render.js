// ───────── Body appearance: procedural textures and an orthographic sphere shader ─────────
// Purely visual. Nothing here reads or writes the simulation state.
const Art=(()=>{
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const hex=h=>{const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]};
function h2(x,y,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s+1,1274126177);h=Math.imul(h^(h>>>13),1103515245);return((h^(h>>>16))>>>0)/4294967296}
function vn(x,y,P,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),x0=((xi%P)+P)%P,x1=(x0+1)%P;
  const a=h2(x0,yi,s),b=h2(x1,yi,s),c=h2(x0,yi+1,s),d=h2(x1,yi+1,s);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy}
function fbm(u,v,P,oct,s){let t=0,A=.5,f=1,n=0;for(let i=0;i<oct;i++){t+=A*vn(u*P*f,v*P*f*.5,P*f,s+i*17);n+=A;A*=.5;f*=2}return t/n}
let seed=7;const rnd=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;

// Simplified coastlines (lon, lat pairs). Coarse by design; enough for a recognisable globe.
const LAND=[
 [-168,66,-162,70,-150,71,-140,70,-128,70,-115,68,-100,68,-95,72,-85,70,-82,66,-88,64,-94,60,-92,57,-85,55,-80,52,-79,57,-77,62,-72,62,-65,60,-61,56,-56,52,-60,47,-65,44,-70,42,-74,40,-76,37,-76,35,-80,32,-81,28,-80,25,-82,27,-83,30,-87,30,-90,29,-94,29,-97,27,-98,22,-96,19,-91,19,-87,21,-88,16,-84,15,-83,11,-80,9,-77,8,-80,7,-84,9,-86,12,-92,14,-96,16,-105,20,-109,24,-112,28,-115,30,-117,32,-121,35,-124,40,-124,46,-124,49,-128,51,-133,55,-137,58,-142,60,-148,60,-152,58,-158,56,-163,55,-158,58,-162,60,-165,62],
 [-73,78,-60,82,-40,83,-22,82,-18,77,-20,70,-25,68,-32,66,-40,63,-43,60,-48,61,-52,64,-54,67,-56,71,-60,75,-68,77],
 [-62,67,-65,63,-72,62.5,-78,64,-74,68,-80,70,-80,73.5,-70,73,-67,69],[-80,77,-62,82,-75,83,-92,81,-90,78],[-118,69,-101,68,-101,71,-110,73,-118,72],
 [-77,8,-72,12,-64,11,-60,8,-52,5,-50,0,-44,-2,-38,-4,-35,-7,-37,-12,-39,-16,-41,-22,-45,-24,-48,-27,-51,-31,-55,-35,-58,-38,-62,-39,-65,-42,-66,-47,-69,-51,-68,-55,-72,-54,-75,-50,-74,-44,-73,-38,-71,-30,-70,-20,-75,-15,-78,-10,-81,-5,-80,-1,-78,3],
 [-85,22,-82,23,-77,22,-74,20,-78,20,-81,21.7],[-74.5,18.4,-72,19.9,-69,19.6,-68.3,18.4,-71,17.8],
 [-9,37,-8.9,38.7,-9.5,39.5,-8.8,42,-9.2,43.2,-8,43.7,-1.8,43.4,-1.2,46,-2.5,47.3,-4.6,48.4,-1.6,48.7,-1,49.4,1.6,50.9,3.5,51.4,4.7,52.9,7,53.5,8.6,53.9,8.4,55.5,8.1,56.8,7,58,5,59,5,61.5,8,63,12,65,14,67.5,18,69.8,25,71,30,69.8,33,69,34,66,37,64,40,64.5,42,66.5,44,68,54,68.5,60,69.5,66,69,68,72.5,72,72.8,80,73.5,88,75.5,97,75.5,104,77.7,110,76.7,113,73.7,125,73.5,130,71,140,72.5,150,71.5,160,70,170,70,180,68.5,180,65,178,63,173,61.5,170,60,165,62,160,60.3,163,58,162.5,56.5,160,53,156.7,51,155.6,57.5,150,59.5,143,59.3,140.5,58,137,54,141,52.5,140,48,135,43.5,130,42.5,129,36,126,35,127,38,125,40,121,40,122,37,119.5,35,121,32,122,29.5,120,26,117,23.5,113.5,22.2,110,21,108.5,21.6,106.5,20.5,105.7,18.8,108.5,15.5,109.2,12,107,10.5,105,8.6,103.5,10.5,100.5,13.5,99.5,10,100.3,6.5,103.5,1.5,101,3,100.3,4,98.5,8,98.5,13.5,97.6,16.5,94.5,16,94,19.5,92.3,21,90,22,87,21.5,85,19.5,80,15.5,80,10,78,8.5,77,8,75,12,73,18,72.5,21,69,22,67,25,62,25,57,26,56,24,59,22,55,17,52,16,45,13,43,13,43,15,39,21,35,28,34.5,29.5,32.5,30,35,33,36,36,32,36.5,28,36.8,26.5,39,26,40.5,23,40.5,24,38,22,36.5,21,38.5,19.5,40,19,42,16,43.5,13.5,45.6,12.3,45.3,12.3,44.2,13.6,43.5,15.2,41.9,16.2,41.1,18.5,40.2,17,39,16.6,38.4,15.7,38,15.8,39.6,14.9,40.3,12.5,41.4,10.5,43,8.5,44.3,7,43.6,4.5,43.4,3.2,43,3.2,41.9,.8,41,0,39.8,-.5,38.4,-2,36.8,-4.5,36.7,-6,36.2,-7,37.1],
 [-180,65,-172,64.5,-170,66,-175,67.5,-180,68.5],
 [-17,21,-16,26,-13,28,-10,30,-9,33,-6,35.8,-2,35,3,36.8,10,37,11,35,10,34,15,32,20,31,20,32.5,25,32,29,31,32,31.3,32.5,30,34,27,36,22,38,18,39,16,43,12,45,10.5,51,11.8,51,10,48,5,42,-1,40,-5,39,-8,40,-11,40,-15,37,-18,35,-21,35,-24,33,-26,32,-29,30,-31,27,-33.5,22,-34,18.5,-34,18,-31,16,-28,15,-26,12,-18,12,-14,13,-9,12,-5,9,-1,9,4,6,4.3,4,6.3,1,6,-3,5,-7,4.4,-11,6.5,-13,8,-15,11,-17,14,-17,18],
 [49,-12,50,-15.5,47.5,-25,45,-25,43.5,-22,44.5,-16,47,-14],
 [-5.7,50,1.4,51.2,1.7,52.7,0,53.5,-.5,54.5,-2,55.9,-1.8,57.6,-3,58.6,-5,58.6,-6.2,56.8,-5.6,55.3,-4.8,54.8,-3,54,-3,53.3,-4.6,53.3,-4.2,52.3,-5.2,51.7,-3.4,51.4,-4.8,51.2],
 [-6,52.2,-6,54,-7.3,55.3,-8.5,54.6,-10,53.6,-9.8,51.7,-8,51.6],[-22.5,63.8,-24,65.5,-22,66.4,-16,66.5,-13.5,65,-15,64.2,-18.7,63.4],
 [130,31,132,33.8,135,33.7,137,34.6,140,35,141,38,142,40.5,141.5,41.5,143.5,42,145.5,43.3,144,44.4,141.7,45.4,140,42.5,140,40,139.5,38.4,137,37,133,35.5,130.9,34,129.7,33.2],
 [120,18.5,122.2,18.5,122,14,124,12.5,126.5,7,125,6,122,7,122.8,10,121,13.5,120,16],[109,1.5,110,-2,114,-4,116,-3.8,118,1,119,5,117,7,115.5,5,113,3,111,2],
 [95.3,5.6,98,4,102,0,104,-2,106,-6,102,-4,100,-1,98,2,95.5,3.5],[105.5,-6.5,108,-6.5,112.5,-6.8,114.5,-7.8,110,-8.1,106,-7.5],[119.5,1,125,1.5,121,-1,123,-5.5,120,-5.5,120.5,-1.5],
 [131,-1,135,-3.5,138,-1.6,141,-2.6,145,-4.5,147.5,-6,147,-8.5,143,-9,141,-9,138,-8.4,137,-5,133,-4,132,-2.5],
 [114,-22,113.5,-26,115,-34,118,-35,123,-34,129,-31.6,134,-32.5,137.5,-35.5,140,-38,144,-38.5,147,-38,150,-37.5,150.8,-34.5,153,-31,153.5,-28,153,-25,150,-22,146,-19,145.5,-15,143.5,-14,142.5,-10.7,141.6,-13,141.5,-17,139.5,-17.5,136.5,-15.5,136.8,-12.2,132.5,-11.5,130,-13,129,-15,126,-14,123.5,-17,121,-19.5,117,-20.7],
 [144.6,-40.7,148.3,-40.9,148,-43.2,146,-43.6,145,-42.2],[172.7,-34.5,174.8,-36.8,178.5,-37.7,177,-39.3,175.3,-41.6,174.6,-41.2,173.8,-39.2,174.6,-37],[172.7,-40.5,174.3,-41.7,173,-43.9,171.2,-44.4,169,-46.7,166.5,-46,168.3,-44,170.8,-42.5],
 [80,9.8,81.8,7.5,81,6,80,6.2,79.7,8],[52,71,56,74.5,62,76.5,68,76.8,60,75,55,72],[142,46,143.5,49,144.5,54,142.5,54,142,50],[10,77,18,80,27,80,22,77,15,76.5],
 [-180,-78,-160,-77,-150,-76,-140,-75,-120,-73,-100,-73,-80,-73,-75,-70,-65,-65,-57,-63,-62,-68,-62,-74,-50,-78,-35,-78,-20,-74,-10,-71,0,-70,20,-70,40,-69,55,-67,70,-68,78,-69,90,-66.5,110,-66,130,-66.5,145,-67,160,-70,170,-72,175,-78,180,-78,180,-90,-180,-90]];
const WATER=[[28,41,28,44,31,46.5,35,45.3,38,47,41.5,42,36,41,31,41],[47,45,50,47,53,45,52.5,41,54,37,51,37,49,38,48,41],
 [10,54,14,54,19,55,21,57,24,59,28,60,23,60,21,62,22,65,25,66,21,64,18,61,19,59,16,56,12,56],[48,30,50,29,52,27,56,26.5,56,24,54,24,51,25,50,27],
 [-95,59,-92,57,-87,55.5,-82,53,-79,55,-77,60,-78,62,-86,64,-90,63,-94,61]];
function box(lon,lat,l0,l1,b0,b1,e=4){return sstep(l0-e,l0+e,lon)*(1-sstep(l1-e,l1+e,lon))*sstep(b0-e,b0+e,lat)*(1-sstep(b1-e,b1+e,lat))}
const TEX={};
function finish(W,H,d,extra){const t={W,H,d,...extra};return t}
function build(W,H,fn){const d=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++){const v=(y+.5)/H,lat=90-v*180;for(let x=0;x<W;x++){const u=(x+.5)/W,c=fn(u,v,u*360-180,lat,x,y),i=(y*W+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255}}return d}
function texEarth(){
  const W=1024,H=512,cv=mkCanvas(W,H),g=cv.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,W,H);
  const poly=(P,col)=>{g.fillStyle=col;g.beginPath();for(let i=0;i<P.length;i+=2){const x=(P[i]+180)/360*W,y=(90-P[i+1])/180*H;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.fill()};
  LAND.forEach(P=>poly(P,'#fff'));WATER.forEach(P=>poly(P,'#000'));
  const m=g.getImageData(0,0,W,H).data,spec=new Uint8Array(W*H),map=new Uint8ClampedArray(W*H*4);
  const d=build(W,H,(u,v,lon,lat,x,y)=>{
    const i=y*W+x,land=m[i*4]>127,n=fbm(u,v,16,4,3),al=Math.abs(lat);let c;
    if(land){
      if(lat<-62||(lon>-74&&lon<-12&&lat>59.5))c=mix([214,222,232],[244,247,250],n);
      else{
        const veg=al<11?[34,86,40]:al<24?mix([34,86,40],[86,112,54],(al-11)/13):al<52?[78,108,56]:al<64?mix([78,98,62],[120,114,94],(al-52)/12):[150,146,140];
        const ds=Math.max(box(lon,lat,-17,58,14,33),box(lon,lat,48,72,24,31)*.8,box(lon,lat,75,115,36,46,3)*.7,box(lon,lat,-118,-103,26,37,3)*.6,box(lon,lat,12,25,-30,-18,3)*.7,box(lon,lat,-71,-68,-27,-18,2)*.6,box(lon,lat,-72,-64,-50,-38,3)*.45);
        const au=box(lon,lat,115,146,-33,-19,4);
        c=mix(veg,[206,174,122],ds);c=mix(c,[192,122,72],au*.9);
        const mt=box(lon,lat,78,100,28,37,3);c=mix(c,[138,124,110],mt*.8);
        if(al>58)c=mix(c,[236,240,244],sstep(.45,.7,n+(al-58)/30));
        c=mix(c,[c[0]*.8,c[1]*.8,c[2]*.8],n*.6);
      }
    }else{const t=1-al/90;c=[8+10*n,30+22*n+10*t,68+30*n+12*t]}
    map[i*4]=c[0];map[i*4+1]=c[1];map[i*4+2]=c[2];map[i*4+3]=255;
    const w=fbm(u,v,6,3,9),cn=.75*fbm(u+.07*(w-.5),v+.05*(w-.5),14,6,21)+.25*fbm(u,v,40,3,27);
    const wl=.62+.25*Math.exp(-(((al-58)/14)**2))+.22*Math.exp(-(((lat-5)/8)**2))-.2*Math.exp(-(((al-24)/9)**2));
    const ca=sstep(.5,.74,cn*wl*1.35)*.93;spec[i]=land?0:Math.round(255*(1-ca));
    return mix(c,[242,245,248],ca);
  });
  return finish(W,H,d,{spec,map,mapW:W,mapH:H});
}
function craters(d,W,H,count,rmin,rmax,dark,rim,s0){seed=s0;
  const one=(lat0,lon0,r,dk,rm)=>{const cl=Math.max(.15,Math.cos(lat0*Math.PI/180)),rx=r/cl,y0=Math.floor((90-lat0-r*1.2)/180*H),y1=Math.ceil((90-lat0+r*1.2)/180*H);
    for(let y=Math.max(0,y0);y<Math.min(H,y1);y++){const lat=90-(y+.5)/H*180,dy=(lat-lat0)/r;
      for(let xx=Math.floor((lon0-rx*1.2+180)/360*W);xx<Math.ceil((lon0+rx*1.2+180)/360*W);xx++){const x=((xx%W)+W)%W,lon=(xx+.5)/W*360-180,dx=(lon-lon0)*cl/r,q=Math.hypot(dx,dy);if(q>1.15)continue;
        const k=q<.85?-dk:q<1.05?rm*(1-Math.abs(q-.95)/.1):rm*.3*(1.15-q)/.1,i=(y*W+x)*4;d[i]+=k;d[i+1]+=k;d[i+2]+=k}}};
  for(let j=0;j<count;j++){const lat=Math.asin(2*rnd()-1)*180/Math.PI,lon=rnd()*360-180,r=rmin*Math.pow(rmax/rmin,Math.pow(rnd(),2.2));one(lat,lon,r,dark,rim)}return one}
function blob(lat,lon,lat0,lon0,rl,rb){let dl=lon-lon0;dl=((dl+180)%360+360)%360-180;return Math.hypot(dl/rb,(lat-lat0)/rl)}
function texMoon(){const W=512,H=256,M=[[33,-16,13,17],[28,17,8,9],[8,31,10,12],[17,59,5,6],[-8,51,8,6],[-21,-17,8,10],[15,-55,24,16],[-15,35,5,5],[56,0,4,32],[-24,-39,5,5],[-1,-23,5,7]];
  const d=build(W,H,(u,v,lon,lat)=>{const n=fbm(u,v,10,5,4);let g=150+34*(n-.5);let mr=0;const wob=.55*(fbm(u,v,18,4,5)-.5);for(const[a,b,c,e]of M){const q=blob(lat,lon,a,b,c,e)+wob;mr=Math.max(mr,1-sstep(.55,1.2,q))}
    g=g*(1-.36*mr*(.8+.4*n));if(lon>90||lon<-90)g+=6*(1-mr);return[g*1.02,g,g*.97]});
  const one=craters(d,W,H,900,.25,4.5,12,18,11);one(-43.3,-11.2,2.2,4,36);one(9.6,-20,1.6,4,28);
  for(let y=0;y<H;y++){const lat=90-(y+.5)/H*180;for(let x=0;x<W;x++){const lon=(x+.5)/W*360-180,dx=(lon+11.2)*Math.cos(lat*Math.PI/180),dy=lat+43.3,q=Math.hypot(dx,dy);if(q>3&&q<45){const a=Math.atan2(dy,dx),ray=Math.pow(Math.abs(Math.cos(a*7+.5)),40)*Math.exp(-q/16)*38,i=(y*W+x)*4;d[i]+=ray;d[i+1]+=ray;d[i+2]+=ray}}}
  return finish(W,H,d)}
function texMercury(){const W=512,H=256,d=build(W,H,(u,v)=>{const n=fbm(u,v,10,5,8),g=128+40*(n-.5);return[g*1.06,g,g*.92]});craters(d,W,H,700,.3,5,16,22,31);return finish(W,H,d)}
function texMars(){const W=512,H=256,DK=[[10,70,12,9,.9],[45,-30,10,22,.8],[-25,-40,10,26,.8],[-3,0,5,12,.7],[-22,145,8,26,.75],[-30,-155,8,22,.75],[-15,110,8,16,.6],[45,115,10,22,.45]];
  return finish(W,H,build(W,H,(u,v,lon,lat)=>{const n=fbm(u,v,12,5,6);let c=mix([196,108,62],[214,140,90],n);let dk=0;for(const[a,b,rl,rb,s]of DK){const q=blob(lat,lon,a,b,rl,rb)+.4*(fbm(u,v,20,3,7)-.5);dk=Math.max(dk,s*(1-sstep(.7,1.1,q)))}
    c=mix(c,[106,62,44],dk*.75);c=mix(c,[226,170,128],(1-sstep(.7,1.1,blob(lat,lon,-42,70,10,12)))*.6);
    const cap=Math.max(sstep(78,82,lat+6*(n-.5)),sstep(81,85,-lat+6*(n-.5)));return mix(c,[244,240,236],cap)}))}
function texVenus(){const W=512,H=256;return finish(W,H,build(W,H,(u,v,lon,lat)=>{const n=fbm(u*1,v*2.2,8,5,12),y=Math.abs(Math.sin((lat/90+.3*Math.sin(lon/57.3*2))*3));return mix([226,206,158],[246,236,206],n*.8+.2*y)}))}
function texBands(B,spot,s0,amp){const W=512,H=256;return finish(W,H,build(W,H,(u,v,lon,lat)=>{
  const t=fbm(u,v,18,4,s0),lp=lat+amp*(t-.5)*2+.9*Math.sin(lon/57.3*3+lat/9);let c=B[B.length-1][2];
  for(let i=0;i<B.length;i++){if(lp<B[i][1]){const e=Math.min(lp-B[i][0],B[i][1]-lp),nx=B[Math.min(B.length-1,i+(lp-B[i][0]>B[i][1]-lp?1:-1))]||B[i];c=mix(B[i][2],(nx||B[i])[2],.5*(1-sstep(0,2.2,e)));break}}
  c=mix(c,[c[0]*.86,c[1]*.86,c[2]*.86],fbm(u,v,48,3,s0+5)*.5);
  if(spot){const q=blob(lat,lon,spot[0],spot[1],spot[2],spot[3]);c=mix(c,spot[4],1-sstep(.6,1,q));if(q>.95&&q<1.25)c=mix(c,[240,228,210],.35*(1-Math.abs(q-1.1)/.15))}
  return c}))}
function texJupiter(){return texBands([[-90,-60,[140,132,124]],[-60,-45,[176,160,140]],[-45,-36,[206,190,168]],[-36,-28,[160,118,92]],[-28,-20,[232,220,198]],[-20,-8,[168,112,78]],[-8,8,[236,226,206]],[8,18,[160,104,74]],[18,25,[228,214,190]],[25,32,[176,136,106]],[32,40,[214,198,176]],[40,55,[178,158,138]],[55,90,[140,132,124]]],[-22.5,15,6,11,[198,104,72]],2,2.2)}
function texSaturn(){return texBands([[-90,-60,[176,168,148]],[-60,-40,[204,186,146]],[-40,-25,[220,200,152]],[-25,-12,[206,182,134]],[-12,12,[232,214,166]],[12,25,[210,186,138]],[25,40,[224,204,156]],[40,60,[206,188,148]],[60,90,[172,170,160]]],null,9,1.4)}
function texIce(c1,c2,spot){const W=512,H=256;return finish(W,H,build(W,H,(u,v,lon,lat)=>{const n=fbm(u,v,10,4,13),b=.5+.5*Math.sin(lat/9);let c=mix(c1,c2,.3*n+.25*b);if(spot)c=mix(c,spot[4],1-sstep(.6,1,blob(lat,lon,spot[0],spot[1],spot[2],spot[3])));return c}))}
function texPluto(){const W=512,H=256;return finish(W,H,build(W,H,(u,v,lon,lat)=>{const n=fbm(u,v,10,5,17);let c=mix([196,164,134],[224,196,166],n);
  const ct=blob(lat,lon,-5,90,14,55)+.4*(fbm(u,v,16,3,18)-.5);c=mix(c,[96,58,44],1-sstep(.7,1,ct));
  const h=Math.min(blob(lat,lon,22,177,17,16),blob(lat,lon,10,-158,14,18))+.25*(fbm(u,v,20,3,19)-.5);return mix(c,[246,240,232],1-sstep(.75,1,h))}))}
function texCharon(){const W=512,H=256;return finish(W,H,build(W,H,(u,v,lon,lat)=>{const n=fbm(u,v,10,5,23);return mix(mix([132,130,128],[176,174,170],n),[124,74,58],sstep(58,72,lat+8*(n-.5)))}))}
function texStar(col,spots){const W=512,H=256,c0=hex(col),hot=mix(c0,[255,255,240],.55),d=build(W,H,(u,v,lon,lat)=>{const n=fbm(u,v,96,3,29);return mix(c0,hot,.25+.75*n)});
  if(spots){seed=97;for(let j=0;j<7;j++){const la=(rnd()<.5?-1:1)*(8+rnd()*18),lo=rnd()*360-180,r=.8+rnd()*1.8;
    for(let y=0;y<H;y++){const lat=90-(y+.5)/H*180;for(let x=0;x<W;x++){const lon=(x+.5)/W*360-180,q=blob(lat,lon,la,lo,r,r/Math.cos(la*Math.PI/180));if(q<1.6){const i=(y*W+x)*4,k=q<.7?.25:.25+.6*(q-.7)/.9;d[i]*=k;d[i+1]*=k;d[i+2]*=k}}}}}
  return finish(W,H,d)}
function texFlat(col,amp,s0){const W=256,H=128,c0=hex(col);return finish(W,H,build(W,H,(u,v)=>{const n=fbm(u,v,8,4,s0)-.5;return[c0[0]*(1+amp*n),c0[1]*(1+amp*n),c0[2]*(1+amp*n)]}))}
function tex(kind,col){const key=kind==='star'||kind==='generic'||kind==='wd'?kind+col:kind;if(TEX[key])return TEX[key];
  const f={earth:texEarth,moon:texMoon,mercury:texMercury,mars:texMars,venus:texVenus,jupiter:texJupiter,saturn:texSaturn,pluto:texPluto,charon:texCharon,
   uranus:()=>texIce([168,218,226],[196,232,236]),neptune:()=>texIce([58,96,204],[96,140,228],[-20,0,6,12,[34,52,128]]),
   sun:()=>texStar('#ff9f2e',1),star:()=>texStar(col,0),wd:()=>texFlat('#eef4ff',.05,3),comet:()=>texFlat('#57524c',.9,41)}[kind]||(()=>texFlat(col,.18,51));
  const t=f();t.id=key;return TEX[key]=t}

// ───────── sphere shader ─────────
const GEOM=new Map();
function geom(D,M){const key=D+'|'+M.map(r=>r.map(v=>v.toFixed(4)).join(',')).join(';');let g=GEOM.get(key);if(g)return g;
  const n=D*D,u=new Float32Array(n),v=new Float32Array(n),nx=new Float32Array(n),ny=new Float32Array(n),nz=new Float32Array(n),a=new Float32Array(n),R=D/2;
  for(let py=0;py<D;py++)for(let px=0;px<D;px++){const i=py*D+px,x=(px+.5-R)/R,y=-(py+.5-R)/R,rr=x*x+y*y,rl=Math.sqrt(rr);a[i]=Math.max(0,Math.min(1,(1-rl)*R+.5));if(!a[i])continue;
    const z=Math.sqrt(Math.max(0,1-rr)),q=rl>1?[x/rl,y/rl,0]:[x,y,z],p0=M[0][0]*q[0]+M[0][1]*q[1]+M[0][2]*q[2],p1=M[1][0]*q[0]+M[1][1]*q[1]+M[1][2]*q[2],p2=M[2][0]*q[0]+M[2][1]*q[1]+M[2][2]*q[2];
    u[i]=(Math.atan2(p1,p0)+Math.PI)/(2*Math.PI);v[i]=(Math.PI/2-Math.asin(Math.max(-1,Math.min(1,p2))))/Math.PI;nx[i]=q[0];ny[i]=q[1];nz[i]=q[2]}
  g={D,u,v,nx,ny,nz,a,key};GEOM.set(key,g);if(GEOM.size>28)GEOM.delete(GEOM.keys().next().value);return g}
const SLOTS={};
function shade(slot,T,D,M,theta,L,o){
  const tq=2*Math.PI/T.W;theta=Math.round(theta/tq)*tq;// rotate in whole texels: no reshade for sub-texel motion
  const g=geom(D,M),key=g.key+'|'+T.id+'|'+theta.toFixed(5)+'|'+(L?L.map(x=>x.toFixed(3)).join(','):'lum')+'|'+(o.flat?1:0);let s=SLOTS[slot];
  if(!s||s.c.width!==D){const c=mkCanvas(D,D);s=SLOTS[slot]={c,x:c.getContext('2d'),img:null,key:''};s.img=s.x.createImageData(D,D)}
  if(s.key===key)return s.c;s.key=key;
  const d=s.img.data,td=T.d,W=T.W,H=T.H,sh=-theta/(2*Math.PI),sp=o.spec?T.spec:null,amb=o.amb??.03,[Lx,Ly,Lz]=L||[0,0,1];
  for(let i=0,n=D*D;i<n;i++){const al=g.a[i],j=i*4;if(!al){d[j+3]=0;continue}
    let uu=g.u[i]+sh;uu-=Math.floor(uu);const ti=((Math.min(H-1,(g.v[i]*H)|0))*W+((uu*W)|0)),k=ti*4;let r=td[k],gg=td[k+1],b=td[k+2],I;
    if(!L){const mu=g.nz[i];I=.36+.64*Math.pow(mu,.6)}
    else{const l=g.nx[i]*Lx+g.ny[i]*Ly+g.nz[i]*Lz;I=amb+(1-amb)*Math.max(0,l)*(o.flat?1:Math.min(1,.15+(l+.05)*4.5));
      if(sp&&l>0){const w=sp[ti];if(w){const rv=2*l*g.nz[i]-Lz;if(rv>0){const q=Math.pow(rv,28)*.6*w/255*255;r+=q;gg+=q;b+=q*.9}}}
      if(o.night&&l<.02){const t=Math.min(1,(.02-l)*12);b+=10*t;gg+=3*t}}
    d[j]=r*I;d[j+1]=gg*I;d[j+2]=b*I;d[j+3]=al*255}
  s.x.putImageData(s.img,0,0);return s.c}
const bucket=D=>Math.max(16,Math.min(480,Math.round(16*Math.pow(1.12,Math.round(Math.log(D/16)/Math.log(1.12))))));

// Saturn's rings in units of the planet radius: C, B, A (Cassini Division between B and A)
const RINGS=[[1.239,1.527,[150,136,112],.3],[1.527,1.951,[226,210,174],.88],[2.027,2.269,[204,188,152],.68]];
function rings(ctx,x,y,r,M,L,part){
  const Mt=(v)=>[M[0][0]*v[0]+M[1][0]*v[1]+M[2][0]*v[2],M[0][1]*v[0]+M[1][1]*v[1]+M[2][1]*v[2],M[0][2]*v[0]+M[1][2]*v[1]+M[2][2]*v[2]];
  // depth of a ring point at angle t is A·cos(t − φ): the front half spans φ ± 90°
  const nrm=Mt([0,0,1]),lit=L?(nrm[0]*L[0]+nrm[1]*L[1]+nrm[2]*L[2])*(nrm[2]||1)>=0:true,phi=Math.atan2(M[1][2],M[0][2]);
  const start=part==='back'?phi+Math.PI/2:phi-Math.PI/2;
  for(const[r0,r1,c,al]of RINGS){ctx.beginPath();const N=64;
    for(let k=0;k<=N;k++){const t=start+Math.PI*k/N,p=Mt([r1*Math.cos(t),r1*Math.sin(t),0]);k?ctx.lineTo(x+p[0]*r,y-p[1]*r):ctx.moveTo(x+p[0]*r,y-p[1]*r)}
    for(let k=N;k>=0;k--){const t=start+Math.PI*k/N,p=Mt([r0*Math.cos(t),r0*Math.sin(t),0]);ctx.lineTo(x+p[0]*r,y-p[1]*r)}
    ctx.closePath();ctx.fillStyle=`rgba(${c[0]*(lit?1:.55)|0},${c[1]*(lit?1:.55)|0},${c[2]*(lit?1:.55)|0},${al*(lit?1:.7)})`;ctx.fill()}
}
// thin limb haze: real atmospheres are about 1–2 % of the radius, so the glow stays close to the disc
function atmo(ctx,x,y,r,col,L){const c=hex(col),w=Math.max(1.5,r*.035),ox=L?L[0]*w*.6:0,oy=L?-L[1]*w*.6:0,g=ctx.createRadialGradient(x+ox,y+oy,r-w,x+ox,y+oy,r+w);
  g.addColorStop(0,`rgba(${c},0)`);g.addColorStop(.5,`rgba(${c},.5)`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r+w,0,2*Math.PI);ctx.fill()}
function glow(ctx,x,y,r,col,k){const c=hex(col),g=ctx.createRadialGradient(x,y,r*.9,x,y,r*(1+k));g.addColorStop(0,`rgba(${c},.55)`);g.addColorStop(.25,`rgba(${c},.18)`);g.addColorStop(1,`rgba(${c},0)`);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*(1+k),0,2*Math.PI);ctx.fill()}

// o: {kind,col,x,y,r,dpr,M,theta,L,real,slot,night,velAng,tail:{dx,dy,len}}
function draw(ctx,o){const K=KINDS[o.kind]||KINDS.generic,lum=!!K.lum,r=o.r;
  if(o.kind==='craft'&&r<5){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(-(o.velAng||0));ctx.fillStyle='#4a78b8';ctx.fillRect(-1.5,-8,3,5.5);ctx.fillRect(-1.5,2.5,3,5.5);ctx.fillStyle='#e6e0cc';ctx.fillRect(-2.5,-2.5,5,5);ctx.restore();return}
  if(o.kind==='comet'&&o.tail&&o.tail.len>2){const t=o.tail,g=ctx.createLinearGradient(o.x,o.y,o.x+t.dx*t.len,o.y+t.dy*t.len);g.addColorStop(0,'rgba(200,236,240,.45)');g.addColorStop(1,'rgba(200,236,240,0)');
    const w=t.len*.16;ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(o.x-t.dy*2,o.y+t.dx*2);ctx.lineTo(o.x+t.dx*t.len-t.dy*w,o.y+t.dy*t.len+t.dx*w);ctx.lineTo(o.x+t.dx*t.len+t.dy*w,o.y+t.dy*t.len-t.dx*w);ctx.lineTo(o.x+t.dy*2,o.y-t.dx*2);ctx.fill()}
  if(o.kind==='comet'){glow(ctx,o.x,o.y,Math.max(r,2),'#b8ecf0',3.5)}
  if(lum&&r<4000)glow(ctx,o.x,o.y,r,o.kind==='sun'?'#ffb040':o.col,o.kind==='wd'?3:o.kind==='sun'?.9:1.1);
  if(r>6000){ctx.fillStyle=o.col;ctx.beginPath();ctx.arc(o.x,o.y,r,0,2*Math.PI);ctx.fill();return}
  if(!o.real){const L=o.L||[0,0,1],g=ctx.createRadialGradient(o.x+L[0]*r*.45,o.y-L[1]*r*.45,r*.05,o.x,o.y,r*1.02),c=hex(o.col);
    g.addColorStop(0,`rgb(${c.map(v=>Math.min(255,v*1.25+40)|0)})`);g.addColorStop(.55,o.col);g.addColorStop(1,`rgb(${c.map(v=>v*(lum?.85:.25)|0)})`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.x,o.y,r,0,2*Math.PI);ctx.fill();return}
  if(K.rings)rings(ctx,o.x,o.y,r,o.M,o.L,'back');
  const D=bucket(2*r*o.dpr),T=tex(o.kind,o.col),img=shade(o.slot,T,D,o.M,o.theta||0,lum?null:o.L,{spec:o.kind==='earth',night:o.kind==='earth'&&o.night,amb:o.kind==='earth'?.035:.02,flat:!o.night});
  ctx.drawImage(img,o.x-r,o.y-r,2*r,2*r);
  if(K.atm&&r>3)atmo(ctx,o.x,o.y,r,K.atm,o.L);
  if(K.rings)rings(ctx,o.x,o.y,r,o.M,o.L,'front');
}
// Side view used in the body card: camera 15° above the equator, light from the upper left.
function portrait(cv,kind,col){const g=cv.getContext('2d'),W=cv.width,K=KINDS[kind]||KINDS.generic,r=W*(K.rings?.2:.34),e=75*Math.PI/180;
  const M=[[1,0,0],[0,Math.cos(e),-Math.sin(e)],[0,Math.sin(e),Math.cos(e)]],face=kind==='earth'?20:kind==='pluto'?180:kind==='mars'?60:0,theta=(-90-face)*Math.PI/180;
  g.clearRect(0,0,W,W);draw(g,{kind,col,x:W/2,y:W/2,r,dpr:2,M,theta,L:K.lum?null:[-.55,.45,.7],real:true,slot:'portrait',night:false})}
function earthMap(){const T=tex('earth');if(!T.mapCv){const c=mkCanvas(T.mapW,T.mapH),g=c.getContext('2d'),im=g.createImageData(T.mapW,T.mapH);im.data.set(T.map);g.putImageData(im,0,0);T.mapCv=c}return T.mapCv}
return{draw,portrait,earthMap,tex,hex};
})();

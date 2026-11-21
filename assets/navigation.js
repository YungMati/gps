'use strict';
const RallyNav = (() => {

const D2R=Math.PI/180;
function hav(a,b){const R=6371008.8,dl=(b[0]-a[0])*D2R,dn=(b[1]-a[1])*D2R,q=Math.sin(dl/2)**2+Math.cos(a[0]*D2R)*Math.cos(b[0]*D2R)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(q)))}
function bearing(a,b){const y=Math.sin((b[1]-a[1])*D2R)*Math.cos(b[0]*D2R),x=Math.cos(a[0]*D2R)*Math.sin(b[0]*D2R)-Math.sin(a[0]*D2R)*Math.cos(b[0]*D2R)*Math.cos((b[1]-a[1])*D2R);return (Math.atan2(y,x)/D2R+360)%360}
function angDiff(a,b){return ((b-a+540)%360)-180}
function destPoint(p,hdg,d){const h=hdg*D2R;return [p[0]+d*Math.cos(h)/110540,p[1]+d*Math.sin(h)/(111320*Math.cos(p[0]*D2R))]}
const ORD=['','pierwszy','drugi','trzeci','czwarty','piąty','szósty','siódmy','ósmy','dziewiąty','dziesiąty'];
const MODANG={'sharp left':-125,'left':-80,'slight left':-30,'straight':0,'slight right':30,'right':80,'sharp right':125,'uturn':-170};
function thetaOf(type,mod,bb,ba){
  if(type==='arrive')return mod==='left'?-90:mod==='right'?90:0;
  let t=(bb!=null&&ba!=null)?angDiff(bb,ba):null;
  if(t==null||(Math.abs(t)<12&&mod&&mod!=='straight'))t=MODANG[mod]??0;
  return t;
}
// skala jak w grafice DiRT: 6 (prawie prosto) … 1 (ciasny), 0 = kwadrat (90°), -1 = agrafka
function sevOf(a){return a>=130?-1:a>=88?0:a>=78?1:a>=66?2:a>=52?3:a>=36?4:a>=20?5:6}
const NUMW=['','jeden','dwa','trzy','cztery','pięć','sześć'];
function describe(m){
  const a=Math.abs(m.theta),left=m.theta<0,pl=left?'lewo':'prawo',L=left?'L':'P';
  const o={kind:'turn',theta:m.theta,sev:sevOf(a),badge:L};
  const t=m.type;
  if(t==='arrive'){const side=m.mod==='left'?', po lewej':m.mod==='right'?', po prawej':'';
    return {...o,kind:'arrive',badge:'🏁',call:'Meta',classic:'Dojechałeś do celu'+side,short:'meta'}}
  if(t==='roundabout'||t==='rotary'||t==='roundabout turn'){const n=m.exit||1;
    return {...o,kind:'round',badge:'R'+n,call:`rondo, ${ORD[n]||n+'.'} zjazd`,classic:`Na rondzie wybierz ${ORD[n]||n+'.'} zjazd`,short:`rondo, ${ORD[n]||n}`}}
  if(t==='fork'){const s=left?'lewej':'prawej';
    return {...o,kind:'fork',call:`rozwidlenie, trzymaj ${s}`,classic:`Na rozwidleniu trzymaj się ${s}`,short:`trzymaj ${s}`}}
  if(t==='off ramp'){return {...o,kind:'ramp',call:`zjazd w ${pl}`,classic:`Zjedź w ${pl}`,short:`zjazd w ${pl}`}}
  if(t==='on ramp'){return {...o,kind:'ramp',call:`wjazd, ${left?'lewy':'prawy'}`,classic:`Wjedź na drogę w ${pl}`,short:`wjazd w ${pl}`}}
  if(t==='merge'){return {...o,kind:'merge',call:'włączenie do ruchu',classic:'Włącz się do ruchu',short:'włączenie'}}
  // zwykłe skręty i łuki
  const sv=m.sev!==undefined?m.sev:sevOf(a);o.sev=sv;o.kind=m.type==='curve'?'curve':'turn';
  let call,classic;
  if(sv===-1){call=`agrafka w ${pl}`;classic=a>=165?'Zawróć':`Skręć ostro w ${pl}`}
  else if(sv===0){call=`kwadrat w ${pl}`;classic=`Skręć w ${pl}`}
  else{call=`${left?'lewy':'prawy'} ${NUMW[sv]}`;classic=sv<=2?`Skręć ostro w ${pl}`:sv<=4?`Skręć w ${pl}`:`Skręć lekko w ${pl}`}
  if(m.type==='curve'){classic=(sv<=2?'Ostry zakręt w ':'Zakręt w ')+pl;if(m.len>140&&sv>=1&&sv<=5)call+=' długi'}
  if(t==='end of road')classic='Na końcu drogi '+classic.charAt(0).toLowerCase()+classic.slice(1);
  return {...o,call,classic,short:`w ${pl}`};
}
// wykrywanie łuków na samej geometrii drogi (nie tylko skrzyżowań)
function detectCurves(R,mans){
  const step=10,n=Math.floor(R.total/step);if(n<4)return [];
  const hs=[];for(let k=0;k<=n;k++){const s=k*step,a=pointAt(R,Math.max(0,s-15)),b=pointAt(R,Math.min(R.total,s+15));hs.push(hav(a,b)<3?(hs[k-1]??0):bearing(a,b))}
  const d=[0];for(let k=1;k<=n;k++)d.push(angDiff(hs[k-1],hs[k]));
  const r=d.map((_,k)=>(d[k-1]||0)*.25+d[k]*.5+(d[k+1]||0)*.25);
  const runs=[];let k=1;
  while(k<=n){
    if(Math.abs(r[k])<.4){k++;continue}
    const sg=Math.sign(r[k]);let j=k+1,last=k,gap=0;
    while(j<=n){const v=r[j];if(Math.sign(v)===sg&&Math.abs(v)>=.4){last=j;gap=0}else if(++gap>3)break;j++}
    let tot=0;for(let q=k;q<=last;q++)tot+=d[q];
    runs.push({s0:(k-1)*step,len:(last-k+1)*step,tot,sg});k=last+1;
  }
  const mg=[];for(const c of runs){const p=mg[mg.length-1];
    if(p&&p.sg===c.sg&&c.s0-(p.s0+p.len)<40){p.len=c.s0+c.len-p.s0;p.tot+=c.tot}else mg.push({...c})}
  const out=[];
  for(const c of mg){const ang=Math.abs(c.tot);if(ang<9)continue;
    const rad=c.len/(ang*D2R);if(rad>800)continue;
    if(mans.some(m=>m.type!=='arrive'&&m.at>c.s0-45&&m.at<c.s0+c.len+45))continue;
    let sev=sevOf(ang);if(sev>=1&&sev<6&&rad>220)sev++;
    const m={at:c.s0,type:'curve',mod:'',theta:c.sg*ang,len:c.len,sev,name:''};m.d=describe(m);out.push(m)}
  return out;
}
function buildRoute(r){
  const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);
  const cum=new Float64Array(coords.length);
  for(let i=1;i<coords.length;i++)cum[i]=cum[i-1]+hav(coords[i-1],coords[i]);
  const total=cum[cum.length-1]||1,scale=total/(r.distance||total),mans=[];let acc=0;
  for(const leg of r.legs)for(const st of leg.steps){
    const m=st.maneuver||{},type=m.type||'',mod=m.modifier||'';
    const at=Math.min(total,acc*scale);acc+=st.distance;
    if(type==='arrive')continue;
    if(type==='depart'||type==='notification'||type==='exit roundabout'||type==='exit rotary')continue;
    const theta=thetaOf(type,mod,m.bearing_before,m.bearing_after);
    if((type==='new name'||type==='continue'||type==='turn'||type==='end of road')&&Math.abs(theta)<(type==='turn'||type==='end of road'?14:22))continue;
    const mm={at,type,mod,exit:m.exit,theta,name:st.name||st.ref||''};mm.d=describe(mm);mans.push(mm);
  }
  const last=r.legs[r.legs.length-1].steps.slice(-1)[0],lm=(last&&last.maneuver)||{};
  const am={at:total,type:'arrive',mod:lm.modifier||'',theta:thetaOf('arrive',lm.modifier||''),name:''};am.d=describe(am);mans.push(am);
  const base={coords,cum,total};
  const all=[...mans,...detectCurves(base,mans)].sort((a,b)=>a.at-b.at);
  all.forEach((m,i)=>{m.id=i;m.said={}});
  const cls=all.filter(m=>m.type!=='curve'||m.sev<=2);
  return {coords,cum,total,duration:r.duration,mans:all,all,cls};
}
function pointAt(R,s){const c=R.cum,n=c.length;if(s<=0)return R.coords[0];if(s>=c[n-1])return R.coords[n-1];
  let lo=0,hi=n-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(c[mid]<=s)lo=mid;else hi=mid}
  const t=(s-c[lo])/((c[hi]-c[lo])||1),a=R.coords[lo],b=R.coords[hi];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function hdgAt(R,s){const a=pointAt(R,Math.max(0,s-4)),b=pointAt(R,Math.min(R.total,s+22));return hav(a,b)<1?bearing(R.coords[R.coords.length-2]||a,R.coords[R.coords.length-1]):bearing(a,b)}
function project(R,p,hint){
  const cs=R.coords,n=cs.length,kx=111320*Math.cos(p[0]*D2R),ky=110540;
  function scan(lo,hi){let best=null;for(let i=lo;i<hi;i++){
    const ax=(cs[i][1]-p[1])*kx,ay=(cs[i][0]-p[0])*ky,bx=(cs[i+1][1]-p[1])*kx,by=(cs[i+1][0]-p[0])*ky,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
    const t=l2?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/l2)):0,px=ax+t*dx,py=ay+t*dy,d=Math.hypot(px,py);
    if(!best||d<best.d)best={i,t,d}}return best}
  let b=null;if(hint!=null)b=scan(Math.max(0,hint-8),Math.min(n-1,hint+160));
  if(!b||b.d>70)b=scan(0,n-1);
  const along=R.cum[b.i]+b.t*(R.cum[b.i+1]-R.cum[b.i]);
  const a=cs[b.i],c=cs[b.i+1];
  return {i:b.i,d:b.d,along,pt:[a[0]+(c[0]-a[0])*b.t,a[1]+(c[1]-a[1])*b.t]};
}
function fmtDist(m){m=Math.max(0,m);if(m<1000)return {v:String(m<100?Math.round(m/5)*5:Math.round(m/10)*10),u:'m'};
  const k=m/1000;return {v:(k<10?k.toFixed(1):Math.round(k)+'').replace('.',','),u:'km'}}
function fmtDur(s){const m=Math.max(1,Math.round(s/60));return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')}
function spokenDist(m){
  if(m<1000){const n=m<100?Math.round(m/10)*10:Math.round(m/50)*50;return n+' metrów'}
  const k=Math.round(m/100)/10;if(Number.isInteger(k))return k+(k===1?' kilometr':k<5?' kilometry':' kilometrów');
  return String(k).replace('.',',')+' kilometra'}
function spokenKm(m){return spokenDist(m)}
const SEVCOL={'-1':'#ff4d4d','0':'#ff4d4d','1':'#ff5a4d','2':'#ff8a3d','3':'#ffc933','4':'#a6d92b','5':'#3ddc4a','6':'#3ddc4a'};
const SEVANG={1:84,2:70,3:56,4:42,5:28,6:14};
function glyphOld(d){
  const st='stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"',hd='fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"';
  const head=(E,dir)=>{const r=dir*D2R,dx=Math.sin(r),dy=-Math.cos(r),px=-dy,py=dx,T=[E[0]+dx*14,E[1]+dy*14],A=[E[0]+px*13,E[1]+py*13],B=[E[0]-px*13,E[1]-py*13];return `<polygon ${hd} points="${T} ${A} ${B}"/>`};
  if(d.kind==='arrive')return `<path ${st} d="M30 90V14"/><path fill="#fff" d="M32 16h50v36H32z"/><path fill="#14152a" d="M32 16h12.5v12H32zM57 16h12.5v12H57zM44.5 28H57v12H44.5zM69.5 28H82v12H69.5zM32 40h12.5v12H32zM57 40h12.5v12H57z"/>`;
  if(d.kind==='round'){const t=d.theta,r=t*D2R,cx=50,cy=46,R=19,E=[cx+(R+14)*Math.sin(r),cy-(R+14)*Math.cos(r)],S=[cx+R*Math.sin(r),cy-R*Math.cos(r)];
    return `<circle cx="${cx}" cy="${cy}" r="${R}" stroke="#fff" stroke-opacity=".4" stroke-width="7" fill="none"/><path ${st} d="M50 96V68"/><path ${st} d="M${S[0]} ${S[1]}L${E[0]} ${E[1]}"/>${head(E,t)}`}
  const t=d.theta,a=Math.abs(t),r=t*D2R,cy=a<10?96:58,E=a<10?[50,24]:[50+30*Math.sin(r),cy-30*Math.cos(r)];
  return `<path ${st} d="${a<10?'M50 96V28':`M50 96V${cy}L${E[0]} ${E[1]}`}"/>${head(E,a<10?0:t)}`;
}
function turnSVG(d){
  const frame=(col,inner)=>`<svg viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="16" fill="#000" stroke="${col}" stroke-width="6"/>${inner}</svg>`;
  if(d.kind!=='turn'&&d.kind!=='curve'&&d.kind!=='uturn')
    return frame('#3b82f6',`<g transform="translate(11 11) scale(.78)">${glyphOld(d)}</g>`);
  const a=Math.abs(d.theta),sev=d.sev!==undefined?d.sev:sevOf(a),left=d.theta<0,col=a<8?'#3b82f6':SEVCOL[sev];
  const st='stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"',hd='fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"';
  const head=(E,dir,s=11)=>{const r=dir*D2R,dx=Math.sin(r),dy=-Math.cos(r),px=-dy,py=dx;return `<polygon ${hd} points="${[E[0]+dx*s*1.1,E[1]+dy*s*1.1]} ${[E[0]+px*s,E[1]+py*s]} ${[E[0]-px*s,E[1]-py*s]}"/>`};
  if(a<8)return frame(col,`<path ${st} d="M50 84V32"/>${head([50,30],0,13)}`);
  let g,txt='';
  if(sev===-1){g=`<path ${st} d="M36 86V46a14 14 0 0 1 28 0V64"/>${head([64,66],180)}`;txt='!'}
  else if(sev===0){g=`<path ${st} d="M40 86V46H58"/>${head([60,46],90)}`;txt='!'}
  else{const al=SEVANG[sev]*D2R,C=[40,48],E=[C[0]+20*Math.sin(al),C[1]-20*Math.cos(al)];
    g=`<path ${st} d="M40 86V64Q40 48 ${E[0]} ${E[1]}"/>${head(E,SEVANG[sev])}`;txt=String(sev)}
  const flip=left?'transform="translate(100 0) scale(-1 1)"':'',tx=left?76:24;
  return frame(col,`<g ${flip}>${g}</g><text x="${tx}" y="84" text-anchor="middle" font-family="-apple-system,Arial" font-weight="800" font-style="italic" font-size="${txt==='!'?24:26}" fill="#fff">${txt}</text>`);
}

// ---------- sylwetki aut (widok z góry, przód u góry) ----------
const CARS={
 arrow:{n:'Strzałka'},
 golf:{n:'Golf 5/6',len:70,w:34,rf:12,rr:8,seg:[17,11,21,9,12]},
 rapid:{n:'Škoda Rapid',len:78,w:34,rf:12,rr:10,seg:[19,11,18,15,15]},
 opel:{n:'Opel Astra',len:74,w:34,rf:14,rr:9,seg:[20,12,17,11,14],opel:1},
 sedan:{n:'Sedan',len:82,w:34,rf:12,rr:12,seg:[22,11,15,8,26]},
 kombi:{n:'Kombi',len:80,w:34,rf:12,rr:7,seg:[19,11,30,6,14]},
 suv:{n:'SUV',len:76,w:40,rf:13,rr:9,seg:[18,12,26,8,12],rails:1},
 rally:{n:'Rajdówka',len:72,w:36,rf:11,rr:7,seg:[18,11,18,10,15],rally:1}
};
const CAR_COLORS=['#e63946','#3b82f6','#f1f1f1','#22c55e','#1f2937','#ffb020','#9ca3af','#a855f7'];
function shade(hex,k){const n=parseInt(hex.slice(1),16),f=c=>Math.round(k<0?c*(1+k):c+(255-c)*k),r=f(n>>16),g=f((n>>8)&255),b=f(n&255);return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}
const ARROW_SVG='<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#a45cff" opacity=".18"/><path d="M28 6L44 46 28 38 12 46z" fill="#fff" stroke="#a45cff" stroke-width="3.5" stroke-linejoin="round" style="filter:drop-shadow(0 0 7px #a45cff)"/></svg>';
function carSVG(key,color){
  const c=CARS[key];if(!c||!c.len)return ARROW_SVG;color=color||'#3b82f6';
  const cx=22,H=90,y0=(H-c.len)/2,y1=y0+c.len,x0=cx-c.w/2,x1=cx+c.w/2,w=c.w,[hL,wL,rL,gL]=c.seg;
  const yA=y0+hL,yB=yA+wL,yC=yB+rL,yD=yC+gL,dk=shade(color,-.4),lt=shade(color,.22),gl='#18202e';
  const body=(dx,dy)=>`M${x0+dx} ${y0+c.rf+dy}Q${x0+dx} ${y0+dy} ${x0+c.rf+dx} ${y0+dy}H${x1-c.rf+dx}Q${x1+dx} ${y0+dy} ${x1+dx} ${y0+c.rf+dy}V${y1-c.rr+dy}Q${x1+dx} ${y1+dy} ${x1-c.rr+dx} ${y1+dy}H${x0+c.rr+dx}Q${x0+dx} ${y1+dy} ${x0+dx} ${y1-c.rr+dy}Z`;
  let s=`<svg viewBox="0 0 44 90">`;
  s+=`<path d="${body(1.2,2.2)}" fill="#000" opacity=".3"/>`;
  for(const [x,y] of [[x0-1.3,y0+8],[x1-1.3,y0+8],[x0-1.3,y1-19],[x1-1.3,y1-19]])s+=`<rect x="${x}" y="${y}" width="2.6" height="11" rx="1" fill="#0d0d12"/>`;
  s+=`<path d="${body(0,0)}" fill="${color}" stroke="rgba(255,255,255,.9)" stroke-width="1.1"/>`;
  if(c.rally)s+=`<rect x="${cx-4.5}" y="${y0+1.5}" width="3" height="${c.len-3}" fill="#fff" opacity=".92"/><rect x="${cx+1.5}" y="${y0+1.5}" width="3" height="${c.len-3}" fill="#fff" opacity=".92"/>`;
  if(c.opel)s+=`<path d="M${cx} ${y0+4}V${yA-1}" stroke="${dk}" stroke-width="1.1" opacity=".55"/><path d="M${cx-5} ${y0+5}L${cx} ${y0+3}L${cx+5} ${y0+5}" fill="none" stroke="${dk}" stroke-width=".9" opacity=".5"/>`;
  // szyby i dach
  s+=`<path d="M${x0+4.5} ${yA}H${x1-4.5}L${x1-7} ${yB}H${x0+7}Z" fill="${gl}"/>`;
  s+=`<rect x="${x0+6.2}" y="${yB}" width="${w-12.4}" height="${rL}" fill="${lt}"/>`;
  s+=`<rect x="${x0+3.6}" y="${yB+.6}" width="2.8" height="${rL-1.2}" rx="1" fill="${gl}"/><rect x="${x1-6.4}" y="${yB+.6}" width="2.8" height="${rL-1.2}" rx="1" fill="${gl}"/>`;
  s+=`<path d="M${x0+7} ${yC}H${x1-7}L${x1-5} ${yD}H${x0+5}Z" fill="${gl}"/>`;
  if(c.rails)s+=`<path d="M${x0+8.5} ${yB+1}V${yC-1}M${x1-8.5} ${yB+1}V${yC-1}" stroke="${dk}" stroke-width="1.2"/>`;
  if(c.rally)s+=`<rect x="${cx-3}" y="${yB+5}" width="6" height="6" rx="1.5" fill="#0d0d12"/><rect x="${x0+1.5}" y="${y1-7}" width="${w-3}" height="4" rx="1" fill="#0d0d12"/>`;
  // lusterka, światła
  s+=`<rect x="${x0-3}" y="${yA+1.5}" width="4.2" height="3.6" rx="1.6" fill="${color}" stroke="${dk}" stroke-width=".6"/><rect x="${x1-1.2}" y="${yA+1.5}" width="4.2" height="3.6" rx="1.6" fill="${color}" stroke="${dk}" stroke-width=".6"/>`;
  s+=c.opel?`<path d="M${x0+2.5} ${y0+3.2}L${x0+11} ${y0+1.6}V${y0+4.4}L${x0+2.8} ${y0+5.8}Z" fill="#fff7c2"/><path d="M${x1-2.5} ${y0+3.2}L${x1-11} ${y0+1.6}V${y0+4.4}L${x1-2.8} ${y0+5.8}Z" fill="#fff7c2"/>`
    :`<rect x="${x0+2.6}" y="${y0+1.8}" width="7" height="3.3" rx="1.5" fill="#fff7c2"/><rect x="${x1-9.6}" y="${y0+1.8}" width="7" height="3.3" rx="1.5" fill="#fff7c2"/>`;
  s+=`<rect x="${x0+2.2}" y="${y1-4.8}" width="7" height="3" rx="1.2" fill="#ff3b3b"/><rect x="${x1-9.2}" y="${y1-4.8}" width="7" height="3" rx="1.2" fill="#ff3b3b"/>`;
  return s+'</svg>';
}

// ---------- indeks siatki trasy + dopasowanie punktów (dla ostrzeżeń) ----------
const GCL=0.002,GKN=0.003;
function buildGrid(R){const g=new Map(),add=(la,ln,i)=>{const k=Math.floor(la/GCL)+','+Math.floor(ln/GKN);let a=g.get(k);if(!a)g.set(k,a=[]);if(a[a.length-1]!==i)a.push(i)};
  for(let i=0;i<R.coords.length-1;i++){const a=R.coords[i],b=R.coords[i+1],n=Math.max(1,Math.ceil(hav(a,b)/80));for(let j=0;j<=n;j++)add(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,i)}
  R.grid=g}
function projectNear(R,p,maxD){if(!R.grid)buildGrid(R);const r0=Math.floor(p[0]/GCL),c0=Math.floor(p[1]/GKN),cand=new Set();
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const a=R.grid.get((r0+dr)+','+(c0+dc));if(a)for(const i of a)cand.add(i)}
  if(!cand.size)return null;const cs=R.coords,kx=111320*Math.cos(p[0]*D2R),ky=110540;let best=null;
  for(const i of cand){const ax=(cs[i][1]-p[1])*kx,ay=(cs[i][0]-p[0])*ky,bx=(cs[i+1][1]-p[1])*kx,by=(cs[i+1][0]-p[0])*ky,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
    const t=l2?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/l2)):0,d=Math.hypot(ax+t*dx,ay+t*dy);if(!best||d<best.d)best={i,t,d}}
  if(!best||best.d>maxD)return null;return {i:best.i,d:best.d,along:R.cum[best.i]+best.t*(R.cum[best.i+1]-R.cum[best.i])}}
// ---------- Overpass → elementy ostrzeżeń ----------
function parseOverpass(d){const out=[],num=v=>{const n=parseInt(v);return isFinite(n)?n:null};
  for(const e of d.elements||[]){const t=e.tags||{};
    if(e.type==='node'){const base={id:'n'+e.id,lat:e.lat,lng:e.lon,max:num(t.maxspeed)??num(t['enforcement:maxspeed'])};
      if(t.enforcement==='traffic_signals')out.push({...base,k:'red'});
      else if(t.highway==='speed_camera'||t.enforcement==='maxspeed'||t.enforcement==='average_speed')out.push({...base,k:'cam'});
      else if(t.highway==='traffic_signals')out.push({id:base.id,lat:e.lat,lng:e.lon,k:'light'});
      else if(t.railway==='level_crossing')out.push({id:base.id,lat:e.lat,lng:e.lon,k:'rail'});
    }else if(e.type==='relation'){const enf=t.enforcement,mem=e.members||[],max=num(t.maxspeed);
      const nodes=roles=>mem.filter(m=>m.type==='node'&&roles.includes(m.role)&&m.lat!=null).map(m=>[m.lat,m.lon]);
      if(enf==='average_speed'){const sec=mem.filter(m=>m.type==='way'&&m.role==='section'&&m.geometry).flatMap(m=>m.geometry.map(g=>[+g.lat.toFixed(5),+g.lon.toFixed(5)])),fr=nodes(['from']),to=nodes(['to']);
        const pts=fr.length&&to.length?[fr[0],...sec,to[to.length-1]]:sec;if(pts.length>=2)out.push({id:'r'+e.id,k:'sec',lat:pts[0][0],lng:pts[0][1],max,pts})}
      else if(enf==='maxspeed'||enf==='traffic_signals'){const dv=nodes(['device']),ps=dv.length?dv:nodes(['from']);
        ps.forEach(([la,ln],i)=>out.push({id:'r'+e.id+'_'+i,k:enf==='maxspeed'?'cam':'red',lat:la,lng:ln,max}))}}}
  return out}

// ---------- ograniczenia prędkości z OSM (maxspeed) ----------
const PLSPEED={'PL:urban':50,'PL:rural':90,'PL:motorway':140,'PL:expressway':120,'PL:trunk':100,'walk':7,'living_street':20};
function parseMaxspeed(v){if(v==null)return null;v=String(v).trim();if(/^\d+$/.test(v))return +v;const m=v.match(/^(\d+)\s*mph$/i);if(m)return Math.round(m[1]*1.609/5)*5;return PLSPEED[v]??null}
function wayLimit(t,reversed){const dir=parseMaxspeed(reversed?t['maxspeed:backward']:t['maxspeed:forward']);return dir??parseMaxspeed(t.maxspeed)}
function limitsFromWays(R,ways){const out=[];
  for(const w of ways){if(w.type!=='way'||!w.geometry||!w.tags)continue;
    const al=[];for(const g of w.geometry){const p=projectNear(R,[g.lat,g.lon],20);if(p)al.push(p.along)}
    if(al.length<2)continue;const s0=Math.min(...al),s1=Math.max(...al);if(s1-s0<20)continue;if(al.length/w.geometry.length<.4&&s1-s0<60)continue;
    const v=wayLimit(w.tags,al[0]>al[al.length-1]);if(v==null)continue;out.push({s0,s1,v})}
  return out}
function limitAt(list,s){let best=null,bd=1e9;for(const x of list){const d=s<x.s0?x.s0-s:s>x.s1?s-x.s1:0;if(d<bd||(d===bd&&best&&x.s0>best.s0)){bd=d;best=x}}return best&&bd<=60?best.v:null}

return {D2R, hav, bearing, angDiff, destPoint, buildRoute, pointAt, hdgAt, project, fmtDist, fmtDur, spokenDist, turnSVG, CARS, CAR_COLORS, ARROW_SVG, carSVG, projectNear, parseOverpass, parseMaxspeed, limitsFromWays, limitAt};
})();

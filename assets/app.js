(() => {
'use strict';
const {D2R, hav, bearing, angDiff, destPoint, buildRoute, pointAt, hdgAt, project, fmtDist, fmtDur, spokenDist, turnSVG, CARS, CAR_COLORS, ARROW_SVG, carSVG, projectNear, parseOverpass, parseMaxspeed, limitsFromWays, limitAt} = RallyNav;


const $=id=>document.getElementById(id);
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICON={
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
 layers:'<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
 locate:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
 plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 minus:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
 close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 vol:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
 warn:'<svg viewBox="0 0 24 24"><path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>',
 mute:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
 gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
 stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
 compass:(rot)=>`<svg viewBox="0 0 24 24" style="transform:rotate(${rot}deg)"><circle cx="12" cy="12" r="9.5"/><path d="M12 4.5l3 7.5h-6z" fill="#ff4d5e" stroke="#ff4d5e"/><path d="M12 19.5l3-7.5h-6z" fill="#cfd3e6" stroke="#cfd3e6"/></svg>`
};
document.querySelectorAll('[data-ic]').forEach(e=>{const k=e.dataset.ic;e.innerHTML=typeof ICON[k]==='string'?ICON[k]:''});

/* ---------- ustawienia i stan ---------- */
const mansOf=R=>SET.style==='rally'?R.all:R.cls;
function resyncMan(){if(!S.route)return;const L=mansOf(S.route);S.mIdx=0;while(S.mIdx<L.length-1&&L[S.mIdx].at<S.along-18)S.mIdx++;lastManKey=null}
const SET=Object.assign({base:'osm',voice:true,style:'rally',headingUp:true,tilt:45,autoZoom:false,car:'arrow',carColor:'#3b82f6',warn:{cam:true,sec:true,red:true,rail:true,light:false}},LS.get('rn_set',{}));
SET.warn=Object.assign({cam:true,sec:true,red:true,rail:true,light:false},SET.warn||{});
const saveSet=()=>LS.set('rn_set',SET);
const S={tiltCur:0,mode:'idle',fix:null,fixAt:0,spd:0,hdg:null,vis:null,tgt:null,follow:true,pinch:false,rotCur:0,zoomBias:0,anchor:.5,
  routes:[],sel:0,route:null,dest:null,along:0,hint:null,mIdx:0,off:0,onRoute:false,rerouting:false,lastReroute:0,
  safeOn:[],trip:null,watch:null,wake:null,incOn:[],warned:new Set(),doneAt:0};

/* ---------- mapa ---------- */
const map=L.map('map',{zoomControl:false,preferCanvas:true,zoomSnap:0,zoomAnimation:true,fadeAnimation:false,attributionControl:false,
  dragging:false,touchZoom:'center',scrollWheelZoom:'center',doubleClickZoom:'center',keepBuffer:1,inertia:false,bounceAtZoomLimits:false})
  .setView(LS.get('rn_last',[52.2297,21.0122]),LS.get('rn_last',null)?15:13);

const ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
const SATATTR='Imagery © Esri, Maxar, Earthstar Geographics';
const BASES={
 dark:{name:'Ciemna',sw:'linear-gradient(135deg,#171a2b,#0b0d18)',layers:()=>[L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,className:'tiles-dark',attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})]},
 osm:{name:'Mapa',sw:'linear-gradient(135deg,#f2efe9,#aad3df)',layers:()=>[L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})]},
 sat:{name:'Satelita',sw:'linear-gradient(135deg,#3b5a2c,#1c3b52 60%,#6b5a3a)',sat:true,layers:()=>[L.tileLayer(ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:SATATTR})]},
 hybrid:{name:'Hybryda',sw:'linear-gradient(135deg,#3b5a2c,#1c3b52 60%,#6b5a3a),repeating-linear-gradient(0deg,#fff6 0 2px,#0000 2px 9px)',sat:true,layers:()=>[
   L.tileLayer(ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:SATATTR}),
   L.tileLayer(ESRI+'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,opacity:.9}),
   L.tileLayer(ESRI+'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19})]}
};
let baseLayers=[];
function setBase(k){if(!BASES[k])k='dark';baseLayers.forEach(l=>map.removeLayer(l));baseLayers=BASES[k].layers();baseLayers.forEach((l,i)=>{Object.assign(l.options,{keepBuffer:2,updateWhenZooming:false,updateInterval:120});l.addTo(map);l.setZIndex(i)});$('esriCredit').hidden=!BASES[k].sat;SET.base=k;saveSet();document.body.classList.toggle('satmode',!!BASES[k].sat);drawRoutes();renderMenu()}

/* geometria sceny: kontener mapy jest większy od ekranu i obracany wokół pozycji auta */
const PERSP=900;
function layoutStage(){
  const vw=innerWidth,vh=innerHeight,el=$('mapRot');
  S.cx=mapAnchorX();S.cy=vh*S.anchor;
  const flat=Math.ceil(2*(Math.hypot(Math.max(S.cx,vw-S.cx),Math.max(S.cy,vh-S.cy))+12));
  const D=SET.tilt>0?Math.max(2000,flat):flat;
  el.style.width=el.style.height=D+'px';el.style.left=S.cx+'px';el.style.top=S.cy+'px';
  el.style.marginLeft=el.style.marginTop=(-D/2)+'px';applyRot();map.invalidateSize({animate:false,pan:false});
}
function applyRot(){const t=S.tiltCur,cam=$('camera');
  $('mapRot').style.transform=(t>.3?`perspective(${PERSP}px) rotateX(${t}deg) `:'')+`rotate(${S.rotCur}deg)`;
  const r=document.documentElement.style;r.setProperty('--rot',S.rotCur+'deg');r.setProperty('--tk',t>.3?(1/Math.cos(t*D2R)).toFixed(3):'1');
  if(cam){let m='none';if(t>.3){const th=t*D2R,u=900,top=S.cy-u*Math.cos(th)*PERSP/(PERSP+u*Math.sin(th));m=`linear-gradient(to bottom,transparent ${Math.max(0,top-30).toFixed(0)}px,#000 ${(top+90).toFixed(0)}px)`}
    cam.style.webkitMaskImage=m;cam.style.maskImage=m}
  const cb=$('compassBtn');if(cb)cb.innerHTML=ICON.compass(S.rotCur)}
function sidePanelLayout(){return innerWidth>=740 || (innerWidth>innerHeight && innerHeight<=540)}
function mapAnchorX(){
  if(S.mode==='nav' && sidePanelLayout()){
    const edge=$('bottom').getBoundingClientRect().right;
    return edge+(innerWidth-edge)*.46;
  }
  return innerWidth/2;
}
function setAnchor(a){S.anchor=a;layoutStage()}
addEventListener('resize',()=>setTimeout(layoutStage,60));addEventListener('orientationchange',()=>setTimeout(layoutStage,300));

/* własne przesuwanie mapy (uwzględnia obrót) + długie przytrzymanie */
(function(){const el=$('stage');let d=null,lp=null;const ptrs=new Set();
  const stopLP=()=>{clearTimeout(lp);lp=null};
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.ui,.backdrop,.leaflet-marker-icon'))return;ptrs.add(e.pointerId);
    if(ptrs.size>1){d=null;stopLP();S.pinch=true;return}
    d={x:e.clientX,y:e.clientY,moved:false};stopLP();lp=setTimeout(()=>{if(d&&!d.moved){const x=d.x,y=d.y;d=null;longPress(x,y)}},560)});
  el.addEventListener('pointermove',e=>{if(!d||ptrs.size>1)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(!d.moved&&Math.hypot(dx,dy)<8)return;if(!d.moved){d.moved=true;stopLP();setFollow(false)}
    const a=S.rotCur*D2R,vx=dx*Math.cos(a)+dy*Math.sin(a),vy=-dx*Math.sin(a)+dy*Math.cos(a);
    map.panBy([-vx,-vy],{animate:false});d.x=e.clientX;d.y=e.clientY});
  const up=e=>{ptrs.delete(e.pointerId);stopLP();d=null;if(ptrs.size<1)setTimeout(()=>{S.pinch=false},250)};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('contextmenu',e=>e.preventDefault());
})();
function screenToLatLng(x,y){let dx=x-S.cx,dy=y-S.cy;const t=S.tiltCur;
  if(t>.3){const th=t*D2R,s=Math.sin(th),c=Math.cos(th),py=dy*PERSP/(PERSP*c+dy*s);dx=dx*(PERSP-py*s)/PERSP;dy=py}
  const a=S.rotCur*D2R,vx=dx*Math.cos(a)+dy*Math.sin(a),vy=-dx*Math.sin(a)+dy*Math.cos(a),D=$('mapRot').offsetWidth;
  return map.containerPointToLatLng([D/2+vx,D/2+vy])}

/* ---------- znaczniki ---------- */
function makeCarIcon(){const k=CARS[SET.car]?SET.car:'arrow';
  return L.divIcon({className:'',iconSize:[56,56],iconAnchor:[28,28],html:`<div class="car ${k==='arrow'?'':'veh'}">${k==='arrow'?ARROW_SVG:carSVG(k,SET.carColor)}</div>`})}
const carMarker=L.marker([0,0],{icon:makeCarIcon(),interactive:false,zIndexOffset:1000});
function setCar(k,c){if(k)SET.car=k;if(c)SET.carColor=c;saveSet();carMarker.setIcon(makeCarIcon());carEl=null;renderMenu()}
let carEl=null,accCircle=null,destMarker=null;
const routeGroup=L.layerGroup().addTo(map),incGroup=L.layerGroup().addTo(map);
function setDestMarker(p){if(destMarker){map.removeLayer(destMarker);destMarker=null}if(!p)return;
  destMarker=L.marker([p.lat,p.lng],{interactive:false,zIndexOffset:500,icon:L.divIcon({className:'',iconSize:[36,40],iconAnchor:[18,38],html:'<div class="dpin cr">📍</div>'})}).addTo(map)}

/* ---------- pętla renderująca ---------- */
function frame(ts){requestAnimationFrame(frame);
  if(!S.tgt||document.hidden)return;
  const dt=Math.min(.1,(ts-(S.lastTs||ts))/1000);S.lastTs=ts;
  let t=S.tgt;const el=(performance.now()-S.fixAt)/1000;
  if(S.mode==='nav'&&S.route&&S.onRoute){const s=Math.min(S.route.total,S.along+Math.min(S.spd*el,S.spd*1.6+1)),p=pointAt(S.route,s);t={lat:p[0],lng:p[1],hdg:hdgAt(S.route,s)}}
  else if(S.spd>1.5&&S.hdg!=null){const p=destPoint([S.tgt.lat,S.tgt.lng],S.hdg,Math.min(S.spd*el,S.spd*1.6));t={lat:p[0],lng:p[1],hdg:S.hdg}}
  const k=1-Math.exp(-dt*9);
  if(!S.vis)S.vis={lat:t.lat,lng:t.lng,hdg:t.hdg||0};
  S.vis.lat+=(t.lat-S.vis.lat)*k;S.vis.lng+=(t.lng-S.vis.lng)*k;
  if(t.hdg!=null)S.vis.hdg=(S.vis.hdg+angDiff(S.vis.hdg,t.hdg)*Math.min(1,dt*6)+360)%360;
  carMarker.setLatLng([S.vis.lat,S.vis.lng]);
  if(!carEl){const e=carMarker.getElement();carEl=e&&e.querySelector('.car')}
  if(carEl)carEl.style.transform=`rotate(${S.vis.hdg}deg)`;
  const moving=S.mode==='nav'||S.spd>4,wantRot=(S.follow&&SET.headingUp&&moving)?-S.vis.hdg:0,wantTilt=(S.follow&&SET.tilt>0&&moving)?SET.tilt:0;
  const dr=angDiff(S.rotCur,wantRot),dtl=wantTilt-S.tiltCur;let ch=false;
  if(Math.abs(dr)>.03){S.rotCur=(S.rotCur+dr*Math.min(1,dt*5)+360)%360;if(S.rotCur>180)S.rotCur-=360;ch=true}
  if(Math.abs(dtl)>.05){S.tiltCur+=dtl*Math.min(1,dt*(wantTilt?3:9));ch=true}else if(S.tiltCur!==wantTilt){S.tiltCur=wantTilt;ch=true}
  if(ch)applyRot();
  if(S.follow&&!S.pinch&&!map._animatingZoom)map.setView([S.vis.lat,S.vis.lng],map.getZoom(),{animate:false});
}
requestAnimationFrame(frame);
setInterval(()=>{ // opcjonalny auto-zoom: rzadko i tylko przy dużej różnicy
  if(!SET.autoZoom||!S.follow||S.pinch||!S.vis||map._animatingZoom||S.mode!=='nav')return;
  if(Date.now()-(S.lastAutoZ||0)<8000)return;
  const v=S.spd*3.6;let z=v<40?17.2:v<80?16.5:v<110?15.8:15;S.baseZ=z;z=Math.max(5,Math.min(19,z+S.zoomBias));
  if(Math.abs(z-map.getZoom())>=1){S.lastAutoZ=Date.now();S.autoZ=true;map.setZoom(z,{animate:true})}
},2000);
map.on('zoomend',()=>{if(S.autoZ){S.autoZ=false;return}if(S.follow&&S.baseZ!=null)S.zoomBias=Math.max(-3,Math.min(3,map.getZoom()-S.baseZ))});

/* ---------- tryby / UI ---------- */
function setMode(m){S.mode=m;document.body.dataset.mode=m;setAnchor(m==='nav'?.7:.5);
  $('navTop').classList.toggle('hidden',m!=='nav');
  if(m!=='nav'){$('incWarn').classList.add('hidden')}}
function setFollow(f){S.follow=f;$('recenter').classList.toggle('on',f);
  clearTimeout(S.resume);if(!f&&S.mode==='nav')S.resume=setTimeout(()=>setFollow(true),12000);
  if(f&&S.vis)map.setView([S.vis.lat,S.vis.lng],Math.max(map.getZoom(),15),{animate:true})}
$('recenter').onclick=()=>{if(S.mode==='preview'){fitRoutes();return}if(!S.fix&&!SIM.on){startGPS();toast('Szukam sygnału GPS…')}setFollow(true)};
$('compassBtn').onclick=()=>{SET.headingUp=!SET.headingUp;saveSet();toast(SET.headingUp?'Mapa obraca się wg kierunku jazdy':'Północ u góry');setFollow(true)};
let toastT;function toast(t,kind,ms=3200){const e=$('toast');e.textContent=t;e.className='ui glass '+(kind||'');e.classList.remove('hidden');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.add('hidden'),ms)}
let sheetTrigger=null;
const panels=[...document.querySelectorAll('.backdrop')];
for(const panel of panels){
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  const heading=panel.querySelector('h2');if(!heading.id)heading.id=panel.id+'Heading';
  panel.setAttribute('aria-labelledby',heading.id);
}
function openSheet(id){
  closeSheets();sheetTrigger=document.activeElement;const panel=$(id);
  panel.classList.add('open');
  for(const child of document.body.children) if(child!==panel && !child.matches('script,.backdrop,#toast')) child.inert=true;
  (panel.querySelector('input')||panel.querySelector('button'))?.focus({preventScroll:true});
}
function closeSheets(){
  const current=document.querySelector('.backdrop.open');if(!current)return;
  if(current.id==='sSearch'){sSeq++;clearTimeout(sTimer)}
  current.classList.remove('open');
  for(const child of document.body.children)child.inert=false;
  if(sheetTrigger?.isConnected)sheetTrigger.focus({preventScroll:true});
  sheetTrigger=null;
}
document.addEventListener('keydown',event=>{
  const panel=document.querySelector('.backdrop.open');if(!panel)return;
  if(event.key==='Escape'){event.preventDefault();closeSheets();return}
  if(event.key!=='Tab')return;
  const items=[...panel.querySelectorAll('button:not([disabled]),input,summary,a[href]')].filter(el=>el.getClientRects().length);
  if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
});
document.querySelectorAll('.backdrop').forEach(b=>b.addEventListener('pointerdown',e=>{if(e.target===b&&b.id!=='sSearch')closeSheets()}));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheets);

/* ---------- menu: warstwy i ustawienia ---------- */
function renderMenu(){
  $('tilesBox').innerHTML=Object.entries(BASES).map(([k,b])=>`<button class="tile ${SET.base===k?'sel':''}" data-base="${k}"><i style="background:${b.sw}"></i>${b.name}</button>`).join('');
  $('tilesBox').querySelectorAll('[data-base]').forEach(b=>b.onclick=()=>setBase(b.dataset.base));
  $('segStyle').querySelectorAll('button').forEach(b=>b.classList.toggle('sel',b.dataset.v===SET.style));
  $('vehBox').innerHTML=Object.entries(CARS).map(([k,v])=>`<button class="vt ${SET.car===k?'sel':''}" data-k="${k}"><div>${k==='arrow'?ARROW_SVG:carSVG(k,SET.carColor)}</div><span>${v.n}</span></button>`).join('');
  $('vehBox').querySelectorAll('.vt').forEach(b=>b.onclick=()=>setCar(b.dataset.k));
  $('colorBox').classList.toggle('dim',SET.car==='arrow');
  $('colorBox').innerHTML=CAR_COLORS.map(c=>`<button class="cd ${SET.carColor===c?'sel':''}" data-c="${c}" style="background:${c}" aria-label="kolor"></button>`).join('');
  $('colorBox').querySelectorAll('.cd').forEach(b=>b.onclick=()=>setCar(SET.car==='arrow'?'golf':null,b.dataset.c));
  $('segTilt').querySelectorAll('button').forEach(b=>b.classList.toggle('sel',+b.dataset.v===SET.tilt));$('swZoom').classList.toggle('on',SET.autoZoom);
  $('warnBox').innerHTML=Object.entries({cam:'Fotoradary',sec:'Odcinkowy pomiar prędkości',red:'Kamery na czerwonym świetle',rail:'Przejazdy kolejowe',light:'Sygnalizacja świetlna (tylko głos)'}).map(([k,n])=>`<button class="toggle" data-w="${k}"><span>${SK[k].ic} ${n}</span><span class="sw ${SET.warn[k]?'on':''}"></span></button>`).join('');
  $('warnBox').querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{SET.warn[b.dataset.w]=!SET.warn[b.dataset.w];saveSet();computeSafeOnRoute();renderSafety();renderMenu()});
  $('swVoice').classList.toggle('on',SET.voice);$('swHead').classList.toggle('on',SET.headingUp);
  $('voiceBtn').innerHTML=SET.voice?ICON.vol:ICON.mute;
  $('legend').innerHTML=[[14,6],[28,5],[42,4],[56,3],[70,2],[84,1],[90,0],[160,-1]].map(([t,s])=>`<div>${turnSVG({kind:'turn',theta:t,sev:s})}</div>`).join('');
}
$('menuBtn').onclick=()=>{renderMenu();openSheet('sMenu')};
$('segStyle').querySelectorAll('button').forEach(b=>b.onclick=()=>{SET.style=b.dataset.v;saveSet();renderMenu();resyncMan()})
$('segTilt').querySelectorAll('button').forEach(b=>b.onclick=()=>{SET.tilt=+b.dataset.v;saveSet();layoutStage();renderMenu()});
$('rowZoom').onclick=()=>{SET.autoZoom=!SET.autoZoom;saveSet();renderMenu()};
$('rowVoice').onclick=()=>{SET.voice=!SET.voice;saveSet();renderMenu();if(!SET.voice)window.speechSynthesis?.cancel()};
$('rowHead').onclick=()=>{SET.headingUp=!SET.headingUp;saveSet();renderMenu()};
$('voiceBtn').onclick=()=>{SET.voice=!SET.voice;saveSet();renderMenu();if(!SET.voice)window.speechSynthesis?.cancel();toast(SET.voice?'Pilot włączony':'Pilot wyciszony')};

/* ---------- głos ---------- */
let voice=null,speaking=false;
function pickVoice(){const vs=speechSynthesis.getVoices().filter(v=>/^pl/i.test(v.lang));voice=vs.find(v=>/zosia|premium|enhanced/i.test(v.name))||vs[0]||null}
if('speechSynthesis'in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function unlockSpeech(){try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch{}}
function speak(text,urgent){if(!SET.voice||!('speechSynthesis'in window)||!text)return;
  try{if(urgent)speechSynthesis.cancel();else if(speechSynthesis.speaking&&speaking)return;
    const u=new SpeechSynthesisUtterance(text);u.lang='pl-PL';if(voice)u.voice=voice;u.rate=1.08;u.onstart=()=>speaking=true;u.onend=u.onerror=()=>speaking=false;speechSynthesis.speak(u)}catch{}}

/* ---------- GPS ---------- */
let gpsFix = null;
function gpsState(state, label) {
  const button=$('gpsState');
  if(button.dataset.status===state && button.lastElementChild.textContent===label)return;
  button.dataset.status=state;
  button.lastElementChild.textContent=label;
}
function freshGPS() {return gpsFix && Date.now()-gpsFix.t<45000}
$('gpsState').onclick=()=>{startGPS();if(freshGPS())setFollow(true)};
function startGPS(){if(S.watch!=null)return;if(!navigator.geolocation){gpsState('error','Brak GPS');toast('Ta przeglądarka nie obsługuje GPS','bad');return}
  gpsState('waiting','Szukam GPS');
  S.watch=navigator.geolocation.watchPosition(p=>{const c=p.coords;
    gpsFix={lat:c.latitude,lng:c.longitude,acc:c.accuracy,spd:(c.speed!=null&&isFinite(c.speed))?c.speed:null,hdg:(c.heading!=null&&isFinite(c.heading))?c.heading:null,t:p.timestamp||Date.now()};gpsState('ready','GPS aktywny');if(!SIM.on){handleFix({...gpsFix});updateConnection()}},
    e=>{gpsFix=null;gpsState('error',e.code===1?'Włącz GPS':'Brak sygnału');if(e.code===1){navigator.geolocation.clearWatch(S.watch);S.watch=null}updateConnection();toast(({1:'Brak zgody na lokalizację — włącz ją w ustawieniach',2:'Nie mogę ustalić pozycji GPS',3:'GPS długo nie odpowiada'})[e.code]||'Błąd GPS','bad',5000)},
    {enableHighAccuracy:true,maximumAge:1000,timeout:20000})}
function handleFix(f){
  const prev=S.fix;
  if(prev){const dt=(f.t-prev.t)/1000,d=hav([prev.lat,prev.lng],[f.lat,f.lng]);if(f.spd==null&&dt>.2)f.spd=d/dt;if(f.hdg==null&&d>6)f.hdg=bearing([prev.lat,prev.lng],[f.lat,f.lng])}
  if(f.hdg!=null&&(f.spd==null||f.spd>1.2))S.hdg=f.hdg;
  S.fix=f;S.fixAt=performance.now();S.spd=f.spd||0;
  $('spd').textContent=Math.round(S.spd*3.6);
  let tgt={lat:f.lat,lng:f.lng,hdg:S.hdg};
  if(S.mode==='nav'&&S.route){const r=navTick(f);if(S.mode!=='nav')return;if(r)tgt=r}
  S.tgt=tgt;
  if(!carMarker._map){carMarker.addTo(map);S.vis={lat:f.lat,lng:f.lng,hdg:S.hdg||0};if(S.follow)map.setView([f.lat,f.lng],16,{animate:false})}
  if(!SIM.on){if(f.acc>25||S.mode==='idle'){if(!accCircle)accCircle=L.circle([f.lat,f.lng],{radius:f.acc,color:'#a45cff',weight:1,fillOpacity:.07,interactive:false}).addTo(map);else accCircle.setLatLng([f.lat,f.lng]).setRadius(f.acc)}else if(accCircle){map.removeLayer(accCircle);accCircle=null}}
  if(S.mode!=='nav')updateLimit();
  if(S.mode==='nav'&&S.trip)S.trip.max=Math.max(S.trip.max,S.spd);
  if (!SIM.on) {
    S.fixN=(S.fixN||0)+1;
    if (S.fixN===1 || S.fixN%10===0) LS.set('rn_last',[f.lat,f.lng]);
  }
}

/* ---------- symulacja jazdy (test bez wychodzenia z domu) ---------- */
const SIM={t:0,on:false,mult:1,along:0,pos:null,hdg:0,detour:false,detourAt:0,timer:null,spd:20};
function simStart(){SIM.t=Date.now();SIM.on=true;SIM.along=0;SIM.detour=false;SIM.pos=null;SIM.hdg=0;if(!carMarker._map)carMarker.addTo(map);
  clearInterval(SIM.timer);SIM.timer=setInterval(simTick,250);if(accCircle){map.removeLayer(accCircle);accCircle=null};renderSim()}
function simStop(){
  const wasSimulating=SIM.on;SIM.on=false;clearInterval(SIM.timer);
  if(wasSimulating){
    S.tgt=S.vis=S.fix=null;S.spd=0;S.hdg=null;carEl=null;
    if(carMarker._map)map.removeLayer(carMarker);
    if(freshGPS() && S.mode==='idle')handleFix({...gpsFix});
    else {S.idleLim=null;updateLimit();$('spd').textContent='0'}
  }
}
function simResync(){if(!SIM.on||!SIM.pos||!S.route)return;SIM.along=project(S.route,SIM.pos).along;SIM.detour=false}
function simTick(){const R=S.route;if(!R||S.mode!=='nav')return;const dt=.25*SIM.mult;SIM.t+=dt*1000;
  const m=mansOf(R)[S.mIdx],near=m&&m.at-S.along<70&&m.type!=='arrive';let v=near?9:SIM.spd;if(S.rerouting)v=0;
  if(SIM.detour){SIM.pos=destPoint(SIM.pos,SIM.hdg,v*dt);if(Date.now()-SIM.detourAt>25000)simResync()}
  else{SIM.along=Math.min(R.total,SIM.along+v*dt);SIM.pos=pointAt(R,SIM.along);SIM.hdg=hdgAt(R,SIM.along)}
  handleFix({lat:SIM.pos[0],lng:SIM.pos[1],acc:5,spd:v,hdg:SIM.hdg,t:SIM.t})}
function simDetour(){if(!SIM.on||SIM.detour||!SIM.pos)return;SIM.detour=true;SIM.detourAt=Date.now();SIM.hdg=(SIM.hdg+90)%360;toast('Symulacja: zjeżdżasz z trasy…')}
function renderSim(){$('simRow').classList.toggle('hidden',!SIM.on);$('simMult').textContent='×'+SIM.mult}
$('simDetour').onclick=simDetour;
$('simMult').onclick=()=>{SIM.mult=SIM.mult===1?2:SIM.mult===2?4:1;renderSim()};

/* ---------- wyszukiwanie miejsc ---------- */
const PL_BBOX='14.0,48.9,24.3,55.0';
async function fetchJSON(url,ms=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
function uniq(a){return [...new Set(a.filter(Boolean))]}
async function searchPlaces(q, submitted=false){
  const m=q.match(/^\s*([+-]?\d+(?:[.,]\d+)?)\s*[;\s]\s*([+-]?\d+(?:[.,]\d+)?)\s*$/) || q.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/);
  if(m){
    const lat=Number(m[1].replace(',','.')),lng=Number(m[2].replace(',','.'));
    if(Math.abs(lat)>90 || Math.abs(lng)>180)return [];
    return [{name:'Punkt na mapie',sub:q.trim(),lat,lng,ic:'📍'}];
  }
  const c=map.getCenter();
  try{const d=await fetchJSON(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&bbox=${PL_BBOX}&lat=${c.lat.toFixed(3)}&lon=${c.lng.toFixed(3)}`);
    const out=(d.features||[]).map(f=>{const p=f.properties,[lng,lat]=f.geometry.coordinates,st=[p.street,p.housenumber].filter(Boolean).join(' ');
      const name=p.name||st||p.city||p.county||'Miejsce';return {name,sub:uniq([p.name&&st?st:null,p.city||p.town||p.village||p.county,p.state]).filter(x=>x!==name).join(' · '),lat,lng,ic:p.osm_key==='highway'?'🛣️':p.osm_key==='place'?'🏙️':'📍'}});
    if(out.length || !submitted)return out}catch(error){if(!submitted)throw error}
  const d=await fetchJSON('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=pl&addressdetails=1&q='+encodeURIComponent(q));
  return d.map(x=>({name:x.name||x.display_name.split(',')[0],sub:x.display_name.split(',').slice(1,4).join(',').trim(),lat:+x.lat,lng:+x.lon,ic:'📍'}));
}
let sTimer,sSeq=0;
function renderList(items,title){$('sList').innerHTML=(title?`<div class="lbl">${title}</div>`:'')+items.map((p,i)=>`<button class="item" data-i="${i}"><span class="ic">${p.ic||'🕘'}</span><div><b>${esc(p.name)}</b><span>${esc(p.sub||'')}</span></div></button>`).join('');
  $('sList').querySelectorAll('.item').forEach(b=>b.onclick=()=>pickPlace(items[+b.dataset.i]))}
function showRecents(){const r=LS.get('rn_recent',[]);if(!r.length){$('sList').innerHTML='<div class="empty">Wpisz adres, miejscowość lub miejsce.<br>Możesz też przytrzymać palec na mapie, aby wybrać cel.</div>';return}renderList(r,'OSTATNIE')}
$('idleTop').onclick=()=>{$('sInput').value='';showRecents();openSheet('sSearch')};
$('sBack').onclick=closeSheets;
function scheduleSearch(submitted){
  clearTimeout(sTimer);
  const seq=++sSeq,query=$('sInput').value.trim();
  if(query.length<2){showRecents();return}
  $('sList').innerHTML='<p class="empty" role="status">Szukam miejsc…</p>';
  sTimer=setTimeout(async()=>{
    try{
      const results=await searchPlaces(query,submitted);
      if(seq!==sSeq)return;
      if(results.length)renderList(results);
      else $('sList').innerHTML='<p class="empty" role="status">'+(submitted?'Brak wyników. Sprawdź pisownię lub wskaż punkt na mapie.':'Brak podpowiedzi. Naciśnij Szukaj, aby wyszukać adres.')+'</p>';
    }catch{
      if(seq===sSeq)$('sList').innerHTML='<p class="empty" role="status">Wyszukiwarka jest niedostępna. Spróbuj ponownie lub wpisz współrzędne.</p>';
    }
  },submitted?0:450);
}
$('sInput').addEventListener('input',()=>scheduleSearch(false));
$('searchForm').onsubmit=e=>{e.preventDefault();scheduleSearch(true)};
function pickPlace(p){const r=LS.get('rn_recent',[]).filter(x=>!(Math.abs(x.lat-p.lat)<1e-4&&Math.abs(x.lng-p.lng)<1e-4));r.unshift({name:p.name,sub:p.sub,lat:p.lat,lng:p.lng,ic:'🕘'});LS.set('rn_recent',r.slice(0,8));
  closeSheets();unlockSpeech();startGPS();previewTo(p)}

/* ---------- długie przytrzymanie na mapie ---------- */
let placeTmp=null;
async function longPress(x,y){if(S.mode!=='idle'||document.body.hasAttribute('data-loading')||document.body.hasAttribute('data-picking'))return;const ll=screenToLatLng(x,y);navigator.vibrate?.(25);
  placeTmp={name:'Wybrany punkt',sub:ll.lat.toFixed(5)+', '+ll.lng.toFixed(5),lat:ll.lat,lng:ll.lng};setDestMarker(placeTmp);showPlace();
  const chosen=placeTmp;
  try{const d=await fetchJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${ll.lat}&lon=${ll.lng}`,6000);
    if(placeTmp===chosen&&!$('pPlace').classList.contains('hidden')&&d&&d.display_name){const a=d.address||{};placeTmp.name=[a.road||d.name,a.house_number].filter(Boolean).join(' ')||d.display_name.split(',')[0];placeTmp.sub=uniq([a.village||a.town||a.city,a.state]).join(' · ');showPlace()}}catch{}}
function showPlace(){$('plName').textContent=placeTmp.name;$('plSub').textContent=placeTmp.sub;$('pPlace').classList.remove('hidden')}
$('plClose').onclick=()=>{$('pPlace').classList.add('hidden');placeTmp=null;setDestMarker(null)};
$('plGo').onclick=()=>{const p=placeTmp;$('pPlace').classList.add('hidden');unlockSpeech();startGPS();previewTo(p)};
$('plReport').onclick=()=>{reportAt=[placeTmp.lat,placeTmp.lng];$('pPlace').classList.add('hidden');setDestMarker(null);openSheet('sReport')};

/* ---------- routing ---------- */
const OSRM=['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car'];
async function fetchRoutes(from,to,{alts=true,hdg=null}={}){
  const q=`${from[1].toFixed(6)},${from[0].toFixed(6)};${to[1].toFixed(6)},${to[0].toFixed(6)}`;
  let qs=`overview=full&geometries=geojson&steps=true&alternatives=${alts?3:false}`;
  if(hdg!=null)qs+=`&bearings=${Math.round(hdg)},75;0,180`;
  let err;for(const b of OSRM){try{const d=await fetchJSON(`${b}/route/v1/driving/${q}?${qs}`,14000);
    if(d.code==='Ok'&&d.routes&&d.routes.length)return d.routes.map(buildRoute);err=Error(d.message||d.code)}catch(e){err=e}}
  throw err||Error('Brak połączenia z serwerem tras');
}
function drawRoutes(){routeGroup.clearLayers();
  const col=BASES[SET.base]?.sat?'#c9a6ff':'#a678ff';
  const draw=(R,i,main)=>{const pts=R.coords;
    if(!main){L.polyline(pts,{color:'#fff',weight:13,opacity:.55,lineCap:'round',lineJoin:'round',interactive:false}).addTo(routeGroup);
      L.polyline(pts,{color:'#8b93ad',weight:8,opacity:.95,lineCap:'round',lineJoin:'round',interactive:false}).addTo(routeGroup);
      L.polyline(pts,{color:'#000',weight:22,opacity:.01,interactive:true}).addTo(routeGroup).on('click',()=>selectRoute(i));return}
    L.polyline(pts,{color:'#ffffff',weight:18,opacity:.95,lineCap:'round',lineJoin:'round',interactive:false}).addTo(routeGroup);
    S.mainLine=L.polyline(pts,{color:'#7c3aed',weight:12,opacity:1,lineCap:'round',lineJoin:'round',interactive:false}).addTo(routeGroup);
    S.mainLine2=L.polyline(pts,{color:col,weight:5,opacity:.9,lineCap:'round',lineJoin:'round',interactive:false}).addTo(routeGroup)};
  if(S.mode==='preview')S.routes.forEach((R,i)=>{if(i!==S.sel)draw(R,i,false)});
  const R=S.mode==='preview'?S.routes[S.sel]:S.route;if(R)draw(R,S.sel,true)}
function fitScreen(b,{top=110,bottom=300,left=34,right=34}={}){
  const vw=innerWidth,vh=innerHeight,aw=Math.max(80,vw-left-right),ah=Math.max(120,vh-top-bottom),zm=18,nw=map.project(b.getNorthWest(),zm),se=map.project(b.getSouthEast(),zm);
  const w=Math.max(1,se.x-nw.x),h=Math.max(1,se.y-nw.y);let z=zm-Math.log2(Math.max(w/aw,h/ah));z=Math.max(3,Math.min(17,z));
  const k=Math.pow(2,z-zm),bc=L.point((nw.x+se.x)/2*k,(nw.y+se.y)/2*k),mc=L.point(bc.x-(left+aw/2-S.cx),bc.y-(top+ah/2-S.cy));
  map.setView(map.unproject(mc,z),z,{animate:true})}
function fitRoutes(){setFollow(false);const R=S.routes[S.sel];if(!R)return;const b=L.latLngBounds(R.coords);if(previewOrigin)b.extend(previewOrigin);const card=$('bottom').getBoundingClientRect();fitScreen(b,sidePanelLayout()?{top:35,bottom:45,left:card.right+12,right:64}:{top:48,bottom:innerHeight-card.top+16})}
let routeRequest=0, previewOrigin=null, previewFromGPS=false;
function setLoading(active){
  document.body.toggleAttribute('data-loading',active);
  $('loadingPanel').hidden=!active;
}
function stopPicking(){
  document.body.removeAttribute('data-picking');$('pickPanel').hidden=true;$('mapAim').hidden=true;
}
$('pointBtn').onclick=()=>{
  placeTmp=null;setDestMarker(null);setFollow(false);
  document.body.setAttribute('data-picking','');$('pickPanel').hidden=false;$('mapAim').hidden=false;
};
$('pickCancel').onclick=stopPicking;
$('pickConfirm').onclick=()=>{
  const ll=screenToLatLng(innerWidth/2,innerHeight/2);stopPicking();
  placeTmp={name:'Wybrany punkt',sub:ll.lat.toFixed(5)+', '+ll.lng.toFixed(5),lat:ll.lat,lng:ll.lng};
  setDestMarker(placeTmp);showPlace();
};
function cancelPreview(){
  routeRequest++;setLoading(false);S.routes=[];S.dest=null;placeTmp=null;
  $('pPlace').classList.add('hidden');routeGroup.clearLayers();setDestMarker(null);setMode('idle');
}
$('routeCancel').onclick=cancelPreview;
$('routeRetry').onclick=()=>{if(S.dest)previewTo(S.dest)};
async function previewTo(p){
  const request=++routeRequest;stopPicking();placeTmp=null;$('pPlace').classList.add('hidden');
  S.dest=p;S.routes=[];S.route=null;setMode('idle');setFollow(false);routeGroup.clearLayers();setDestMarker(p);
  const c=map.getCenter();previewFromGPS=Boolean(freshGPS());
  previewOrigin=previewFromGPS?[gpsFix.lat,gpsFix.lng]:[c.lat,c.lng];
  $('routeStatus').textContent='Wyznaczam trasę…';$('routeTarget').textContent=p.name;
  $('routeRetry').hidden=true;setLoading(true);
  try{
    const routes=await fetchRoutes(previewOrigin,[p.lat,p.lng]);if(request!==routeRequest)return;
    S.routes=routes.slice().sort((a,b)=>a.duration-b.duration);S.sel=0;setLoading(false);setMode('preview');
    $('pvName').textContent=p.name;$('pvSub').textContent=p.sub||'';
    $('pvOrigin').textContent=previewFromGPS?'Start: Twoja pozycja GPS':'Start: środek mapy';
    renderSaveButton();renderChips();drawRoutes();fitRoutes();
  }catch{
    if(request!==routeRequest)return;
    $('routeStatus').textContent='Nie udało się wyznaczyć trasy';
    $('routeTarget').textContent='Cel: '+p.name;$('routeRetry').hidden=false;
  }
}
function savedPlaces(){return LS.get('rn_saved',[])}
function samePlace(a,b){return Math.abs(a.lat-b.lat)<.0001 && Math.abs(a.lng-b.lng)<.0001}
function renderSaveButton(){
  const saved=savedPlaces().some(p=>samePlace(p,S.dest));
  $('savePlace').textContent=saved?'★ Zapisano':'☆ Zapisz';$('savePlace').setAttribute('aria-pressed',String(saved));
}
$('savePlace').onclick=()=>{
  const p=S.dest;if(!p)return;
  const saved=savedPlaces();const found=saved.some(x=>samePlace(x,p));
  LS.set('rn_saved',found?saved.filter(x=>!samePlace(x,p)):[{name:p.name,sub:p.sub,lat:p.lat,lng:p.lng},...saved]);
  renderSaveButton();
};
function renderSaved(){
  const saved=savedPlaces(),list=$('savedList');
  list.innerHTML=saved.length?saved.map((p,i)=>`<div class="saved-row"><button class="item" data-open="${i}"><span class="ic" aria-hidden="true">★</span><div><b>${esc(p.name)}</b><span>${esc(p.sub)}</span></div></button><button class="iconbtn" data-remove="${i}" aria-label="Usuń z zapisanych: ${esc(p.name)}">${ICON.close}</button></div>`).join(''):'<p class="empty">W podglądzie trasy dotknij „☆ Zapisz”. Cel pojawi się tutaj.</p>';
}
$('savedBtn').onclick=()=>{renderSaved();openSheet('sSaved')};
$('savedList').onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  const saved=savedPlaces();
  if(button.hasAttribute('data-open')){const p=saved[Number(button.dataset.open)];if(p)pickPlace(p)}
  else {saved.splice(Number(button.dataset.remove),1);LS.set('rn_saved',saved);renderSaved();$('sSaved').querySelector('button').focus()}
};
function renderChips(){const base=S.routes[0].duration;
  $('chips').innerHTML=S.routes.map((R,i)=>{const dd=Math.round((R.duration-base)/60),dist=fmtDist(R.total);
    return `<button class="rchip ${i===S.sel?'sel':''}" aria-pressed="${i===S.sel}" data-i="${i}"><div class="a">${i===0?'NAJSZYBSZA':'ALTERNATYWA '+i}</div><div class="b">${fmtDur(R.duration)}</div><div class="c">${dist.v} ${dist.u}</div>${i>0?`<div class="d">${dd>0?'+'+dd:dd===0?'≈ tyle samo':dd} ${dd!==0?'min':''}</div>`:''}</button>`}).join('');
  $('chips').querySelectorAll('.rchip').forEach(b=>b.onclick=()=>selectRoute(+b.dataset.i))}
function selectRoute(i){S.sel=i;renderChips();drawRoutes();fitRoutes()}
$('pvClose').onclick=cancelPreview;
$('pvGo').onclick=()=>{
  unlockSpeech();startGPS();
  if(!freshGPS()){toast('Do jazdy potrzebna jest pozycja GPS. Możesz uruchomić symulację.','bad',4500);return}
  if(!previewFromGPS || hav(previewOrigin,[gpsFix.lat,gpsFix.lng])>100){previewTo(S.dest);return}
  startNav(false);
};
$('pvSim').onclick=()=>{unlockSpeech();startNav(true)};

/* ---------- nawigacja ---------- */
let lastManKey=null;
function applyRoute(R,{reroute=false}={}){S.route=R;S.along=0;S.hint=null;S.mIdx=0;S.off=0;S.warned=new Set();lastManKey=null;S.doneAt=0;
  R.mans.forEach(m=>{m.said={}});drawRoutes();computeIncOnRoute();S.safeOn=[];computeSafeOnRoute();ensureAlongRoute();simResync();if(S.mode==='nav')setTimeout(loadLimits,100)}
function startNav(sim){const R=S.routes[S.sel];if(!R)return;
  setMode('nav');S.routes=[];applyRoute(R);S.trip={t0:Date.now(),max:0,reroutes:0};S.along=0;S.onRoute=true;
  if(sim){SIM.mult=1;simStart()}else{simStop();renderSim();startGPS()}
  setFollow(true);S.zoomBias=0;
  if((sim||!S.vis)&&S.route){const p=S.route.coords[0];S.vis={lat:p[0],lng:p[1],hdg:hdgAt(S.route,0)};S.tgt={lat:p[0],lng:p[1],hdg:S.vis.hdg};S.fixAt=performance.now();if(!carMarker._map)carMarker.addTo(map)}
  requestWake();
  const first=mansOf(R)[0];
  speak(`Trasa gotowa. ${spokenDist(R.total)}, około ${fmtDur(R.duration).replace(' h ',' godzin ').replace('min','minut')}. `+(first&&first.at>1200?`Jedź prosto ${spokenDist(first.at)}.`:'Powodzenia, pilocie.'),true);
  updateConnection();updateNavUI();map.setView(S.vis?[S.vis.lat,S.vis.lng]:map.getCenter(),SET.tilt>0?16.6:17,{animate:false})}
function endNav(){routeRequest++;setMode('idle');simStop();S.rerouting=false;S.route=null;S.routes=[];S.dest=null;S.onRoute=false;routeGroup.clearLayers();setDestMarker(null);releaseWake();window.speechSynthesis?.cancel();
  document.body.classList.remove('busy');S.zoomBias=0;setMode('idle');setFollow(true);renderSim()}
$('endBtn').onclick=()=>{if(confirm('Zakończyć nawigację?'))endNav()};
async function requestWake(){
  if(!('wakeLock' in navigator)||S.wake||S.wakePending)return;
  S.wakePending=true;
  try {
    const lock=await navigator.wakeLock.request('screen');
    if(S.mode!=='nav'){await lock.release();return}
    S.wake=lock;lock.addEventListener('release',()=>{if(S.wake===lock)S.wake=null});
  }catch{}finally{S.wakePending=false}
}
function releaseWake(){try{S.wake?.release()}catch{}S.wake=null}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.mode==='nav'&&!S.wake)requestWake()});

function navTick(f){
  const R=S.route,p=[f.lat,f.lng],pr=project(R,p,S.hint);S.hint=pr.i;
  const thr=Math.max(45,(f.acc||10)*1.7);
  if(pr.d>thr){S.onRoute=false;S.off++;
    if(S.off>=3&&!S.rerouting&&Date.now()-S.lastReroute>6000)reroute();
    updateNavUI();return null}
  S.off=0;S.onRoute=true;S.along=Math.max(pr.along,S.along-30);
  {const Ls=mansOf(R);while(S.mIdx<Ls.length-1&&Ls[S.mIdx].at<S.along-18)S.mIdx++}
  voiceTick(f);incTick(f);updateLimit();
  if(R.total-S.along<28&&!S.doneAt){S.doneAt=Date.now();arrived();return null}
  updateNavUI();
  return {lat:pr.pt[0],lng:pr.pt[1],hdg:hdgAt(R,S.along)};
}
function voiceTick(f){const R=S.route,Ls=mansOf(R),m=Ls[S.mIdx];if(!m)return;const dist=m.at-S.along,v=Math.max(S.spd,7),style=SET.style,curve=m.type==='curve';if(curve&&m.d.sev>=6){m.said.near=m.said.far=1;return}
  const nearT=Math.max(curve?70:90,Math.min(320,v*(curve?8:10))),farT=Math.max(420,Math.min(2000,v*32)),nx=Ls[S.mIdx+1];
  const ph=x=>style==='rally'?x.d.call:x.d.classic;
  if(m.type==='arrive'){if(dist<farT&&!m.said.far&&dist>nearT){m.said.far=1;speak(`Za ${spokenDist(dist)} meta.`)}return}
  if(dist<nearT&&!m.said.near){m.said.near=1;m.said.far=1;let s=ph(m);if(style==='rally'&&m.d.sev<=1&&m.d.kind!=='round')s='Uwaga! '+s;
    else if(style!=='rally'&&m.name)s+=`, ${m.name}`;
    if(nx&&nx.at-m.at<260&&nx.type!=='arrive')s+=`, potem ${style==='rally'?nx.d.call:nx.d.short}`;speak(s,!curve||m.d.sev<=3)}
  else if(dist<farT&&dist>nearT+160&&!m.said.far&&(!curve||m.d.sev<=3)){m.said.far=1;let s=`Za ${spokenDist(dist)}, ${ph(m)}`;if(nx&&nx.at-m.at<300&&nx.type!=='arrive')s+=`, potem ${style==='rally'?nx.d.call:nx.d.short}`;speak(s)}}
function updateNavUI(){const R=S.route;if(!R)return;
  const Ls=mansOf(R);let di=Math.min(S.mIdx,Ls.length-1);
  while(di<Ls.length-1){const x=Ls[di];if(!(x.type==='curve'&&x.sev>=5&&x.at-S.along>=350))break;di++}
  const m=Ls[di],dist=Math.max(0,m.at-S.along),fd=fmtDist(dist),nx=Ls[di+1],showThen=!!nx&&m.type!=='arrive'&&nx.at-m.at<500;
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1),rally=SET.style==='rally',key=m.id+SET.style+(showThen?'/'+nx.id:'');
  if(key!==lastManKey){lastManKey=key;$('bnIcon').innerHTML=turnSVG(m.d);
    $('bnStreet').textContent=m.type==='arrive'?'Cel podróży':cap(rally?m.d.call:m.d.classic)+(m.name?' · '+m.name:'');
    $('then').classList.toggle('hidden',!showThen);
    if(showThen){$('thenIcon').innerHTML=turnSVG(nx.d);$('thenTxt').textContent='Potem '+(rally?nx.d.call:nx.d.short);const g=fmtDist(nx.at-m.at);$('thenDist').textContent=g.v+' '+g.u}}
  $('bnDist').innerHTML=fd.v+'<small>'+fd.u+'</small>';
  document.body.classList.toggle('busy',S.rerouting||!S.onRoute&&S.off>0);
  const rem=Math.max(0,R.total-S.along),remT=R.duration*(rem/R.total),rd=fmtDist(rem);
  $('stRem').innerHTML=rd.v+'<small>'+rd.u+'</small>';
  $('stTime').innerHTML=fmtDur(remT).replace(' min','')+(remT>=3600?'':'<small>min</small>');
  const eta=new Date(Date.now()+remT*1000);$('stEta').textContent=String(eta.getHours()).padStart(2,'0')+':'+String(eta.getMinutes()).padStart(2,'0');
  if(S.mainLine&&(!S.lastTrim||Date.now()-S.lastTrim>1500)&&S.onRoute){S.lastTrim=Date.now();
    const i=S.hint||0,pts=[S.vis?[S.vis.lat,S.vis.lng]:R.coords[i],...R.coords.slice(i+1)];S.mainLine.setLatLngs(pts);S.mainLine2&&S.mainLine2.setLatLngs(pts);
    routeGroup.eachLayer(l=>{if(l.options&&l.options.weight===18)l.setLatLngs(pts)})}
}
function arrived(){speak('Meta! Dojechałeś do celu.',true);const T=S.trip||{t0:Date.now(),max:0},R=S.route,sec=(Date.now()-T.t0)/1000,d=fmtDist(R.total);
  $('sumDist').textContent=d.v+' '+d.u;$('sumTime').textContent=fmtDur(sec);$('sumAvg').textContent=Math.round(R.total/Math.max(sec,1)*3.6)+' km/h';$('sumMax').textContent=Math.round(T.max*3.6)+' km/h';
  $('sumRe').textContent=T.reroutes||0;endNav();openSheet('sSummary')}
async function reroute(why){if(S.rerouting||!S.dest||!S.fix)return;const request=routeRequest;S.rerouting=true;S.lastReroute=Date.now();document.body.classList.add('busy');
  if(!why)speak('Zjechałeś z trasy. Przeliczam.',true);toast('Przeliczam trasę…');
  try{const f=S.fix,R=(await fetchRoutes([f.lat,f.lng],[S.dest.lat,S.dest.lng],{alts:false,hdg:S.spd>2&&S.hdg!=null?S.hdg:null}))[0];
    if(request!==routeRequest)return;applyRoute(R,{reroute:true});if(S.trip)S.trip.reroutes++;S.onRoute=true;speak(why==='avoid'?'Wyznaczyłem objazd.':'Nowa trasa.');toast('Nowa trasa gotowa','good',2000)}
  catch(e){if(request!==routeRequest)return;toast('Brak połączenia — spróbuję ponownie','bad');S.lastReroute=Date.now()-3500}
  finally{if(request===routeRequest){S.rerouting=false;document.body.classList.remove('busy')}}}

/* ---------- ostrzeżenia: fotoradary, odcinkowy pomiar, kamery na czerwonym, przejazdy, światła (OpenStreetMap) ---------- */
const SK={cam:{ic:'📸',n:'Fotoradar',c:'#ff5a67',thr:900,say:'Fotoradar'},sec:{ic:'⏱️',n:'Odcinkowy pomiar prędkości',c:'#ff8a3d',thr:1200,say:'Odcinkowy pomiar prędkości'},
  red:{ic:'🚦',n:'Kamera na czerwonym świetle',c:'#ff3b3b',thr:500,say:'Kamera na czerwonym świetle'},rail:{ic:'🚆',n:'Przejazd kolejowy',c:'#d9b341',thr:450,say:'Przejazd kolejowy'},light:{ic:'🚦',n:'Sygnalizacja świetlna',c:'#6fe3ff',thr:300,say:'Światła'}};
const SAFE={items:new Map(),cells:new Map(),q:[],busy:false};
const safeGroup=L.layerGroup().addTo(map);
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
async function overpass(q){let err;for(const u of OVERPASS){const c=new AbortController(),t=setTimeout(()=>c.abort(),30000);
  try{const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}catch(e){err=e}finally{clearTimeout(t)}}throw err}
function addSafe(list){for(const it of list){if(SAFE.items.has(it.id))continue;
  if(it.k==='cam'||it.k==='red'){let dup=false;for(const o of SAFE.items.values())if(o.k===it.k&&Math.abs(o.lat-it.lat)<.0002&&Math.abs(o.lng-it.lng)<.0003&&hav([o.lat,o.lng],[it.lat,it.lng])<15){dup=true;if(it.max&&!o.max)o.max=it.max;break}if(dup)continue}
  SAFE.items.set(it.id,it)}}
function ensureCell(i,j){const key=i+','+j,c=SAFE.cells.get(key);if(c==='ok'||c==='busy'||(c&&c.retry>Date.now()))return;
  const cached=LS.get('rn_sf:'+key,null);if(cached&&Date.now()-cached.t<7*864e5){addSafe(cached.items);SAFE.cells.set(key,'ok');return}
  SAFE.cells.set(key,'busy');SAFE.q.push([i,j]);safePump()}
async function safePump(){if(SAFE.busy)return;SAFE.busy=true;
  while(SAFE.q.length){const [i,j]=SAFE.q.shift(),key=i+','+j,b=`${i/10},${j/10},${(i+1)/10},${(j+1)/10}`;
    try{const d=await overpass(`[out:json][timeout:25];(node["highway"="speed_camera"](${b});node["enforcement"](${b});relation["type"="enforcement"]["enforcement"~"^(maxspeed|average_speed|traffic_signals)$"](${b});node["highway"="traffic_signals"](${b});node["railway"="level_crossing"](${b}););out geom;`);
      const items=parseOverpass(d);addSafe(items);SAFE.cells.set(key,'ok');
      try{localStorage.setItem('rn_sf:'+key,JSON.stringify({t:Date.now(),items}))}catch{try{Object.keys(localStorage).filter(k=>k.startsWith('rn_sf:')).slice(0,15).forEach(k=>localStorage.removeItem(k))}catch{}}
      renderSafety();computeSafeOnRoute()}
    catch{SAFE.cells.set(key,{retry:Date.now()+60000})}
    await new Promise(r=>setTimeout(r,1200))}
  SAFE.busy=false}
function ensureAlongRoute(ahead=25000){if(!S.route)return;const R=S.route,s0=Math.max(0,S.along-500),s1=Math.min(R.total,S.along+ahead),seen=new Set();
  for(let s=s0;s<=s1+400;s+=500){const p=pointAt(R,Math.min(s,R.total)),i=Math.floor(p[0]*10),j=Math.floor(p[1]*10),k=i+','+j;if(!seen.has(k)){seen.add(k);ensureCell(i,j)}}}
function renderSafety(){safeGroup.clearLayers();if(map.getZoom()<12)return;const b=map.getBounds().pad(.2);let n=0;
  for(const it of SAFE.items.values()){if(it.k==='light'||!SET.warn[it.k]||n>450)continue;if(!b.contains([it.lat,it.lng]))continue;n++;const d=SK[it.k];
    if(it.k==='sec'&&it.pts)L.polyline(it.pts,{color:d.c,weight:6,opacity:.75,dashArray:'2 10',lineCap:'round',interactive:false}).addTo(safeGroup);
    L.marker([it.lat,it.lng],{zIndexOffset:200,icon:L.divIcon({className:'',iconSize:[30,30],iconAnchor:[15,15],html:`<div class="inc cr" style="width:30px;height:30px;font-size:15px;background:${d.c}">${d.ic}</div>`})})
      .addTo(safeGroup).on('click',()=>toast(`${d.ic} ${d.n}${it.max?' · limit '+it.max+' km/h':''} (dane OSM)`,null,3500))}}
let sfT;map.on('moveend',()=>{clearTimeout(sfT);sfT=setTimeout(()=>{if(map.getZoom()<12)return;
  if(S.mode!=='nav'){const c=map.getCenter();ensureCell(Math.floor(c.lat*10),Math.floor(c.lng*10))}renderSafety()},500)});
function computeSafeOnRoute(){S.safeOn=[];const R=S.route;if(!R)return;
  for(const it of SAFE.items.values()){if(!SET.warn[it.k])continue;
    if(it.k==='sec'&&it.pts){const a=projectNear(R,it.pts[0],40),b=projectNear(R,it.pts[it.pts.length-1],40);
      if(a&&b){const s0=Math.min(a.along,b.along),s1=Math.max(a.along,b.along);if(s1-s0>150)S.safeOn.push({it,at:s0,end:s1})}}
    else{const p=projectNear(R,[it.lat,it.lng],it.k==='light'?28:30);if(p)S.safeOn.push({it,at:p.along})}}
  S.safeOn.sort((a,b)=>a.at-b.at)}
setInterval(()=>{if(S.mode==='nav')ensureAlongRoute()},10000);
$('warnBox').innerHTML='';

/* ---------- ograniczenie prędkości na bieżącej drodze (OSM maxspeed) ---------- */
const LIM={busy:false},IDLE={busy:false,t:0};
async function loadLimits(){const R=S.route;if(!R||LIM.busy)return;if(!R.limDone){R.limDone=new Set();R.limits=[];R.limRetry={}}
  const CH=2500,c0=Math.floor(Math.max(0,S.along-200)/CH),c1=Math.floor(Math.min(R.total,S.along+6000)/CH);
  for(let c=c0;c<=c1;c++){if(R.limDone.has(c)||(R.limRetry[c]||0)>Date.now())continue;
    LIM.busy=true;
    try{const s1=Math.min(R.total,(c+1)*CH+100),pts=[];for(let s=c*CH;s<=s1;s+=100){const p=pointAt(R,s);pts.push(p[0].toFixed(5),p[1].toFixed(5))}
      const d=await overpass(`[out:json][timeout:25];way(around:25,${pts.join(',')})["highway"][~"^maxspeed"~"."];out tags geom;`);
      if(S.route===R){R.limits.push(...limitsFromWays(R,d.elements||[]));R.limDone.add(c);updateLimit()}}
    catch{R.limRetry[c]=Date.now()+45000}
    finally{LIM.busy=false}
    return}}
setInterval(()=>{if(S.mode==='nav')loadLimits()},3000);
async function idleLimitFetch(){if(S.mode==='nav'||!S.fix||S.spd<3||IDLE.busy||Date.now()-IDLE.t<20000)return;IDLE.busy=true;IDLE.t=Date.now();
  try{const f=S.fix,d=await overpass(`[out:json][timeout:15];way(around:18,${f.lat},${f.lng})["highway"][~"^maxspeed"~"."];out tags geom;`);let best=null;
    for(const w of d.elements||[]){if(!w.geometry||!w.tags)continue;const md=Math.min(...w.geometry.map(g=>hav([f.lat,f.lng],[g.lat,g.lon])));
      const v=parseMaxspeed(w.tags['maxspeed'])??parseMaxspeed(w.tags['maxspeed:forward']);if(v!=null&&(!best||md<best.d))best={d:md,v}}
    S.idleLim=best?{v:best.v,t:Date.now()}:null;updateLimit()}catch{}finally{IDLE.busy=false}}
setInterval(idleLimitFetch,5000);
function updateLimit(){let v=null;
  if(S.mode==='nav'&&S.route&&S.route.limits)v=limitAt(S.route.limits,S.along);
  else if(S.mode!=='nav'&&S.idleLim&&Date.now()-S.idleLim.t<45000&&S.spd>1)v=S.idleLim.v;
  const el=$('limitSign');if(v==null){el.classList.add('hidden');$('spd').style.color='';return}
  el.classList.remove('hidden');$('limV').textContent=v;const over=S.spd*3.6>v+3;el.classList.toggle('over',over);$('spd').style.color=over?'#ff6b78':''}

/* ---------- zgłoszenia na drodze ---------- */
const INC={korek:{ic:'🚗',n:'Korek',c:'#ff4d5e',ttl:40,avoid:1},wypadek:{ic:'💥',n:'Wypadek',c:'#ff7b50',ttl:90,avoid:1},roboty:{ic:'🚧',n:'Roboty drogowe',c:'#ffb020',ttl:360,avoid:1},
  policja:{ic:'👮',n:'Kontrola drogowa',c:'#48a5ff',ttl:30},przeszkoda:{ic:'⚠️',n:'Przeszkoda na drodze',c:'#ffd23d',ttl:60,avoid:1},slisko:{ic:'❄️',n:'Śliska nawierzchnia',c:'#7fe3ff',ttl:120}};
let incs=LS.get('rn_inc',[]).filter(i=>INC[i.type]&&Date.now()<i.t+INC[i.type].ttl*60000);
const saveInc=()=>LS.set('rn_inc',incs);
let reportAt=null;
function renderInc(){incGroup.clearLayers();incs=incs.filter(i=>Date.now()<i.t+INC[i.type].ttl*60000);
  incs.forEach(i=>{const d=INC[i.type];L.marker([i.lat,i.lng],{zIndexOffset:300,icon:L.divIcon({className:'',iconSize:[38,38],iconAnchor:[19,19],html:`<div class="inc cr" style="background:${d.c}">${d.ic}</div>`})})
    .addTo(incGroup).on('click',()=>openInc(i))})}
function openInc(i){const d=INC[i.type],mins=Math.round((Date.now()-i.t)/60000);
  $('icTitle').textContent=d.ic+' '+d.n;$('icSub').textContent=(mins<1?'przed chwilą':mins+' min temu')+(i.note?' · '+i.note:'')+(i.up?` · potwierdzone ${i.up}×`:'');$('sInc').dataset.id=i.id;openSheet('sInc')}
$('icYes').onclick=()=>{const i=incs.find(x=>x.id===$('sInc').dataset.id);if(i){i.up=(i.up||0)+1;i.t=Math.max(i.t,Date.now()-INC[i.type].ttl*30000);saveInc()}closeSheets();toast('Dzięki za potwierdzenie','good')};
$('icNo').onclick=()=>{incs=incs.filter(x=>x.id!==$('sInc').dataset.id);saveInc();renderInc();computeIncOnRoute();closeSheets();toast('Zgłoszenie usunięte')};
$('reportBtn').onclick=()=>{reportAt=null;openSheet('sReport')};
$('reportGrid').innerHTML=Object.entries(INC).map(([k,d])=>`<button class="rt" data-k="${k}" style="border-color:${d.c}88;color:${d.c}"><span class="e">${d.ic}</span><span style="color:#fff">${d.n}</span></button>`).join('');
$('reportGrid').querySelectorAll('.rt').forEach(b=>b.onclick=()=>{
  const at=reportAt||(S.vis?[S.vis.lat,S.vis.lng]:(()=>{const c=map.getCenter();return [c.lat,c.lng]})());
  const i={id:'i'+Date.now().toString(36),type:b.dataset.k,lat:at[0],lng:at[1],t:Date.now(),up:0};incs.push(i);saveInc();renderInc();computeIncOnRoute();closeSheets();reportAt=null;
  navigator.vibrate?.(30);toast(`${INC[i.type].ic} Dodano: ${INC[i.type].n} · ważne ok. ${INC[i.type].ttl} min`,'good');speak('Zgłoszenie dodane.')});
function computeIncOnRoute(){S.incOn=[];if(!S.route)return;for(const i of incs){const p=project(S.route,[i.lat,i.lng],null);if(p.d<45)S.incOn.push({inc:i,along:p.along})}}
function kmhSay(v){const n=Math.round(v),a=n%100,b=n%10;return n+((a<10||a>20)&&b>=2&&b<=4?' kilometry':' kilometrów')+' na godzinę'}
function incTick(f){if(!S.route)return;const box=$('incWarn');let show=null;
  // aktywny odcinkowy pomiar (średnia prędkość na odcinku)
  for(const o of S.safeOn){if(o.it.k!=='sec')continue;
    if(S.along>=o.at&&S.along<=o.end){if(!o.entered){o.entered={t:f.t,a:S.along};speak(`Wjeżdżasz na odcinkowy pomiar prędkości${o.it.max?'. Limit '+o.it.max:''}.`,true)}
      const el=(f.t-o.entered.t)/1000,avg=el>6?(S.along-o.entered.a)/el*3.6:null,left=fmtDist(o.end-S.along);o.avg=avg;
      show={em:'⏱️',t:`Odcinkowy pomiar · ${left.v} ${left.u} do końca`,s:(avg!=null?`średnia ${Math.round(avg)} km/h`:'liczę średnią…')+(o.it.max?` · limit ${o.it.max}`:''),go:false};break}
    else if(S.along>o.end&&o.entered&&!o.left){o.left=1;speak(`Koniec odcinkowego pomiaru.${o.avg!=null?' Średnia '+kmhSay(o.avg)+'.':''}`,true)}}
  if(!show){let best=null;
    for(const o of S.incOn){const a=o.along-S.along;if(a<-40||Date.now()>o.inc.t+INC[o.inc.type].ttl*60000)continue;if(a<3500&&(!best||a<best.a))best={a,inc:o.inc}}
    let sb=null;for(const o of S.safeOn){const a=o.at-S.along,k=SK[o.it.k];if(a<25||a>k.thr*1.6)continue;
      if(o.it.k==='light'&&(a>k.thr||S.spd<5))continue;if(!sb||a<sb.a)sb={a,o}}
    if(sb&&(!best||sb.a<best.a)){const o=sb.o,k=SK[o.it.k],fd=fmtDist(sb.a);
      show={em:k.ic,t:`${k.n} za ${fd.v} ${fd.u}`,s:(o.it.max?`limit ${o.it.max} km/h · `:'')+'dane OSM',go:false};
      const th=Math.max(k.thr*.6,Math.min(k.thr,S.spd*14));
      if(sb.a<th&&!S.warned.has(o.it.id)){S.warned.add(o.it.id);speak(`${k.say} za ${spokenDist(sb.a)}${o.it.max?', limit '+o.it.max:''}.`,true)}}
    else if(best){const d=INC[best.inc.type],fd=fmtDist(best.a);S.warnInc=best.inc;
      show={em:d.ic,t:`${d.n} za ${fd.v} ${fd.u}`,s:`zgłoszenie kierowcy · ${Math.round((Date.now()-best.inc.t)/60000)} min temu`,go:!!d.avoid};
      if(best.a<1400&&!S.warned.has(best.inc.id)){S.warned.add(best.inc.id);speak(`Uwaga, ${d.n.toLowerCase()} za ${spokenDist(best.a)}.`,true)}}}
  if(!show){box.classList.add('hidden');return}
  box.classList.remove('hidden');$('iwEm').textContent=show.em;$('iwT').innerHTML=`${esc(show.t)}<small>${esc(show.s)}</small>`;$('iwGo').classList.toggle('hidden',!show.go)}
$('iwGo').onclick=async()=>{const inc=S.warnInc,request=routeRequest;if(!inc||!S.fix||S.rerouting)return;S.rerouting=true;document.body.classList.add('busy');toast('Szukam objazdu…');
  try{const f=S.fix,rs=await fetchRoutes([f.lat,f.lng],[S.dest.lat,S.dest.lng],{alts:true,hdg:S.spd>2&&S.hdg!=null?S.hdg:null});
    if(request!==routeRequest)return;
    const ok=rs.filter(R=>project(R,[inc.lat,inc.lng],null).d>140).sort((a,b)=>a.duration-b.duration)[0];
    if(!ok){toast('Brak sensownego objazdu — to jedyna droga','bad',4500)}
    else{const old=S.route.duration*((S.route.total-S.along)/S.route.total);applyRoute(ok);if(S.trip)S.trip.reroutes++;S.onRoute=true;const dm=Math.round((ok.duration-old)/60);
      speak('Wyznaczyłem objazd.');toast(`Objazd gotowy · ${dm>0?'+'+dm:dm} min`,'good',3500)}}
  catch{if(request===routeRequest)toast('Nie udało się wyznaczyć objazdu','bad')}finally{if(request===routeRequest){S.rerouting=false;document.body.classList.remove('busy')}}};

function updateConnection(){
  $('connectionNote').hidden=navigator.onLine!==false;
  if(S.mode!=='nav')return;
  const lost=!SIM.on && !freshGPS();$('signalWarning').hidden=!lost;
  if(lost)$('spd').textContent='—';
}
addEventListener('online',updateConnection);addEventListener('offline',updateConnection);
setInterval(updateConnection,5000);
/* ---------- start ---------- */
$('sumClose').onclick=closeSheets;
if('ResizeObserver' in window)new ResizeObserver(entries=>document.documentElement.style.setProperty('--bottom-h',entries[0].target.offsetHeight+'px')).observe($('bottom'));
setBase(SET.base);layoutStage();setMode('idle');renderInc();renderMenu();setFollow(true);
setInterval(renderInc,60000);
updateConnection();startGPS();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
setTimeout(layoutStage,300);

})();

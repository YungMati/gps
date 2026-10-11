// RallyNav — cache powłoki aplikacji + kafelków map (żeby mapa nie doczytywała się w trakcie jazdy)
const CACHE='rallynav-shell-v8';
const TCACHE='rallynav-tiles-w'+Math.floor(Date.now()/(7*864e5)); // kafelki odświeżają się co tydzień
const MAXTILES=6000;
const TILE_HOSTS=['tile.openstreetmap.org','server.arcgisonline.com'];
const SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-180.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
let puts=0;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!==TCACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
async function trim(c){const ks=await c.keys();if(ks.length>MAXTILES)await Promise.all(ks.slice(0,ks.length-MAXTILES+500).map(k=>c.delete(k)))}
async function tile(req){
  const c=await caches.open(TCACHE),hit=await c.match(req.url);if(hit)return hit;
  try{const res=await fetch(req);if(res&&(res.ok||res.type==='opaque')){c.put(req.url,res.clone());if(++puts%150===0)trim(c)}return res}
  catch(e){return Response.error()}
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(TILE_HOSTS.includes(u.hostname)){e.respondWith(tile(e.request));return}
  if(u.origin===location.origin){ // własne pliki: najpierw sieć (aktualizacje), cache jako zapas offline
    e.respondWith(fetch(e.request).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return res}).catch(()=>caches.match(e.request).then(h=>h||caches.match('./index.html'))));
    return;
  }
  if(u.hostname==='unpkg.com')e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return res})));
});

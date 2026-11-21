const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const scope = 'https://example.test/gps/';
const navigation = vm.runInNewContext(fs.readFileSync(path.join(root,'assets/navigation.js'),'utf8')+'\nRallyNav;');

test('OSRM geometry keeps coordinate order, arrival and distance on the selected route', () => {
  const route = navigation.buildRoute({
    geometry:{coordinates:[[21.01,52.23],[21.015,52.23],[21.015,52.232]]},duration:100,distance:560,
    legs:[{steps:[{distance:340,maneuver:{type:'depart'}},{distance:220,name:'Celna',maneuver:{type:'turn',modifier:'left',bearing_before:90,bearing_after:0}},{distance:0,maneuver:{type:'arrive'}}]}]
  });
  assert.deepEqual(Array.from(route.coords[0]),[52.23,21.01]);
  assert.equal(route.cls.at(-1).type,'arrive');
  assert.ok(Math.abs(route.total-560)<15);
  assert.ok(navigation.project(route,[52.23,21.015]).d<1);
});

function worker() {
  const handlers = {}, deleted = [], stored = new Map();
  const caches = {
    open:async()=>({
      addAll:async reqs=>{for(const req of reqs){
        const relative=new URL(req.url).pathname.slice('/gps/'.length);
        assert.ok(fs.statSync(path.join(root,relative)).isFile(),relative);
        stored.set(req.url,{relative});
      }},
      match:async key=>stored.get(key)
    }),
    keys:async()=>['rallynav-shell-v8','rallynav-tiles-w2500','other-app'],
    delete:async key=>deleted.push(key)
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{
    URL,Request,caches,self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(type,cb)=>handlers[type]=cb},
    fetch(){throw Error('Network offline')}
  });
  return {handlers,deleted};
}

test('offline shell contains all referenced files and never handles foreign pages, tiles or API requests', async () => {
  const {handlers,deleted}=worker();let pending;
  const event={waitUntil(value){pending=value}};
  handlers.install(event);await pending;handlers.activate(event);await pending;
  assert.deepEqual(deleted,['rallynav-shell-v8','rallynav-tiles-w2500']);
  async function read(url,mode){
    let result;handlers.fetch({request:{url,mode,method:'GET'},respondWith(value){result=value}});
    return result;
  }
  assert.equal((await read(scope,'navigate')).relative,'index.html');
  assert.equal((await read(scope+'assets/app.js?v=1','cors')).relative,'assets/app.js');
  assert.equal(await read('https://example.test/codestudy/','navigate'),undefined);
  assert.equal(await read('https://tile.openstreetmap.org/12/1/2.png','cors'),undefined);
});

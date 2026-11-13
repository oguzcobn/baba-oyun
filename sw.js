const CACHE='baba-v63';
const FILES=['./','index.html','manifest.webmanifest','css/app.css','js/core.js','js/draft-data.js','js/draft-nat.js','js/draft.js','js/draft-physics.js','js/match2d.js','js/traits.js','js/club-id.js','css/club-id.css','js/career.js','css/career.css','js/football-hub.js','css/football-hub.css','css/match2d.css','js/scores.js','js/dost-en.js','js/dost.js','js/is.js','js/flights.js','js/travel.js','js/foto.js','js/globe.js','js/vendor/three.module.min.js','js/vendor/OrbitControls.js','js/vendor/topojson-client.min.js','data/countries-50m.json','css/v2.css','css/features.css','css/social-media.css','css/four-identities.css','css/engagement.css','css/all-category-motion.css','css/quick-nav.css','css/daily.css','css/groups.css','css/draft-career.css','css/draft-manager.css','css/draft-analytics.css','css/life-game.css','css/cbn.css','css/ts.css','css/dost.css','css/msn.css','js/msn.js','js/ts.js','js/cbn/core.js','js/cbn/tasks.js','js/cbn/notes.js','js/cbn/calendar.js','js/cbn/kit.js','js/cbn/life.js','js/cbn/money.js','js/cbn/work.js','js/cbn/sync.js','js/cbn/profile.js','js/cbn/home.js','js/cbn/settings.js','js/gundem.js','js/lab.js','js/play.js','js/akis.js','js/engagement.js','js/quick-nav.js','js/daily.js','js/groups.js','js/life-game.js','js/games.js','img/icon-180.png','img/icon-192.png','img/icon-512.png'];
// Keep startup light: cache the app shell first and warm the rest after activation.
// Versioned caches are kept separate from user data (IndexedDB/localStorage).
const CORE=['./','index.html','manifest.webmanifest','css/app.css','css/v2.css','js/core.js','js/games.js','img/icon-192.png'];
const ASSETS=FILES.filter(f=>!CORE.includes(f));
const sameOrigin=url=>url.origin===self.location.origin;
async function warmAssets(){
  const c=await caches.open(CACHE);
  // Limit parallel downloads to avoid saturating mobile connections.
  for(let i=0;i<ASSETS.length;i+=4){
    await Promise.all(ASSETS.slice(i,i+4).map(async path=>{
      try{const request=new Request(path,{cache:'reload'});const response=await fetch(request);if(response.ok)await c.put(request,response)}catch(_){}
    }));
  }
}
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(async c=>{
    await Promise.all(CORE.map(async f=>{try{await c.add(f)}catch(_){}}));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('baba-v')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Noncritical offline assets are cached after the app becomes usable.
    await warmAssets();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Never intercept third-party APIs, analytics, streaming or cross-origin resources.
  if(!sameOrigin(url))return;
  const navigation=req.mode==='navigate';
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(req);
      if(response.ok && response.type==='basic'){
        // Only cache successful same-origin responses.
        e.waitUntil(cache.put(req,response.clone()).catch(()=>{}));
      }
      return response;
    }catch(_){
      const stored=await cache.match(req,{ignoreSearch:true});
      if(stored)return stored;
      if(navigation){
        const shell=await cache.match('index.html');
        if(shell)return shell;
        return new Response('Offline',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
      // Never serve index.html as a JS/CSS/image response.
      return Response.error();
    }
  })());
});

/* Messenger: uygulama kapalıyken gelen bildirim (Web Push) */
const isApple=/Safari/.test(navigator.userAgent)&&!/Chrome|Chromium|Android|CriOS|Edg/.test(navigator.userAgent);
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={title:'BABA.',body:e.data?e.data.text():''}}
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const open=cs.some(c=>c.visibilityState==='visible'&&c.focused);
    if(open&&d.msn&&!isApple){cs.forEach(c=>c.postMessage({msnPush:d}));return}   // uygulama önündeyse içerideki bildirim yeter
    return self.registration.showNotification(d.title||'BABA.',{body:d.body||'',tag:d.tag||'baba',renotify:true,icon:'img/icon-192.png',badge:'img/icon-192.png',data:{url:d.url||'./#msn',msn:d.msn?1:0,k:d.k||''}});
  }))});
self.addEventListener('notificationclick',e=>{const nd=e.notification.data||{};if(nd.msn){e.notification.close();const base=(nd.url||'./').split('#')[0],u=base+(nd.k?'?ac='+encodeURIComponent(nd.k):'')+'#msn';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){c.postMessage({msnOpen:nd.k||''});return c.focus()}}return clients.openWindow(u)}));return}
  e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'./#is';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){c.navigate&&c.navigate(u);return c.focus()}}return clients.openWindow(u)}))});

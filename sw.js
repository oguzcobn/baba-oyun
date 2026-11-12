const CACHE='baba-v37';
const FILES=['./','index.html','manifest.webmanifest','css/app.css','js/core.js','js/draft-data.js','js/draft-nat.js','js/draft.js','js/scores.js','js/dost-en.js','js/dost.js','js/is.js','js/flights.js','js/travel.js','js/foto.js','js/globe.js','js/vendor/three.module.min.js','js/vendor/OrbitControls.js','js/vendor/topojson-client.min.js','data/countries-50m.json','css/v2.css','css/features.css','css/cbn.css','css/ts.css','css/dost.css','css/msn.css','js/msn.js','js/ts.js','js/cbn/core.js','js/cbn/tasks.js','js/cbn/notes.js','js/cbn/calendar.js','js/cbn/kit.js','js/cbn/life.js','js/cbn/money.js','js/cbn/work.js','js/cbn/sync.js','js/cbn/profile.js','js/cbn/home.js','js/cbn/settings.js','js/gundem.js','js/lab.js','js/games.js','img/icon-180.png','img/icon-192.png','img/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))))});

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

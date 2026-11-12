"use strict";
/* BABA. TODAY, safe local backup and compact mobile navigation. No cloud or tracking. */
const BABADaily=(()=>{
 const T=(tr,en)=>I18N.lang==='en'?en:tr;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const userKey=()=>App.user()?.key||'owner';
 const isPrivate=()=>!!App.user();
 const safeDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):'';
 const dateLocal=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const getData=()=>{if(typeof CBN==='undefined'||!CBN.S)return {tasks:[],events:[]};return {tasks:Array.isArray(CBN.S.tasks)?CBN.S.tasks:[],events:Array.isArray(CBN.S.events)?CBN.S.events:[]}};
 const isDone=t=>['completed','cancelled','done','archived'].includes(t.status);
 function todayHTML(){
  const now=new Date(),today=dateLocal(now),next=dateLocal(new Date(now.getFullYear(),now.getMonth(),now.getDate()+7));
  const {tasks,events}=getData();
  const dueOf=x=>safeDate(x.due||x.dueDate||x.date);
  const open=tasks.filter(x=>!isDone(x));
  const due=open.filter(x=>dueOf(x)&&dueOf(x)<=next).sort((a,b)=>dueOf(a).localeCompare(dueOf(b))).slice(0,6);
  const late=open.filter(x=>dueOf(x)&&dueOf(x)<today).length;
  const todayAll=tasks.filter(x=>dueOf(x)===today&&x.status!=='cancelled'),todayDone=todayAll.filter(isDone).length;
  const pct=todayAll.length?Math.round(todayDone/todayAll.length*100):0;
  const upcoming=events.filter(x=>safeDate(x.date)>=today&&safeDate(x.date)<=next).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,5);
  const fmt=x=>{const [y,m,d]=x.split('-');return d+'.'+m+'.'+y};
  const rel=x=>x===today?T('Bugün','Today'):x===dateLocal(new Date(now.getFullYear(),now.getMonth(),now.getDate()+1))?T('Yarın','Tomorrow'):x<today?T('Gecikti','Overdue'):fmt(x);
  const item=(x,kind)=>{const d=kind==='tasks'?dueOf(x):safeDate(x.date);return '<a class="bb-today-item'+(d&&d<today?' late':'')+'" href="#cbn/'+kind+'"><span>'+esc(x.title||T('Başlıksız','Untitled'))+'</span><small>'+esc(d?rel(d):'')+'</small></a>'};
  const h=now.getHours(),greet=h<6?T('İyi geceler','Good night'):h<12?T('Günaydın','Good morning'):h<18?T('İyi günler','Good afternoon'):T('İyi akşamlar','Good evening');
  const name=(typeof CBN!=='undefined'&&CBN.profile&&CBN.profile.name&&CBN.profile.name())||'';
  const R=54,C=2*Math.PI*R;
  return '<section class="bb-today hb-today"><div class="hbt-road" aria-hidden="true"></div>'
   +'<div class="bb-today-head hbt-head"><div><p class="eyebrow">'+T('GÜNLÜK ÖZET','DAILY OVERVIEW')+' · '+esc(new Intl.DateTimeFormat(I18N.locale,{weekday:'long',day:'numeric',month:'long'}).format(now))+'</p><h1>'+T('BUGÜN.','TODAY.')+'</h1><p class="hbt-greet">'+esc(greet)+(name?', '+esc(name):'')+'.</p></div>'
   +'<div class="hbt-clock" aria-live="off"><b data-clock>'+String(h).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+'</b><span>'+esc(Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_',' '))+'</span></div></div>'
   +'<div class="hbt-stats"><div class="hbt-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="'+R+'" class="bg"/><circle cx="60" cy="60" r="'+R+'" class="fg" style="stroke-dasharray:'+C.toFixed(1)+';stroke-dashoffset:'+(C*(1-pct/100)).toFixed(1)+'"/></svg><div><b>'+pct+'<small>%</small></b><span>'+T('bugün tamam','done today')+'</span></div></div>'
   +'<div class="hbt-stat"><b>'+open.length+'</b><span>'+T('açık görev','open tasks')+'</span></div><div class="hbt-stat"><b>'+upcoming.length+'</b><span>'+T('7 günde etkinlik','events in 7 days')+'</span></div><div class="hbt-stat'+(late?' warn':'')+'"><b>'+late+'</b><span>'+T('geciken','overdue')+'</span></div></div>'
   +'<div class="bb-today-grid"><article><h2>'+T('Yaklaşan görevler','Upcoming tasks')+'<a href="#cbn/tasks">'+T('Tümü','All')+' →</a></h2>'+(due.length?due.map(x=>item(x,'tasks')).join(''):'<p class="hbt-empty">'+T('Yaklaşan görev bulunamadı. Güzel bir gün!','No upcoming tasks. Enjoy your day!')+'</p>')+'</article><article><h2>'+T('Takvim','Calendar')+'<a href="#cbn/calendar">'+T('Aç','Open')+' →</a></h2>'+(upcoming.length?upcoming.map(x=>item(x,'calendar')).join(''):'<p class="hbt-empty">'+T('Yaklaşan etkinlik bulunamadı.','No upcoming events.')+'</p>')+'</article></div>'
   +'<div class="bb-today-shortcuts"><a class="pri" href="#cbn/tasks">'+T('Görev ekle','Add task')+'</a><a href="#cbn/calendar">'+T('Takvimi aç','Open calendar')+'</a><a href="#backup">'+T('Verileri yedekle','Back up data')+'</a></div></section>';
 }
 async function openToday(el){el.innerHTML='<section class="bb-today"><h1>'+T('BUGÜN.','TODAY.')+'</h1><p>'+T('Veriler hazırlanıyor…','Loading your data…')+'</p></section>';try{if(typeof CBN!=='undefined')await CBN.ready()}catch(e){console.warn('CBN data unavailable',e)}if(el.isConnected){el.innerHTML=todayHTML();const ck=el.querySelector('[data-clock]');const tick=()=>{if(!ck.isConnected){clearInterval(iv);return}const d=new Date();ck.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};const iv=setInterval(tick,15000)}}
 const stores=['notes','folders','tasks','events','items','meta'];
 function openDb(name){return new Promise((resolve,reject)=>{const req=indexedDB.open(name);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>{req.transaction.abort();reject(Error('Database does not exist'))}})}
 function readAll(db,store){return new Promise((resolve,reject)=>{if(!db.objectStoreNames.contains(store)){resolve([]);return}const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 async function snapshot(){
  const name='cbn'+(App.user()?.key?'-'+App.user().key:'');
  const db=await openDb(name);try{const records={};for(const store of stores)records[store]=await readAll(db,store);
   const suffix=userKey();const local={};for(const key of ['baba_play_v1_'+suffix,'baba_akis_v1_'+suffix,'baba_gundem_v1_'+suffix,'baba_lab_v1_'+suffix]){const value=localStorage.getItem(key);if(value!==null)local[key]=value}
   return {format:'baba-local-backup',version:1,created:new Date().toISOString(),user:suffix,database:name,records,local};
  }finally{db.close()}
 }
 function saveFile(payload){const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BABA-yedek-'+dateLocal(new Date())+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 function validBackup(p){return p&&p.format==='baba-local-backup'&&p.version===1&&p.user===userKey()&&p.database==='cbn'+(App.user()?.key?'-'+App.user().key:'')&&p.records&&stores.every(s=>Array.isArray(p.records[s]))&&p.local&&typeof p.local==='object'}
 async function restore(p){
  if(!validBackup(p))throw Error(T('Bu kullanıcıya ait geçerli yedek değil.','Not a valid backup for this user.'));
  const db=await openDb(p.database);
  try{
   const available=stores.filter(s=>db.objectStoreNames.contains(s));
   await new Promise((resolve,reject)=>{const tx=db.transaction(available,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);for(const s of available){const st=tx.objectStore(s);st.clear();for(const row of p.records[s])st.put(row)}});
   for(const [key,value] of Object.entries(p.local)){if(key.startsWith('baba_')&&key.endsWith('_'+userKey())&&typeof value==='string')localStorage.setItem(key,value)}
  }finally{db.close()}
 }
 function openBackup(el){
  el.innerHTML='<section class="bb-backup"><a href="#today">← '+T('BUGÜN.','TODAY.')+'</a><p class="eyebrow">'+T('YEREL VERİ GÜVENLİĞİ','LOCAL DATA SAFETY')+'</p><h1>'+T('YEDEK.','BACKUP.')+'</h1><p>'+T('CBN not, görev, takvim ve diğer kayıtların ile PLAY./AKIŞ. koleksiyonlarının bu kullanıcıya ait yerel kopyasını indir. PIN ve davet kodları yedeğe dahil edilmez.','Download your local CBN records and PLAY./AKIŞ. collections. PIN and invitation codes are excluded.')+'</p><div class="bb-backup-actions"><button id="bbExport">'+T('JSON yedeği indir','Download JSON backup')+'</button><label>'+T('Yedeği geri yükle','Restore backup')+'<input id="bbImport" type="file" accept=".json,application/json"></label></div><p id="bbBackupStatus" role="status"></p><p class="bb-backup-warn">'+T('Geri yükleme mevcut yerel kayıtların üzerine yazar. Önce mevcut verilerinin yedeğini indir.','Restoring replaces current local records. Download a backup of your current data first.')+'</p></section>';
  const status=el.querySelector('#bbBackupStatus');el.querySelector('#bbExport').onclick=async()=>{try{status.textContent=T('Yedek hazırlanıyor…','Preparing backup…');saveFile(await snapshot());status.textContent=T('Yedek indirildi.','Backup downloaded.')}catch(e){status.textContent=T('Yedek alınamadı: ','Backup failed: ')+e.message}};
  el.querySelector('#bbImport').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>25*1024*1024)throw Error(T('Dosya çok büyük.','File too large.'));const p=JSON.parse(await file.text());if(!validBackup(p))throw Error(T('Geçersiz yedek veya farklı kullanıcı.','Invalid backup or different user.'));if(!confirm(T('Mevcut kayıtlar değiştirilecek. Önce yedek aldın mı?','Current records will be replaced. Have you backed them up?')))return;await restore(p);status.textContent=T('Geri yüklendi. Verileri yenilemek için sayfayı yeniden aç.','Restored. Reload the app to refresh data.')}catch(err){status.textContent=T('Geri yükleme başarısız: ','Restore failed: ')+err.message}};
 }
 function mobile(){
  let bar=document.getElementById('bbMobileNav');if(!isPrivate()){bar?.remove();return}
  if(!bar){bar=document.createElement('nav');bar.id='bbMobileNav';bar.setAttribute('aria-label',T('Mobil gezinme','Mobile navigation'));document.body.appendChild(bar)}
  const entries=[['today','calendar-days',T('Bugün','Today')],['cbn','check-square',T('CBN','CBN')],['','house',T('Ana','Home')],['kesfet','play',T('Keşfet','Discover')],['backup','database',T('Yedek','Backup')]];
  const current=location.hash.slice(1).split('/')[0];bar.innerHTML=entries.map(([id,icon,label])=>'<a href="#'+id+'" '+(id===current?'aria-current="page"':'')+'><span aria-hidden="true">'+({today:'◷',cbn:'☑','':'⌂',kesfet:'▷',backup:'▣'}[id])+'</span><small>'+esc(label)+'</small></a>').join('');
 }
 function related(){
  const page=document.querySelector('.bb-feature.bb-gundem,.bb-feature.bb-lab,.bb-feature.bb-play,.bb-feature.bb-akis');
  if(!page||page.querySelector('.bb-related'))return;
  const name=['gundem','lab','play','akis'].find(x=>page.classList.contains('bb-'+x));const routes={gundem:[['cbn/notes',T('CBN Notlar','CBN Notes')],['akis','AKIŞ.']],lab:[['cbn/notes',T('CBN Notlar','CBN Notes')],['gundem','GÜNDEM.']],play:[['akis','AKIŞ.'],['gundem','GÜNDEM.']],akis:[['cbn/notes',T('CBN Notlar','CBN Notes')],['gundem','GÜNDEM.'],['lab','LAB.']]};
  const aside=document.createElement('aside');aside.className='bb-related';aside.innerHTML='<strong>'+T('İlgili alanlar','Related areas')+'</strong><div>'+routes[name].map(([id,label])=>'<a href="#'+id+'">'+esc(label)+' ↗</a>').join('')+'</div>';page.appendChild(aside);
 }
 function refresh(){mobile();related()}
 return {openToday,openBackup,refresh};
})();

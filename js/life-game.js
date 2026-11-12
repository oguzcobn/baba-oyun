/* BABA. HAYAT RPG — fictional, offline, per-browser save. */
const LifeGame=(()=>{
 'use strict';
 const KEY='baba_life_game_v1';
 const jobs=[
  {name:'Barista',pay:24000,skill:'social',req:0},
  {name:'Satış danışmanı',pay:31000,skill:'social',req:12},
  {name:'Etkinlik uzmanı',pay:42000,skill:'social',req:30},
  {name:'Yazılımcı',pay:56000,skill:'logic',req:40},
  {name:'Proje yöneticisi',pay:76000,skill:'logic',req:65},
  {name:'Şirket yöneticisi',pay:112000,skill:'social',req:80}
 ];
 const foods=['Mantı','Pizza','Sushi','Köfte','Lahmacun','Makarna','Salata'];
 const music=['Rock','Pop','Rap','Caz','Klasik','Elektronik','Türkçe pop'];
 const films=['Bilim kurgu','Komedi','Dram','Aksiyon','Animasyon','Korku'];
 const teams=['Trabzonspor','Galatasaray','Fenerbahçe','Beşiktaş','Bursaspor','Takım tutmuyorum'];
 const rand=n=>Math.floor(Math.random()*n);
 const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
 const money=n=>Math.round(n).toLocaleString('tr-TR')+' ₺';
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const load=()=>{try{const s=JSON.parse(localStorage.getItem(KEY));return s&&s.version===1?s:null}catch{return null}};
 let state=load(),host=null,tab='home';
 const create=name=>({version:1,name:String(name||'Oyuncu').slice(0,32),age:18,month:1,year:2026,cash:45000,debt:0,savings:10000,rent:11000,food:6000,fun:3000,transport:2500,health:80,happiness:70,energy:85,stress:18,knowledge:15,social:15,logic:15,job:0,exp:0,partner:null,children:[],friends:[{name:'Deniz',bond:38},{name:'Ece',bond:22}],home:'Kirada',car:false,choices:0,log:['Yeni bir hayat başladı.'],prefs:{food:'Mantı',music:'Rock',film:'Bilim kurgu',team:'Trabzonspor'},flags:{},career:[],ended:false});
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
 function note(x){state.log.unshift(x);state.log=state.log.slice(0,70)}
 function change(d){for(const [k,v] of Object.entries(d))state[k]=['cash','debt','savings','exp','choices'].includes(k)?Math.max(0,state[k]+v):clamp(state[k]+v)}
 function month(){
  const s=state;if(s.ended)return;
  const pay=jobs[s.job].pay;
  const spend=s.rent+s.food+s.fun+s.transport+(s.children.length*3500)+(s.car?4500:0);
  s.cash+=pay-spend;
  if(s.cash<0){s.debt+=-s.cash;s.cash=0;s.stress=clamp(s.stress+8);note('Bütçe açığı oluştu, borç arttı.')}
  if(s.debt>0){const interest=Math.ceil(s.debt*.012);s.debt+=interest}
  s.energy=clamp(s.energy+8);s.stress=clamp(s.stress+Math.round((spend-pay)/6000));s.health=clamp(s.health+(s.stress>70?-2:1));
  s.exp+=3;s.age+=(s.month===12?1:0);s.month=s.month%12+1;if(s.month===1)s.year++;
  s.children.forEach(c=>{c.months++;if(c.months%12===0)note(c.name+' '+Math.floor(c.months/12)+' yaşına girdi.')});
  if(s.partner){s.partner.bond=clamp(s.partner.bond+(s.stress>65?-2:1));if(s.partner.bond<12){note(s.partner.name+' ile ilişkiniz sona erdi.');s.partner=null}}
  if(s.health<=0){s.ended=true;note('Sağlığını ihmal ettin. Bu hayat hikâyesi sona erdi.')}
  note(s.month+'/'+s.year+' · Maaş '+money(pay)+' · Gider '+money(spend));
  save();render();
 }
 const actions=[
  {id:'work',title:'💼 Fazla mesai',desc:'Gelir artar; enerji ve sosyal yaşam azalır.',run(){change({cash:4000,energy:-15,stress:12,exp:5});note('Fazla mesai yaptın, 4.000 ₺ kazandın.')}},
  {id:'study',title:'📚 Eğitim al',desc:'4.500 ₺ öde, bilgi ve kariyer becerisi kazan.',run(){if(state.cash<4500)return alert('Yeterli para yok.');change({cash:-4500,knowledge:12,logic:8,exp:8,energy:-8});note('Bir eğitimi tamamladın.')}},
  {id:'friends',title:'☕ Arkadaşlarla buluş',desc:'1.200 ₺ harca, sosyalleş.',run(){if(state.cash<1200)return alert('Yeterli para yok.');change({cash:-1200,social:8,happiness:9,energy:-5,stress:-7});state.friends.forEach(f=>f.bond=clamp(f.bond+5));note('Arkadaşlarınla güzel bir gün geçirdin.')}},
  {id:'date',title:'❤️ Buluşmaya çık',desc:'Romantik bir ilişkiyi geliştir.',run(){if(state.cash<1600)return alert('Yeterli para yok.');change({cash:-1600,happiness:7,social:4,energy:-6});if(!state.partner){state.partner={name:['Alex','Mira','Deniz','Ada'][rand(4)],bond:30,married:false};note(state.partner.name+' ile tanıştın.')}else{state.partner.bond=clamp(state.partner.bond+13);note(state.partner.name+' ile ilişkiniz güçlendi.')}}},
  {id:'exercise',title:'🏃 Spor yap',desc:'Sağlığı artır, stresi azalt.',run(){change({health:9,energy:-12,stress:-8,happiness:4});note('Spor yaptın.')}},
  {id:'rest',title:'🛌 Dinlen',desc:'Enerji kazan, stresi düşür.',run(){change({energy:22,stress:-12,health:2});note('Dinlenmeye zaman ayırdın.')}},
  {id:'concert',title:'🎵 Konser / sinema',desc:'Sevdiğin müzik veya filmle keyifli zaman.',run(){if(state.cash<2200)return alert('Yeterli para yok.');change({cash:-2200,happiness:13,stress:-7,social:3});note(state.prefs.music+' dinledin, '+state.prefs.film+' izledin.')}},
  {id:'cook',title:'🍽️ Favori yemeğini pişir',desc:'Daha az harcama, biraz mutluluk.',run(){change({happiness:5,health:3,energy:-4});note(state.prefs.food+' pişirdin.')}},
  {id:'match',title:'⚽ Maça git',desc:'Tuttuğun takım için tribünde ol.',run(){if(state.cash<1800)return alert('Yeterli para yok.');change({cash:-1800,happiness:10,energy:-7,social:4});note(state.prefs.team+' maçına gittin.')}}
 ];
 function button(label,action,cls=''){return '<button class="'+cls+'" data-action="'+action+'">'+label+'</button>'}
 function top(){return '<div class="life-top"><div><p class="eyebrow">BABA. / OYUNLAR</p><h1>HAYAT<span>.</span></h1><p>Kararların, hayatının hikâyesini değiştirir.</p></div><div class="life-time"><b>'+state.age+' yaş</b><small>'+state.month+'/'+state.year+'</small></div></div><div class="life-tabs">'+[['home','Yaşam'],['money','Finans'],['career','Kariyer'],['people','İlişkiler'],['identity','Kimlik'],['story','Hikâye']].map(([id,l])=>button(l,'tab:'+id,tab===id?'on':'')).join('')+'</div>'}
 function meters(){return '<div class="life-meters">'+[['health','Sağlık'],['happiness','Mutluluk'],['energy','Enerji'],['stress','Stres'],['knowledge','Bilgi'],['social','Sosyal'],['logic','Mantık']].map(([k,l])=>'<div class="life-meter"><span>'+l+'</span><b>'+state[k]+'</b><i><em style="width:'+state[k]+'%"></em></i></div>').join('')+'</div>'}
 function home(){return '<div class="life-summary"><div><small>Nakit</small><b>'+money(state.cash)+'</b></div><div><small>Meslek</small><b>'+esc(jobs[state.job].name)+'</b></div><div><small>Aile</small><b>'+(state.partner?'❤️ '+esc(state.partner.name):'Bekâr')+' · '+state.children.length+' çocuk</b></div></div>'+meters()+'<h2>Bugün ne yapmak istersin?</h2><div class="life-actions">'+actions.map(a=>'<button data-action="do:'+a.id+'"><b>'+a.title+'</b><small>'+a.desc+'</small></button>').join('')+'</div><div class="life-advance">'+button('Bir sonraki aya geç →','month','primary')+'<small>Her ay maaş, giderler, borç faizi ve aile masrafları hesaplanır.</small></div>'}
 function finance(){const pay=jobs[state.job].pay,sp=state.rent+state.food+state.fun+state.transport+state.children.length*3500+(state.car?4500:0);return '<h2>Para yönetimi</h2><div class="life-summary"><div><small>Maaş</small><b>'+money(pay)+'</b></div><div><small>Aylık gider</small><b>'+money(sp)+'</b></div><div><small>Net fark</small><b>'+money(pay-sp)+'</b></div><div><small>Birikim</small><b>'+money(state.savings)+'</b></div><div><small>Borç</small><b>'+money(state.debt)+'</b></div></div><h3>Aylık bütçe</h3><div class="life-budget">'+[['rent','Kira',1000,90000],['food','Yemek',1000,35000],['fun','Eğlence',0,30000],['transport','Ulaşım',500,20000]].map(([k,l,min,max])=>'<label>'+l+' <strong>'+money(state[k])+'</strong><input type="range" min="'+min+'" max="'+max+'" step="500" value="'+state[k]+'" data-budget="'+k+'"></label>').join('')+'</div><div class="life-buttons">'+button('5.000 ₺ biriktir','save')+button('5.000 ₺ çek','withdraw')+button('5.000 ₺ borç öde','repay')+button('Araç satın al · 250.000 ₺','car')+'</div><p class="life-hint">Birikim getirisi simüle edilmez; borca aylık %1,2 faiz uygulanır. Harcama tercihlerin mutluluğunu ve sağlığını etkileyebilir.</p>'}
 function career(){return '<h2>Kariyer ve eğitim</h2><p>Deneyim: <b>'+state.exp+'</b> · Bilgi: <b>'+state.knowledge+'</b> · Sosyal: <b>'+state.social+'</b> · Mantık: <b>'+state.logic+'</b></p><div class="life-actions">'+jobs.map((j,i)=>'<button data-action="job:'+i+'" '+(i===state.job?'disabled':'')+'><b>'+esc(j.name)+' · '+money(j.pay)+'</b><small>Gereken '+(j.skill==='social'?'sosyal':'mantık')+' beceri: '+j.req+(state[j.skill]<j.req?' · Yetersiz beceri':'')+'</small></button>').join('')+'</div><h3>Kariyer geçmişi</h3><p>'+esc(state.career.slice(-8).join(' · ')||'İlk işindesin.')+'</p>'}
 function people(){return '<h2>İlişkiler ve aile</h2><div class="life-people"><article><h3>❤️ Aşk</h3><p>'+(state.partner?esc(state.partner.name)+' · Bağ '+state.partner.bond+'/100 · '+(state.partner.married?'Evli':'İlişki'):'Şu anda ilişkin yok.')+'</p>'+button('Birlikte zaman geçir','do:date')+(state.partner&&!state.partner.married?button('Evlenme teklif et · 25.000 ₺','marry'):'')+(state.partner&&state.partner.married?button('Çocuk sahibi olmayı planla','baby'):'')+(state.partner?button('Ayrıl','breakup'):'')+'</article><article><h3>👶 Çocuklar</h3><p>'+state.children.map(c=>esc(c.name)+' · '+Math.floor(c.months/12)+' yaş').join(', ')+'</p><small>Her çocuk için aylık 3.500 ₺ bakım gideri vardır.</small></article><article><h3>🤝 Arkadaşlar</h3>'+state.friends.map(f=>'<p>'+esc(f.name)+' · Yakınlık '+f.bond+'/100</p>').join('')+button('Birlikte vakit geçir','do:friends')+'</article></div><p class="life-hint">Bu sürümde kişiler kurgusal NPC karakterlerdir. Messenger arkadaşların bu oyuna henüz bağlanmaz.</p>'}
 function identity(){return '<h2>Kimliğin ve zevklerin</h2><div class="life-prefs">'+[['food','Sevdiğin yemek',foods],['music','Sevdiğin müzik',music],['film','Sevdiğin film türü',films],['team','Tuttuğun takım',teams]].map(([k,l,arr])=>'<label>'+l+'<select data-pref="'+k+'">'+arr.map(v=>'<option '+(state.prefs[k]===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>').join('')+'</div><p class="life-hint">Bu tercihler oyun içi etkinlikleri ve hikâye kayıtlarını etkiler; gerçek BABA. profilini değiştirmez.</p>'}
 function story(){return '<h2>Hayat hikâyen</h2><p>'+state.choices+' karar verdin. '+state.age+' yaşındasın.</p><div class="life-log">'+state.log.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>'+button('Yeni bir hayat başlat','reset')}
 function render(){if(!host||!state)return;host.innerHTML='<section class="life-game">'+top()+(tab==='home'?home():tab==='money'?finance():tab==='career'?career():tab==='people'?people():tab==='identity'?identity():story())+'</section>';host.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>act(b.dataset.action));host.querySelectorAll('[data-budget]').forEach(e=>e.onchange=()=>{state[e.dataset.budget]=Number(e.value);save();render()});host.querySelectorAll('[data-pref]').forEach(e=>e.onchange=()=>{state.prefs[e.dataset.pref]=e.value;save();render()})}
 function act(action){
  if(action.startsWith('tab:')){tab=action.slice(4);render();return}
  if(action==='reset'){if(confirm('Bu hayatın kayıtlarını silip yeni bir oyun başlatmak istiyor musun?')){state=null;localStorage.removeItem(KEY);start()}return}
  if(action==='month'){month();return}
  if(action.startsWith('do:')){const a=actions.find(x=>x.id===action.slice(3));if(a){a.run();state.choices++}}
  if(action.startsWith('job:')){const i=Number(action.slice(4)),j=jobs[i];if(j&&state[j.skill]>=j.req){state.job=i;state.career.push(state.month+'/'+state.year+': '+j.name);note(j.name+' olarak işe başladın.')}else alert('Bu iş için gereken beceriyi geliştirmelisin.')}
  if(action==='save'){if(state.cash>=5000){state.cash-=5000;state.savings+=5000}else alert('Yeterli nakit yok.')}
  if(action==='withdraw'){if(state.savings>=5000){state.savings-=5000;state.cash+=5000}else alert('Yeterli birikim yok.')}
  if(action==='repay'){const v=Math.min(5000,state.cash,state.debt);state.cash-=v;state.debt-=v;note(money(v)+' borç ödedin.')}
  if(action==='car'&&!state.car){if(state.cash>=250000){state.cash-=250000;state.car=true;note('Araba satın aldın.')}else alert('Yeterli nakit yok.')}
  if(action==='marry'&&state.partner&&!state.partner.married){if(state.partner.bond>=65&&state.cash>=25000){state.cash-=25000;state.partner.married=true;note(state.partner.name+' ile evlendin!')}else alert('Evlenmek için ilişkiniz en az 65/100 olmalı ve 25.000 ₺ birikmiş nakit gerekli.')}
  if(action==='baby'&&state.partner&&state.partner.married){if(state.children.length>=5)return alert('Bu sürümde en fazla 5 çocuk destekleniyor.');if(state.cash<12000)return alert('Çocuk planlaması için 12.000 ₺ nakit gerekli.');if(!confirm('Ailenize yeni bir çocuk eklemek istiyor musun? Bu karar aylık giderleri artıracak.'))return;const n=prompt('Çocuğun adı?','Bebek');if(!n)return;state.cash-=12000;state.children.push({name:n.slice(0,24),months:0});note(n.slice(0,24)+' ailenize katıldı.')}
  if(action==='breakup'&&state.partner){if(!confirm('İlişkiyi bitirmek istiyor musun?'))return;note(state.partner.name+' ile ayrıldınız.');state.partner=null;change({happiness:-15,stress:12})}
  save();render()
 }
 function start(){if(!host)return;if(!state){host.innerHTML='<section class="life-game life-intro"><p class="eyebrow">BABA. / YENİ OYUN</p><h1>HAYAT<span>.</span></h1><p>Bir hayat, binlerce karar. Para, aşk, aile, kariyer, sağlık ve tutkuların arasında kendi hikâyeni yaz.</p><label>Karakterinin adı <input id="lifeName" maxlength="32" placeholder="İsmin"></label><button id="lifeStart" class="primary">Hayatımı başlat →</button><small>Oyun kurgusaldır. Kayıtlar yalnızca bu cihazın tarayıcısında tutulur.</small></section>';host.querySelector('#lifeStart').onclick=()=>{state=create(host.querySelector('#lifeName').value.trim());save();render()}}else render()}
 function open(el){host=el;state=load();tab='home';start()}
 return {open};
})();

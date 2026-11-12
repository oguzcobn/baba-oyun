"use strict";
/* Category groups are presentation only. All legacy routes and storage remain unchanged. */
const BABAGroups=(()=>{
 const tr=(a,b)=>I18N.lang==='en'?b:a;
 const groups={
  kesfet:{title:'KEŞFET.',subtitle:['Haberler, kişisel akış ve medya bir arada.','News, personal feed and media in one place.'],items:[['gundem','GÜNDEM.','Haberler / News','newspaper'],['akis','AKIŞ.','Paylaşımlar / Feed','messages-square'],['play','PLAY.','Medya / Media','play-circle']]},
  hayat:{title:'HAYAT.',subtitle:['Yolculuklar ve fotoğraflar tek yerde.','Travel and photography in one place.'],items:[['seyahat','SEYAHAT.','Geziler / Travel','plane'],['foto','FOTOĞRAF.','Galeri / Photography','camera']]},
  sosyal:{title:'SOSYAL.',subtitle:['Mesajlaşma ve iyi hissetme alanı.','Messaging and wellbeing in one place.'],items:[['msn','MESSENGER.','Sohbet / Chat','message-circle'],['dost','DOST.','Okuma ve nefes / Wellbeing','heart']]},
  ismerkez:{title:'İŞ.',subtitle:['İş bağlantıları ve CBN iş araçları.','Work links and CBN work tools.'],items:[['is','İŞ MERKEZİ.','DSAn bağlantıları / Work links','briefcase-business'],['cbn/work','CBN İŞ ARAÇLARI.','Projeler ve görevler / Projects','list-checks']]}
 };
 function open(host,id){const g=groups[id];if(!g)return;host.innerHTML='<section class="bb-group-page"><a class="bb-group-back" href="#">← '+tr('Ana sayfa','Home')+'</a><p class="eyebrow">BABA. / '+g.title+'</p><h1>'+g.title+'</h1><p class="bb-group-sub">'+tr(...g.subtitle)+'</p><div class="bb-group-grid">'+g.items.map(([route,label,description],i)=>'<a class="bb-group-card" href="#'+route+'"><span class="bb-group-number">0'+(i+1)+'</span><h2>'+label+'</h2><p>'+description+'</p><span aria-hidden="true">↗</span></a>').join('')+'</div><p class="bb-group-hint">'+tr('Eski kategori bağlantıları çalışmaya devam eder.','Existing category links continue to work.')+'</p></section>'}
 function injectCbn(){
  const r=location.hash.slice(1);
  if(r!=='cbn'&&!r.startsWith('cbn/'))return;
  const el=document.getElementById('cbnRoot');if(!el||el.querySelector('.bb-cbn-shortcuts'))return;
  const box=document.createElement('nav');box.className='bb-cbn-shortcuts';box.setAttribute('aria-label',tr('CBN bağlantıları','CBN shortcuts'));
  box.innerHTML='<a href="#today">'+tr('BUGÜN. / Bildirimler','TODAY / Notifications')+'</a><a href="#lab">'+tr('AI ARAÇLARI (LAB.)','AI TOOLS (LAB.)')+'</a><a href="#cbn/work">'+tr('İŞ ARAÇLARI','WORK TOOLS')+'</a>';
  el.prepend(box);
 }
 function injectWork(){
  if(location.hash!=='#is')return;const el=document.getElementById('isRoot');if(!el||el.querySelector('.bb-work-shortcut'))return;
  const a=document.createElement('a');a.className='bb-work-shortcut';a.href='#cbn/work';a.textContent=tr('CBN İş Araçlarını Aç ↗','Open CBN Work Tools ↗');el.prepend(a)
 }
 function refresh(){injectCbn();injectWork()}
 return {open,refresh,groups};
})();

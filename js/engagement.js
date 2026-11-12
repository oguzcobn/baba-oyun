"use strict";
/* Progressive enhancements: privacy-safe sharing, accessible transitions and PWA install. */
const BABAEnhance=(()=>{
 let deferred=null;
 const T=(a,b)=>typeof I18N!=='undefined'&&I18N.lang==='en'?b:a;
 const pages={gundem:{title:'GÜNDEM.',description:'Haber kaynaklarını ve okuma listeni keşfet.'},lab:{title:'LAB.',description:'Yaratıcı komutlar ve metin araçları.'},play:{title:'PLAY.',description:'Kişisel müzik ve izleme koleksiyonunu oluştur.'},akis:{title:'AKIŞ.',description:'Anılarını ve fikirlerini kendi akışında biriktir.'}};
 const icon='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V3m0 0L7 8m5-5l5 5M5 13v7h14v-7"/></svg>';
 function announce(text){let el=document.getElementById('baba-toast');if(!el){el=document.createElement('div');el.id='baba-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}el.textContent=text;el.classList.add('visible');clearTimeout(announce.timer);announce.timer=setTimeout(()=>el.classList.remove('visible'),2500)}
 async function share(id){const p=pages[id];if(!p)return;const url=new URL(location.href);url.hash=id;const data={title:'BABA. · '+p.title,text:p.description,url:url.href};try{if(navigator.share){await navigator.share(data);return}if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url.href);announce(T('Bağlantı kopyalandı.','Link copied.'));return}const field=document.createElement('textarea');field.value=url.href;field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();if(ok){announce(T('Bağlantı kopyalandı.','Link copied.'));return}throw Error('copy failed')}catch(e){if(e.name!=='AbortError')announce(T('Bağlantı kopyalanamadı.','Could not copy the link.'))}}
 function install(){if(!deferred){announce(T('Tarayıcı menüsünden “Ana ekrana ekle” seçeneğini kullanabilirsin.','Use “Add to Home Screen” in your browser menu.'));return}const p=deferred;deferred=null;p.prompt();Promise.resolve(p.userChoice).catch(()=>{});}
 function enhance(){
  // One shared actions menu for all pages, instead of repeating controls on four pages.
  let holder=document.getElementById('babaSharedActions');
  if(!holder){
   holder=document.createElement('div');holder.id='babaSharedActions';holder.className='baba-shared-actions';
   const btn=document.createElement('button');btn.type='button';btn.className='baba-shared-trigger';btn.setAttribute('aria-label',T('Sayfa işlemleri','Page actions'));btn.textContent='⋯';btn.setAttribute('aria-expanded','false');
   const menu=document.createElement('div');menu.className='baba-shared-menu';menu.hidden=true;
   const shareBtn=document.createElement('button');shareBtn.type='button';shareBtn.textContent=T('Paylaş','Share');shareBtn.onclick=()=>{const id=location.hash.slice(1).split('/')[0];menu.hidden=true;btn.setAttribute('aria-expanded','false');share(id)};
   const installBtn=document.createElement('button');installBtn.type='button';installBtn.textContent=T('Ana ekrana ekle','Install app');installBtn.onclick=()=>{menu.hidden=true;btn.setAttribute('aria-expanded','false');install()};
   menu.append(shareBtn,installBtn);btn.onclick=()=>{menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden))};
   holder.append(btn,menu);document.body.appendChild(holder);
   document.addEventListener('click',e=>{if(!holder.contains(e.target)){menu.hidden=true;btn.setAttribute('aria-expanded','false')}});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;btn.setAttribute('aria-expanded','false')}});
  }
  const active=!!App.user()&&!document.body.classList.contains('locked');
  holder.hidden=!active;
  const page=document.querySelector('.bb-feature.bb-gundem,.bb-feature.bb-lab,.bb-feature.bb-play,.bb-feature.bb-akis');
  if(!page)return;
  page.classList.add('baba-enter');
  page.addEventListener('animationend',()=>page.classList.remove('baba-enter'),{once:true});
 }
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e});
 window.addEventListener('appinstalled',()=>{deferred=null;announce(T('BABA. ana ekrana eklendi!','BABA. installed!'))});
 return {enhance};
})();

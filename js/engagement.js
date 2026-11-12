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
  const page=document.querySelector('.bb-feature.bb-gundem,.bb-feature.bb-lab,.bb-feature.bb-play,.bb-feature.bb-akis');
  if(!page)return;
  const id=['gundem','lab','play','akis'].find(n=>page.classList.contains('bb-'+n));
  const top=page.querySelector('.bb-feature-top');
  if(!id||!top||top.querySelector('.baba-actions'))return;
  const actions=document.createElement('div');actions.className='baba-actions';
  const shareBtn=document.createElement('button');shareBtn.type='button';shareBtn.className='baba-action';shareBtn.innerHTML=icon+' <span>'+T('Paylaş','Share')+'</span>';shareBtn.setAttribute('aria-label',T('Bu sayfanın bağlantısını paylaş','Share a link to this page'));shareBtn.addEventListener('click',()=>share(id));
  const installBtn=document.createElement('button');installBtn.type='button';installBtn.className='baba-action baba-install';installBtn.textContent=T('＋ Ana ekrana ekle','＋ Install app');installBtn.addEventListener('click',install);
  actions.append(shareBtn,installBtn);top.appendChild(actions);
  page.classList.add('baba-enter');
  page.addEventListener('animationend',()=>page.classList.remove('baba-enter'),{once:true});
 }
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e});
 window.addEventListener('appinstalled',()=>{deferred=null;announce(T('BABA. ana ekrana eklendi!','BABA. installed!'))});
 return {enhance};
})();

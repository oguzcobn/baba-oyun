"use strict";
/* GÜNDEM. — trusted news shortcuts and a personal reading list.
   No invented headlines, scraping, tracking or embedded API keys. */
const Gundem = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tr = (a,b) => I18N.lang === 'en' ? b : a;
  const topics = [
    {id:'all',tr:'Tümü',en:'All',query:'Türkiye dünya son dakika'},
    {id:'tr',tr:'Türkiye',en:'Türkiye',query:'Türkiye gündem'},
    {id:'world',tr:'Dünya',en:'World',query:'dünya haberleri'},
    {id:'tech',tr:'Teknoloji',en:'Technology',query:'teknoloji yapay zeka'},
    {id:'football',tr:'Futbol',en:'Football',query:'Trabzonspor Süper Lig'},
    {id:'games',tr:'Oyun',en:'Gaming',query:'video oyunları'},
    {id:'photo',tr:'Fotoğraf',en:'Photography',query:'fotoğrafçılık kamera'}
  ];
  const sources = [
    {name:'Google News',url:'https://news.google.com/home?hl=tr&gl=TR&ceid=TR:tr',tag:'Haber arama'},
    {name:'BBC Türkçe',url:'https://www.bbc.com/turkce',tag:'Dünya'},
    {name:'Reuters',url:'https://www.reuters.com/',tag:'Uluslararası'},
    {name:'Anadolu Ajansı',url:'https://www.aa.com.tr/tr',tag:'Türkiye'},
    {name:'The Verge',url:'https://www.theverge.com/',tag:'Teknoloji'},
    {name:'Trabzonspor',url:'https://www.trabzonspor.org.tr/',tag:'Kulüp'}
  ];
  let active='all', root=null, filter='';
  const key=()=> 'baba_gundem_saved_' + ((App.user()||{}).key||'owner');
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.url==='string').slice(0,100):[]}catch(e){return []}};
  const save=v=>{try{localStorage.setItem(key(),JSON.stringify(v));return true}catch(e){return false}};
  const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:null}catch(e){return null}};
  const newsUrl=q=>'https://news.google.com/search?q='+encodeURIComponent(q)+'&hl=tr&gl=TR&ceid=TR:tr';
  function open(el){
    root=el;active='all';filter='';
    render();
  }
  function render(){
    if(!root||!root.isConnected)return;
    const saved=read().filter(x=>(x.title+' '+x.url).toLocaleLowerCase('tr').includes(filter.toLocaleLowerCase('tr')));
    root.innerHTML=`<section class="bb-feature"><div class="bb-feature-top"><a href="#" class="back">← BABA.</a><p class="eyebrow">${tr('Haberler · Kaynaklar · Okuma listesi','News · Sources · Reading list')}</p><h1 class="display">GÜNDEM<em>.</em></h1><p class="lead">${tr('İlgilendiğin konular, güvenilir haber kaynakları ve sonra okumak istediklerin.','Your topics, trusted news sources and saved reading.')}</p></div>
    <div class="bb-feature-tabs" role="group" aria-label="${tr('Haber konuları','News topics')}">${topics.map(t=>`<button type="button" data-topic="${t.id}" class="${active===t.id?'on':''}">${esc(tr(t.tr,t.en))}</button>`).join('')}</div>
    <div class="bb-feature-grid"><section class="bb-feature-card bb-feature-wide"><p class="eyebrow">${tr('KONU AKIŞI','TOPIC SEARCH')}</p><h2>${tr('Haberleri keşfet','Explore the news')}</h2><p class="bb-feature-muted">${tr('Güncel başlıklar Google News üzerinde açılır. Bu sayfa doğrulanmamış canlı haber üretmez.','Current headlines open on Google News. This page does not generate unverified live news.')}</p><a class="pill" href="${esc(newsUrl(topics.find(t=>t.id===active).query))}" target="_blank" rel="noopener noreferrer">${tr('Güncel haberleri aç ↗','Open latest news ↗')}</a></section>
    <section class="bb-feature-card"><p class="eyebrow">${tr('KAYNAKLAR','SOURCES')}</p><h2>${tr('Hızlı erişim','Quick links')}</h2><div class="bb-feature-links">${sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.name)}</strong><small>${esc(s.tag)} ↗</small></a>`).join('')}</div></section>
    <section class="bb-feature-card"><p class="eyebrow">${tr('KAYDET','SAVE')}</p><h2>${tr('Sonra oku','Read later')}</h2><form id="gundemSave" class="bb-feature-form"><label>${tr('Başlık','Title')}<input name="title" required maxlength="140" placeholder="${tr('Makale başlığı','Article title')}"></label><label>URL<input name="url" required type="url" placeholder="https://..."></label><button class="pill" type="submit">${tr('Listeye ekle','Add to list')}</button><p class="bb-feature-message" aria-live="polite"></p></form></section>
    <section class="bb-feature-card bb-feature-wide"><p class="eyebrow">${tr('KÜTÜPHANEM','MY LIBRARY')}</p><h2>${tr('Kaydettiklerim','Saved articles')} <small>(${saved.length})</small></h2><input id="gundemFilter" class="bb-feature-search" placeholder="${tr('Kaydedilenlerde ara','Search saved articles')}" value="${esc(filter)}" aria-label="${tr('Kaydedilenlerde ara','Search saved articles')}"><div class="bb-feature-links">${saved.length?saved.map((x,i)=>`<div class="bb-feature-saved"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.title)}</strong><small>${esc(new URL(x.url).hostname)} ↗</small></a><button type="button" data-remove="${esc(x.id)}" aria-label="${tr('Kaydı sil','Remove saved item')}">×</button></div>`).join(''):`<p class="bb-feature-muted">${tr('Henüz kaydedilmiş makale yok.','No saved articles yet.')}</p>`}</div></section></div></section>`;
    root.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{active=b.dataset.topic;render()});
    root.querySelector('#gundemSave').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,u=safeUrl(f.elements.url.value.trim());if(!u){f.querySelector('.bb-feature-message').textContent=tr('Geçerli bir http(s) bağlantısı gir.','Enter a valid http(s) URL.');return}const a=read();a.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2),title:f.elements.title.value.trim(),url:u});if(save(a.slice(0,100)))render();else f.querySelector('.bb-feature-message').textContent=tr('Bu cihazda kayıt yapılamadı.','Unable to save on this device.')};
    root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{save(read().filter(x=>x.id!==b.dataset.remove));render()});
    root.querySelector('#gundemFilter').oninput=e=>{const pos=e.target.selectionStart;filter=e.target.value;render();const inp=root.querySelector('#gundemFilter');inp.focus();inp.setSelectionRange(pos,pos)};
  }
  return {open};
})();

"use strict";
/* LAB. — local creative utilities and a reusable prompt builder.
   No AI service is implied or called; prompts are copied by the user. */
const Lab = (() => {
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
  const tr=(a,b)=>I18N.lang==='en'?b:a;
  const key=()=> 'baba_lab_drafts_' + ((App.user()||{}).key||'owner');
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v.slice(0,30):[]}catch(e){return []}};
  const save=a=>{try{localStorage.setItem(key(),JSON.stringify(a.slice(0,30)));return true}catch(e){return false}};
  let root=null,tool='prompt',input='',output='',mode='clean',status='';
  const presets=[
    {id:'email',tr:'Profesyonel e-posta',en:'Professional email',guide:'Write a clear, polite and natural professional email. Keep it concise and preserve all facts.'},
    {id:'ideas',tr:'Fikir geliştir',en:'Develop ideas',guide:'Generate practical, original ideas with benefits, trade-offs and a phased implementation plan.'},
    {id:'code',tr:'Yazılım planı',en:'Software plan',guide:'Create an implementation-ready technical specification with architecture, milestones, security and tests.'},
    {id:'summary',tr:'Özet çıkar',en:'Summarise',guide:'Summarise the material accurately, distinguish facts from assumptions and identify action items.'}
  ];
  let preset='email';
  function transform(s,m){
    if(m==='upper')return s.toLocaleUpperCase(I18N.locale);
    if(m==='lower')return s.toLocaleLowerCase(I18N.locale);
    if(m==='json'){try{return JSON.stringify(JSON.parse(s),null,2)}catch(e){return tr('Geçersiz JSON: ','Invalid JSON: ')+e.message}}
    if(m==='lines')return [...new Set(s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))].join('\n');
    return s.replace(/\r\n/g,'\n').split('\n').map(x=>x.trim().replace(/[ \t]+/g,' ')).join('\n').trim();
  }
  const prompt=()=>{const p=presets.find(x=>x.id===preset);return p.guide+'\n\nContext / Request:\n'+input.trim()+'\n\nRequirements:\n- Do not invent facts.\n- Use clear headings and actionable output.\n- Ask for clarification only if essential.'};
  function open(el){root=el;tool='prompt';input='';output='';status='';render()}
  function render(){
    if(!root||!root.isConnected)return;
    const drafts=read();
    root.innerHTML=`<section class="bb-feature bb-lab"><div class="bb-feature-top"><a href="#" class="back">← BABA.</a><p class="eyebrow">${tr('Yaratıcılık · Araçlar · Üretkenlik','Creativity · Tools · Productivity')}</p><h1 class="display">LAB<em>.</em></h1><p class="lead">${tr('Fikirlerini geliştir, metinleri düzenle ve yapay zekâ için hazır komutlar oluştur.','Develop ideas, refine text and create prompts ready for AI tools.')}</p></div>
    <div class="bb-feature-tabs"><button data-tool="prompt" class="${tool==='prompt'?'on':''}">${tr('Komut oluşturucu','Prompt builder')}</button><button data-tool="text" class="${tool==='text'?'on':''}">${tr('Metin araçları','Text tools')}</button></div>
    <div class="bb-feature-grid"><section class="bb-feature-card bb-feature-wide"><p class="eyebrow">${tool==='prompt'?tr('PROMPT STUDIO','PROMPT STUDIO'):tr('METİN ATÖLYESİ','TEXT WORKSHOP')}</p><h2>${tool==='prompt'?tr('İçeriğini oluştur','Build your prompt'):tr('Metnini düzenle','Edit your text')}</h2>
    <label class="bb-feature-label">${tool==='prompt'?tr('Şablon','Template'):tr('İşlem','Operation')}<select id="labMode">${(tool==='prompt'?presets:[{id:'clean',tr:'Boşlukları düzenle',en:'Clean whitespace'},{id:'upper',tr:'BÜYÜK HARF',en:'UPPERCASE'},{id:'lower',tr:'küçük harf',en:'lowercase'},{id:'lines',tr:'Tekrarlanan satırları sil',en:'Remove duplicate lines'},{id:'json',tr:'JSON biçimlendir',en:'Format JSON'}]).map(x=>`<option value="${x.id}" ${(tool==='prompt'?preset:mode)===x.id?'selected':''}>${esc(tr(x.tr,x.en))}</option>`).join('')}</select></label>
    <label class="bb-feature-label">${tr('Metin / İstek','Text / Request')}<textarea id="labInput" rows="7" maxlength="20000" placeholder="${tr('Buraya yaz…','Write here…')}">${esc(input)}</textarea></label><div class="bb-feature-actions"><button class="pill" id="labRun">${tool==='prompt'?tr('Komut oluştur','Build prompt'):tr('Metni işle','Transform text')}</button><button class="pill ghost" id="labSave">${tr('Taslak kaydet','Save draft')}</button></div><p class="bb-feature-muted" id="labStats">${tr('Karakter','Characters')}: ${input.length} · ${tr('Kelime','Words')}: ${input.trim()?input.trim().split(/\s+/).length:0}</p><p class="bb-feature-message" aria-live="polite">${esc(status)}</p>
    <label class="bb-feature-label">${tr('Sonuç','Result')}<textarea id="labOutput" rows="8" readonly>${esc(output)}</textarea></label><button class="pill ghost" id="labCopy">${tr('Sonucu kopyala','Copy result')}</button></section>
    <section class="bb-feature-card"><p class="eyebrow">${tr('TASLAKLAR','DRAFTS')}</p><h2>${tr('Kaydettiklerim','Saved drafts')}</h2><div class="bb-feature-links">${drafts.length?drafts.map(x=>`<div class="bb-feature-saved"><button type="button" class="bb-feature-draft" data-load="${esc(x.id)}"><strong>${esc(x.title)}</strong><small>${esc(new Date(x.at).toLocaleDateString(I18N.locale))}</small></button><button type="button" data-delete="${esc(x.id)}" aria-label="${tr('Taslağı sil','Delete draft')}">×</button></div>`).join(''):`<p class="bb-feature-muted">${tr('Henüz taslak yok.','No drafts saved yet.')}</p>`}</div></section>
    <section class="bb-feature-card"><p class="eyebrow">${tr('YAPAY ZEKÂ','AI TOOLS')}</p><h2>${tr('Komutunu kullan','Use your prompt')}</h2><p class="bb-feature-muted">${tr('LAB. yerel metin araçları sunar. Yapay zekâ yanıtı üretmez; oluşturduğun komutu kopyalayıp seçtiğin hizmette kullanabilirsin.','LAB. provides local text tools. It does not generate AI responses; copy the prompt to your preferred service.')}</p><div class="bb-feature-links"><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><strong>ChatGPT</strong><small>↗</small></a><a href="https://claude.ai/" target="_blank" rel="noopener noreferrer"><strong>Claude</strong><small>↗</small></a></div></section></div></section>`;
    root.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;output='';status='';render()});
    root.querySelector('#labMode').onchange=e=>{if(tool==='prompt')preset=e.target.value;else mode=e.target.value};
    root.querySelector('#labInput').oninput=e=>{input=e.target.value;root.querySelector('#labStats').textContent=tr('Karakter','Characters')+': '+input.length+' · '+tr('Kelime','Words')+': '+(input.trim()?input.trim().split(/\s+/).length:0)};
    root.querySelector('#labRun').onclick=()=>{output=tool==='prompt'?prompt():transform(input,mode);status='';render()};
    root.querySelector('#labSave').onclick=()=>{if(!input.trim()){status=tr('Önce bir metin yaz.','Write some text first.');render();return}const d={id:Date.now().toString(36)+Math.random().toString(36).slice(2),title:input.trim().slice(0,64),input,tool,preset,mode,at:Date.now()};status=save([d,...read()])?tr('Taslak kaydedildi.','Draft saved.'):tr('Kayıt başarısız.','Save failed.');render()};
    root.querySelector('#labCopy').onclick=async()=>{if(!output)return;try{await navigator.clipboard.writeText(output);status=tr('Kopyalandı.','Copied.')}catch(e){const o=root.querySelector('#labOutput');o.focus();o.select();status=tr('Metni seçtik; kopyalayabilirsin.','Text selected; you can copy it.')}root.querySelector('.bb-feature-message').textContent=status};
    root.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const d=read().find(x=>x.id===b.dataset.load);if(d){input=d.input;tool=d.tool;preset=d.preset;mode=d.mode;output='';status='';render()}});
    root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{save(read().filter(x=>x.id!==b.dataset.delete));render()});
  }
  return {open,transform};
})();

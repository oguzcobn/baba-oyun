"use strict";
/* CBN · Work Space, Voice Inbox, Knowledge Graph */
(() => {
  const { S, L, esc, uid, put, today, fmtDate, fmtDay, fmtStamp, toast, empty, modal } = CBN;
  const I = k => CBN.items(k), save = o => CBN.saveItem(o);

  /* ================= İŞ ALANI ================= */
  const SEC = { travel: ['Seyahat düzenlemeleri', 'Travel Arrangements'], email: ['E-postalar ve taslaklar', 'Emails & Drafts'], event: ['Etkinlikler', 'Events'], pnote: ['Proje notları', 'Project Notes'], follow: ['Takipler', 'Follow-ups'] };
  const TPL = [
    ['Misafir ziyareti', 'Guest visit', ['Ziyaret tarihleri ve program', 'Davet / izin mektubu', 'Otel rezervasyonu', 'Havalimanı transferi', 'Toplantı odası ve ikram', 'Ziyaret sonrası teşekkür ve takip']],
    ['Otel rezervasyonu', 'Hotel booking', ['Tarih ve kişi sayısı', 'Otel seçimi ve fiyat teyidi', 'Rezervasyon onayı', 'Misafire bilgilendirme', 'Fatura / ödeme']],
    ['Transfer planı', 'Transfer plan', ['Uçuş saatleri teyidi', 'Şoför ve araç ataması', 'Karşılama bilgisi misafire iletildi', 'Dönüş transferi']],
    ['Uçuş organizasyonu', 'Flight arrangement', ['Tarih ve güzergâh', 'Fiyat seçenekleri', 'Onay alındı', 'Bilet kesildi ve iletildi', 'Bagaj / koltuk tercihi']],
    ['Vize ve izin takibi', 'Visa & permit tracking', ['Gerekli belgeler listesi', 'Davet / destek mektubu', 'Randevu tarihi', 'Başvuru yapıldı', 'Sonuç ve pasaport teslimi']],
    ['Etkinlik organizasyonu', 'Event organisation', ['Tarih, yer ve bütçe', 'Davetli listesi', 'Davetiyeler gönderildi', 'İkram ve teknik hazırlık', 'Etkinlik günü akışı', 'Etkinlik sonrası değerlendirme']],
    ['Kurumsal iletişim', 'Corporate communication', ['Mesajın amacı ve hedef kitle', 'Taslak metin', 'Onay süreci', 'Yayın / gönderim', 'Geri dönüşlerin takibi']]
  ];
  function work(main, sub) {
    const tabs = [['gorevler', L('İş görevlerim', 'My Work Tasks')], ['toplanti', L('Toplantılar', 'Meetings')], ['kayitlar', L('Kayıtlar', 'Records')], ['sablon', L('Şablonlar', 'Templates')]], tab = tabs.some(x => x[0] === sub[0]) ? sub[0] : 'gorevler';
    const wt = S.tasks.filter(t => (t.tags || []).includes('work')), links = I('wlink');
    const wform = (x, sec) => CBN.formFor({ title: L('İş kaydı', 'Work record'), wide: true, value: x || { section: sec || 'follow', status: 'open', date: today() }, fields: [{ k: 'title', label: L('Başlık', 'Title'), req: true, full: true, top: true }, { k: 'section', label: L('Bölüm', 'Section'), type: 'select', opts: Object.keys(SEC).map(k => [k, L(SEC[k][0], SEC[k][1])]) }, { k: 'date', label: L('Tarih', 'Date'), type: 'date' }, { k: 'status', label: L('Durum', 'Status'), type: 'select', opts: [['open', L('Açık', 'Open')], ['done', L('Tamam', 'Done')]] }, { k: 'text', label: L('İçerik / taslak', 'Content / draft'), type: 'textarea', rows: 6 }], hint: L('Kurumsal gizli bilgileri, parolaları ve kimlik belgelerini buraya yazma: kayıtlar şifresiz olarak bu cihazda durur.', 'Do not store confidential corporate data, passwords or ID documents here: records are kept unencrypted on this device.'), onSave: v => save(x ? Object.assign(x, v) : CBN.newItem('work', v)), onDelete: x ? () => CBN.removeItem(x) : null });
    const lform = x => CBN.formFor({ title: L('Uygulama kısayolu', 'App shortcut'), value: x || { name: (CBN.me() && CBN.me().key) ? '' : 'Damen Travel App' }, fields: [{ k: 'name', label: L('Ad', 'Name'), req: true }, { k: 'url', label: L('Adres (https://…)', 'URL (https://…)'), type: 'url', req: true, ph: 'https://' }], onSave: v => { if (!/^https:\/\//i.test(v.url)) { toast(L('Adres https:// ile başlamalı', 'URL must start with https://'), { type: 'err' }); return false; } return save(x ? Object.assign(x, v) : CBN.newItem('wlink', v)); }, onDelete: x ? () => CBN.removeItem(x) : null });
    let body = '', btn = '';
    if (tab === 'gorevler') {
      const open = wt.filter(CBN.tasks.isOpen).sort(CBN.tasks.byDue), done = wt.filter(t => t.status === 'completed').sort((a, b) => b.completedAt - a.completedAt).slice(0, 5);
      body = `<form class="tk-quick wk-q"><input name="t" maxlength="200" placeholder="${L('İş görevi ekle…', 'Add a work task…')}" aria-label="${L('İş görevi ekle', 'Add work task')}"><button class="cbn-btn sm">${L('Ekle', 'Add')}</button></form><div class="wk-tasks">${open.map(CBN.tasks.row).join('') || empty('💼', L('Açık iş görevi yok', 'No open work tasks'), L('“work” etiketli görevler burada görünür.', 'Tasks tagged “work” appear here.'))}${done.length ? `<h2 class="cbn-h">${L('Son tamamlananlar', 'Recently completed')}</h2>` + done.map(CBN.tasks.row).join('') : ''}</div>`;
    } else if (tab === 'toplanti') {
      btn = `<button type="button" class="cbn-btn" data-a="meet">＋ ${L('Toplantı', 'Meeting')}</button>`;
      const ev = S.events.filter(e => e.cat === 'work').sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)), up = ev.filter(e => e.date >= today()).reverse(), past = ev.filter(e => e.date < today()).slice(0, 10);
      const row = e => `<button type="button" class="cal-row c-work" data-ev="${e.id}"><time>${esc(fmtDay(e.date))}${e.start ? ' ' + esc(e.start) : ''}</time><span><b>${esc(e.title)}</b>${e.location ? `<small>📍 ${esc(e.location)}</small>` : ''}${e.desc ? `<small>${esc(e.desc.slice(0, 120))}</small>` : ''}</span></button>`;
      body = `<div class="pj-cols"><section class="cbn-card"><h2>${L('Yaklaşan', 'Upcoming')}</h2><div class="cal-list">${up.map(row).join('') || `<p class="muted">${L('Planlı toplantı yok.', 'No meetings planned.')}</p>`}</div></section><section class="cbn-card"><h2>${L('Geçmiş', 'Past')}</h2><div class="cal-list">${past.map(row).join('') || `<p class="muted">—</p>`}</div></section></div>`;
    } else if (tab === 'kayitlar') {
      btn = `<button type="button" class="cbn-btn" data-a="rec">＋ ${L('Kayıt', 'Record')}</button>`;
      const rs = I('work').sort((a, b) => (a.status === 'done') - (b.status === 'done') || (b.date || '').localeCompare(a.date || ''));
      body = `<div class="pj-cols">${Object.keys(SEC).map(k => `<section class="cbn-card"><h2>${L(SEC[k][0], SEC[k][1])} <button type="button" class="cbn-ib" data-add="${k}" aria-label="${L('Ekle', 'Add')}">＋</button></h2>${rs.filter(r => r.section === k).map(r => `<button type="button" class="fm-note${r.status === 'done' ? ' done' : ''}" data-w="${r.id}"><b>${esc(r.title)}</b><small>${[r.date ? fmtDate(r.date) : '', r.status === 'done' ? L('tamam', 'done') : L('açık', 'open')].filter(Boolean).join(' · ')}</small>${r.text ? `<p>${esc(r.text.slice(0, 120))}</p>` : ''}</button>`).join('') || `<p class="muted">${L('Kayıt yok.', 'Nothing yet.')}</p>`}</section>`).join('')}</div>`;
    } else body = `<p class="cbn-sub">${L('Bir şablon seç: kontrol listesi hazır bir iş görevi oluşturulur, sonra düzenleyebilirsin.', 'Pick a template: a work task with a ready checklist is created, which you can then edit.')}</p><div class="pj-grid">${TPL.map((t, i) => `<button type="button" class="pj-card" data-tpl="${i}"><em>${t[2].length} ${L('adım', 'steps')}</em><b>${L(t[0], t[1])}</b><p>${t[2].slice(0, 3).map(esc).join(' · ')}…</p></button>`).join('')}</div>`;
    main.innerHTML = CBN.head('work', `${wt.filter(CBN.tasks.isOpen).length} ${L('açık iş görevi', 'open work tasks')}`, btn) + `<div class="wk-links">${links.map(l => `<span class="wk-l"><a class="cbn-btn ghost sm" href="${esc(/^https:\/\//i.test(l.url) ? l.url : '#')}" target="_blank" rel="noopener noreferrer">↗ ${esc(l.name)}</a><button type="button" class="cbn-ib" data-l="${l.id}" aria-label="${L('Kısayolu düzenle', 'Edit shortcut')}">✎</button></span>`).join('')}<button type="button" class="cbn-btn ghost sm" data-a="link">＋ ${L('Uygulama kısayolu', 'App shortcut')}</button></div>` + CBN.seg('work', tabs, tab) + `<div class="cbn-body">${body}</div>`;
    const on = (q, f) => main.querySelectorAll(q).forEach(b => b.onclick = () => f(b));
    main.querySelectorAll('.wk-tasks').forEach(CBN.tasks.bind);
    const qf = main.querySelector('.wk-q'); if (qf) qf.onsubmit = async e => { e.preventDefault(); const title = qf.t.value.trim(); if (!title) return; await put('tasks', CBN.tasks.blank({ title, tags: ['work'], status: 'planned' })); CBN.refresh(); };
    on('[data-a=link]', () => lform(null)); on('[data-l]', b => lform(links.find(l => l.id === b.dataset.l)));
    on('[data-a=meet]', () => CBN.calendar.form({ cat: 'work' })); on('[data-ev]', b => CBN.calendar.form(S.events.find(e => e.id === b.dataset.ev)));
    on('[data-a=rec]', () => wform(null)); on('[data-add]', b => wform(null, b.dataset.add)); on('[data-w]', b => wform(I('work').find(r => r.id === b.dataset.w)));
    on('[data-tpl]', async b => { const t = TPL[+b.dataset.tpl], task = CBN.tasks.blank({ title: L(t[0], t[1]), tags: ['work'], status: 'planned', checklist: t[2].map(x => ({ id: uid(), t: x, done: false })) }); await put('tasks', task); CBN.go('work/gorevler'); setTimeout(() => CBN.tasks.form(task), 80); });
  }
  CBN.register('work', { render: work });

  /* ================= SESLİ KUTU / INBOX ================= */
  let rec = null, draft = '';
  function inbox(main) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, list = I('inbox').sort((a, b) => b.createdAt - a.createdAt);
    const folders = t => { const w = CBN.low(t); return S.folders.find(f => w.includes(CBN.low(f.name.split(/[ /]/)[0]))) || null; }, proj = t => { const w = CBN.low(t); return I('project').find(p => w.includes(CBN.low(p.name.split(/[ &]/)[0]))) || null; };
    main.innerHTML = CBN.head('inbox', `${list.length} ${L('bekleyen kayıt', 'items waiting')}`) + `<section class="cbn-card vx"><div class="vx-top"><button type="button" class="vx-mic${rec ? ' on' : ''}" data-a="mic" aria-pressed="${!!rec}" ${SR ? '' : 'disabled'}>${CBN.icon('inbox')}<span>${rec ? L('Durdur', 'Stop') : L('Konuş', 'Speak')}</span></button><p class="vx-state" role="status" aria-live="polite">${SR ? (rec ? L('Dinliyorum…', 'Listening…') : L('Mikrofona dokun, konuş; metne dönüşür. Ya da bağlantı / metin yapıştır.', 'Tap the mic and speak; it becomes text. Or paste a link / text.')) : L('Bu tarayıcı konuşmayı metne çevirmeyi desteklemiyor (Chrome ya da Safari dene). Metni elle yazıp kutuya ekleyebilirsin.', 'This browser does not support speech-to-text (try Chrome or Safari). You can still type and add to the inbox.')}</p></div>
        <textarea rows="3" maxlength="8000" placeholder="${L('Sesli not, metin ya da bağlantı…', 'Voice note, text or link…')}" aria-label="${L('Gelen kutusu metni', 'Inbox text')}">${esc(draft)}</textarea><div class="cbn-actions"><span class="cbn-hint sp">${L('Konuşma tanıma tarayıcının kendi servisini kullanır; ses CBN’de saklanmaz.', 'Speech recognition uses the browser’s own service; no audio is stored in CBN.')}</span><button type="button" class="cbn-btn" data-a="add">${L('Kutuya ekle', 'Add to inbox')}</button></div></section>
      <div class="vx-list">${list.map(x => { const f = folders(x.text), p = proj(x.text); return `<article class="cbn-card vx-it" data-id="${x.id}"><p>${esc(x.text)}</p><small>${x.src === 'voice' ? '🎙 ' : x.src === 'link' ? '🔗 ' : '✎ '}${esc(fmtStamp(x.createdAt))}${f || p ? ' · ' + L('öneri: ', 'suggested: ') + esc(p ? p.name : f.name) : ''}</small><div class="cbn-actions left"><button type="button" class="cbn-btn sm" data-to="note">→ ${L('Not', 'Note')}</button><button type="button" class="cbn-btn ghost sm" data-to="task">→ ${L('Görev', 'Task')}</button><button type="button" class="cbn-btn ghost sm" data-to="idea">→ ${L('Fikir', 'Idea')}</button><span class="sp"></span><button type="button" class="cbn-btn ghost sm danger" data-to="del">${L('Sil', 'Delete')}</button></div></article>`; }).join('') || empty('📥', L('Gelen kutusu boş', 'Inbox is empty'), L('Buraya düşen kayıtları sonra not, görev ya da fikre dönüştürürsün.', 'Items land here and you turn them into notes, tasks or ideas later.'))}</div>`;
    const ta = main.querySelector('textarea'); ta.oninput = () => draft = ta.value;
    const stop = () => { if (rec) { try { rec.stop(); } catch (e) {} rec = null; } };
    main.querySelector('[data-a=mic]').onclick = () => {
      if (rec) { stop(); return CBN.refresh(); }
      try { const r = new SR(); r.lang = S.settings.lang === 'en' ? 'en-GB' : 'tr-TR'; r.continuous = true; r.interimResults = true; const base = draft ? draft + ' ' : '';
        r.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; draft = base + t; const el = document.querySelector('.vx textarea'); if (el) el.value = draft; };
        r.onerror = e => { toast(e.error === 'not-allowed' ? L('Mikrofon izni verilmedi', 'Microphone permission denied') : L('Konuşma tanıma hatası: ', 'Speech recognition error: ') + e.error, { type: 'err' }); };
        r.onend = () => { if (rec === r) { rec = null; if (CBN.cur.mod === 'inbox') CBN.refresh(); } };
        rec = r; r._voice = true; r.start(); CBN.refresh();
      } catch (e) { rec = null; toast(L('Mikrofon başlatılamadı', 'Could not start the microphone'), { type: 'err' }); }
    };
    CBN.onLeave(stop);
    main.querySelector('[data-a=add]').onclick = async () => { const t = ta.value.trim(); if (!t) return ta.focus(); const voice = !!rec; stop(); await save(CBN.newItem('inbox', { text: t, src: voice ? 'voice' : /^https?:\/\/\S+$/i.test(t) ? 'link' : 'text' })); draft = ''; CBN.refresh(); };
    main.querySelectorAll('.vx-it').forEach(a => { const x = list.find(i => i.id === a.dataset.id); a.querySelectorAll('[data-to]').forEach(b => b.onclick = async () => {
      const k = b.dataset.to, lines = x.text.split('\n'), head = lines[0].slice(0, 200), rest = lines.slice(1).join('\n'), f = folders(x.text), p = proj(x.text);
      if (k === 'del') return CBN.removeItem(x);
      if (k === 'task') await put('tasks', CBN.tasks.blank({ title: head, desc: rest, project: p ? p.name : '' }));
      else { const idea = k === 'idea', fo = idea ? S.folders.find(y => y.name.toLowerCase() === 'ideas') : f; await CBN.notes.create({ title: head.slice(0, 80), content: (head.length > 80 || rest ? [head, ...lines.slice(1)] : []).map(l => `<p>${esc(l) || '<br>'}</p>`).join(''), folderId: fo ? fo.id : null, tags: idea ? ['idea'] : [] }); }
      await CBN.del('items', x.id); toast(L('Dönüştürüldü', 'Converted')); CBN.refresh();
    }); });
  }
  CBN.register('inbox', { render: inbox });

  /* ================= BİLGİ HARİTASI ================= */
  let gf = '';
  function graph(main) {
    const N = new Map(), E = [], C = CBN.COLORS, add = (id, label, type, go) => { if (!N.has(id)) N.set(id, { id, label: String(label || '—').slice(0, 26), type, go, x: 0, y: 0, vx: 0, vy: 0, d: 0 }); return id; }, link = (a, b) => { if (a && b && a !== b && N.has(a) && N.has(b)) E.push([a, b]); };
    const projs = I('project'); projs.forEach(p => add('p' + p.id, p.name, 'projects', 'projects/' + p.id));
    const pid = name => { const p = projs.find(x => x.name === name); return p ? 'p' + p.id : null; };
    S.folders.forEach(f => add('f' + f.id, f.name, 'folder', null));
    S.notes.filter(n => !n.deletedAt && !n.archivedAt).slice(-120).forEach(n => { add('n' + n.id, CBN.notes.title(n), 'notes', 'notes/' + n.id); if (n.folderId) link('n' + n.id, 'f' + n.folderId); (n.tags || []).forEach(t => link('n' + n.id, add('t' + t, '#' + t, 'tag', null))); });
    S.notes.forEach(n => (n.links || []).forEach(l => { if (n.id < l) link('n' + n.id, 'n' + l); }));
    projs.forEach(p => (p.noteIds || []).forEach(i => link('p' + p.id, 'n' + i)));
    S.tasks.filter(CBN.tasks.isOpen).slice(-120).forEach(t => { if (t.project && pid(t.project)) link(add('k' + t.id, t.title, 'tasks', null), pid(t.project)); (t.tags || []).forEach(g => { if (N.has('t' + g)) link(add('k' + t.id, t.title, 'tasks', null), 't' + g); }); });
    S.events.filter(e => e.date >= today()).slice(0, 60).forEach(e => { const has = (e.project && pid(e.project)) || (e.noteIds || []).some(i => N.has('n' + i)); if (!has) return; add('e' + e.id, e.title, 'calendar', 'calendar/' + e.date); link('e' + e.id, pid(e.project)); (e.noteIds || []).forEach(i => link('e' + e.id, 'n' + i)); });
    I('member').forEach(m => { const mentions = [...N.values()].filter(n => n.type !== 'family' && CBN.low(n.label).includes(CBN.low(m.name)) && m.name.length > 2); if (mentions.length) { add('m' + m.id, m.name, 'family', 'family'); mentions.forEach(n => link('m' + m.id, n.id)); } });
    E.forEach(e => { N.get(e[0]).d++; N.get(e[1]).d++; });
    let nodes = [...N.values()].filter(n => n.d > 0 || n.type === 'projects'), edges = E;
    if (gf && N.has(gf)) { const keep = new Set([gf]); for (let h = 0; h < 2; h++) edges.forEach(e => { if (keep.has(e[0]) || keep.has(e[1])) { keep.add(e[0]); keep.add(e[1]); } }); nodes = nodes.filter(n => keep.has(n.id)); edges = edges.filter(e => keep.has(e[0]) && keep.has(e[1])); }
    const W = 1000, H = 640, ix = new Map(nodes.map((n, i) => [n.id, i]));
    nodes.forEach((n, i) => { const a = i / nodes.length * 6.283, r = 120 + (i % 5) * 45; n.x = W / 2 + Math.cos(a) * r; n.y = H / 2 + Math.sin(a) * r * .65; });
    const ed = edges.filter(e => ix.has(e[0]) && ix.has(e[1])).map(e => [nodes[ix.get(e[0])], nodes[ix.get(e[1])]]);
    for (let it = 0; it < 260; it++) {       // basit kuvvet yerleşimi
      const k = 1 - it / 260;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy || 1; const f = 5200 / d2, d = Math.sqrt(d2); dx /= d; dy /= d; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
      ed.forEach(([a, b]) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 95) * .02; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; });
      nodes.forEach(n => { n.vx += (W / 2 - n.x) * .004; n.vy += (H / 2 - n.y) * .006; n.x = Math.max(40, Math.min(W - 40, n.x + Math.max(-30, Math.min(30, n.vx)) * k)); n.y = Math.max(26, Math.min(H - 26, n.y + Math.max(-30, Math.min(30, n.vy)) * k)); n.vx *= .55; n.vy *= .55; });
    }
    const col = t => C[t] || (t === 'tag' ? '#A855F7' : '#94A3B8'), TY = { projects: L('Proje', 'Project'), notes: L('Not', 'Note'), tasks: L('Görev', 'Task'), calendar: L('Etkinlik', 'Event'), family: L('Kişi', 'Person'), folder: L('Klasör', 'Folder'), tag: L('Etiket', 'Tag') };
    main.innerHTML = CBN.head('graph', `${nodes.length} ${L('düğüm', 'nodes')} · ${ed.length} ${L('bağlantı', 'links')}`, `<select class="gr-f" aria-label="${L('Odak', 'Focus')}"><option value="">${L('Tüm harita', 'Whole map')}</option>${projs.map(p => `<option value="p${p.id}" ${gf === 'p' + p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`) +
      (nodes.length > 1 && ed.length ? `<section class="cbn-card gr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Kayıtlar arasındaki bağlantıların haritası', 'Map of links between your records')}">${ed.map(([a, b]) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`).join('')}${nodes.map(n => `<g class="gr-n${n.go ? ' go' : ''}" data-go="${esc(n.go || '')}" data-id="${esc(n.id)}" tabindex="${n.go ? 0 : -1}" role="${n.go ? 'link' : 'img'}" aria-label="${esc(TY[n.type] + ': ' + n.label)}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})"><circle r="${n.type === 'projects' ? 15 : Math.min(12, 6 + n.d)}" fill="${col(n.type)}"/><text y="${n.type === 'projects' ? 30 : 24}" text-anchor="middle">${esc(n.label)}</text></g>`).join('')}</svg><p class="fn-leg">${Object.keys(TY).map(k => `<i style="background:${col(k)}"></i>${esc(TY[k])}`).join(' ')}</p></section><p class="cbn-hint">${L('Bağlantılar gerçek ilişkilerden gelir: notun klasörü ve etiketi, ilişkili notlar, görevin/etkinliğin projesi, projeye bağlanan notlar, başlıkta adı geçen aile üyeleri. Bir düğüme tıklayınca kayıt açılır.', 'Links come from real relations: a note’s folder and tags, related notes, a task’s or event’s project, notes linked to a project, family members named in titles. Click a node to open the record.')}</p>` : empty('🕸️', L('Henüz gösterilecek bağlantı yok', 'No links to show yet'), L('Görevlere proje ver, notları etiketle ya da birbirine ilişkilendir; harita kendiliğinden oluşur.', 'Give tasks a project, tag notes or relate them to each other; the map builds itself.')));
    main.querySelector('.gr-f').onchange = e => { gf = e.target.value; CBN.refresh(); };
    main.querySelectorAll('.gr-n.go').forEach(g => { const go = () => CBN.go(g.dataset.go); g.onclick = go; g.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  }
  CBN.register('graph', { render: graph });
})();

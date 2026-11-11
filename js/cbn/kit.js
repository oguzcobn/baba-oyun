"use strict";
/* CBN · ortak araçlar (Sürüm 2–3): genel kayıt deposu ("items"), form üretici, mini liste, komut paleti. */
(() => {
  const { S, L, esc, uid, put, del, modal, confirmBox, toast, low, icon } = CBN;
  CBN.items = k => S.items.filter(x => x.kind === k);
  CBN.newItem = (kind, p) => Object.assign({ id: uid(), kind, createdAt: Date.now(), updatedAt: Date.now() }, p || {});
  CBN.saveItem = o => { o.updatedAt = Date.now(); return put('items', o); };
  CBN.removeItem = async (o, msg) => {
    if (!await confirmBox(msg || L('Bu kayıt silinsin mi?', 'Delete this record?'), L('Sil', 'Delete'), true)) return false;
    await del('items', o.id); CBN.refresh();
    toast(L('Silindi', 'Deleted'), { action: L('Geri al', 'Undo'), onAction: async () => { await put('items', o); CBN.refresh(); } });
    return true;
  };
  CBN.money = (n, cur) => { try { return new Intl.NumberFormat(CBN.loc(), { style: 'currency', currency: cur || 'TRY', maximumFractionDigits: 2 }).format(n || 0); } catch (e) { return (n || 0).toFixed(2) + ' ' + cur; } };
  CBN.seg = (base, tabs, cur) => `<nav class="cbn-seg" aria-label="${L('Bölümler', 'Sections')}">${tabs.map(t => `<a href="#cbn/${base}/${t[0]}" class="${t[0] === cur ? 'on' : ''}" ${t[0] === cur ? 'aria-current="page"' : ''}>${esc(t[1])}</a>`).join('')}</nav>`;
  CBN.head = (mod, sub, btn) => `<header class="cbn-head"><div><h1>${esc(CBN.modName(mod))}</h1>${sub ? `<p class="cbn-sub">${sub}</p>` : ''}</div>${btn || ''}</header>`;
  CBN.bar = (pct, cls) => `<div class="cbn-bar ${cls || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

  /* alan şemasından form: fields = [{k,label,type,opts,req,ph,list}] */
  CBN.formFor = ({ title, fields, value, onSave, onDelete, wide, hint }) => {
    const v = value || {};
    const inp = f => {
      const val = v[f.k] == null ? '' : v[f.k], a = `name="${f.k}" ${f.req ? 'required' : ''}`;
      if (f.type === 'textarea') return `<textarea ${a} rows="${f.rows || 3}" maxlength="8000" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
      if (f.type === 'select') return `<select ${a}>${f.opts.map(o => `<option value="${esc(o[0])}" ${String(val) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      if (f.type === 'number') return `<input type="number" ${a} step="any" min="0" value="${esc(val)}" inputmode="decimal">`;
      return `<input type="${f.type || 'text'}" ${a} value="${esc(val)}" maxlength="200" placeholder="${esc(f.ph || '')}" ${f.list ? `list="ff-${f.k}"` : ''}>${f.list ? `<datalist id="ff-${f.k}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
    };
    const wideF = f => f.type === 'textarea' || f.full;
    modal({ title, wide, html: `<form class="cbn-form">${fields.filter(wideF).filter(f => f.top).map(f => `<label>${esc(f.label)}${inp(f)}</label>`).join('')}<div class="cbn-fg">${fields.filter(f => !wideF(f)).map(f => `<label>${esc(f.label)}${inp(f)}</label>`).join('')}</div>${fields.filter(f => wideF(f) && !f.top).map(f => `<label>${esc(f.label)}${inp(f)}</label>`).join('')}${hint ? `<p class="cbn-hint">${esc(hint)}</p>` : ''}
      <div class="cbn-actions">${onDelete ? `<button type="button" class="cbn-btn danger ghost" data-a="del">${L('Sil', 'Delete')}</button>` : ''}<span class="sp"></span><button type="button" class="cbn-btn ghost" data-a="no">${L('Vazgeç', 'Cancel')}</button><button class="cbn-btn">${L('Kaydet', 'Save')}</button></div></form>`,
      onOpen(box, close) {
        const f = box.querySelector('form');
        box.querySelector('[data-a=no]').onclick = close;
        if (onDelete) box.querySelector('[data-a=del]').onclick = () => { close(); onDelete(); };
        f.onsubmit = async e => { e.preventDefault(); const out = {}; for (const fd of fields) { const el = f[fd.k]; let x = el.value.trim(); if (fd.type === 'number') { x = parseFloat(x); if (isNaN(x)) { if (fd.req) return el.focus(); x = 0; } } out[fd.k] = x; } if (await onSave(out) === false) return; close(); CBN.refresh(); };
      } });
  };
  /* satır içi mini liste: arr = [{id,t,done?,date?}] */
  CBN.miniList = (box, arr, o, onChange) => {
    const draw = focus => {
      box.innerHTML = (arr.length ? arr.map((x, i) => `<div class="ml-row${x.done ? ' done' : ''}">${o.check ? `<input type="checkbox" data-i="${i}" ${x.done ? 'checked' : ''} aria-label="${esc(x.t)}">` : '<i class="ml-dot"></i>'}<span>${esc(x.t)}${x.date ? `<small>${esc(CBN.fmtDate(x.date))}</small>` : ''}</span><button type="button" class="cbn-ib" data-rm="${i}" aria-label="${L('Kaldır', 'Remove')}: ${esc(x.t)}">✕</button></div>`).join('') : `<p class="muted">${esc(o.empty || '')}</p>`) +
        `<form class="ml-add"><input name="t" maxlength="200" placeholder="${esc(o.ph)}" aria-label="${esc(o.ph)}">${o.date ? `<input type="date" name="d" aria-label="${L('Tarih', 'Date')}">` : ''}<button class="cbn-ib" aria-label="${L('Ekle', 'Add')}">＋</button></form>`;
      box.querySelectorAll('input[type=checkbox]').forEach(c => c.onchange = () => { const x = arr[+c.dataset.i]; x.done = c.checked; x.doneAt = c.checked ? Date.now() : null; onChange(); draw(); });
      box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { arr.splice(+b.dataset.rm, 1); onChange(); draw(); });
      const f = box.querySelector('.ml-add'); f.onsubmit = e => { e.preventDefault(); const t = f.t.value.trim(); if (!t) return; arr.push({ id: uid(), t, done: false, date: f.d ? f.d.value : '' }); onChange(); draw(true); };
      if (focus) box.querySelector('.ml-add input').focus();
    };
    draw();
  };

  /* ---------- Ctrl/⌘+K: genel arama + komutlar ---------- */
  CBN.palette = () => {
    if (!S.settings || document.querySelector('.cbn-pal')) return;
    const cmds = [
      [L('Yeni not', 'New Note'), async () => { const n = await CBN.notes.create({}); CBN.go('notes/' + n.id); }],
      [L('Yeni görev', 'New Task'), () => CBN.tasks.form(null)],
      [L('Yeni etkinlik', 'New Event'), () => CBN.calendar.form(null)],
      [L('Proje oluştur', 'Create Project'), () => CBN.projects.form(null)],
      [L('Takvimi aç', 'Open Calendar'), () => CBN.go('calendar')],
      [L('Temayı değiştir', 'Switch Theme'), () => CBN.toggleTheme()],
      [L('Yedek indir', 'Download backup'), () => CBN.settings.exportAll()],
      ...CBN.MODS.map(m => [L('Aç: ', 'Open: ') + CBN.modName(m), () => CBN.go(m)])
    ].map(c => ({ type: L('Komut', 'Command'), title: c[0], desc: '', run: c[1], hay: low(c[0]), cmd: true }));
    const recs = () => [
      ...S.notes.filter(n => !n.deletedAt).map(n => ({ type: L('Not', 'Note'), title: CBN.notes.title(n), desc: n.text.slice(0, 90), run: () => CBN.go('notes/' + n.id), hay: low(n.title + ' ' + n.text + ' ' + (n.tags || []).join(' ')), at: n.updatedAt })),
      ...S.tasks.map(t => ({ type: L('Görev', 'Task'), title: t.title, desc: [CBN.tasks.stName(t.status), t.due ? CBN.fmtDay(t.due) : '', t.project].filter(Boolean).join(' · '), run: () => CBN.tasks.form(t), hay: low(t.title + ' ' + t.desc + ' ' + t.project + ' ' + (t.tags || []).join(' ')), at: t.updatedAt })),
      ...S.events.map(e => ({ type: L('Etkinlik', 'Event'), title: e.title, desc: CBN.fmtDate(e.date) + (e.start ? ' ' + e.start : '') + (e.location ? ' · ' + e.location : ''), run: () => CBN.calendar.form(e), hay: low(e.title + ' ' + e.desc + ' ' + e.location), at: e.updatedAt })),
      ...CBN.items('project').map(p => ({ type: L('Proje', 'Project'), title: p.name, desc: p.desc || '', run: () => CBN.go('projects/' + p.id), hay: low(p.name + ' ' + p.desc), at: p.updatedAt })),
      ...S.folders.map(f => ({ type: L('Klasör', 'Folder'), title: f.name, desc: '', run: () => { CBN.notes.scope(f.id); CBN.go('notes'); }, hay: low(f.name), at: 0 }))
    ];
    let res = [], sel = 0; const all = recs();
    modal({ title: L('Ara ya da komut çalıştır', 'Search or run a command'), wide: true, html: `<div class="cbn-pal"><input type="search" placeholder="${L('Not, görev, etkinlik, proje, klasör ya da komut…', 'Note, task, event, project, folder or command…')}" aria-label="${L('Arama', 'Search')}" autofocus autocomplete="off"><div class="pal-list" role="listbox"></div><p class="cbn-hint">↑ ↓ ${L('gezin', 'navigate')} · Enter ${L('aç', 'open')} · Esc ${L('kapat', 'close')}</p></div>`,
      onOpen(box, close) {
        const inp = box.querySelector('input'), list = box.querySelector('.pal-list');
        const draw = () => {
          const w = low(inp.value).split(/\s+/).filter(Boolean);
          res = (w.length ? [...cmds, ...all.sort((a, b) => b.at - a.at)].filter(r => w.every(x => r.hay.includes(x))) : cmds.slice(0, 8)).slice(0, 40); sel = Math.min(sel, Math.max(0, res.length - 1));
          list.innerHTML = res.length ? res.map((r, i) => `<button type="button" role="option" aria-selected="${i === sel}" class="pal-it${i === sel ? ' on' : ''}" data-i="${i}"><em>${esc(r.type)}</em><b>${esc(r.title)}</b><span>${esc(r.desc)}</span></button>`).join('') : `<p class="muted">${L('Sonuç yok', 'No results')}</p>`;
          list.querySelectorAll('.pal-it').forEach(b => b.onclick = () => run(+b.dataset.i));
          const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
        };
        const run = i => { const r = res[i]; if (!r) return; close(); r.run(); };
        inp.oninput = () => { sel = 0; draw(); };
        inp.onkeydown = e => { if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(res.length - 1, sel + 1); draw(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); } else if (e.key === 'Enter') { e.preventDefault(); run(sel); } };
        draw();
      } });
  };
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k' && document.body.classList.contains('cbn-mode')) { e.preventDefault(); CBN.palette(); } });
})();

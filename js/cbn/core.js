"use strict";
/* =====================================================================
   CBN — Personal OS · çekirdek
   Veri: IndexedDB ("cbn" veritabanı, şema sürümlü, yalnızca bu cihazda).
   Kabuk: masaüstü sol menü + mobil alt navigasyon, açık/koyu tema, TR/EN.
   Modüller CBN.register(id, { render }) ile eklenir; yönlendirme #cbn/<modül>/<alt>.
   ===================================================================== */
const CBN = (() => {
  const SCHEMA = 1, DB_NAME = 'cbn';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = n => String(n).padStart(2, '0');
  const S = { notes: [], folders: [], tasks: [], events: [], settings: null };
  const mods = {};
  let db = null, readyP = null, el = null, cur = { mod: 'home', sub: [] }, leaveFns = [], ticker = null;

  /* ---------- dil ---------- */
  const L = (tr, en) => (S.settings && S.settings.lang === 'en') ? en : tr;
  const loc = () => (S.settings && S.settings.lang === 'en') ? 'en-GB' : 'tr-TR';
  const low = s => String(s || '').toLocaleLowerCase('tr-TR');

  /* ---------- tarih ---------- */
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const pd = s => { const a = String(s).split('-'); return new Date(+a[0], a[1] - 1, +a[2]); };
  const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  function fmtDate(v) {
    if (!v) return '';
    const d = typeof v === 'string' ? pd(v) : new Date(v), dd = pad(d.getDate()), mm = pad(d.getMonth() + 1), yy = d.getFullYear(), f = S.settings.dateFmt;
    return f === 'mdy' ? `${mm}/${dd}/${yy}` : f === 'ymd' ? `${yy}-${mm}-${dd}` : `${dd}.${mm}.${yy}`;
  }
  const fmtTime = ms => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const fmtStamp = ms => fmtDate(ms) + ' ' + fmtTime(ms);
  function fmtDay(s) {
    const t = today();
    if (s === t) return L('Bugün', 'Today');
    if (s === addDays(t, 1)) return L('Yarın', 'Tomorrow');
    if (s === addDays(t, -1)) return L('Dün', 'Yesterday');
    return pd(s).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /* ---------- varsayılanlar ---------- */
  const MODS = ['home', 'notes', 'tasks', 'calendar', 'settings'];
  const MOD_NAME = { home: ['Ana Sayfa', 'Home'], notes: ['Notlar', 'Notes'], tasks: ['Görevler', 'Tasks'], calendar: ['Takvim', 'Calendar'], settings: ['Ayarlar', 'Settings'] };
  const WIDGETS = [{ id: 'overview', w: 3 }, { id: 'capture', w: 2 }, { id: 'focus', w: 1 }, { id: 'upcoming', w: 1 }, { id: 'recent', w: 1 }, { id: 'ai', w: 1 }];
  const SEED_FOLDERS = ['Personal', 'Family', 'Damen / Work', 'Scotland', 'Photography', 'Game Development', 'Ideas', 'Travel', 'Important'];
  const defaults = () => ({ lang: 'tr', theme: 'system', dateFmt: 'dmy', startPage: 'home', notif: true, modules: MODS.map(id => ({ id, hidden: false, name: '' })), widgets: WIDGETS.map(w => ({ id: w.id, w: w.w, hidden: false })), focus: [], notesView: 'list', tasksView: 'today', calView: 'month', lastBackup: null });
  function normSettings(v) {
    const d = defaults(), s = Object.assign({}, d, v && typeof v === 'object' ? v : {});
    const fix = (arr, base, keep) => { const a = (Array.isArray(arr) ? arr : []).filter(x => x && base.some(b => b.id === x.id)).map(keep); base.forEach(b => { if (!a.some(x => x.id === b.id)) a.push(b); }); return a; };
    s.modules = fix(s.modules, d.modules, m => ({ id: m.id, hidden: !!m.hidden && m.id !== 'settings', name: String(m.name || '').slice(0, 30) }));
    s.widgets = fix(s.widgets, d.widgets, w => ({ id: w.id, w: [1, 2, 3].includes(w.w) ? w.w : 1, hidden: !!w.hidden }));
    if (!Array.isArray(s.focus)) s.focus = [];
    if (!['tr', 'en'].includes(s.lang)) s.lang = 'tr';
    if (!['system', 'light', 'dark'].includes(s.theme)) s.theme = 'system';
    if (!MODS.includes(s.startPage) || s.startPage === 'settings') s.startPage = 'home';
    return s;
  }
  const modName = id => { const m = S.settings.modules.find(x => x.id === id); return (m && m.name) || L(MOD_NAME[id][0], MOD_NAME[id][1]); };

  /* ---------- IndexedDB ---------- */
  function openDb() {
    return new Promise((res, rej) => {
      let r; try { r = indexedDB.open(DB_NAME, SCHEMA); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => {        // yalnızca ekleme yapar; mevcut kayıtları silen migrasyon yok
        const d = r.result, mk = (n, o) => d.objectStoreNames.contains(n) ? null : d.createObjectStore(n, o);
        mk('notes', { keyPath: 'id' }); mk('folders', { keyPath: 'id' }); mk('tasks', { keyPath: 'id' }); mk('events', { keyPath: 'id' });
        const v = mk('versions', { keyPath: 'id' }); if (v) v.createIndex('noteId', 'noteId');
        const f = mk('files', { keyPath: 'id' }); if (f) f.createIndex('noteId', 'noteId');
        mk('meta', { keyPath: 'key' });
      };
      r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); res(r.result); };
      r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
    });
  }
  const rq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const txDone = (n, fn) => new Promise((res, rej) => { const t = db.transaction(n, 'readwrite'); fn(t.objectStore(n)); t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error); });
  const idb = {
    all: n => rq(db.transaction(n).objectStore(n).getAll()),
    get: (n, k) => rq(db.transaction(n).objectStore(n).get(k)),
    byIndex: (n, i, k) => rq(db.transaction(n).objectStore(n).index(i).getAll(k)),
    put: (n, v) => txDone(n, s => s.put(v)),
    del: (n, k) => txDone(n, s => s.delete(k)),
    clear: n => txDone(n, s => s.clear())
  };
  const saveErr = e => { console.error('[CBN] kayıt hatası', e); toast(L('Kayıt yazılamadı. Depolama alanını kontrol et.', 'Could not save. Check device storage.'), { type: 'err' }); };
  function put(n, o) { const a = S[n]; if (Array.isArray(a)) { const i = a.findIndex(x => x.id === o.id); if (i < 0) a.push(o); else a[i] = o; } return idb.put(n, o).catch(saveErr); }
  function del(n, id) { const a = S[n]; if (Array.isArray(a)) { const i = a.findIndex(x => x.id === id); if (i >= 0) a.splice(i, 1); } return idb.del(n, id).catch(saveErr); }
  const saveSettings = () => idb.put('meta', { key: 'settings', value: S.settings }).catch(saveErr);

  async function init() {
    if (!('indexedDB' in window)) throw new Error('noidb');
    db = await openDb();
    const [notes, folders, tasks, events, meta] = await Promise.all(['notes', 'folders', 'tasks', 'events', 'meta'].map(idb.all));
    Object.assign(S, { notes, folders, tasks, events });
    const m = {}; meta.forEach(x => m[x.key] = x.value);
    S.settings = normSettings(m.settings);
    if (!m.seeded) {       // başlangıç klasörleri yalnızca ilk açılışta, bir kez
      if (!folders.length) for (let i = 0; i < SEED_FOLDERS.length; i++) await put('folders', { id: uid() + i, name: SEED_FOLDERS[i], order: i, createdAt: Date.now() });
      await idb.put('meta', { key: 'seeded', value: Date.now() });
      await idb.put('meta', { key: 'schema', value: SCHEMA });
    }
  }
  const ready = () => readyP || (readyP = init().catch(e => { readyP = null; throw e; }));
  async function reload() { readyP = null; if (db) { try { db.close(); } catch (e) {} db = null; } await ready(); }

  /* ---------- içerik temizleyici (not HTML'i ve içe aktarılan yedekler için) ---------- */
  const OK_TAGS = new Set(['P', 'DIV', 'BR', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'HR']);
  const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TITLE', 'HEAD', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'NOSCRIPT', 'TEMPLATE', 'VIDEO', 'AUDIO', 'CANVAS']);
  function sanitize(html) {
    const doc = new DOMParser().parseFromString('<body>' + String(html || ''), 'text/html');
    (function walk(node) {
      [...node.childNodes].forEach(c => {
        if (c.nodeType === 8) return c.remove();
        if (c.nodeType !== 1) return;
        const t = c.tagName.toUpperCase();
        if (DROP_TAGS.has(t)) return c.remove();
        walk(c);
        if (!OK_TAGS.has(t)) { while (c.firstChild) node.insertBefore(c.firstChild, c); return c.remove(); }
        [...c.attributes].forEach(a => {
          const n = a.name.toLowerCase(), v = a.value;
          const keep = (t === 'A' && n === 'href' && /^(https?:|mailto:)/i.test(v.trim())) ||
            (t === 'IMG' && n === 'src' && /^(data:image\/(png|jpeg|gif|webp);base64,|https:\/\/)/i.test(v.trim())) ||
            (t === 'IMG' && n === 'alt') || (t === 'UL' && n === 'class' && v === 'cl') || (t === 'LI' && n === 'data-c' && /^[01]$/.test(v)) ||
            ((t === 'TD' || t === 'TH') && (n === 'colspan' || n === 'rowspan') && /^\d{1,2}$/.test(v));
          if (!keep) c.removeAttribute(a.name);
        });
        if (t === 'A') { if (!c.getAttribute('href')) { while (c.firstChild) node.insertBefore(c.firstChild, c); return c.remove(); } c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener noreferrer'); }
        if (t === 'IMG' && !c.getAttribute('src')) c.remove();
      });
    })(doc.body);
    return doc.body.innerHTML;
  }
  const toText = html => { const d = new DOMParser().parseFromString('<body>' + String(html || '').replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)>/gi, '$& '), 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };

  /* ---------- arayüz yardımcıları ---------- */
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 10h6M9 14h6M9 18h3"/>',
    tasks: '<path d="m3.5 6 1.5 1.5L7.5 5M3.5 12 5 13.5 7.5 11M3.5 18 5 19.5 7.5 17M11 6h9.5M11 12h9.5M11 18h9.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    settings: '<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'
  };
  const icon = n => `<svg class="cbn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;

  function toast(msg, o = {}) {
    let box = document.querySelector('.cbn-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'cbn-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'cbn-toast' + (o.type ? ' ' + o.type : '');
    t.innerHTML = `<span>${esc(msg)}</span>${o.action ? `<button type="button">${esc(o.action)}</button>` : ''}${o.sticky ? '<button type="button" class="x" aria-label="' + L('Kapat', 'Close') + '">✕</button>' : ''}`;
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 220); };
    const b = t.querySelector('button:not(.x)'); if (b) b.onclick = () => { kill(); o.onAction && o.onAction(); };
    const x = t.querySelector('.x'); if (x) x.onclick = kill;
    box.appendChild(t); if (!o.sticky) setTimeout(kill, o.action ? 7000 : 3200);
    return kill;
  }
  function modal({ title, html, onOpen, wide }) {
    const prev = document.activeElement, ov = document.createElement('div'); ov.className = 'cbn-ov';
    ov.innerHTML = `<div class="cbn-modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button type="button" class="cbn-x" aria-label="${L('Kapat', 'Close')}">✕</button></header><div class="cbn-mbody">${html}</div></div>`;
    const box = ov.firstChild;
    const key = e => {
      if (!ov.isConnected) return document.removeEventListener('keydown', key, true);
      if (ov !== [...document.querySelectorAll('.cbn-ov')].pop()) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { const f = [...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    };
    function close() { ov.remove(); document.removeEventListener('keydown', key, true); try { prev && prev.focus && prev.focus(); } catch (e) {} }
    document.addEventListener('keydown', key, true);
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    box.querySelector('.cbn-x').onclick = close;
    document.body.appendChild(ov);
    if (onOpen) onOpen(box, close);
    const af = box.querySelector('[autofocus]') || box.querySelector('.cbn-mbody input,.cbn-mbody textarea,.cbn-mbody select,.cbn-mbody button'); if (af) setTimeout(() => af.focus(), 30);
    return close;
  }
  const confirmBox = (msg, ok, danger) => new Promise(res => {
    let done = false;
    modal({ title: L('Onay', 'Confirm'), html: `<p class="cbn-cmsg">${esc(msg)}</p><div class="cbn-actions"><button type="button" class="cbn-btn ghost" data-a="no">${L('Vazgeç', 'Cancel')}</button><button type="button" class="cbn-btn ${danger ? 'danger' : ''}" data-a="yes" autofocus>${esc(ok || L('Tamam', 'OK'))}</button></div>`,
      onOpen(box, close) { box.querySelector('[data-a=yes]').onclick = () => { done = true; close(); res(true); }; box.querySelector('[data-a=no]').onclick = close; new MutationObserver((_, o) => { if (!box.isConnected) { o.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true }); } });
  });
  const promptBox = (title, label, value) => new Promise(res => {
    let done = false;
    modal({ title, html: `<form class="cbn-form"><label>${esc(label)}<input name="v" value="${esc(value || '')}" maxlength="80" required autofocus></label><div class="cbn-actions"><button type="button" class="cbn-btn ghost" data-a="no">${L('Vazgeç', 'Cancel')}</button><button class="cbn-btn">${L('Kaydet', 'Save')}</button></div></form>`,
      onOpen(box, close) { const f = box.querySelector('form'); f.onsubmit = e => { e.preventDefault(); const v = f.v.value.trim(); if (!v) return; done = true; close(); res(v); }; box.querySelector('[data-a=no]').onclick = close; new MutationObserver((_, o) => { if (!box.isConnected) { o.disconnect(); if (!done) res(null); } }).observe(document.body, { childList: true }); } });
  });
  function download(name, data, type) { const a = document.createElement('a'), u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain' })); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
  const empty = (emoji, title, text, btn) => `<div class="cbn-empty"><div class="cbn-empty-e" aria-hidden="true">${emoji}</div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${btn || ''}</div>`;

  /* ---------- tema ---------- */
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const isDark = () => S.settings.theme === 'dark' || (S.settings.theme === 'system' && mq && mq.matches);
  function applyTheme() { document.body.classList.toggle('cbn-dark', !!(el && el.isConnected && isDark())); }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (S.settings && el && el.isConnected) applyTheme(); });
  function toggleTheme() { S.settings.theme = isDark() ? 'light' : 'dark'; saveSettings(); applyTheme(); const b = el && el.querySelector('.cbn-theme'); if (b) b.innerHTML = themeBtn(); }
  const themeBtn = () => `${icon(isDark() ? 'sun' : 'moon')}<span>${isDark() ? L('Açık tema', 'Light theme') : L('Koyu tema', 'Dark theme')}</span>`;

  /* ---------- kabuk + yönlendirme ---------- */
  const go = path => { const h = '#cbn' + (path ? '/' + path : ''); if (location.hash === h) refresh(); else location.hash = h; };
  function leave() { leaveFns.forEach(f => { try { f(); } catch (e) { console.error(e); } }); leaveFns = []; document.querySelectorAll('.cbn-ov').forEach(o => o.remove()); }
  const onLeave = f => leaveFns.push(f);
  function drawShell() {
    const vis = S.settings.modules.filter(m => !m.hidden);
    const a = (m, cls) => `<a class="${cls}${m.id === cur.mod ? ' on' : ''}" href="#cbn/${m.id}" ${m.id === cur.mod ? 'aria-current="page"' : ''}>${icon(m.id)}<span>${esc(modName(m.id))}</span></a>`;
    el.innerHTML = `<div class="cbn" lang="${S.settings.lang}">
      <a class="cbn-skip" href="#cbnMain">${L('İçeriğe geç', 'Skip to content')}</a>
      <aside class="cbn-side" aria-label="CBN">
        <a class="cbn-brand" href="#cbn"><b>CBN</b><span>Personal OS</span></a>
        <nav class="cbn-menu" aria-label="${L('CBN modülleri', 'CBN modules')}">${vis.map(m => a(m, 'cbn-link')).join('')}</nav>
        <div class="cbn-side-foot"><button type="button" class="cbn-link cbn-theme">${themeBtn()}</button><p>${L('Veriler yalnızca bu cihazda', 'Data stays on this device')}</p></div>
      </aside>
      <section class="cbn-main" id="cbnMain" tabindex="-1"></section>
      <nav class="cbn-tabs" aria-label="${L('CBN modülleri', 'CBN modules')}">${vis.slice(0, 5).map(m => a(m, 'cbn-tab')).join('')}</nav>
    </div>`;
    el.querySelector('.cbn-theme').onclick = toggleTheme;
  }
  function renderMod() {
    const main = el && el.querySelector('#cbnMain'); if (!main) return;
    const m = mods[cur.mod];
    try { if (m) m.render(main, cur.sub); else main.innerHTML = empty('🧭', L('Sayfa bulunamadı', 'Page not found'), ''); }
    catch (e) { console.error(e); main.innerHTML = empty('⚠️', L('Bu bölüm açılırken hata oluştu', 'This section failed to open'), String(e && e.message || e)); }
  }
  function refresh() { if (el && el.isConnected) renderMod(); }
  function redraw() { if (!el || !el.isConnected) return; leave(); applyTheme(); drawShell(); renderMod(); }
  async function open(root, route) {
    leave(); el = root;
    if (!S.settings) root.innerHTML = `<div class="cbn"><div class="cbn-skel side"></div><div class="cbn-skel-col"><div class="cbn-skel h"></div><div class="cbn-skel-row"><div class="cbn-skel"></div><div class="cbn-skel"></div><div class="cbn-skel"></div></div></div></div>`;
    try { await ready(); }
    catch (e) {
      console.error('[CBN]', e);
      root.innerHTML = `<div class="cbn-fatal">${empty('🗄️', 'CBN yerel veritabanı açılamadı', 'Tarayıcı IndexedDB erişimine izin vermiyor (gizli sekme ya da depolama kısıtı olabilir). CBN veri kaydedemeyeceği için açılmadı; BABA.\'nın diğer bölümleri etkilenmez.')}</div>`;
      return;
    }
    if (!root.isConnected) return;
    const p = String(route || '').split('/').slice(1).filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    cur = { mod: p[0] || S.settings.startPage, sub: p.slice(1) };
    if (!mods[cur.mod]) cur = { mod: 'home', sub: [] };
    applyTheme(); drawShell();
    const mn = el.querySelector('#cbnMain'); mn.classList.add('anim'); setTimeout(() => mn.classList.remove('anim'), 900);
    renderMod(); start();
  }
  const register = (id, m) => { mods[id] = m; };

  /* ---------- hatırlatmalar (yalnızca uygulama açıkken) ---------- */
  async function notify(title, body, url) {
    toast('⏰ ' + title + (body ? ' · ' + body : ''), { sticky: true });
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) await reg.showNotification('⏰ ' + title, { body, icon: 'img/icon-192.png', badge: 'img/icon-192.png', data: { url } });
        else new Notification('⏰ ' + title, { body, icon: 'img/icon-192.png' });
      }
    } catch (e) {}
    try { if (typeof Snd !== 'undefined') { Snd.note(880, .15, 'triangle', .06); Snd.note(1320, .2, 'triangle', .06, .18); } } catch (e) {}
  }
  function check() {
    if (!S.settings || !S.settings.notif) return;
    const now = Date.now(), fresh = at => now - at < 12 * 3600e3; let ch = false;
    S.tasks.forEach(t => {
      if (!t.remindAt || t.remindAt > now || t.remFired === t.remindAt || t.status === 'completed' || t.status === 'cancelled') return;
      if (fresh(t.remindAt)) notify(t.title, L('Görev hatırlatması', 'Task reminder'), './#cbn/tasks');
      t.remFired = t.remindAt; put('tasks', t); ch = true;
    });
    S.events.forEach(e => {
      if (e.remindMin == null || e.remindMin === '') return;
      const at = new Date(e.date + 'T' + (e.start || '09:00')).getTime() - e.remindMin * 60000;
      if (isNaN(at) || at > now || e.remFired === at) return;
      if (fresh(at)) notify(e.title, fmtDay(e.date) + (e.start ? ' ' + e.start : '') + (e.location ? ' · ' + e.location : ''), './#cbn/calendar');
      e.remFired = at; put('events', e); ch = true;
    });
    if (ch && cur.mod === 'home' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) refresh();
  }
  function start() {
    if (ticker) return;
    ticker = setInterval(check, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    ready().then(check).catch(() => {});
  }

  return { SCHEMA, S, L, loc, low, esc, uid, pad, ymd, today, pd, addDays, nowHM, fmtDate, fmtTime, fmtStamp, fmtDay, idb, put, del, saveSettings, normSettings, defaults, reload, sanitize, toText, icon, toast, modal, confirmBox, promptBox, download, empty, applyTheme, isDark, go, refresh, redraw, open, leave, onLeave, register, start, modName, MODS, MOD_NAME, get cur() { return cur; } };
})();

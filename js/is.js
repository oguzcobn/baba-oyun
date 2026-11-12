"use strict";
/* =====================================================================
   İŞ MASASI — DSAn kısayolları, hatırlatmalar (bildirimli), notlar.
   Veriler yalnızca bu cihazda (localStorage). Bildirimler uygulama açıkken
   ya da arka planda çalışırken gelir; telefon kapalıyken de çalması için
   her hatırlatma tek dokunuşla telefon takvimine eklenebilir (.ics / Google).
   ===================================================================== */
const Is = (() => {
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const LINKS = [
    { t: 'DSAn Travel App', d: ['Ziyaret · otel · transfer takibi', 'Visits · hotels · transfer tracking'], u: 'https://dsan-travel-app.starrygull1.chatgpt.site', n: '01' },
    { t: ['Şoför Takvimi', 'Driver Schedule'], d: ['Transfer planı · günlük takvim', 'Transfer plan · daily schedule'], u: 'https://dsan-transfer-plan.starrygull1.chatgpt.site/takvim/LiViQvrCVXRZ4Wfl6Hj4Rd_PGvd-OJrgycSN8pRd9U8', n: '02' }
  ];
  const P = x => Array.isArray(x) ? T(x[0], x[1]) : x;
  const REPS = { yok: ['Tek sefer', 'One-off'], gun: ['Her gün', 'Every day'], haftaici: ['Hafta içi', 'Weekdays'], hafta: ['Her hafta', 'Every week'], ay: ['Her ay', 'Every month'] };
  const REP = new Proxy(REPS, { get: (o, k) => o[k] ? P(o[k]) : undefined });
  const rems = () => ls.get('is_rem', []), saveR = a => ls.set('is_rem', a);
  const notes = () => ls.get('is_notes', []), saveN = a => ls.set('is_notes', a);
  let el = null, tick = null, q = '';

  /* ---------- zaman yardımcıları ---------- */
  const pad = n => String(n).padStart(2, '0');
  const fmtDT = ms => { const d = new Date(ms); return d.toLocaleDateString(I18N.locale, { day: '2-digit', month: 'short', weekday: 'short' }) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  function rel(ms) {
    const s = Math.round((ms - Date.now()) / 1000), a = Math.abs(s);
    const t = a < 60 ? T('şimdi', 'now') : a < 3600 ? Math.round(a / 60) + T(' dk', ' min') : a < 86400 ? Math.floor(a / 3600) + T(' sa ', ' h ') + Math.round((a % 3600) / 60) + T(' dk', ' min') : Math.round(a / 86400) + T(' gün', ' days');
    return a < 60 ? T('şimdi', 'now') : s > 0 ? T(t + ' sonra', 'in ' + t) : T(t + ' geçti', t + ' ago');
  }
  function nextOf(at, rep) {
    const d = new Date(at);
    do {
      if (rep === 'gun') d.setDate(d.getDate() + 1);
      else if (rep === 'haftaici') { do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); }
      else if (rep === 'hafta') d.setDate(d.getDate() + 7);
      else if (rep === 'ay') d.setMonth(d.getMonth() + 1);
      else return null;
    } while (d.getTime() <= Date.now());
    return d.getTime();
  }

  /* ---------- bildirim motoru (her sayfada çalışır) ---------- */
  async function notify(r) {
    const body = (r.note ? r.note + ' · ' : '') + fmtDT(r.at);
    let shown = false;
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) { await reg.showNotification('⏰ ' + r.title, { body, tag: r.id, requireInteraction: true, icon: 'img/icon-192.png', badge: 'img/icon-192.png', data: { url: './#is' } }); shown = true; }
        else { new Notification('⏰ ' + r.title, { body, tag: r.id, icon: 'img/icon-192.png' }); shown = true; }
      }
    } catch (e) {}
    banner(r, shown);
    try { if (typeof AdvAudio !== 'undefined') { AdvAudio.note(880, .15, 'triangle', .06); setTimeout(() => AdvAudio.note(1320, .2, 'triangle', .06), 180); } } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function banner(r) {
    const b = document.createElement('div'); b.className = 'is-alert';
    b.innerHTML = `<span>${T('HATIRLATMA', 'REMINDER')} · ${esc(fmtDT(r.at))}</span><b>${esc(r.title)}</b>${r.note ? `<p>${esc(r.note)}</p>` : ''}<button>${T('Tamam', 'OK')}</button>`;
    b.querySelector('button').onclick = () => b.remove();
    document.body.appendChild(b); setTimeout(() => b.remove(), 60000);
  }
  function check() {
    const a = rems(); let ch = false;
    a.forEach(r => {
      if (r.done || r.fired === r.at || r.at > Date.now()) return;
      if (Date.now() - r.at < 1000 * 60 * 60 * 12) notify(r);    // 12 saatten eski kaçanları sessiz geç
      r.fired = r.at; ch = true;
      const n = nextOf(r.at, r.rep); if (n) { r.at = n; r.fired = null; }
    });
    if (ch) { saveR(a); if (el && el.isConnected) drawRems(); }
  }
  function start() { if (tick) return; check(); tick = setInterval(check, 15000); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); }); }

  /* ---------- takvime ekle ---------- */
  const icsDate = ms => { const d = new Date(ms); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z'; };
  function ics(r) {
    const rr = { gun: 'RRULE:FREQ=DAILY', haftaici: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', hafta: 'RRULE:FREQ=WEEKLY', ay: 'RRULE:FREQ=MONTHLY' }[r.rep];
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Baba.Oyun//Is Masasi//TR', 'BEGIN:VEVENT', 'UID:' + r.id + '@baba-oyun', 'DTSTAMP:' + icsDate(Date.now()), 'DTSTART:' + icsDate(r.at), 'DTEND:' + icsDate(r.at + 15 * 60000), 'SUMMARY:' + r.title.replace(/[,;]/g, ' '), r.note ? 'DESCRIPTION:' + r.note.replace(/\n/g, '\\n').replace(/[,;]/g, ' ') : '', rr || '', 'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + r.title.replace(/[,;]/g, ' '), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = r.title.replace(/[^\wçğıöşüÇĞİÖŞÜ ]+/g, '').slice(0, 40) + '.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const gcal = r => `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(r.title)}&dates=${icsDate(r.at)}/${icsDate(r.at + 15 * 60000)}&details=${encodeURIComponent(r.note || '')}`;

  /* ---------- arayüz ---------- */
  function open(root) {
    el = root; start();
    const now = new Date(), dflt = new Date(now.getTime() + 60 * 60000);
    const li = ls.get('is_linkedin', '');
    el.innerHTML = `<div class="bl">
      <div class="bl-reveal"></div>
      <section class="bl-hero">
        <div class="bl-top"><span class="bl-tag">DSAn® · ${T('İş Masası', 'Work Desk')}</span><span class="bl-pill bl-clock"><b class="w-time">--:--</b><span class="w-date"></span></span></div>
        <h1>${T('Sıradan bir iş günü?<br><span class="bl-u">Yok öyle.</span>', 'Just another working day?<br><span class="bl-u">Not a chance.</span>')}</h1>
        <div class="bl-row"><p class="bl-lead">${T('Ziyaretler, transferler, toplantılar — hepsi burada. Hatırlatmayı kur, notu düş, gerisini BABA. halletsin.', 'Visits, transfers, meetings — all in one place. Set a reminder, jot a note and let BABA. handle the rest.')}</p><span class="bl-pill bl-next w-next"></span></div>
      </section>
      <div class="bl-marquee" aria-hidden="true"><div>${T('<span>Damen Shipyards Antalya</span><i>✺</i><span>Travel App</span><i>✺</i><span>Şoför takvimi</span><i>✺</i><span>Hatırlatmalar</span><i>✺</i><span>Notlar</span><i>✺</i>', '<span>Damen Shipyards Antalya</span><i>✺</i><span>Travel App</span><i>✺</i><span>Driver schedule</span><i>✺</i><span>Reminders</span><i>✺</i><span>Notes</span><i>✺</i>').repeat(4)}</div></div>
      <section class="bl-links">
        ${LINKS.map((l, i) => `<a class="bl-card bl-c${i}" href="${l.u}" target="_blank" rel="noopener"><span class="bl-n">${l.n}</span><h2>${P(l.t)}</h2><p>${P(l.d)}</p><span class="bl-go">${T('Hadi gidelim', 'Let’s go')} ↗</span></a>`).join('')}
        <a class="bl-card bl-c2 bl-li" href="${li ? esc(li) : '#'}" target="_blank" rel="noopener" data-li="${li ? 1 : 0}"><span class="bl-n">03</span><h2>LinkedIn</h2><p>${li ? T('Profilime git', 'Go to my profile') : T('Profil adresini bir kez ekle', 'Add your profile link once')}</p><span class="bl-go">${li ? T('Profile git ↗', 'Open profile ↗') : T('Bağla +', 'Connect +')}</span></a>
      </section>
      <section class="bl-grid">
        <div class="bl-panel w-rem">
          <div class="w-ph"><h3>${T('Hatırlatmalar', 'Reminders')}<sup class="bl-count"></sup></h3><button class="bl-btn bl-ghost w-perm" data-a="perm"></button></div>
          <form class="w-form">
            <input name="title" placeholder="${T('Ne hatırlatılsın? (ör. Pacific heyeti havalimanı karşılama)', 'What should I remind you about? (e.g. meet the Pacific delegation at the airport)')}" maxlength="120" required>
            <div class="w-row"><input type="date" name="d" value="${dflt.getFullYear()}-${pad(dflt.getMonth() + 1)}-${pad(dflt.getDate())}" required><input type="time" name="t" value="${pad(dflt.getHours())}:${pad(dflt.getMinutes())}" required>
              <select name="rep">${Object.entries(REP).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
            <div class="w-quick">${[[T('+15 dk', '+15 min'), 15], [T('+1 sa', '+1 hr'), 60], [T('Yarın 09:00', 'Tomorrow 09:00'), 'y9'], [T('Pzt 08:30', 'Mon 08:30'), 'p830']].map(([t, v]) => `<button type="button" class="w-chip" data-q="${v}">${t}</button>`).join('')}</div>
            <textarea name="note" rows="2" placeholder="${T('Not (isteğe bağlı)', 'Note (optional)')}" maxlength="500"></textarea>
            <button class="bl-btn">${T('Hatırlatmayı kur', 'Set reminder')} →</button>
          </form>
          <div class="w-list"></div>
          <p class="w-hint">${T('Bildirimler uygulama açıkken ya da arka planda çalışırken gelir. Telefon kilitliyken de kesin çalsın istiyorsan hatırlatmayı <b>📅</b> ile telefon takvimine ekle. iPhone\'da önce siteyi “Ana Ekrana Ekle” ile kur.', 'Notifications arrive while the app is open or running in the background. If it must go off even when your phone is locked, add the reminder to your phone calendar with <b>📅</b>. On iPhone, first install the site with “Add to Home Screen”.')}</p>
        </div>
        <div class="bl-panel bl-yellow w-notes">
          <div class="w-ph"><h3>${T('Notlar', 'Notes')}</h3><input class="w-search" placeholder="${T('ara…', 'search…')}"></div>
          <form class="w-nform"><textarea name="n" rows="3" placeholder="${T('Hızlı not… (Enter: kaydet, Shift+Enter: yeni satır)', 'Quick note… (Enter: save, Shift+Enter: new line)')}" maxlength="4000"></textarea><button class="bl-btn">${T('Not ekle', 'Add note')} +</button></form>
          <div class="w-nlist"></div>
        </div>
      </section>
      <footer class="bl-foot"><b>${T('Sıradan olmak çok sıradan.', 'Ordinary is far too ordinary.')}</b><span>${T('Veriler yalnızca bu cihazda', 'Data stays on this device')} · BABA.</span></footer>
    </div>`;
    const liA = el.querySelector('.bl-li');
    liA.onclick = e => { if (liA.dataset.li === '1' && !e.altKey) return; e.preventDefault(); const v = prompt(T('LinkedIn profil adresin (ör. https://www.linkedin.com/in/kullanici-adin)', 'Your LinkedIn profile link (e.g. https://www.linkedin.com/in/your-name)'), ls.get('is_linkedin', '') || 'https://www.linkedin.com/in/'); if (v === null) return; const u = v.trim(); if (u && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(u)) return alert(T('Lütfen linkedin.com ile başlayan bir adres gir.', 'Please enter a link that starts with linkedin.com.')); ls.set('is_linkedin', u); open(el); };
    liA.oncontextmenu = e => { e.preventDefault(); liA.dataset.li = '0'; liA.click(); };
    const f = el.querySelector('.w-form');
    f.onsubmit = e => { e.preventDefault(); const fd = new FormData(f); const at = new Date(fd.get('d') + 'T' + fd.get('t')).getTime(); if (!fd.get('title').trim() || isNaN(at)) return;
      const a = rems(); a.push({ id: uid(), title: fd.get('title').trim(), note: fd.get('note').trim(), at, rep: fd.get('rep'), done: false, fired: null, created: Date.now() }); saveR(a);
      f.title.value = ''; f.note.value = ''; drawRems(); askPerm(true); };
    f.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const v = b.dataset.q, d = new Date();
      if (v === 'y9') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); } else if (v === 'p830') { do d.setDate(d.getDate() + 1); while (d.getDay() !== 1); d.setHours(8, 30, 0, 0); } else d.setTime(d.getTime() + (+v) * 60000);
      f.d.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; f.t.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`; f.title.focus(); });
    el.querySelector('[data-a=perm]').onclick = () => askPerm(false);
    const nf = el.querySelector('.w-nform'), nt = nf.querySelector('textarea');
    nf.onsubmit = e => { e.preventDefault(); const v = nt.value.trim(); if (!v) return; const a = notes(); a.unshift({ id: uid(), t: v, at: Date.now(), pin: false }); saveN(a); nt.value = ''; drawNotes(); };
    nt.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); nf.requestSubmit(); } };
    el.querySelector('.w-search').oninput = e => { q = e.target.value.toLocaleLowerCase(I18N.locale); drawNotes(); };
    drawRems(); drawNotes(); clock(); permBtn();
  }
  function clock() {
    if (!el || !el.isConnected) return;
    const d = new Date(); el.querySelector('.w-time').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    el.querySelector('.w-date').textContent = d.toLocaleDateString(I18N.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    nextLine();
    el.querySelectorAll('[data-rel]').forEach(s => s.textContent = rel(+s.dataset.rel));
    setTimeout(clock, 20000 - (Date.now() % 20000));
  }
  function nextLine() {
    const n = el && el.querySelector('.w-next'); if (!n) return;
    const up = rems().filter(r => !r.done && r.at > Date.now()).sort((a, b) => a.at - b.at)[0];
    n.innerHTML = up ? `⏰ ${T('Sıradaki', 'Next')}: <b>${esc(up.title)}</b> · ${rel(up.at)}` : T('☕ Sırada hatırlatma yok', '☕ No reminders coming up');
  }
  function permBtn() {
    const b = el && el.querySelector('[data-a=perm]'); if (!b) return;
    const p = 'Notification' in window ? Notification.permission : 'unsupported';
    b.textContent = p === 'granted' ? T('🔔 Bildirim açık', '🔔 Notifications on') : p === 'denied' ? T('🔕 Bildirim engelli', '🔕 Notifications blocked') : p === 'unsupported' ? T('🔕 Bildirim yok', '🔕 No notifications') : T('🔔 Bildirimleri aç', '🔔 Turn on notifications');
    b.classList.toggle('on', p === 'granted');
  }
  async function askPerm(silent) {
    if (!('Notification' in window)) { if (!silent) alert(T('Bu tarayıcı bildirim desteklemiyor. iPhone\'da siteyi "Ana Ekrana Ekle" ile kurup oradan açman gerekir. Hatırlatmayı 📅 Takvim ile telefon takvimine de ekleyebilirsin.', 'This browser does not support notifications. On iPhone, install the site with "Add to Home Screen" and open it from there. You can also add the reminder to your phone calendar with 📅.')); return; }
    if (Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) {} }
    else if (Notification.permission === 'denied' && !silent) alert(T('Bildirimler tarayıcı ayarlarından engellenmiş. Site ayarlarından "Bildirimler"e izin ver.', 'Notifications are blocked in your browser settings. Allow "Notifications" in the site settings.'));
    else if (Notification.permission === 'granted' && !silent) notify({ id: 'test', title: T('Bildirimler çalışıyor', 'Notifications are working'), note: T('İş Masası test bildirimi', 'Work Desk test notification'), at: Date.now() });
    permBtn();
  }
  function drawRems() {
    const box = el && el.querySelector('.w-list'); if (!box) return;
    nextLine();
    const cnt = el.querySelector('.bl-count'); if (cnt) { const k = rems().filter(r => !r.done).length; cnt.textContent = k || ''; }
    const a = rems().sort((x, y) => (x.done - y.done) || x.at - y.at);
    box.innerHTML = a.length ? a.map(r => `<div class="w-item ${r.done ? 'done' : ''} ${!r.done && r.at < Date.now() ? 'late' : ''}" data-id="${r.id}">
        <div class="w-when"><b>${esc(fmtDT(r.at))}</b><span data-rel="${r.at}">${rel(r.at)}</span>${r.rep !== 'yok' ? `<em>↻ ${REP[r.rep]}</em>` : ''}</div>
        <div class="w-what"><b>${esc(r.title)}</b>${r.note ? `<p>${esc(r.note)}</p>` : ''}</div>
        <div class="w-acts"><button data-x="done" title="${T('Tamamlandı', 'Done')}">${r.done ? '↺' : '✓'}</button><button data-x="ics" title="${T('Telefon takvimine ekle', 'Add to phone calendar')}">📅</button><a href="${gcal(r)}" target="_blank" rel="noopener" title="Google Calendar">G</a><button data-x="del" title="${T('Sil', 'Delete')}">✕</button></div></div>`).join('')
      : `<div class="w-empty">${T('Henüz hatırlatma yok. Yukarıdan bir tane kur 👆', 'No reminders yet. Set one above 👆')}</div>`;
    box.querySelectorAll('.w-item').forEach(it => it.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      const all = rems(), r = all.find(x => x.id === it.dataset.id); if (!r) return;
      if (b.dataset.x === 'done') r.done = !r.done; else if (b.dataset.x === 'ics') return ics(r); else if (b.dataset.x === 'del') { if (!confirm(T('Hatırlatma silinsin mi?', 'Delete this reminder?'))) return; all.splice(all.indexOf(r), 1); }
      saveR(all); drawRems(); }));
  }
  function drawNotes() {
    const box = el && el.querySelector('.w-nlist'); if (!box) return;
    const a = notes().filter(n => !q || n.t.toLocaleLowerCase(I18N.locale).includes(q)).sort((x, y) => (y.pin - x.pin) || y.at - x.at);
    box.innerHTML = a.length ? a.map(n => `<article class="w-note ${n.pin ? 'pin' : ''}" data-id="${n.id}"><div class="w-nh"><span>${esc(fmtDT(n.at))}</span><span><button data-x="pin">${n.pin ? '★' : '☆'}</button><button data-x="copy">⧉</button><button data-x="del">✕</button></span></div><div class="w-nt" contenteditable="true" spellcheck="false">${esc(n.t)}</div></article>`).join('')
      : `<div class="w-empty">${q ? T('Eşleşen not yok', 'No matching notes') : T('Henüz not yok ✍️', 'No notes yet ✍️')}</div>`;
    box.querySelectorAll('.w-note').forEach(it => {
      const id = it.dataset.id, upd = f => { const all = notes(), n = all.find(x => x.id === id); if (n) { f(n, all); saveN(all); } };
      it.querySelector('.w-nt').onblur = e => upd(n => { const v = e.target.innerText.trim(); if (v && v !== n.t) { n.t = v; n.at = Date.now(); } });
      it.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
        if (b.dataset.x === 'copy') { const t = it.querySelector('.w-nt').innerText; navigator.clipboard && navigator.clipboard.writeText(t); b.textContent = '✓'; return setTimeout(() => b.textContent = '⧉', 1200); }
        if (b.dataset.x === 'del' && !confirm(T('Not silinsin mi?', 'Delete this note?'))) return;
        upd((n, all) => { if (b.dataset.x === 'pin') n.pin = !n.pin; else all.splice(all.indexOf(n), 1); }); drawNotes(); });
    });
  }
  return { open, start, _check: check };
})();

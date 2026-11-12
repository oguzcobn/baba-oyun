"use strict";
/* =====================================================================
   BABA SAYFASI — şifreyle açılan yetişkin zekâ oyunları
   2048 · Sudoku · Mayın Tarlası · Blok Yığ
   Not: Şifre çocukların yanlışlıkla girmesini önlemek içindir; gerçek bir güvenlik değildir.
   ===================================================================== */
const App = (() => {
  const DEFAULT_HASH = '2d5een7ghm3', PIN_LEN = 6;      // 6 haneli şifre; eski 4 haneli şifreler geçersiz
  const cyrb = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const hash = pin => cyrb('lale-ela:' + pin);
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const storedHash = () => ls.get('baba_pin6_hash', null) || DEFAULT_HASH;
  let unlocked = false; try { unlocked = sessionStorage.getItem('baba_ok') === '1'; } catch (e) {}
  // misafir: sahibinin verdiği davet koduyla bu cihazda açılır
  const norm = n => String(n || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
  const inviteCode = name => 'B-' + cyrb('baba-davet:' + norm(name)).slice(0, 6).toUpperCase();
  let guest = ls.get('baba_guest', null);
  if (guest && inviteCode(guest.name) !== guest.code) guest = null;
  /* davet bağlantısı (?davet=KOD&ad=AD ya da eski #davet=…): geçerliyse doğrudan davetli olarak açılır.
     Ana ekrana eklenen uygulama Safari'den ayrı hafıza kullandığı için davet adreste ve manifestte taşınır. */
  const fromUrl = () => { try { const s = new URLSearchParams(location.search), h = location.hash.match(/davet=([^&]+)&ad=([^&]+)/), c = s.get('davet') || (h && decodeURIComponent(h[1])), n = s.get('ad') || (h && decodeURIComponent(h[2])); return c && n ? { c: String(c).trim().toUpperCase(), n: String(n).trim().slice(0, 40) } : null; } catch (e) { return null; } };
  { const u = fromUrl(); if (u && !unlocked && inviteCode(u.n) === u.c && (!guest || guest.code !== u.c)) { guest = { name: u.n, code: u.c, at: Date.now() }; ls.set('baba_guest', guest); } }
  let manBase = null, manUrl = null;
  async function setManifest(start) {
    const link = document.querySelector('link[rel=manifest]'); if (!link) return;
    if (manUrl) { URL.revokeObjectURL(manUrl); manUrl = null; }
    if (!start) { link.setAttribute('href', 'manifest.webmanifest'); return; }
    try {
      if (!manBase) manBase = await (await fetch('manifest.webmanifest', { cache: 'no-cache' })).json();
      const dir = location.origin + location.pathname.replace(/[^/]*$/, ''), m = JSON.parse(JSON.stringify(manBase));
      m.start_url = start; m.scope = dir; (m.icons || []).forEach(i => { i.src = new URL(i.src, dir).href; });
      manUrl = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' })); link.setAttribute('href', manUrl);
    } catch (e) {}
  }
  let manFor = '';
  function guestUrl() {
    if (guest && !unlocked) {
      const q = '?davet=' + encodeURIComponent(guest.code) + '&ad=' + encodeURIComponent(guest.name);
      if (location.search !== q) history.replaceState(null, '', location.pathname + q + location.hash);
      if (manFor !== q) { manFor = q; setManifest(location.origin + location.pathname + q); }
    } else if (manFor) { manFor = ''; setManifest(null); }
  }
  const isOwner = () => unlocked, isGuest = () => !unlocked && !!guest, canIn = () => unlocked || !!guest;
  const OWNER_ONLY = ['is', 'erisim', 'ts'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const root = () => document.getElementById('view');
  let cleanup = [];
  const onLeave = f => cleanup.push(f);
  function leave() { cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = []; }
  const click = () => Snd.click();
  const blip = (f, d, v) => Snd.note(f, d || .08, 'triangle', v || .05);

  /* ---------------- PIN kilidi ---------------- */
  function pinPad(title, onOk, opts = {}) {
    const ov = document.createElement('div'); ov.className = 'bb-pin-ov';
    ov.innerHTML = `<div class="bb-pin"><div class="bb-lock">🔒</div><h3>${title}</h3><div class="bb-dots">${'<i></i>'.repeat(PIN_LEN)}</div><p class="bb-msg">${opts.msg || T('6 haneli şifreyi gir', 'Enter your 6-digit PIN')}</p>
      <div class="bb-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '✖', 0, '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
    document.body.appendChild(ov);
    let v = ''; const dots = ov.querySelectorAll('.bb-dots i'), msg = ov.querySelector('.bb-msg');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < v.length));
    const close = () => ov.remove();
    ov.querySelectorAll('.bb-keys button').forEach(b => b.onclick = () => {
      const k = b.dataset.k; click();
      if (k === '✖') { close(); if (opts.onCancel) opts.onCancel(); return; }
      if (k === '⌫') { v = v.slice(0, -1); paint(); return; }
      if (v.length >= PIN_LEN) return; v += k; paint();
      if (v.length === PIN_LEN) setTimeout(() => {
        const r = onOk(v);
        if (r === true) { close(); }
        else { ov.querySelector('.bb-pin').classList.add('bad'); msg.textContent = r || T('Şifre yanlış, tekrar dene', 'Wrong PIN, please try again'); setTimeout(() => ov.querySelector('.bb-pin').classList.remove('bad'), 450); v = ''; paint(); }
      }, 120);
    });
    const kd = e => { if (/^[0-9]$/.test(e.key)) ov.querySelector(`[data-k="${e.key}"]`).click(); else if (e.key === 'Backspace') ov.querySelector('[data-k="⌫"]').click(); else if (e.key === 'Escape') ov.querySelector('[data-k="✖"]').click(); };
    addEventListener('keydown', kd); const obs = new MutationObserver(() => { if (!ov.isConnected) { removeEventListener('keydown', kd); obs.disconnect(); } }); obs.observe(document.body, { childList: true });
  }
  function askOpen() {
    pinPad('BABA.', pin => {
      if (hash(pin) !== storedHash()) return T('Şifre yanlış, tekrar dene', 'Wrong PIN, please try again');
      unlocked = true; try { sessionStorage.setItem('baba_ok', '1'); } catch (e) {}
      render(); return true;
    });
  }
  function changePin() {
    pinPad(T('Yeni şifre', 'New PIN'), p1 => {
      setTimeout(() => pinPad(T('Yeni şifreyi tekrar gir', 'Enter the new PIN again'), p2 => { if (p1 !== p2) return T('İki şifre aynı değil', 'The two PINs don’t match'); ls.set('baba_pin6_hash', hash(p1)); toast(T('🔐 Şifre değiştirildi', '🔐 PIN changed')); return true; }), 50);
      return true;
    }, { msg: T('Bu cihazda kullanılacak yeni 6 haneli şifre', 'New 6-digit PIN for this device') });
  }
  function lock() { unlocked = false; try { sessionStorage.removeItem('baba_ok'); } catch (e) {} if (location.hash) location.hash = ''; else render(); }
  function guestOut() { guest = null; try { localStorage.removeItem('baba_guest'); } catch (e) {} history.replaceState(null, '', location.pathname); manFor = 'x'; guestUrl(); render(); }
  function toast(t) { const d = document.createElement('div'); d.className = 'bb-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }

  /* ---------------- menü ---------------- */
  const GAMES = [
    { id: 'draft', name: 'Süper Lig Draft', tags: [['Futbol', 'Football'], ['18 kulüp', '18 clubs'], ['İstatistik', 'Stats']], best: () => ls.get('draft_best', 0) + T(' p', ' pts') },
    { id: 'vadi', name: 'Empires of the Valley', tags: [['Strateji', 'Strategy'], ['Şehir kurma', 'City-building']], best: () => T('1. Bölüm', 'Chapter 1') },
    { id: '2048', name: '2048', tags: [['Bulmaca', 'Puzzle'], ['Kaydır', 'Swipe']], best: () => ls.get('bb_best_2048', 0) },
    { id: 'sudoku', name: 'Sudoku', tags: [['Mantık', 'Logic'], ['3 seviye', '3 levels']], best: () => { const b = ls.get('bb_best_sudoku', null); return b ? fmtT(b) : '—'; } },
    { id: 'mines', name: ['Mayın Tarlası', 'Minesweeper'], tags: [['Klasik', 'Classic'], ['Dikkat', 'Focus']], best: () => { const b = ls.get('bb_best_mines', null); return b ? fmtT(b) : '—'; } },
    { id: 'blocks', name: ['Blok Yığ', 'Block Stack'], tags: ['Arcade', ['Hız', 'Speed']], best: () => ls.get('bb_best_blocks', 0) }
  ];
  const P = x => Array.isArray(x) ? T(x[0], x[1]) : x;
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function shell(title, inner, tag) {
    root().innerHTML = `<section class="game-page"><div class="gp-head"><a class="back" href="#oyunlar">← ${T('Oyunlar', 'Games')}</a><p class="eyebrow">${tag || T('Zekâ oyunu', 'Brain game')}</p><h1 class="display sm">${title}</h1></div><div class="bb-body">${inner}</div></section>`;
    window.scrollTo(0, 0);
    return root().querySelector('.bb-body');
  }
  function hub() {
    const d = new Date(), pn = (typeof CBN !== 'undefined' && CBN.S && CBN.S.settings && CBN.S.settings.profile && CBN.S.settings.profile.name) || '', name = pn || (isOwner() ? 'Oğuzhan' : (guest && guest.name));
    const CATS = [
      { id: 'cbn', n: '01', t: 'CBN<i>Personal OS</i>', d: T('Notlar · görevler · takvim · projeler · aile · finans · hedefler — kişisel asistanın, yalnızca sana özel', 'Notes · tasks · calendar · projects · family · finance · goals — your personal assistant, just for you'), cls: 'c-cbn' },
      { id: 'msn', n: '02', t: 'Messenger<i>' + T('sohbet', 'chat') + '</i>', d: T('Aile, arkadaşlar, iş — durumlar, titreşim, gruplar; MSN usulü anlık mesajlaşma', 'Family, friends, work — statuses, nudges, groups; instant messaging the MSN way'), cls: 'c-msn' },
      ...(isOwner() ? [{ id: 'is', n: '02', t: T('İş', 'Work'), d: T('DSAn kısayolları, hatırlatmalar, notlar, LinkedIn', 'DSAn shortcuts, reminders, notes, LinkedIn'), cls: 'c-is' }] : []),
      { id: 'dost', n: '03', t: 'Dost', d: T('Psikoloji okuma alanı · nefes molası', 'Psychology reading room · breathing break'), cls: 'c-dost' },
      { id: 'oyunlar', n: '04', t: T('Oyunlar', 'Games'), d: T('Süper Lig Draft · Empires of the Valley · 2048 · Sudoku · Mayın · Blok', 'Süper Lig Draft · Empires of the Valley · 2048 · Sudoku · Minesweeper · Blocks'), cls: 'c-oyun' },
      { id: 'seyahat', n: '05', t: T('Seyahat', 'Travel'), d: T('Booking · Airbnb · Skyscanner · Gezilerim 3D dünya', 'Booking · Airbnb · Skyscanner · My Travels 3D globe'), cls: 'c-sey' },
      { id: 'foto', n: '06', t: T('Fotoğraf', 'Photography'), d: T('Pexels · günün fotoğrafçısı · 3D sokak galerisi', 'Pexels · photographer of the day · 3D street gallery'), cls: 'c-foto' },
      ...(isOwner() ? [{ id: 'ts', n: '07', t: 'Trabzonspor', d: T('Sıradaki maç · son 5 maç · kadro · TS Club', 'Next match · last 5 matches · squad · TS Club'), cls: 'c-ts' }] : [])
    ];
    root().innerHTML = `
      <section class="hero hub-hero"><p class="eyebrow">${esc(name || '')} · ${d.toLocaleDateString(I18N.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 class="display xl">BABA<em>.</em></h1>
        <p class="lead">${T('İş, dinlenme, oyun ve yolculuk — hepsi tek yerde, sadece davetlilere açık.', 'Work, rest, play and travel — all in one place, open by invitation only.')}</p></section>
      <section class="hub">${CATS.map((c, i) => `<a class="hub-card ${c.cls}" href="#${c.id}"><span class="hub-n">${String(i + 1).padStart(2, '0')}</span><h2>${c.t}</h2><p>${c.d}</p><span class="arrow">↗</span></a>`).join('')}</section>
      <footer class="foot"><div class="foot-word">BABA<span>.</span></div><div class="foot-row">${isOwner() ? `<button class="link" data-a="pin">${T('Şifreyi değiştir', 'Change PIN')}</button><a class="link" href="#erisim">${T('Davetler &amp; erişim', 'Invitations &amp; access')}</a><button class="link" data-a="lock">${T('Kilitle', 'Lock')}</button>` : `<button class="link" data-a="gout">${T('Bu cihazdan çık', 'Sign out on this device')}</button>`}<span class="muted">${T('Yalnızca davetliler için', 'Invitation only')} · ${T('sürüm', 'version')} 32</span></div></footer>`;
    const q = s => root().querySelector(s);
    if (q('[data-a=pin]')) q('[data-a=pin]').onclick = () => { click(); changePin(); };
    if (q('[data-a=lock]')) q('[data-a=lock]').onclick = () => { click(); lock(); };
    if (q('[data-a=gout]')) q('[data-a=gout]').onclick = () => { if (confirm(T('Davetli erişimi bu cihazdan kaldırılsın mı?', 'Remove guest access from this device?'))) guestOut(); };
    window.scrollTo(0, 0);
  }
  /* ---------------- davetler (yalnızca sahibi) ---------------- */
  function access() {
    const list = ls.get('baba_invites', []);
    const link = (n, c) => location.origin + location.pathname + '?davet=' + encodeURIComponent(c) + '&ad=' + encodeURIComponent(n);
    root().innerHTML = `<section class="game-page"><div class="gp-head"><a class="back" href="#">← ${T('Ana sayfa', 'Home')}</a><p class="eyebrow">${T('Yalnızca sahibi görür', 'Visible to the owner only')}</p><h1 class="display sm">${T('Davetler &amp; erişim', 'Invitations &amp; access')}</h1></div>
      <div class="acc">
        <form class="acc-form"><input name="n" placeholder="${T('Davet edeceğin kişinin adı (ör. Nicole)', 'Name of the person you are inviting (e.g. Nicole)')}" required maxlength="40"><button class="pill">${T('Davet kodu oluştur', 'Create invitation code')}</button></form>
        <div class="acc-list">${list.length ? list.slice().reverse().map(x => `<div class="acc-item"><div><b>${esc(x.name)}</b><code>${x.code}</code><small class="muted">${new Date(x.at).toLocaleDateString(I18N.locale)}</small></div><div class="acc-acts"><button class="pill ghost sm" data-share="${esc(x.name)}">${T('Paylaş', 'Share')}</button><button class="pill ghost sm" data-del="${esc(x.code)}">${T('Listeden sil', 'Remove from list')}</button></div></div>`).join('') : `<p class="muted">${T('Henüz davet yok.', 'No invitations yet.')}</p>`}</div>
        <div class="acc-note">${T(`<h3>Nasıl çalışır?</h3><p><b>Ana ekrana eklemek için:</b> davetli, gönderdiğin bağlantıyı açıp giriş yaptıktan sonra “Ana Ekrana Ekle”yi kullanmalı. Uygulama simgesi daveti hatırlar ve PIN sormadan yalnızca davetlilere açık bölümlerle açılır.</p><p>Uygulamaya yalnızca senin şifrenle ya da senin verdiğin davet koduyla girilir. Katılmak isteyen biri giriş ekranından sana istek mesajı gönderir; uygun görürsen buradan ona özel bir kod oluşturup paylaşırsın. Davetliler İş ve Trabzonspor sayfalarını göremez; kayıtları yalnızca kendi cihazlarında tutulur.</p><p class="muted sm">Not: Site GitHub Pages'te durduğu için bu bir “kapı kilidi”dir, banka kasası değil.</p>`, `<h3>How does it work?</h3><p><b>Adding to the Home Screen:</b> your guest should open the link you sent, sign in, and then use “Add to Home Screen”. The app icon remembers the invitation and opens straight into the guest sections, without asking for a PIN.</p><p>The app can only be opened with your PIN or with an invitation code you give out. Someone who wants to join can send you a request from the sign-in screen; if you are happy with it, create a personal code here and share it. Guests cannot see the Work or Trabzonspor pages, and their records are kept only on their own devices.</p><p class="muted sm">Note: because the site is hosted on GitHub Pages, this is a door latch, not a bank vault.</p>`)}</div>
      </div></section>`;
    const f = root().querySelector('.acc-form');
    const share = n => { const c = inviteCode(n), u = link(n, c), t = T(`Merhaba ${n}, BABA. uygulamama davetlisin 🙂\nGiriş kodun: ${c}\n${u}`, `Hi ${n}, you’re invited to my BABA. app 🙂\nYour sign-in code: ${c}\n${u}`); if (navigator.share) navigator.share({ title: T('BABA. daveti', 'BABA. invitation'), text: t }).catch(() => {}); else { navigator.clipboard && navigator.clipboard.writeText(t); toast(T('📋 Davet metni kopyalandı', '📋 Invitation copied')); } };
    f.onsubmit = e => { e.preventDefault(); const n = f.n.value.trim(); if (!n) return; const c = inviteCode(n); const l = ls.get('baba_invites', []).filter(x => x.code !== c); l.push({ name: n, code: c, at: Date.now() }); ls.set('baba_invites', l); access(); share(n); };
    root().querySelectorAll('[data-share]').forEach(b => b.onclick = () => share(b.dataset.share));
    root().querySelectorAll('[data-del]').forEach(b => b.onclick = () => { ls.set('baba_invites', ls.get('baba_invites', []).filter(x => x.code !== b.dataset.del)); access(); });
    window.scrollTo(0, 0);
  }
  function menu() {
    const card = (g, i) => `<a class="card ${g.id}" href="#${g.id}"><div class="card-art art-${g.id}">${ART[g.id]}</div>
      <div class="card-meta"><span class="num">0${i + 1}</span><h3>${P(g.name)}</h3><span class="arrow">↗</span></div>
      <div class="card-tags">${g.tags.map(t => `<span class="chip">${P(t)}</span>`).join('')}<span class="chip dark">🏆 ${g.best()}</span></div></a>`;
    root().innerHTML = `
      <section class="hero"><a class="back" href="#">← ${T('Ana sayfa', 'Home')}</a><p class="eyebrow">${T('Oyunlar', 'Games')} · ${new Date().toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long' })}</p>
        <h1 class="display xl">${T('Kafa<br>dinle.<br><em>Kadro kur.</em>', 'Unwind.<br>Switch off.<br><em>Pick a squad.</em>')}</h1>
        <div class="hero-row"><p class="lead">${T('Altı oyun, sıfır reklam. Futbol draftından vadide medeniyet kurmaya, kısa molalar için seçilmiş bir koleksiyon.', 'Six games, zero adverts. From a football draft to building a civilisation in the valley — a hand-picked collection for short breaks.')}</p>
          <a class="pill big" href="#draft">${T('Draft’a başla', 'Start the draft')} ↗</a></div></section>
      <section class="feature"><a href="#draft" class="feat-card"><div class="feat-art">${ART.draft}</div><div class="feat-txt"><span class="badge">${T('Günün oyunu', 'Game of the day')}</span><h2>Süper Lig<br>Draft</h2><p>${T('Çark 18 Süper Lig kulübü arasında eşit şansla döner; gelen takımın son 10 yıllık kadrosundan seç, 11+2 kur. Teknik direktörünü ve taktiğini belirle, 34 maçlık sezonu canlı izle. Hedef: 102 puan.', 'The wheel spins across 18 Süper Lig clubs with equal odds; pick from that club’s squads of the last 10 years and build an 11 plus 2. Choose your manager and tactics, then follow the 34-match season live. Target: 102 points.')}</p><div class="card-tags"><span class="chip">${T('Futbol', 'Football')}</span><span class="chip">${T('Strateji', 'Strategy')}</span><span class="chip dark">🏆 ${ls.get('draft_best', 0)} ${T('puan', 'pts')}</span></div></div></a></section>
      <section class="list"><div class="list-head"><h2 class="display sm">${T('Koleksiyon', 'Collection')}</h2><span class="muted">${GAMES.length} ${T('oyun', 'games')}</span></div>
        <div class="cards">${GAMES.map(card).join('')}</div></section>
`;
    window.scrollTo(0, 0);
  }
  const ART = {
    vadi: `<svg viewBox="0 0 200 130"><rect width="200" height="130" fill="#bfe3f2"/><path d="M100 30 190 75 100 120 10 75Z" fill="#7cc04f"/><path d="M10 75 100 120v10L10 85Z" fill="#8a5a36"/><path d="M190 75 100 120v10l90-45Z" fill="#6f4628"/><path d="M40 60 70 75 55 82.500 25 67.500Z" fill="#4aa3df"/><path d="M118 62 140 73 118 84 96 73Z" fill="#8b5a2b" fill-opacity=".55"/><g><path d="M92 62v-14l12-7 12 7v14l-12 6Z" fill="#f3e3c3"/><path d="M90 48l14-9 14 9-14 7Z" fill="#b5523a"/><rect x="101" y="57" width="6" height="9" fill="#7a4a2a"/></g><g fill="#2f7d46"><path d="M150 78l7-16 7 16Z"/><path d="M160 86l7-16 7 16Z"/><path d="M140 88l7-16 7 16Z"/><path d="M62 96l7-16 7 16Z"/><path d="M76 102l7-16 7 16Z"/></g><g fill="#9aa3ad"><path d="M120 98l8-6 8 6-8 4Z"/><path d="M130 104l7-5 7 5-7 4Z"/></g></svg>`,
    draft: `<svg viewBox="0 0 200 130"><rect width="200" height="130" fill="#1f8a4c"/><g stroke="#fff" stroke-opacity=".5" fill="none" stroke-width="1.5"><rect x="8" y="8" width="184" height="114"/><line x1="100" y1="8" x2="100" y2="122"/><circle cx="100" cy="65" r="18"/><rect x="8" y="40" width="22" height="50"/><rect x="170" y="40" width="22" height="50"/></g><g fill="#fff">${[[40, 30], [40, 100], [60, 65], [85, 40], [85, 90], [125, 65], [150, 35], [150, 95], [175, 65]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6"/>`).join('')}</g><circle cx="20" cy="65" r="6" fill="#ffd54a"/></svg>`,
    '2048': `<div class="mini2048">${[2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4, 2, 8, 16, 2].map(v => `<i class="v${v}">${v}</i>`).join('')}</div>`,
    sudoku: `<div class="minisd">${'531974862'.split('').map((d, i) => `<i>${i % 2 ? '' : d}</i>`).join('')}</div>`,
    mines: `<div class="minimn">${[1, 1, 2, '🚩', 1, 0, 1, 2, 3, '🚩', 0, 1, '💣', 2, 1, 0].map(v => `<i class="${v === 0 ? 'o' : ''}">${v || ''}</i>`).join('')}</div>`,
    blocks: `<div class="minibk">${[0, 0, 0, 'T', 0, 0, 0, 'T', 'T', 0, 'L', 0, 0, 'T', 'I', 'L', 'L', 'L', 'O', 'O', 'I', 'S', 'S', 'O', 'O', 'I', 'S', 'S', 'Z', 'Z'].map(v => `<i class="${v || ''}"></i>`).join('')}</div>`
  };

  /* ==================== EMPIRES OF THE VALLEY ==================== */
  // Oyun kendi deposunda (oguzcobn/empires-of-the-valley) durur ve aynı adres kökünden yayınlanır;
  // burada çerçeve içinde açılır, böylece oyunun her güncellemesi buraya kendiliğinden yansır.
  const VADI_URL = 'https://oguzcobn.github.io/empires-of-the-valley/';
  function vadi() {
    const b = shell('Empires of<br>the Valley', `<div class="vd-bar"><p class="bb-tip">${T('Vadide küçük bir köyden medeniyete. Kayıtlar bu cihazda tutulur.', 'From a small village in the valley to a civilisation. Saves are kept on this device.')}</p><div class="vd-acts"><button class="bb-btn" data-a="full">⛶ ${T('Tam ekran', 'Full screen')}</button><a class="bb-btn" href="${VADI_URL}" target="_blank" rel="noopener">${T('Yeni sekmede aç', 'Open in a new tab')} ↗</a></div></div>
      <div class="vd-frame"><iframe src="${VADI_URL}" title="Empires of the Valley" allow="fullscreen; autoplay" allowfullscreen loading="eager"></iframe></div>
      <p class="bb-tip">${T('Kısayollar: Boşluk duraklat · 1/2/3 hız · B inşa · R yol · Esc iptal. Telefonda dar geliyorsa “Yeni sekmede aç”ı kullan.', 'Shortcuts: Space pause · 1/2/3 speed · B build · R road · Esc cancel. If it feels cramped on a phone, use “Open in a new tab”.')}</p>`, T('Strateji · şehir kurma', 'Strategy · city-building'));
    const fr = b.querySelector('.vd-frame'), fb = b.querySelector('[data-a=full]');
    const req = fr.requestFullscreen || fr.webkitRequestFullscreen;
    if (!req) fb.hidden = true;
    else fb.onclick = () => { click(); try { const p = req.call(fr); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  }

  /* ==================== 2048 ==================== */
  function g2048() {
    const b = shell('2048', `<div class="g2-head"><div class="g2-sc"><small>${T('SKOR', 'SCORE')}</small><b class="sc">0</b></div><div class="g2-sc"><small>${T('EN İYİ', 'BEST')}</small><b class="bs">${ls.get('bb_best_2048', 0)}</b></div><button class="bb-btn" data-a="undo">↶ ${T('Geri', 'Undo')}</button><button class="bb-btn" data-a="new">${T('Yeni', 'New')}</button></div>
      <div class="g2-board"><div class="g2-cells">${'<i></i>'.repeat(16)}</div><div class="g2-tiles"></div><div class="g2-over" hidden></div></div><p class="bb-tip">${T('Parmağınla kaydır ya da ok tuşlarını kullan', 'Swipe with your finger or use the arrow keys')}</p>`);
    const tilesEl = b.querySelector('.g2-tiles'), scEl = b.querySelector('.sc'), bsEl = b.querySelector('.bs'), over = b.querySelector('.g2-over');
    let grid, score, id, hist = [], won = false;
    const save = () => ls.set('bb_2048_state', { grid: grid.map(r => r.map(t => t && t.v)), score, won });
    function fresh() { grid = Array.from({ length: 4 }, () => Array(4).fill(null)); score = 0; won = false; hist = []; add(); add(); over.hidden = true; render(true); }
    function add() { const e = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) e.push([r, c]); if (!e.length) return; const [r, c] = e[Math.floor(Math.random() * e.length)]; grid[r][c] = { v: Math.random() < .9 ? 2 : 4, id: ++id, isNew: true }; }
    id = 0;
    const st = ls.get('bb_2048_state', null);
    if (st && st.grid) { grid = st.grid.map(r => r.map(v => v ? { v, id: ++id } : null)); score = st.score || 0; won = !!st.won; render(true); } else fresh();
    function render(instant) {
      const live = new Set();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const t = grid[r][c]; if (!t) continue; live.add(String(t.id));
        let e = tilesEl.querySelector(`[data-id="${t.id}"]`);
        if (!e) { e = document.createElement('div'); e.dataset.id = t.id; tilesEl.appendChild(e); if (t.isNew) e.classList.add('new'); }
        e.className = `g2-t v${Math.min(t.v, 4096)}${t.isNew ? ' new' : ''}${t.merged ? ' merged' : ''}`;
        e.textContent = t.v; e.style.setProperty('--r', r); e.style.setProperty('--c', c);
        if (instant) e.style.transition = 'none'; else e.style.transition = '';
        t.isNew = false; t.merged = false;
      }
      tilesEl.querySelectorAll('.g2-t').forEach(e => { if (!live.has(e.dataset.id)) { if (e.dataset.gone) return; e.dataset.gone = 1; setTimeout(() => e.remove(), 120); } });
      scEl.textContent = score; const best = Math.max(score, ls.get('bb_best_2048', 0)); ls.set('bb_best_2048', best); bsEl.textContent = best;
      save();
    }
    function move(dir) {
      if (!over.hidden) return;
      const prev = { g: grid.map(r => r.map(t => t && { v: t.v, id: t.id })), s: score };
      let moved = false, gain = 0;
      const get = (i, j) => dir === 'l' ? [i, j] : dir === 'r' ? [i, 3 - j] : dir === 'u' ? [j, i] : [3 - j, i];
      const next = Array.from({ length: 4 }, () => Array(4).fill(null));
      for (let i = 0; i < 4; i++) {
        const line = []; for (let j = 0; j < 4; j++) { const [r, c] = get(i, j); if (grid[r][c]) line.push(grid[r][c]); }
        const out = [];
        for (let k = 0; k < line.length; k++) {
          if (k + 1 < line.length && line[k].v === line[k + 1].v) {
            const m = { v: line[k].v * 2, id: line[k].id, merged: true }; gain += m.v; out.push(m);
            // birleşen ikinci taş birinciye doğru kayıp kaybolsun
            const ghost = tilesEl.querySelector(`[data-id="${line[k + 1].id}"]`); if (ghost) { const [r, c] = get(i, out.length - 1); ghost.style.setProperty('--r', r); ghost.style.setProperty('--c', c); ghost.dataset.gone = 1; setTimeout(() => ghost.remove(), 130); }
            k++;
          } else out.push(line[k]);
        }
        for (let j = 0; j < 4; j++) { const [r, c] = get(i, j); next[r][c] = out[j] || null; if ((grid[r][c] && grid[r][c].id) !== (next[r][c] && next[r][c].id) || (next[r][c] && next[r][c].merged)) moved = true; }
      }
      if (!moved) return;
      hist.push(prev); if (hist.length > 20) hist.shift();
      grid = next; score += gain; if (gain) blip(300 + Math.log2(gain) * 60, .1); add(); render(false);
      if (!won && grid.some(r => r.some(t => t && t.v >= 2048))) { won = true; showOver(T('🎉 2048! Harikasın!', '🎉 2048! Brilliant!'), true); if (true) confetti(); }
      else if (!canMove()) showOver(T('Hamle kalmadı', 'No moves left'));
    }
    function canMove() { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const t = grid[r][c]; if (!t) return true; if (c < 3 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true; if (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true; } return false; }
    function showOver(t, canGo) { over.hidden = false; over.innerHTML = `<b>${t}</b><span>${T('Skor', 'Score')}: ${score}</span><div>${canGo ? `<button class="bb-btn" data-a="go">${T('Devam et', 'Keep going')}</button>` : ''}<button class="bb-btn" data-a="again">${T('Yeni oyun', 'New game')}</button></div>`; over.querySelector('[data-a=again]').onclick = () => { ls.set('bb_2048_state', null); tilesEl.innerHTML = ''; fresh(); }; const g = over.querySelector('[data-a=go]'); if (g) g.onclick = () => { over.hidden = true; }; }
    b.querySelector('[data-a=new]').onclick = () => { click(); ls.set('bb_2048_state', null); tilesEl.innerHTML = ''; fresh(); };
    b.querySelector('[data-a=undo]').onclick = () => { const h = hist.pop(); if (!h) return; click(); grid = h.g; score = h.s; over.hidden = true; tilesEl.innerHTML = ''; render(true); };
    const kd = e => { const d = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd' }[e.key]; if (d) { e.preventDefault(); move(d); } };
    addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
    const board = b.querySelector('.g2-board'); let sx = 0, sy = 0, act = false;
    board.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; act = true; });
    board.addEventListener('pointerup', e => { if (!act) return; act = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); });
    window.__g2048 = { move, get grid() { return grid; } };
  }

  /* ==================== SUDOKU ==================== */
  function sudokuGen(holes) {
    const g = Array(81).fill(0);
    const ok = (g, i, v) => { const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3; for (let k = 0; k < 9; k++) { if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false; const rr = br + Math.floor(k / 3), cc = bc + k % 3; if (g[rr * 9 + cc] === v) return false; } return true; };
    const fill = (g) => { const i = g.indexOf(0); if (i < 0) return true; for (const v of shuffle9()) { if (ok(g, i, v)) { g[i] = v; if (fill(g)) return true; g[i] = 0; } } return false; };
    const shuffle9 = () => { const a = [1, 2, 3, 4, 5, 6, 7, 8, 9]; for (let i = 8; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const count = (g, lim) => { const i = g.indexOf(0); if (i < 0) return 1; let n = 0; for (let v = 1; v <= 9 && n < lim; v++) if (ok(g, i, v)) { g[i] = v; n += count(g, lim - n); g[i] = 0; } return n; };
    fill(g); const sol = g.slice(), puz = g.slice();
    const order = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - .5);
    let removed = 0;
    for (const i of order) { if (removed >= holes) break; const keep = puz[i]; puz[i] = 0; if (count(puz.slice(), 2) !== 1) puz[i] = keep; else removed++; }
    return { puz, sol };
  }
  const LVL = () => ({ kolay: T('Kolay', 'Easy'), orta: T('Orta', 'Medium'), zor: T('Zor', 'Hard') });
  function sudoku() {
    const lv = ls.get('bb_sudoku_level', 'orta');
    const b = shell('Sudoku', `<div class="sd-head"><div class="seg">${['kolay', 'orta', 'zor'].map(l => `<button data-l="${l}" class="${l === lv ? 'on' : ''}">${LVL()[l]}</button>`).join('')}</div><span class="sd-time">0:00</span><span class="sd-err">❌ 0</span></div>
      <div class="sd-grid"></div><div class="sd-tools"><button class="bb-btn" data-a="note">✏️ ${T('Not: Kapalı', 'Notes: Off')}</button><button class="bb-btn" data-a="erase">⌫ ${T('Sil', 'Erase')}</button><button class="bb-btn" data-a="hint">💡 ${T('İpucu', 'Hint')}</button></div>
      <div class="sd-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>`);
    const gridEl = b.querySelector('.sd-grid'), tEl = b.querySelector('.sd-time'), eEl = b.querySelector('.sd-err');
    let P, S, cur, notes, sel = -1, noteMode = false, errs = 0, t0, timer, done = false;
    function start(level) {
      ls.set('bb_sudoku_level', level);
      b.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x.dataset.l === level));
      gridEl.innerHTML = `<p class="bb-tip">${T('Bulmaca hazırlanıyor…', 'Preparing the puzzle…')}</p>`;
      setTimeout(() => {
        const { puz, sol } = sudokuGen({ kolay: 38, orta: 47, zor: 54 }[level]); P = puz; S = sol; cur = puz.slice(); notes = Array.from({ length: 81 }, () => new Set());
        sel = -1; errs = 0; eEl.textContent = '❌ 0'; done = false; t0 = Date.now(); clearInterval(timer); timer = setInterval(() => { if (!done) tEl.textContent = fmtT((Date.now() - t0) / 1000); }, 500);
        draw();
      }, 30);
    }
    onLeave(() => clearInterval(timer));
    function draw() {
      gridEl.innerHTML = '';
      const sv = sel >= 0 ? cur[sel] : 0;
      for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9), c = i % 9, d = document.createElement('button');
        d.className = 'sd-c' + (P[i] ? ' given' : '') + (i === sel ? ' sel' : '') + (sel >= 0 && (Math.floor(sel / 9) === r || sel % 9 === c || (Math.floor(Math.floor(sel / 9) / 3) === Math.floor(r / 3) && Math.floor(sel % 9 / 3) === Math.floor(c / 3))) ? ' rel' : '') + (sv && cur[i] === sv ? ' same' : '') + (cur[i] && !P[i] && cur[i] !== S[i] ? ' bad' : '') + (c % 3 === 2 && c < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '');
        if (cur[i]) d.textContent = cur[i];
        else if (notes[i].size) d.innerHTML = `<span class="nt">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<i>${notes[i].has(n) ? n : ''}</i>`).join('')}</span>`;
        d.onclick = () => { sel = i; draw(); };
        gridEl.appendChild(d);
      }
      b.querySelectorAll('.sd-pad button').forEach(x => { const n = +x.dataset.n; x.classList.toggle('full', cur.filter(v => v === n).length >= 9); });
    }
    function put(n) {
      if (done || sel < 0 || P[sel]) return;
      if (noteMode) { notes[sel].has(n) ? notes[sel].delete(n) : notes[sel].add(n); draw(); return; }
      cur[sel] = n; notes[sel].clear();
      if (n !== S[sel]) { errs++; eEl.textContent = '❌ ' + errs; blip(160, .15); }
      else { blip(660, .07); const r = Math.floor(sel / 9), c = sel % 9; for (let k = 0; k < 9; k++) { notes[r * 9 + k].delete(n); notes[k * 9 + c].delete(n); notes[(r - r % 3 + Math.floor(k / 3)) * 9 + (c - c % 3 + k % 3)].delete(n); } }
      draw();
      if (cur.every((v, i) => v === S[i])) { done = true; clearInterval(timer); const t = (Date.now() - t0) / 1000; const best = ls.get('bb_best_sudoku', null); if (!best || t < best) ls.set('bb_best_sudoku', Math.round(t)); if (true) confetti(); if (true) Snd.win(); toast(T(`🧩 Bitti! ${fmtT(t)} · ${errs} hata`, `🧩 Solved! ${fmtT(t)} · ${errs} mistakes`)); }
    }
    b.querySelectorAll('.sd-pad button').forEach(x => x.onclick = () => put(+x.dataset.n));
    b.querySelectorAll('.seg button').forEach(x => x.onclick = () => { click(); start(x.dataset.l); });
    b.querySelector('[data-a=note]').onclick = e => { noteMode = !noteMode; e.target.textContent = '✏️ ' + (noteMode ? T('Not: Açık', 'Notes: On') : T('Not: Kapalı', 'Notes: Off')); e.target.classList.toggle('on', noteMode); };
    b.querySelector('[data-a=erase]').onclick = () => { if (sel >= 0 && !P[sel]) { cur[sel] = 0; notes[sel].clear(); draw(); } };
    b.querySelector('[data-a=hint]').onclick = () => { if (done) return; let i = sel >= 0 && !P[sel] && cur[sel] !== S[sel] ? sel : cur.findIndex((v, k) => v !== S[k]); if (i < 0) return; sel = i; const nm = noteMode; noteMode = false; put(S[i]); noteMode = nm; };
    const kd = e => { if (/^[1-9]$/.test(e.key)) put(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete') b.querySelector('[data-a=erase]').click(); else if (sel >= 0 && e.key.startsWith('Arrow')) { e.preventDefault(); const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key]; sel = (sel + d + 81) % 81; draw(); } };
    addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
    start(lv);
    window.__sudoku = { solve: () => { for (let i = 0; i < 81; i++) if (!P[i] && cur[i] !== S[i]) { sel = i; put(S[i]); } } };
  }

  /* ==================== MAYIN TARLASI ==================== */
  function mines() {
    const lv = ls.get('bb_mines_level', 'orta');
    const LV = { kolay: [9, 9, 10], orta: [9, 14, 22], zor: [12, 18, 45] };
    const b = shell(T('Mayın<br>Tarlası', 'Mine-<br>sweeper'), `<div class="sd-head"><div class="seg">${Object.keys(LV).map(l => `<button data-l="${l}" class="${l === lv ? 'on' : ''}">${LVL()[l]}</button>`).join('')}</div><span class="mn-left">💣 0</span><span class="mn-time">0:00</span></div>
      <div class="mn-wrap"><div class="mn-grid"></div></div><div class="sd-tools"><button class="bb-btn mn-mode" data-a="mode">⛏️ ${T('Kazma modu', 'Dig mode')}</button><button class="bb-btn" data-a="new">🙂 ${T('Yeni', 'New')}</button></div><p class="bb-tip">${T('Uzun bas: bayrak · Açık sayıya dokun: çevresini aç', 'Long-press: flag · Tap an open number: clear around it')}</p>`);
    const gridEl = b.querySelector('.mn-grid'), leftEl = b.querySelector('.mn-left'), tEl = b.querySelector('.mn-time'), modeB = b.querySelector('[data-a=mode]');
    let W, H, M, cells, first, over, flagMode = false, t0, timer, level = lv;
    onLeave(() => clearInterval(timer));
    function start(l) {
      level = l; ls.set('bb_mines_level', l); b.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x.dataset.l === l));
      [W, H, M] = LV[l]; cells = Array.from({ length: W * H }, () => ({ m: false, n: 0, o: false, f: false })); first = true; over = false;
      clearInterval(timer); tEl.textContent = '0:00'; gridEl.style.gridTemplateColumns = `repeat(${W},1fr)`; gridEl.style.setProperty('--w', W);
      gridEl.innerHTML = cells.map((_, i) => `<button class="mn-c" data-i="${i}"></button>`).join(''); bind(); count();
    }
    const nb = i => { const x = i % W, y = Math.floor(i / W), r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(ny * W + nx); } return r; };
    function plant(safe) { const ban = new Set([safe, ...nb(safe)]); let k = 0; while (k < M) { const i = Math.floor(Math.random() * W * H); if (ban.has(i) || cells[i].m) continue; cells[i].m = true; k++; } cells.forEach((c, i) => c.n = nb(i).filter(j => cells[j].m).length); t0 = Date.now(); timer = setInterval(() => { if (!over) tEl.textContent = fmtT((Date.now() - t0) / 1000); }, 500); }
    function openC(i) {
      const c = cells[i]; if (c.o || c.f) return;
      if (first) { first = false; plant(i); }
      c.o = true;
      if (c.m) return lose(i);
      if (!c.n) { const st = [i]; while (st.length) { const k = st.pop(); for (const j of nb(k)) { const d = cells[j]; if (!d.o && !d.f && !d.m) { d.o = true; if (!d.n) st.push(j); } } } }
    }
    function act(i, flag) {
      if (over) return; const c = cells[i];
      if (flag) { if (!c.o) { c.f = !c.f; blip(c.f ? 880 : 440, .06); } }
      else if (c.o && c.n) { const f = nb(i).filter(j => cells[j].f).length; if (f === c.n) nb(i).forEach(j => openC(j)); }
      else openC(i);
      paint(); count(); check();
    }
    function paint() { gridEl.querySelectorAll('.mn-c').forEach((e, i) => { const c = cells[i]; e.className = 'mn-c' + (c.o ? ' o n' + c.n : '') + (c.f && !c.o ? ' f' : '') + (over && c.m ? ' m' : '') + (c.boom ? ' boom' : ''); e.textContent = c.o ? (c.m ? '💥' : c.n || '') : c.f ? '🚩' : (over && c.m ? '💣' : ''); }); }
    function count() { leftEl.textContent = '💣 ' + (M - cells.filter(c => c.f).length); }
    function lose(i) { over = true; cells[i].boom = true; clearInterval(timer); paint(); blip(120, .4, .08); toast(T('💥 Mayına bastın! Tekrar dene', '💥 You hit a mine! Have another go')); }
    function check() { if (over) return; if (cells.every(c => c.m || c.o)) { over = true; clearInterval(timer); const t = (Date.now() - t0) / 1000; if (level !== 'kolay') { const bst = ls.get('bb_best_mines', null); if (!bst || t < bst) ls.set('bb_best_mines', Math.round(t)); } cells.forEach(c => { if (c.m) c.f = true; }); paint(); if (true) confetti(); toast(T(`😎 Tarla temizlendi! ${fmtT(t)}`, `😎 Field cleared! ${fmtT(t)}`)); } }
    function bind() {
      gridEl.querySelectorAll('.mn-c').forEach(e => {
        const i = +e.dataset.i; let lt = null, longP = false;
        e.addEventListener('pointerdown', () => { longP = false; lt = setTimeout(() => { longP = true; act(i, true); if (navigator.vibrate) navigator.vibrate(25); }, 420); });
        const cancel = () => clearTimeout(lt);
        e.addEventListener('pointerup', () => { cancel(); if (!longP) act(i, flagMode); });
        e.addEventListener('pointerleave', cancel); e.addEventListener('contextmenu', ev => { ev.preventDefault(); cancel(); if (!longP) act(i, true); longP = true; });
      });
    }
    modeB.onclick = () => { flagMode = !flagMode; modeB.textContent = flagMode ? T('🚩 Bayrak modu', '🚩 Flag mode') : T('⛏️ Kazma modu', '⛏️ Dig mode'); modeB.classList.toggle('on', flagMode); };
    b.querySelector('[data-a=new]').onclick = () => { click(); start(level); };
    b.querySelectorAll('.seg button').forEach(x => x.onclick = () => { click(); start(x.dataset.l); });
    start(lv);
    window.__mines = { win: () => { if (first) act(0, false); cells.forEach((c, i) => { if (!c.m && !c.o) { c.o = true; } }); paint(); check(); }, get over() { return over; } };
  }

  /* ==================== BLOK YIĞ (Tetris tarzı) ==================== */
  function blocks() {
    const b = shell(T('Blok Yığ', 'Block Stack'), `<div class="bk-wrap"><canvas class="bk-cv" width="200" height="400"></canvas><div class="bk-side"><div class="g2-sc"><small>${T('SKOR', 'SCORE')}</small><b class="sc">0</b></div><div class="g2-sc"><small>${T('SATIR', 'LINES')}</small><b class="ln">0</b></div><div class="g2-sc"><small>${T('SEVİYE', 'LEVEL')}</small><b class="lvv">1</b></div><div class="g2-sc"><small>${T('SIRADAKİ', 'NEXT')}</small><canvas class="bk-nx" width="80" height="80"></canvas></div><div class="g2-sc"><small>${T('EN İYİ', 'BEST')}</small><b class="bs">${ls.get('bb_best_blocks', 0)}</b></div><button class="bb-btn" data-a="pause">⏸</button></div></div>
      <div class="bk-ctrl"><button data-k="l">◀</button><button data-k="rot">⟳</button><button data-k="r">▶</button><button data-k="d">▼</button><button data-k="drop">⤓</button></div><div class="bk-over" hidden></div>`);
    const cv = b.querySelector('.bk-cv'), g = cv.getContext('2d'), nx = b.querySelector('.bk-nx').getContext('2d');
    const COLS = 10, ROWS = 20;
    const SH = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
    const COL = { I: '#4fd1ff', O: '#ffd23f', T: '#b06bff', S: '#43d17a', Z: '#ff5d6c', J: '#4f7bff', L: '#ff9a3c' };
    let board, piece, nextK, score, lines, level, dropT, run = true, paused = false, overF = false, bag = [], clearing = null;
    const sz = () => { const W = cv.clientWidth || 200; return W / COLS; };
    function newBag() { bag = Object.keys(SH).sort(() => Math.random() - .5); }
    function take() { if (!bag.length) newBag(); return bag.pop(); }
    function spawn() { const k = nextK || take(); nextK = take(); piece = { k, cells: SH[k].map(c => c.slice()), x: 3, y: k === 'I' ? -1 : 0 }; if (collide(piece.cells, piece.x, piece.y)) gameOver(); drawNext(); }
    function collide(cells, x, y) { return cells.some(([cx, cy]) => { const X = cx + x, Y = cy + y; return X < 0 || X >= COLS || Y >= ROWS || (Y >= 0 && board[Y][X]); }); }
    function rotate() { if (piece.k === 'O') return; const size = piece.k === 'I' ? 4 : 3; const rc = piece.cells.map(([x, y]) => [size - 1 - y, x]); for (const kx of [0, -1, 1, -2, 2]) if (!collide(rc, piece.x + kx, piece.y)) { piece.cells = rc; piece.x += kx; blip(520, .04, .03); return; } }
    function lock() {
      piece.cells.forEach(([cx, cy]) => { const Y = cy + piece.y; if (Y >= 0) board[Y][cx + piece.x] = piece.k; });
      const full = []; board.forEach((r, y) => { if (r.every(v => v)) full.push(y); });
      if (full.length) { clearing = { rows: full, t: 0 }; blip(700 + full.length * 100, .2, .06); }
      else spawn();
    }
    function finishClear() {
      const n = clearing.rows.length; board = board.filter((_, y) => !clearing.rows.includes(y)); while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
      lines += n; score += [0, 100, 300, 500, 800][n] * level; level = 1 + Math.floor(lines / 10); clearing = null; hud(); spawn();
    }
    function hud() { b.querySelector('.sc').textContent = score; b.querySelector('.ln').textContent = lines; b.querySelector('.lvv').textContent = level; const best = Math.max(score, ls.get('bb_best_blocks', 0)); ls.set('bb_best_blocks', best); b.querySelector('.bs').textContent = best; }
    function stepDown(soft) { if (!piece || clearing) return; if (!collide(piece.cells, piece.x, piece.y + 1)) { piece.y++; if (soft) score += 1; } else lock(); }
    function hardDrop() { if (!piece || clearing) return; let d = 0; while (!collide(piece.cells, piece.x, piece.y + 1)) { piece.y++; d++; } score += d * 2; lock(); hud(); }
    function moveX(dx) { if (piece && !clearing && !collide(piece.cells, piece.x + dx, piece.y)) piece.x += dx; }
    function gameOver() { overF = true; run = false; const o = b.querySelector('.bk-over'); o.hidden = false; o.innerHTML = `<b>${T('Oyun bitti', 'Game over')}</b><span>${T('Skor', 'Score')}: ${score}</span><button class="bb-btn">${T('Yeniden başla', 'Play again')}</button>`; o.querySelector('button').onclick = () => { o.hidden = true; start(); }; hud(); }
    function cell(x, y, k, s, alpha) { g.globalAlpha = alpha || 1; const c = COL[k]; g.fillStyle = c; g.beginPath(); g.roundRect(x * s + 1, y * s + 1, s - 2, s - 2, s * .18); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x * s + 3, y * s + 3, s - 6, s * .22); g.globalAlpha = 1; }
    function draw() {
      const s = sz(), W = COLS * s, H = ROWS * s, dpr = Math.min(devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.05)'; for (let x = 1; x < COLS; x++) { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, H); g.stroke(); }
      board.forEach((r, y) => r.forEach((k, x) => { if (k) cell(x, y, k, s, clearing && clearing.rows.includes(y) ? (Math.sin(clearing.t * 30) > 0 ? 1 : .3) : 1); }));
      if (piece && !clearing) {
        let gy = piece.y; while (!collide(piece.cells, piece.x, gy + 1)) gy++;
        piece.cells.forEach(([cx, cy]) => { if (cy + gy >= 0) cell(cx + piece.x, cy + gy, piece.k, s, .22); });
        piece.cells.forEach(([cx, cy]) => { if (cy + piece.y >= 0) cell(cx + piece.x, cy + piece.y, piece.k, s); });
      }
    }
    function drawNext() { nx.clearRect(0, 0, 80, 80); const c = SH[nextK], s = 18; const minx = Math.min(...c.map(p => p[0])), maxx = Math.max(...c.map(p => p[0])), miny = Math.min(...c.map(p => p[1])), maxy = Math.max(...c.map(p => p[1])); const ox = (80 - (maxx - minx + 1) * s) / 2 - minx * s, oy = (80 - (maxy - miny + 1) * s) / 2 - miny * s; nx.fillStyle = COL[nextK]; c.forEach(([x, y]) => { nx.beginPath(); nx.roundRect(ox + x * s + 1, oy + y * s + 1, s - 2, s - 2, 3); nx.fill(); }); }
    let last = performance.now();
    function loop(t) {
      if (!run) return; const dt = Math.min(.1, (t - last) / 1000); last = t;
      if (!paused) {
        if (clearing) { clearing.t += dt; if (clearing.t > .35) finishClear(); }
        else { dropT += dt; const iv = Math.max(.08, .8 - (level - 1) * .07); if (dropT > iv) { dropT = 0; stepDown(false); } }
      }
      draw(); requestAnimationFrame(loop);
    }
    function start() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); score = 0; lines = 0; level = 1; dropT = 0; nextK = null; newBag(); overF = false; paused = false; clearing = null; spawn(); hud(); if (!run) { run = true; last = performance.now(); requestAnimationFrame(loop); } }
    onLeave(() => { run = false; });
    const act = k => { if (overF || paused) return; if (k === 'l') moveX(-1); else if (k === 'r') moveX(1); else if (k === 'rot') rotate(); else if (k === 'd') { stepDown(true); hud(); } else if (k === 'drop') hardDrop(); };
    b.querySelectorAll('.bk-ctrl button').forEach(btn => {
      let rt = null; const k = btn.dataset.k;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); act(k); if (k === 'l' || k === 'r' || k === 'd') rt = setInterval(() => act(k), 90); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearInterval(rt)));
    });
    b.querySelector('[data-a=pause]').onclick = e => { paused = !paused; e.target.textContent = paused ? '▶' : '⏸'; };
    const kd = e => { const m = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'rot', ArrowDown: 'd', ' ': 'drop', x: 'rot', z: 'rot' }[e.key]; if (m) { e.preventDefault(); act(m); } if (e.key === 'p') b.querySelector('[data-a=pause]').click(); };
    addEventListener('keydown', kd); onLeave(() => removeEventListener('keydown', kd));
    // kaydırma: sağ/sol taşı, aşağı bırak, dokun döndür
    let sx = 0, sy = 0, moved = 0;
    cv.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; moved = 0; });
    cv.addEventListener('pointermove', e => { if (!e.buttons && e.pointerType === 'mouse') return; const s = sz(), dx = e.clientX - sx; if (Math.abs(dx) > s) { act(dx > 0 ? 'r' : 'l'); sx = e.clientX; moved = 1; } });
    cv.addEventListener('pointerup', e => { const dy = e.clientY - sy; if (dy > 60) act('drop'); else if (!moved && Math.abs(dy) < 10) act('rot'); });
    run = false; start();
    window.__blocks = { get score() { return score; }, get lines() { return lines; }, drop: hardDrop, get over() { return overF; } };
  }

  /* ---------------- yönlendirme ---------------- */
  function lockScreen() {
    document.body.classList.add('locked'); document.body.classList.remove('work-mode', 'dark-mode', 'cbn-mode', 'cbn-dark');
    const m = fromUrl(), pc = m ? m.c : '', pn = m ? m.n : '';
    root().innerHTML = `<section class="hero lockhero"><p class="eyebrow">${T('Özel alan · yalnızca davetliler', 'Private space · invitation only')}</p><h1 class="display xl">BABA<em>.</em></h1>
      <div class="lock-opts">
        <button class="pill big" data-a="open">🔒 ${T('Sahibi olarak gir', 'Sign in as the owner')}</button>
        <form class="lock-card" data-f="inv"><h3>🎟 ${T('Davet kodum var', 'I have an invitation code')}</h3><input name="n" placeholder="${T('Adın', 'Your name')}" value="${esc(pn)}" required maxlength="40"><input name="c" placeholder="${T('Kod (ör. B-1A2B3C)', 'Code (e.g. B-1A2B3C)')}" value="${esc(pc)}" required maxlength="12"><button class="pill">${T('Giriş yap', 'Sign in')}</button><p class="lock-msg"></p></form>
        <form class="lock-card" data-f="req"><h3>✋ ${T('Katılma isteği gönder', 'Ask to join')}</h3><p class="muted sm">${T('BABA. yalnızca Oğuzhan’ın onay verdiği kişilere açık. İsteğini gönder; uygun görürse sana bir davet kodu yollar.', 'BABA. is open only to people Oğuzhan has approved. Send your request; if he is happy with it, he will send you an invitation code.')}</p><input name="n" placeholder="${T('Adın', 'Your name')}" required maxlength="40"><textarea name="m" rows="2" placeholder="${T('Kısa bir not (isteğe bağlı)', 'A short note (optional)')}" maxlength="300"></textarea><button class="pill ghost">${T('İsteği gönder', 'Send request')}</button></form>
      </div></section>`;
    const q = s => root().querySelector(s);
    q('[data-a=open]').onclick = askOpen;
    q('[data-f=inv]').onsubmit = e => { e.preventDefault(); const f = e.target, n = f.n.value.trim(), c = f.c.value.trim().toUpperCase();
      if (inviteCode(n) !== c) { f.querySelector('.lock-msg').textContent = T('Kod bu isimle eşleşmiyor. Adını davetteki gibi yaz.', 'That code doesn’t match this name. Type your name exactly as it appears in the invitation.'); return; }
      guest = { name: n, code: c, at: Date.now() }; ls.set('baba_guest', guest); location.hash = ''; guestUrl(); render(); };
    q('[data-f=req]').onsubmit = e => { e.preventDefault(); const f = e.target, t = T(`Merhaba Oğuzhan, BABA. uygulamasına katılmak istiyorum.\nAdım: ${f.n.value.trim()}${f.m.value.trim() ? '\nNot: ' + f.m.value.trim() : ''}`, `Hi Oğuzhan, I’d like to join the BABA. app.\nMy name: ${f.n.value.trim()}${f.m.value.trim() ? '\nNote: ' + f.m.value.trim() : ''}`);
      if (navigator.share) navigator.share({ title: T('BABA. katılma isteği', 'BABA. join request'), text: t }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); };
    if (!m) askOpen();
  }
  function render() {
    leave(); if (typeof Draft !== 'undefined') Draft.stop();
    if (typeof CBN !== 'undefined') CBN.leave();
    document.querySelectorAll('.bb-pin-ov').forEach(e => e.remove());
    if (!canIn()) return lockScreen();
    document.body.classList.remove('locked');
    let r = location.hash.slice(1); if (r.startsWith('davet=')) { r = ''; history.replaceState(null, '', location.pathname + location.search); }
    guestUrl();
    const isCbn = r === 'cbn' || r.startsWith('cbn/');
    if (OWNER_ONLY.includes(r) && !isOwner()) r = '';
    if (isCbn && !canIn()) r = '';
    const cbnOn = isCbn && r !== '' && typeof CBN !== 'undefined';
    document.body.classList.toggle('cbn-mode', cbnOn); if (!cbnOn) document.body.classList.remove('cbn-dark');
    document.body.classList.toggle('guest', isGuest());
    document.body.classList.toggle('work-mode', r === 'is');
    document.body.classList.toggle('msn-mode', r === 'msn');
    document.body.classList.toggle('dark-mode', ['seyahat', 'gezilerim', 'foto'].includes(r));
    document.querySelectorAll('.nav a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === r || (a.dataset.r === 'cbn' && cbnOn) || (a.dataset.r === 'dost' && r.startsWith('dost/')) || (a.dataset.r === 'oyunlar' && GAMES.some(g => g.id === r))));
    if (r === 'ts' && typeof TS !== 'undefined') { root().innerHTML = '<div id="tsRoot"></div>'; window.scrollTo(0, 0); TS.open(root().querySelector('#tsRoot')); }
    else if (cbnOn) { root().innerHTML = '<div id="cbnRoot"></div>'; window.scrollTo(0, 0); CBN.open(root().querySelector('#cbnRoot'), r); }
    else if (r === 'draft') { root().innerHTML = '<section class="game-page"><div class="gp-head"><a class="back" href="#oyunlar">← ' + T('Oyunlar', 'Games') + '</a></div><div id="draftRoot"></div></section>'; window.scrollTo(0, 0); Draft.open(root().querySelector('#draftRoot')); }
    else if (r === 'is' && typeof Is !== 'undefined') { root().innerHTML = '<div id="isRoot"></div>'; window.scrollTo(0, 0); Is.open(root().querySelector('#isRoot')); }
    else if ((r === 'dost' || r.startsWith('dost/')) && typeof Dost !== 'undefined') { root().innerHTML = '<div id="dostRoot"></div>'; window.scrollTo(0, 0); Dost.open(root().querySelector('#dostRoot'), r); }
    else if (r === 'msn' && typeof Msn !== 'undefined') { root().innerHTML = '<div id="msnRoot"></div>'; window.scrollTo(0, 0); Msn.mount(root().querySelector('#msnRoot')); }
    else if (r === 'vadi') vadi();
    else if (r === '2048') g2048();
    else if (r === 'sudoku') sudoku();
    else if (r === 'mines') mines();
    else if (r === 'blocks') blocks();
    else if (r === 'oyunlar') menu();
    else if (r === 'erisim') access();
    else if ((r === 'seyahat' || r === 'gezilerim') && typeof Travel !== 'undefined') { root().innerHTML = '<div id="tvRoot"></div>'; window.scrollTo(0, 0); Travel.open(root().querySelector('#tvRoot'), r); onLeave(() => Travel.leave()); }
    else if (r === 'foto' && typeof Foto !== 'undefined') { root().innerHTML = '<div id="ftRoot"></div>'; window.scrollTo(0, 0); Foto.open(root().querySelector('#ftRoot')); onLeave(() => Foto.leave()); }
    else hub();
  }
  addEventListener('hashchange', render);
  return { render, leave, askOpen, lock: () => { if (isOwner()) lock(); else if (confirm(T('Davetli erişimi bu cihazdan kaldırılsın mı?', 'Remove guest access from this device?'))) guestOut(); }, isOwner, user: () => isOwner() ? { name: 'Oğuzhan', key: '' } : guest ? { name: guest.name, key: 'g-' + String(guest.code).toLowerCase().replace(/[^a-z0-9-]/g, '') } : null, get unlocked() { return unlocked; } };
})();

"use strict";
/* =====================================================================
   Oyunlar › Aile skor tablosu + Draft düellosu  (rota: #skor)
   - Skorlar Messenger/CBN hesabıyla Supabase'e kaydedilir (supabase/games.sql). Hesap yoksa cihazda bekler, girişte gönderilir.
   - Herkes kendi skorunu ve Messenger'daki onaylı arkadaşlarınınkini görür.
   - Haftanın şampiyonu: bu hafta (Pazartesi 00:00, Türkiye saati) her oyunda 1.=3, 2.=2, 3.=1 puan.
   - Draft düellosu: iki kayıtlı kadro aynı tohumla tek maç oynar; sonuç arkadaşa Messenger'dan gider.
   ===================================================================== */
const Scores = (() => {
  const BASE = 'https://zjzbpeiuhreyfdihzzzj.supabase.co', KEY = 'sb_publishable_LyV2L0UpIAPnuGEdfgNc2Q_hrY8uqgG', QK = 'sc_queue';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = () => [
    { id: 'draft', n: 'Süper Lig Draft', e: '⚽', hi: true, f: v => v + T(' puan', ' pts') },
    { id: '2048', n: '2048', e: '🔢', hi: true, f: v => v.toLocaleString(I18N.locale) },
    { id: 'blocks', n: T('Blok Yığ', 'Block Stack'), e: '🧱', hi: true, f: v => v.toLocaleString(I18N.locale) },
    { id: 'sudoku', n: 'Sudoku', e: '🧩', hi: false, f: v => tm(v) },
    { id: 'mines', n: T('Mayın Tarlası', 'Minesweeper'), e: '💣', hi: false, f: v => tm(v) }];
  const tm = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const hasAcc = () => typeof CBN !== 'undefined' && CBN.sync && CBN.sync.user;
  let el = null, view = 'week', uid = '', setupMissing = false;

  async function api(path, o) {
    o = o || {};
    const h = { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + await CBN.sync.token() };
    if (o.prefer) h.Prefer = o.prefer;
    const r = await fetch(BASE + path, { method: o.method || 'GET', headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
    const tx = await r.text(); let j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
    if (!r.ok) { const er = new Error((j && (j.message || j.msg)) || 'HTTP ' + r.status); er.status = r.status; er.code = j && j.code; throw er; }
    return j;
  }
  const missing = e => e && (e.status === 404 || /PGRST20[25]|42P01|42883/.test(String(e.code)) || /does not exist|Could not find/i.test(e.message));

  /* ---------- skor gönderme (çevrimdışı kuyruklu) ---------- */
  const queue = () => { try { return JSON.parse(localStorage.getItem(QK) || '[]'); } catch (e) { return []; } };
  const setQ = q => { try { localStorage.setItem(QK, JSON.stringify(q.slice(-60))); } catch (e) {} };
  function report(game, score, meta) {
    score = Math.round(+score); if (!isFinite(score) || score <= 0) return;
    const q = queue(); q.push({ game, score, meta: meta || {}, at: Date.now() }); setQ(q); flush();
  }
  let flushing = false;
  async function flush() {
    if (flushing || !hasAcc()) return;
    const q = queue(); if (!q.length) return;
    flushing = true; let again = false;
    try {
      await api('/rest/v1/game_scores', { method: 'POST', body: q.map(x => ({ game: x.game, score: x.score, meta: x.meta })), prefer: 'return=minimal' });
      setQ(queue().slice(q.length)); again = true;
    } catch (e) { if (missing(e)) setupMissing = true; else if (e.status === 400) setQ(queue().slice(q.length)); }
    finally { flushing = false; }
    if (again && queue().length) setTimeout(flush, 300);
  }
  async function saveSquad(data) {
    try { localStorage.setItem('sc_squad', JSON.stringify(data)); } catch (e) {}
    if (!hasAcc()) return false;
    try { await api('/rest/v1/draft_squads?on_conflict=member', { method: 'POST', body: { member: CBN.sync.user.id, data }, prefer: 'resolution=merge-duplicates,return=minimal' }); localStorage.removeItem('sc_squad'); return true; } catch (e) { return false; }
  }
  setInterval(() => { flush(); try { const s = localStorage.getItem('sc_squad'); if (s && hasAcc()) saveSquad(JSON.parse(s)); } catch (e) {} }, 60000);
  setTimeout(() => { try { if (typeof CBN !== 'undefined' && App.user()) CBN.ready().then(flush).catch(() => {}); } catch (e) {} }, 4000);

  /* ---------- yardımcılar ---------- */
  function weekStart() {       // Pazartesi 00:00 Türkiye saati (UTC+3)
    const now = new Date(Date.now() + 3 * 3600e3), d = (now.getUTCDay() + 6) % 7;
    const m = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - d) - 3 * 3600e3;
    return new Date(m);
  }
  function avatar(p, size) {
    if (p && p.avatar && typeof CBN !== 'undefined' && CBN.profile) { try { return CBN.profile.svg(p.avatar, size); } catch (e) {} }
    const n = ((p && (p.name || p.code)) || '?').trim(), h = [...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
    return `<span class="sc-ini c${h}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px">${esc(n.slice(0, 1).toLocaleUpperCase(I18N.locale))}</span>`;
  }
  const nm = (P, id) => id === uid ? T('Sen', 'You') : ((P.get(id) || {}).name || (P.get(id) || {}).code || '?');
  function toast(t) { const d = document.createElement('div'); d.className = 'sc-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }

  /* ---------- sayfa ---------- */
  async function mount(root) {
    el = root;
    el.innerHTML = `<section class="game-page sc"><div class="gp-head"><a class="back" href="#oyunlar">← ${T('Oyunlar', 'Games')}</a><p class="eyebrow">${T('Aile · arkadaşlar', 'Family · friends')}</p><h1 class="display sm">${T('Skor <em>tablosu</em>', 'Leader<em>board</em>')}</h1></div><div class="sc-body"><p class="muted">${T('Yükleniyor…', 'Loading…')}</p></div></section>`;
    const body = el.querySelector('.sc-body');
    try { if (typeof CBN !== 'undefined') await CBN.ready(); } catch (e) {}
    if (!hasAcc()) {
      body.innerHTML = `<div class="sc-card sc-gate"><b>🔐 ${T('Messenger hesabınla giriş yap', 'Sign in with your Messenger account')}</b><p>${T('Skor tablosu ailen ve arkadaşlarınla ortak. Messenger’da giriş yapınca rekorların buraya gelir, arkadaşlarınınkini de görürsün. Bu cihazda oynadığın oyunlar şimdiden sırada bekliyor.', 'The leaderboard is shared with your family and friends. Once you sign in on Messenger your records appear here and you see your friends’ too. Games you play on this device are already waiting in the queue.')}</p><a class="pill" href="#msn">${T('Messenger’a git', 'Go to Messenger')} →</a></div>`;
      return;
    }
    uid = CBN.sync.user.id;
    await flush();
    try { await draw(body); }
    catch (e) {
      body.innerHTML = missing(e) ? `<div class="sc-card sc-gate"><b>🛠 ${T('Skor tablosu henüz kurulmadı', 'The leaderboard isn’t set up yet')}</b><p>${App.isOwner() ? T('Supabase → SQL Editor’de <b>supabase/games.sql</b> dosyasını bir kez çalıştır (önce messenger.sql çalışmış olmalı). Sonra bu sayfayı yenile.', 'Run <b>supabase/games.sql</b> once in Supabase → SQL Editor (messenger.sql must have run first). Then reload this page.') : T('Uygulamanın sahibi kurulumu bitirince burada görünecek.', 'It will appear here once the app’s owner finishes the set-up.')}</p></div>`
        : `<div class="sc-card sc-gate"><b>⚠️ ${T('Yüklenemedi', 'Couldn’t load')}</b><p>${esc(e.message)}</p><button class="pill" data-a="retry">${T('Tekrar dene', 'Try again')}</button></div>`;
      const r = body.querySelector('[data-a=retry]'); if (r) r.onclick = () => mount(root);
    }
  }
  async function draw(body) {
    const since = weekStart();
    const [wk, all, fr, pr, sq, mt] = await Promise.all([
      api('/rest/v1/rpc/game_board', { method: 'POST', body: { p_since: since.toISOString() } }),
      api('/rest/v1/rpc/game_board', { method: 'POST', body: { p_since: null } }),
      api('/rest/v1/msn_friends?select=friend,state&state=eq.accepted').catch(() => []),
      api('/rest/v1/msn_profiles?select=id,name,code,avatar').catch(() => []),
      api('/rest/v1/draft_squads?select=member,data,updated_at'),
      api(`/rest/v1/draft_matches?select=*&or=(home.eq.${uid},away.eq.${uid})&order=id.desc&limit=12`)]);
    const P = new Map((pr || []).map(p => [p.id, p])), friends = (fr || []).map(f => f.friend);
    const best = (rows, g) => {
      const list = (rows || []).filter(r => r.game === g.id).map(r => ({ id: r.member, v: g.hi ? r.best : r.low, plays: r.plays }));
      return list.sort((a, b) => g.hi ? b.v - a.v : a.v - b.v);
    };
    // haftanın şampiyonu
    const pts = new Map(), wins = new Map();
    G().forEach(g => best(wk, g).slice(0, 3).forEach((r, i) => { pts.set(r.id, (pts.get(r.id) || 0) + [3, 2, 1][i]); if (!i) wins.set(r.id, (wins.get(r.id) || []).concat(g.e)); }));
    const champ = [...pts.entries()].sort((a, b) => b[1] - a[1]);
    const daysLeft = Math.max(0, Math.ceil((since.getTime() + 7 * 864e5 - Date.now()) / 864e5));
    const rows = view === 'week' ? wk : all;

    const squads = new Map((sq || []).map(s => [s.member, s]));
    const mine = squads.get(uid), local = typeof Draft !== 'undefined' && Draft.snapshot ? Draft.snapshot() : null;
    const rivals = friends.filter(f => squads.has(f));

    body.innerHTML = `
      <section class="sc-champ">${champ.length ? `<div class="sc-crownbox"><span class="sc-big">👑</span><div class="sc-av">${avatar(P.get(champ[0][0]) || {}, 84)}</div></div>
        <div class="sc-champ-t"><p class="eyebrow">${T('Haftanın şampiyonu', 'Champion of the week')} · ${T(`${daysLeft} gün kaldı`, `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`)}</p><h2>${esc((P.get(champ[0][0]) || {}).name || nm(P, champ[0][0]))}${champ[0][0] === uid ? ` <small class="sc-you">${T('(sen!)', '(you!)')}</small>` : ''}</h2><p>${champ[0][1]} ${T('puan', 'points')} ${(wins.get(champ[0][0]) || []).join(' ')}</p>
        <ol class="sc-podium">${champ.slice(0, 5).map(([id, p], i) => `<li class="${id === uid ? 'me' : ''}"><span>${i + 1}</span>${avatar(P.get(id) || {}, 28)}<b>${esc(nm(P, id))}</b><em>${p}</em></li>`).join('')}</ol></div>`
        : `<div class="sc-champ-t"><p class="eyebrow">${T('Haftanın şampiyonu', 'Champion of the week')}</p><h2>${T('Bu hafta henüz kimse oynamadı', 'Nobody has played yet this week')}</h2><p>${T('İlk oynayan liderliği alır! Her oyunda haftanın 1.’si 3, 2.’si 2, 3.’sü 1 puan kazanır.', 'The first to play takes the lead! In each game the week’s 1st gets 3 points, 2nd gets 2 and 3rd gets 1.')}</p></div>`}</section>
      <div class="sc-tabs" role="tablist"><button role="tab" data-v="week" aria-selected="${view === 'week'}" class="${view === 'week' ? 'on' : ''}">${T('Bu hafta', 'This week')}</button><button role="tab" data-v="all" aria-selected="${view === 'all'}" class="${view === 'all' ? 'on' : ''}">${T('Tüm zamanlar', 'All time')}</button></div>
      <section class="sc-grid">${G().map(g => { const l = best(rows, g); return `<article class="sc-card"><h3><span>${g.e}</span> ${esc(g.n)} <small>${g.hi ? T('yüksek skor', 'high score') : T('en hızlı', 'fastest')}</small></h3>
        ${l.length ? `<ol class="sc-rank">${l.slice(0, 6).map((r, i) => `<li class="${r.id === uid ? 'me' : ''}"><span class="sc-pos">${['🥇', '🥈', '🥉'][i] || i + 1}</span>${avatar(P.get(r.id) || {}, 30)}<b>${esc(nm(P, r.id))}</b><em>${g.f(r.v)}</em></li>`).join('')}</ol>` : `<p class="muted">${T('Henüz skor yok.', 'No scores yet.')} <a href="#${g.id}">${T('Oyna', 'Play')} →</a></p>`}</article>`; }).join('')}</section>
      ${friends.length ? '' : `<p class="sc-hint">👋 ${T('Ailenin ve arkadaşlarının skorlarını görmek için onları Messenger’da arkadaş olarak ekle.', 'Add your family and friends on Messenger to see their scores here.')} <a href="#msn">Messenger →</a></p>`}
      <section class="sc-duel"><div class="sc-duel-h"><div><p class="eyebrow">⚽ ${T('Draft düellosu', 'Draft duel')}</p><h2>${T('Kadronu arkadaşının kadrosuyla <em>karşılaştır</em>', 'Put your squad up <em>against</em> a friend’s')}</h2></div></div>
        <div class="sc-mysq">${mine ? `<b>${T('Kayıtlı kadron', 'Your saved squad')}</b><span>${T('Ort.', 'Avg.')} ${esc(mine.data.avg)} · ${T('Kimya', 'Chemistry')} ${esc(mine.data.cp)} · ${esc(mine.data.coach)}</span>` : `<b>${T('Henüz kayıtlı kadron yok', 'No saved squad yet')}</b><span>${T('Draft’ta kadronu kurup sezonu oynatınca kadron otomatik kaydedilir.', 'Build your squad in the Draft and play the season; it’s saved automatically.')}</span>`}
          ${local ? `<button class="pill ghost" data-a="savesq">${mine ? T('Şu anki kadromla güncelle', 'Update with my current squad') : T('Şu anki kadromu kaydet', 'Save my current squad')}</button>` : `<a class="pill ghost" href="#draft">${T('Draft’a git', 'Go to the Draft')} →</a>`}</div>
        ${rivals.length ? `<ul class="sc-rivals">${rivals.map(id => { const d = squads.get(id).data || {}; return `<li>${avatar(P.get(id) || {}, 40)}<div><b>${esc(nm(P, id))}</b><small>${T('Ort.', 'Avg.')} ${esc(d.avg)} · ${T('Kimya', 'Chemistry')} ${esc(d.cp)} · ${esc(d.coach || '')}</small></div><button class="pill" data-duel="${id}" ${mine ? '' : 'disabled'}>${T('Maç yap', 'Play match')}</button></li>`; }).join('')}</ul>`
          : `<p class="muted">${T('Kadrosunu kaydetmiş bir arkadaşın yok. Onlar da Draft’ta bir sezon oynayınca burada görünür.', 'None of your friends has saved a squad yet. They’ll appear here once they play a season in the Draft.')}</p>`}
        ${mt && mt.length ? `<h3 class="sc-mh">${T('Son maçlar', 'Recent matches')}</h3><ul class="sc-matches">${mt.map(m => { const home = m.home === uid, my = home ? m.hs : m.aws, op = home ? m.aws : m.hs, r = my > op ? 'w' : my < op ? 'l' : 'd'; return `<li class="${r}"><button type="button" data-m="${m.id}"><span class="sc-r">${{ w: T('G', 'W'), d: T('B', 'D'), l: T('M', 'L') }[r]}</span><b>${esc(nm(P, m.home))}</b><em>${m.hs}–${m.aws}</em><b>${esc(nm(P, m.away))}</b><small>${new Date(m.at).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short' })}</small></button></li>`; }).join('')}</ul>` : ''}
      </section>`;

    body.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; draw(body).catch(() => {}); });
    const ss = body.querySelector('[data-a=savesq]'); if (ss) ss.onclick = async () => { ss.disabled = true; const ok = await saveSquad(Draft.snapshot()); toast(ok ? T('Kadron kaydedildi', 'Your squad has been saved') : T('Kaydedilemedi', 'Couldn’t save')); draw(body).catch(() => {}); };
    body.querySelectorAll('[data-duel]').forEach(b => b.onclick = () => duel(b.dataset.duel, P, body, b));
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const m = mt.find(x => String(x.id) === b.dataset.m); if (m) showMatch(m, P); });
  }
  const okSquad = d => d && Array.isArray(d.xi) && d.xi.length >= 11 && d.xi.every(p => p && typeof p.n === 'string' && typeof p.r === 'number') && isFinite(d.att) && isFinite(d.def);
  async function duel(fid, P, body, btn) {
    if (typeof Draft === 'undefined' || !Draft.h2h) return;
    btn.disabled = true; btn.textContent = '…';
    try {
      const sq = await api(`/rest/v1/draft_squads?select=member,data&member=in.(${uid},${fid})`);
      const H = (sq.find(s => s.member === uid) || {}).data, A = (sq.find(s => s.member === fid) || {}).data;
      if (!okSquad(H) || !okSquad(A)) throw new Error(T('Kadrolardan biri eksik görünüyor', 'One of the squads looks incomplete'));
      const seed = crypto.getRandomValues(new Uint32Array(1))[0], res = Draft.h2h(H, A, seed);
      const data = { seed, ev: res.ev.slice(0, 30), h: { avg: H.avg, coach: H.coach }, a: { avg: A.avg, coach: A.coach } };
      const r = await api('/rest/v1/draft_matches', { method: 'POST', body: { away: fid, hs: res.hs, aws: res.as, data }, prefer: 'return=representation' });
      const m = r && r[0];
      const meN = (P.get(uid) || {}).name || T('Ben', 'Me'), heN = (P.get(fid) || {}).name || '';
      if (typeof Msn !== 'undefined' && Msn.sendText) Msn.sendText(fid, T(`⚽ Draft düellosu: ${meN} ${res.hs}–${res.as} ${heN}. Rövanş için: Oyunlar → Aile skor tablosu`, `⚽ Draft duel: ${meN} ${res.hs}–${res.as} ${heN}. Fancy a rematch? Games → Family leaderboard`));
      if (m) showMatch(m, P);
      draw(body).catch(() => {});
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = T('Maç yap', 'Play match'); }
  }
  function showMatch(m, P) {
    const d = m.data || {}, home = m.home === uid, my = home ? m.hs : m.aws, op = home ? m.aws : m.hs;
    const title = my > op ? T('Kazandın! 🎉', 'You won! 🎉') : my < op ? T('Bu sefer kaybettin', 'You lost this time') : T('Berabere', 'It’s a draw');
    const ov = document.createElement('div'); ov.className = 'sc-ov';
    ov.innerHTML = `<div class="sc-modal" role="dialog" aria-modal="true"><button class="sc-x" aria-label="${T('Kapat', 'Close')}">×</button><p class="eyebrow">${T('Draft düellosu', 'Draft duel')} · ${new Date(m.at).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long' })}</p><h2>${title}</h2>
      <div class="sc-score"><div>${avatar(P.get(m.home) || {}, 56)}<b>${esc(nm(P, m.home))}</b><small>${T('Ev sahibi', 'Home')}</small></div><strong>${m.hs}<i>–</i>${m.aws}</strong><div>${avatar(P.get(m.away) || {}, 56)}<b>${esc(nm(P, m.away))}</b><small>${T('Deplasman', 'Away')}</small></div></div>
      ${(d.ev || []).length ? `<ol class="sc-ev">${d.ev.map(e => `<li class="${e.s}"><span>${e.min}'</span>⚽ <b>${esc(e.sc)}</b>${e.as ? ` <small>(${T('asist', 'assist')}: ${esc(e.as)})</small>` : ''}</li>`).join('')}</ol>` : `<p class="muted">${T('Golsüz geçen bir maç.', 'A goalless match.')}</p>`}
      <p class="muted sm">${T('Maç, iki tarafın kayıtlı kadrosu, teknik direktörü ve taktiğiyle oynandı; ev sahibi meydan okuyan taraftır.', 'The match used both saved squads, managers and tactics; the challenger plays at home.')}</p></div>`;
    const close = () => ov.remove(); ov.onclick = e => { if (e.target === ov) close(); }; ov.querySelector('.sc-x').onclick = close;
    document.body.appendChild(ov); if (my > op && typeof confetti === 'function') confetti();
  }
  return { report, saveSquad, mount, flush };
})();

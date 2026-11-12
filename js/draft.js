"use strict";
/* =====================================================================
   SÜPER LİG DRAFT — torbadan kulüp çek, 11+2 kur, taktik seç, 34 maç oyna.
   Ligdeki 17 rakip kendi FC 27 kadrolarıyla oynar; her golün atanı ve
   asisti tutulur → gol kralı, asist kralı, altın eldiven, yılın oyuncusu.
   ===================================================================== */
const Draft = (() => {
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 68;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CLUB = id => DRAFT_CLUBS.find(c => c.id === id);
  /* gerçekçi simülasyon ayarları (çok sezonluk testlerle ayarlandı):
     güç = mevki ağırlıklı ortalama reyting + kimya; reyting farkı gol beklentisine üstel yansır,
     her maçta form dalgası, iç saha avantajı ve senin takımında sakatlıklar var */
  const CFG = { opp: 0, K: 12.5, base: 1.2, home: 1.12, away: .92, noise: 2.2, inj: .011, tac: .5, coach: .5 };
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const ME = 'Senin Takımın';
  const TN = n => n === ME ? T(ME, 'Your Team') : n;                            // takım adı (gösterim)
  const PZ = k => I18N.lang === 'en' ? ({ KL: 'GK', ST: 'CB', BK: 'FB', OS: 'MF', KN: 'W', FV: 'FW' }[k] || k) : k;   // mevki kısaltması
  const FL = c => I18N.lang === 'en' ? ({ G: 'W', B: 'D', M: 'L' }[c] || c) : c;    // G/B/M → W/D/L
  const COACH_EN = { 'Pres ve tempo': 'Pressing and tempo', 'Sağlam savunma': 'Solid defence', 'Hücum ve moral': 'Attack and morale', 'Dengeli oyun': 'Balanced play', 'Bordo-mavi ruh': 'Claret-and-blue spirit', 'Yaratıcılık': 'Creativity' };
  const CHEM_MAX = 4;          // tam kimya (100) = +4 reyting puanı
  const TR_FIRST = /^(Kaan|Kerem|Arda|Emre|Okan|Ozan|Okay|Mert|Can|Berat|Yunus|Eren|Efe|Ege|Deniz|Umut|Onur|Volkan|Fatih|Taha|Taylan|Zafer|Mithat|Yusuf|Emin|Bertuğ|Berkay|Batuhan|Hamza|Celil|Samed|Enes|Bilal|Yalçın|Kamil|Ali|Ayberk|Atakan|Melih|Arif|Adil|Rayyan|Bahadır|Baran|Fatih|Tayfur|Bedirhan|Emir|Mustafa|Sefa|Mehmet|Furkan|Veysel|Kahraman|Gökhan|Serdar|Berat|Ahmed|Hasan|Erhan|Metehan|Abdurrahim|Ensar|Salih|Cenk|Sinan|Semih|Rıdvan|Ilhan|Kartal|Doğan|Burak|Hakan|Selçuk|Gökdeniz|Volkan|Serkan|Ömer|Ertuğrul|Yakup|Orhan|Murat|Umut)\b/;
  const nation = p => DRAFT_NAT[p.name] || (/[çğıışşİÇĞŞÖÜöü]/.test(p.name) || TR_FIRST.test(p.name) ? 'TR' : null);
  // her oyuncu: aynı kulüpten ya da aynı ülkeden takım arkadaşı başına 1 bağ → 0..3 kimya
  function chemOf(xi) {
    const per = xi.map(p => { const n = nation(p); let links = 0; xi.forEach(q => { if (q === p) return; if (q.club === p.club) links++; if (n && nation(q) === n) links++; }); return links >= 4 ? 3 : links >= 2 ? 2 : links >= 1 ? 1 : 0; });
    return { per, pct: Math.round(per.reduce((s, v) => s + v, 0) / (3 * Math.max(11, xi.length)) * 100) };
  }
  let S = null, el = null, timers = [];
  const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
  function stop() { timers.forEach(clearTimeout); timers = []; }

  function fresh(mode) {
    return { v: 3, bag: shuffle(DRAFT_CLUBS.map((c, i) => i)), drawn: [], pf: null, mode: mode || ls.get('draft_mode', 'normal'), picks: {}, bench: [null, null], jokers: 2, club: null, coach: null, tac: { tempo: 'dengeli', pres: 'orta', hat: 'dengeli', yon: 'dengeli' }, phase: 'draft', last: null };
  }
  const picked = () => [...Object.values(S.picks), ...S.bench].filter(Boolean);
  const count = () => picked().length;
  const openSlotsFor = pos => DRAFT_SLOTS.filter(s => s.pos === pos && !S.picks[s.id]);
  const benchOpen = () => S.bench.findIndex(b => !b);
  const canTake = p => !picked().some(q => q.name === p[0]) && (openSlotsFor(p[1]).length > 0 || benchOpen() >= 0);
  const hide = () => S.mode === 'sefir';
  const eraTxt = e => e === 'FC27' ? 'FC 27' : e.replace('~', '') + T(' · tahmini', ' · estimated');

  /* ---------------- ana çizim ---------------- */
  function open(root) { el = root; stop(); S = ls.get('draft_state', null); if (!S || S.v !== 3) S = fresh(); if (S.phase === 'season') S.phase = 'tactics'; if (S.phase === 'stats' && !S.last) S.phase = 'tactics'; render(); }
  function save() { ls.set('draft_state', S); }
  function render() {
    save();
    if (S.phase === 'tactics') return renderTactics();
    if (S.phase === 'stats') return renderStats();
    const n = count();
    const xi = DRAFT_SLOTS.map(s => S.picks[s.id]).filter(Boolean), ch = chemOf(xi);
    CHM = new Map(xi.map((p, i) => [p, ch.per[i]]));
    el.innerHTML = `
      <section class="dr-hero"><p class="eyebrow">Trendyol Süper Lig 2026-27 · ${T('18 kulüp · son 10 yıl', '18 clubs · last 10 years')}</p><h1 class="display">${T('Kadro<br>kur. <em>102</em><br>puanı vur.', 'Build a<br>squad. Hit<br><em>102</em> points.')}</h1>
        <div class="dr-meta"><span class="chip">${T('Seçim', 'Picks')} <b>${n}/13</b></span><span class="chip">${T('Joker', 'Jokers')} <b>${S.jokers}</b></span><span class="chip chem-chip">🧪 ${T('Kimya', 'Chemistry')} <b>${ch.pct}</b>/100</span><span class="chip">${T('Ort.', 'Avg.')} <b>${hide() ? '??' : xi.length ? avg(xi.map(p => p.r)).toFixed(1) : '—'}</b></span>
          <button class="chip toggle ${hide() ? 'on' : ''}" data-a="mode">${hide() ? T('🙈 Ligin Sefiri', '🙈 Blind mode') : T('👁 Normal mod', '👁 Normal mode')}</button>
          <span class="chip">🏆 ${T('Rekor', 'Record')} <b>${ls.get('draft_best', 0)}</b></span></div></section>
      <section class="dr-grid">
        <div class="dr-left">
          <div class="draw-box">
            <div class="draw-head"><span class="eyebrow">${T('Torba', 'The draw')}</span><span class="muted sm">${T(`${S.drawn.length}/18 kulüp çekildi · her kulübün şansı eşit`, `${S.drawn.length}/18 clubs drawn · every club has an equal chance`)}</span></div>
            <div class="club-grid">${DRAFT_CLUBS.map(tileHtml).join('')}</div>
            <button class="pill big draw-btn" data-a="spin" ${n >= 13 || S.club ? 'disabled' : ''}>${n >= 13 ? T('Kadro tamam ✓', 'Squad complete ✓') : S.club ? T('Oyuncunu seç ↓', 'Pick your player ↓') : T('TAKIM ÇEK', 'DRAW A CLUB')}</button>
          </div>
          <div class="pick-panel">${pickPanel()}</div>
        </div>
        <div class="dr-right">
          <div class="pitch">${DRAFT_SLOTS.map(slotHtml).join('')}<div class="pitch-lines"></div></div>
          <div class="bench"><span class="eyebrow">${T('Yedekler', 'Substitutes')}</span>${S.bench.map((p, i) => `<div class="bslot ${p ? 'full' : ''}">${p ? cardInner(p) : '<span>' + T('Yedek ', 'Sub ') + (i + 1) + '</span>'}</div>`).join('')}</div>
          <div class="dr-actions"><p class="muted sm chem-help">${T(`Kimya: aynı kulüpten ya da aynı ülkeden gelen her takım arkadaşı bir bağ kurar (●○○ → ●●●). Maç gücü = ortalama reyting + kimya (en çok +${CHEM_MAX}); her maçta form ve sakatlık şansı var.`, `Chemistry: every teammate from the same club or the same country forms a link (●○○ → ●●●). Match strength = average rating + chemistry (up to +${CHEM_MAX}); every match carries a chance of form swings and injuries.`)}</p><button class="pill ghost" data-a="reset">${T('Sıfırla', 'Reset')}</button><button class="pill" data-a="next" ${n < 13 ? 'disabled' : ''}>${T('Teknik direktör ve taktik', 'Manager and tactics')} →</button></div>
        </div>
      </section>`;
    bind();
  }
  function crest(c, cls) { return `<span class="crest ${cls || ''}" style="--c1:${c.c1};--c2:${c.c2}"><b>${esc(c.short)}</b></span>`; }
  function tileHtml(c) {
    const used = S.drawn.includes(c.id), cur = S.club === c.id;
    return `<div class="ct ${used ? 'used' : ''} ${cur ? 'win' : ''}" data-club="${c.id}">${crest(c)}<small>${esc(c.name)}</small></div>`;
  }
  const rating = p => hide() ? '?' : p[2];
  let CHM = null; // render sırasında hesaplanan oyuncu kimyaları
  function cardInner(p) { const c = CLUB(p.club), k = CHM ? CHM.get(p) : null, n = nation(p) || '–';
    return `<i style="background:${c.c1}"></i><b>${esc(p.name)}</b><small>${PZ(p.pos)} · ${hide() ? '??' : p.r} · ${n}</small>${k == null ? '' : `<span class="chem c${k}">${'●'.repeat(k)}${'○'.repeat(3 - k)}</span>`}`; }
  function slotHtml(s) { const p = S.picks[s.id]; return `<div class="slot ${p ? 'full' : ''}" style="left:${s.x}%;top:${s.y}%">${p ? cardInner(p) : `<span>${PZ(s.pos)}</span>`}</div>`; }
  function pickPanel() {
    if (!S.club) return `<p class="muted">${T('“Takım çek”e bas: 18 kulüp karıştırılmış bir torbada, her biri bir kez çıkar. Gelen kulübün güncel FC 27 kadrosundan ya da son 10 yılın yıldızlarından bir oyuncu seç. Mevkisi boşsa sahaya, değilse yedeğe geçer.', 'Press “Draw a club”: the 18 clubs are shuffled in a bag and each comes out once. Pick a player from that club’s current FC 27 squad or from the stars of the last 10 years. If their position is free they go on the pitch, otherwise onto the bench.')}</p>`;
    const c = CLUB(S.club), need = new Set(DRAFT_SLOTS.filter(s => !S.picks[s.id]).map(s => s.pos));
    const list = c.players.map((p, i) => ({ p, i })).filter(x => !S.pf || x.p[1] === S.pf).sort((a, b) => b.p[2] - a.p[2]);
    return `<div class="club-head">${crest(c, 'lg')}<div><h3>${esc(c.name)}</h3><small class="muted">${c.players.length} ${T('oyuncu', 'players')}</small></div>${S.jokers > 0 ? `<button class="pill ghost sm" data-a="joker">↻ ${T('Joker', 'Joker')} (${S.jokers})</button>` : ''}</div>
      <div class="pos-filter"><button class="${!S.pf ? 'on' : ''}" data-pf="">${T('Tümü', 'All')}</button>${Object.keys(DRAFT_POS_NAMES).map(k => `<button class="${S.pf === k ? 'on' : ''} ${need.has(k) ? 'need' : ''}" data-pf="${k}">${PZ(k)}</button>`).join('')}</div>
      <div class="plist">${list.map(({ p, i }) => { const ok = canTake(p); return `<button class="pl ${ok ? '' : 'no'}" data-i="${i}" ${ok ? '' : 'disabled'}><span class="pos ${need.has(p[1]) ? 'need' : ''}">${PZ(p[1])}</span><b>${esc(p[0])}<small class="era ${p[3] === 'FC27' ? 'off' : ''}">${eraTxt(p[3])}</small></b><span class="rt">${rating(p)}</span></button>`; }).join('') || `<p class="muted">${T('Bu mevkide oyuncu yok.', 'No players in this position.')}</p>`}</div>`;
  }
  function bind() {
    const q = s => el.querySelector(s);
    q('[data-a=mode]').onclick = () => { S.mode = hide() ? 'normal' : 'sefir'; ls.set('draft_mode', S.mode); render(); };
    const sp = q('[data-a=spin]'); if (sp) sp.onclick = () => spin();
    const jk = q('[data-a=joker]'); if (jk) jk.onclick = () => { S.jokers--; S.club = null; spin(); };
    q('[data-a=reset]').onclick = () => { S = fresh(S.mode); render(); };
    q('[data-a=next]').onclick = () => { S.phase = 'tactics'; render(); };
    el.querySelectorAll('.pos-filter button').forEach(b => b.onclick = () => { S.pf = b.dataset.pf || null; render(); });
    el.querySelectorAll('.pl:not(.no)').forEach(b => b.onclick = () => take(+b.dataset.i));
  }

  /* eşit şans: 18 kulüp karıştırılmış bir torbada; torba bitince yeniden dolar */
  function drawClub() {
    if (!Array.isArray(S.bag)) S.bag = [];
    for (let tries = 0; tries < DRAFT_CLUBS.length * 2; tries++) {
      if (!S.bag.length) { S.bag = shuffle(DRAFT_CLUBS.map((c, i) => i)); S.drawn = []; }
      const k = S.bag.shift();
      if (DRAFT_CLUBS[k].players.some(canTake)) return k;
    }
    return -1;
  }
  function spin() {
    stop();
    const k = drawClub(); if (k < 0) return;
    const target = DRAFT_CLUBS[k].id;
    el.querySelector('[data-a=spin]').disabled = true;
    const tiles = [...el.querySelectorAll('.ct')], N = 12;
    tiles.forEach(t => t.classList.remove('win', 'hot'));
    let t = 0;
    for (let i = 0; i < N; i++) {
      const last = i === N - 1;
      const tile = last ? el.querySelector(`.ct[data-club="${target}"]`) : tiles[rnd(tiles.length)];
      t += 28 + Math.pow(i / N, 2.4) * 150;
      later(() => {
        tiles.forEach(x => x.classList.remove('hot'));
        tile.classList.add(last ? 'win' : 'hot');
        if (typeof AdvAudio !== 'undefined') AdvAudio.note(last ? 1046 : 700 + i * 12, last ? .18 : .03, last ? 'triangle' : 'square', last ? .05 : .02);
      }, t);
    }
    later(() => { S.club = target; S.pf = null; if (!S.drawn.includes(target)) S.drawn.push(target); render(); el.querySelector('.pick-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, t + 280);
  }
  function take(i) {
    const c = CLUB(S.club), p = c.players[i];
    const o = { name: p[0], pos: p[1], r: p[2], club: c.id, era: p[3] };
    const s = openSlotsFor(p[1])[0];
    if (s) S.picks[s.id] = o; else S.bench[benchOpen()] = o;
    S.club = null; S.pf = null; render();
  }

  /* ---------------- teknik direktör ve taktik ---------------- */
  const TACF = () => ({
    tempo: [T('Pas temposu', 'Passing tempo'), [['yavas', T('Yavaş', 'Slow')], ['dengeli', T('Dengeli', 'Balanced')], ['hizli', T('Hızlı', 'Fast')]]],
    pres: [T('Pres', 'Pressing'), [['dusuk', T('Düşük', 'Low')], ['orta', T('Orta', 'Medium')], ['yuksek', T('Yüksek', 'High')]]],
    hat: [T('Savunma hattı', 'Defensive line'), [['geride', T('Geride', 'Deep')], ['dengeli', T('Dengeli', 'Balanced')], ['onde', T('Önde', 'High')]]],
    yon: [T('Hücum yönü', 'Attacking focus'), [['kanat', T('Kanatlar', 'Wings')], ['dengeli', T('Dengeli', 'Balanced')], ['merkez', T('Merkez', 'Centre')]]]
  });
  function renderTactics() {
    save();
    const st = strength();
    el.innerHTML = `<section class="dr-hero"><p class="eyebrow">${T('Adım 2 / 2', 'Step 2 of 2')}</p><h1 class="display">${T('Teknik<br>direktör &amp; <em>taktik.</em>', 'Manager<br>&amp; <em>tactics.</em>')}</h1>
      <div class="dr-meta"><span class="chip">${T('Hücum', 'Attack')} <b>${hide() ? '??' : st.att.toFixed(1)}</b></span><span class="chip">${T('Savunma', 'Defence')} <b>${hide() ? '??' : st.def.toFixed(1)}</b></span><span class="chip chem-chip">🧪 ${T('Kimya', 'Chemistry')} <b>${st.cp}</b>/100 <small>(+${st.chem.toFixed(1)})</small></span><span class="chip">${T('Ort. reyting', 'Avg. rating')} <b>${hide() ? '??' : avg(st.xi.map(p => p.r)).toFixed(1)}</b></span>${S.last ? `<button class="chip" data-a="laststats">📊 ${T('Son sezon istatistikleri', 'Last season’s stats')}</button>` : ''}</div></section>
      <section class="tac">
        <div class="tac-block"><span class="eyebrow">${T('Teknik direktör', 'Manager')}</span><div class="coaches">${DRAFT_COACHES.map((c, i) => `<button class="coach ${S.coach === i ? 'on' : ''}" data-c="${i}"><b>${c.name}</b><small>${I18N.lang === 'en' ? (COACH_EN[c.note] || c.note) : c.note}</small><span>${T('H', 'A')} ${c.att >= 0 ? '+' : ''}${c.att} · ${T('S', 'D')} ${c.def >= 0 ? '+' : ''}${c.def}</span></button>`).join('')}</div></div>
        ${Object.entries(TACF()).map(([k, [lbl, opts]]) => `<div class="tac-block"><span class="eyebrow">${lbl}</span><div class="seg2">${opts.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${S.tac[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('')}
        <div class="dr-actions"><button class="pill ghost" data-a="back">← ${T('Kadroya dön', 'Back to squad')}</button><button class="pill big" data-a="play" ${S.coach === null ? 'disabled' : ''}>${T('OYNA · 34 maç', 'PLAY · 34 matches')}</button></div>
      </section>`;
    el.querySelectorAll('.coach').forEach(b => b.onclick = () => { S.coach = +b.dataset.c; renderTactics(); });
    el.querySelectorAll('.seg2 button').forEach(b => b.onclick = () => { S.tac[b.dataset.k] = b.dataset.v; renderTactics(); });
    el.querySelector('[data-a=back]').onclick = () => { S.phase = 'draft'; render(); };
    el.querySelector('[data-a=play]').onclick = () => { if (S.coach !== null) season(); };
    const ls2 = el.querySelector('[data-a=laststats]'); if (ls2) ls2.onclick = () => { S.phase = 'stats'; render(); };
  }
  function baseAD(xi) {
    const by = pos => xi.filter(p => p.pos === pos).map(p => p.r);
    const att = .45 * avg([...by('FV'), ...by('KN')]) + .35 * avg(by('OS')) + .2 * avg([...by('FV'), ...by('OS')]);
    const def = .35 * avg(by('KL')) + .45 * avg([...by('ST'), ...by('BK')]) + .2 * avg(by('OS'));
    return { att, def };
  }
  function strength() {
    const xi = DRAFT_SLOTS.map(s => S.picks[s.id]).filter(Boolean);
    let { att, def } = baseAD(xi);
    const cp = chemOf(xi).pct, chem = cp / 100 * CHEM_MAX;
    const benchAvg = avg(S.bench.filter(Boolean).map(p => p.r)); att += (benchAvg - 75) * .02; def += (benchAvg - 75) * .02;
    if (S.coach !== null) { att += DRAFT_COACHES[S.coach].att * CFG.coach; def += DRAFT_COACHES[S.coach].def * CFG.coach; }
    return { att: att + chem, def: def + chem, chem, cp, xi };
  }
  function mods(xi) {
    const t = S.tac; let a = 1, d = 1;
    if (t.tempo === 'hizli') { a *= 1.08; d *= 1.05; } else if (t.tempo === 'yavas') { a *= .95; d *= .94; }
    if (t.pres === 'yuksek') { a *= 1.06; d *= .95; } else if (t.pres === 'dusuk') { a *= .95; d *= 1.04; }
    if (t.hat === 'onde') { a *= 1.05; d *= 1.07; } else if (t.hat === 'geride') { a *= .94; d *= .9; }
    const kn = avg(xi.filter(p => p.pos === 'KN').map(p => p.r)), os = avg(xi.filter(p => p.pos === 'OS').map(p => p.r));
    if (t.yon === 'kanat') a *= kn >= os ? 1.06 : .98; else if (t.yon === 'merkez') a *= os >= kn ? 1.06 : .98;
    return { a: 1 + (a - 1) * CFG.tac, d: 1 + (d - 1) * CFG.tac };
  }
  // rakip kulübün en iyi 11'i (4-3-3) — senin seçtiğin oyuncular o kulüpten "transfer" olmuş sayılır
  function clubXI(c, taken) {
    const pool = c.players.filter(p => p[3] === 'FC27' && !taken.has(p[0])).map(p => ({ name: p[0], pos: p[1], r: p[2], club: c.id })).sort((a, b) => b.r - a.r);
    const need = { KL: 1, ST: 2, BK: 2, OS: 3, KN: 2, FV: 1 }, xi = [];
    for (const [pos, n] of Object.entries(need)) pool.filter(p => p.pos === pos && !xi.includes(p)).slice(0, n).forEach(p => xi.push(p));
    for (const [pos, n] of Object.entries(need)) { let have = xi.filter(p => p.pos === pos).length; while (have < n) { const f = pool.find(p => !xi.includes(p)); if (!f) break; xi.push(Object.assign({}, f, { pos, r: f.r - 4, orig: f })); have++; } }
    return xi;
  }
  const poisson = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const wpick = (arr, wf) => { const w = arr.map(wf), tot = w.reduce((s, v) => s + v, 0); let r = Math.random() * tot; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[0]; };
  const SC_W = { FV: 2.6, KN: 2.2, OS: 1.5, ST: .55, BK: .55, KL: 0 }, AS_W = { FV: 2, KN: 4.5, OS: 3, ST: .4, BK: 1.8, KL: .05 };

  /* ---------------- sezon ---------------- */
  function season() {
    stop(); S.phase = 'season'; save();
    const st = strength(), m = mods(st.xi);
    const taken = new Set(picked().map(p => p.name));
    const out = DRAFT_CLUBS[rnd(DRAFT_CLUBS.length)];
    const teams = [{ name: ME, short: 'SEN', id: 'me', me: true, xi: st.xi, c1: '#ff4d00' }];
    DRAFT_CLUBS.filter(c => c !== out).forEach(c => { const xi = clubXI(c, taken), ad = baseAD(xi), oc = chemOf(xi).pct / 100 * CHEM_MAX; ad.att += oc; ad.def += oc; teams.push({ name: c.name, short: c.short, id: c.id, xi, att: ad.att + CFG.opp, def: ad.def + CFG.opp, c1: c.c1 }); });
    teams.forEach(t => Object.assign(t, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, form: [] }));
    const stats = {}; // key -> {name, team, pos, r, g, a, cs, apps}
    const key = (t, p) => t.id + '|' + p.name;
    teams.forEach(t => t.xi.forEach(p => stats[key(t, p)] = { name: p.name, team: t.name, tid: t.id, c1: t.c1, pos: p.pos, r: p.r, g: 0, a: 0, cs: 0, apps: 0 }));
    const N = teams.length, idx = teams.map((_, i) => i), rounds = [];
    for (let r = 0; r < N - 1; r++) { const pr = []; for (let i = 0; i < N / 2; i++) pr.push(r % 2 ? [idx[N - 1 - i], idx[i]] : [idx[i], idx[N - 1 - i]]); rounds.push(pr); idx.splice(1, 0, idx.pop()); }
    const all = [...rounds, ...rounds.map(r => r.map(([h, a]) => [a, h]))];
    const lam = (att, def) => Math.max(.12, Math.min(4.2, CFG.base * Math.exp((att - def) / CFG.K)));
    // sakatlıklar (yalnızca senin takımında görünür): yerine en iyi yedek, mevki dışıysa -4
    const inj = {}, bench = S.bench.filter(Boolean);
    function injPenalty() {
      let pen = 0; const used = new Set();
      Object.entries(inj).forEach(([name, wks]) => { if (wks <= 0) return; const p = st.xi.find(x => x.name === name); if (!p) return;
        const sub = bench.filter(b => !used.has(b.name) && !inj[b.name]).sort((a, b) => (b.pos === p.pos) - (a.pos === p.pos) || b.r - a.r)[0];
        if (sub) used.add(sub.name); const r = sub ? sub.r - (sub.pos === p.pos ? 0 : 4) : 58; pen += (r - p.r) / 11; });
      return pen;
    }
    function goals(t, n, list) {
      for (let k = 0; k < n; k++) {
        const sc = wpick(t.xi, p => SC_W[p.pos] * Math.pow(p.r / 75, 2)); stats[key(t, sc)].g++;
        let as = null;
        if (Math.random() < .78) { as = wpick(t.xi.filter(p => p !== sc), p => AS_W[p.pos] * Math.pow(p.r / 75, 4)); stats[key(t, as)].a++; }
        list.push({ t: t.id, sc: sc.name, as: as && as.name, min: 1 + rnd(90) });
      }
    }
    function play(h, a) {
      const H = teams[h], A = teams[a];
      let lh, la;
      const fh = gauss() * CFG.noise, fa = gauss() * CFG.noise, pen = (H.me || A.me) ? injPenalty() : 0;
      const ha = (H.me ? st.att + pen : H.att) + fh, hd = (H.me ? st.def + pen : H.def) + fh, aa = (A.me ? st.att + pen : A.att) + fa, ad2 = (A.me ? st.def + pen : A.def) + fa;
      lh = lam(ha, ad2) * CFG.home; la = lam(aa, hd) * CFG.away;
      if (H.me) { lh *= m.a; la /= m.d; } else if (A.me) { la *= m.a; lh /= m.d; }
      const gh = poisson(lh), ga = poisson(la), ev = [];
      goals(H, gh, ev); goals(A, ga, ev); ev.sort((x, y) => x.min - y.min);
      H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
      [[H, ga], [A, gh]].forEach(([T, conc]) => T.xi.forEach(p => { const s = stats[key(T, p)]; s.apps++; if (!conc && (p.pos === 'KL' || p.pos === 'ST' || p.pos === 'BK')) s.cs++; }));
      if (gh > ga) { H.w++; H.p += 3; A.l++; H.form.push('G'); A.form.push('M'); } else if (gh < ga) { A.w++; A.p += 3; H.l++; H.form.push('M'); A.form.push('G'); } else { H.d++; A.d++; H.p++; A.p++; H.form.push('B'); A.form.push('B'); }
      return { h, a, gh, ga, ev };
    }
    el.innerHTML = `<section class="dr-hero"><p class="eyebrow">${T('Sezon simülasyonu', 'Season simulation')} · ${T(`${esc(out.name)}'in yerini sen aldın`, `you have taken ${esc(out.name)}’s place`)}</p><h1 class="display">${T('Hafta', 'Week')} <em class="wk">0</em><span class="slash">/34</span></h1>
      <div class="dr-meta"><span class="chip">${T('Puan', 'Points')} <b class="pts">0</b></span><span class="chip">${T('G-B-M', 'W-D-L')} <b class="wdl">0-0-0</b></span><span class="chip">${T('Gol', 'Goals')} <b class="gl">0:0</b></span><button class="chip toggle" data-a="fast">⏩ ${T('Hızlandır', 'Speed up')}</button></div></section>
      <section class="season"><div class="live"><div class="live-card"><span class="eyebrow lc-t">${T('Maç günü', 'Matchday')}</span><div class="score"><span class="tn h">—</span><b class="sc">0 – 0</b><span class="tn a">—</span></div><div class="minute"><i></i></div><div class="goals-ev"></div><div class="feed"></div></div>
        <div class="bar"><i></i></div><div class="mini-kings"></div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>${T('Takım', 'Team')}</th><th>${T('O', 'P')}</th><th>${T('G', 'W')}</th><th>${T('B', 'D')}</th><th>${T('M', 'L')}</th><th>${T('A', 'GD')}</th><th>${T('P', 'Pts')}</th></tr></thead><tbody></tbody></table></div></section>`;
    const q = s => el.querySelector(s), me = teams[0];
    let wk = 0, speed = 700;
    q('[data-a=fast]').onclick = e => { speed = speed > 100 ? 60 : 700; e.target.classList.toggle('on', speed < 100); e.target.textContent = speed < 100 ? T('▶ Normal hız', '▶ Normal speed') : T('⏩ Hızlandır', '⏩ Speed up'); };
    const sorted = () => teams.slice().sort((x, y) => y.p - x.p || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
    function table() {
      const s = sorted();
      q('.tbl tbody').innerHTML = s.map((t, i) => `<tr class="${t.me ? 'me' : ''}"><td>${i + 1}</td><td><i class="dot" style="background:${t.c1}"></i>${esc(TN(t.name))}</td><td>${t.w + t.d + t.l}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf - t.ga}</td><td><b>${t.p}</b></td></tr>`).join('');
      return s.indexOf(me) + 1;
    }
    function kings() {
      const top = Object.values(stats).filter(s => s.g).sort((a, b) => b.g - a.g || b.a - a.a).slice(0, 3);
      q('.mini-kings').innerHTML = top.length ? `<span class="eyebrow">${T('Gol krallığı', 'Top scorers')}</span>${top.map((s, i) => `<div class="mk ${s.tid === 'me' ? 'me' : ''}"><span>${i + 1}</span><i class="dot" style="background:${s.c1}"></i><b>${esc(s.name)}</b><em>${s.g}</em></div>`).join('')}` : '';
    }
    table();
    function week() {
      if (wk >= all.length) return finish();
      const res = all[wk].map(([h, a]) => play(h, a)), mine = res.find(r => teams[r.h].me || teams[r.a].me);
      Object.keys(inj).forEach(k => { inj[k]--; if (inj[k] <= 0) delete inj[k]; });
      let injMsg = '';
      st.xi.forEach(p => { if (!inj[p.name] && Math.random() < CFG.inj) { const w = 1 + Math.floor(Math.random() * Math.random() * 7); inj[p.name] = w; injMsg = T(`🚑 ${p.name} sakatlandı (${w} hafta)`, `🚑 ${p.name} injured (${w} ${w > 1 ? 'weeks' : 'week'})`); } });
      wk++;
      q('.wk').textContent = wk; q('.pts').textContent = me.p; q('.wdl').textContent = `${me.w}-${me.d}-${me.l}`; q('.gl').textContent = `${me.gf}:${me.ga}`;
      q('.bar i').style.width = (wk / 34 * 100) + '%';
      const home = teams[mine.h].me, opp = teams[home ? mine.a : mine.h];
      q('.lc-t').textContent = T(`${wk}. hafta · ${home ? 'İç saha' : 'Deplasman'}`, `Week ${wk} · ${home ? 'Home' : 'Away'}`);
      q('.tn.h').textContent = TN(teams[mine.h].name); q('.tn.a').textContent = TN(teams[mine.a].name);
      const myG = home ? mine.gh : mine.ga, opG = home ? mine.ga : mine.gh, r = myG > opG ? 'G' : myG < opG ? 'M' : 'B';
      const mn = q('.minute i'); mn.style.transition = 'none'; mn.style.width = '0'; void mn.offsetWidth; mn.style.transition = `width ${Math.max(40, speed * .7)}ms linear`; mn.style.width = '100%';
      q('.sc').textContent = `${mine.gh} – ${mine.ga}`; q('.live-card').dataset.r = r;
      q('.goals-ev').innerHTML = mine.ev.map(e => `<span class="${e.t === 'me' ? 'mine' : ''}">⚽ ${e.min}' ${esc(e.sc)}${e.as ? ` <small>(${esc(e.as)})</small>` : ''}</span>`).join('');
      const f = q('.feed'); f.insertAdjacentHTML('afterbegin', `<div class="fr ${r}"><span>${wk}</span><b>${FL(r)}</b> ${home ? '' : '@ '}${esc(TN(opp.name))} <em>${myG}–${opG}</em></div>${injMsg ? `<div class="fr inj">${esc(injMsg)}</div>` : ''}`); while (f.children.length > 5) f.lastChild.remove();
      if (typeof AdvAudio !== 'undefined' && speed > 100) AdvAudio.note(r === 'G' ? 784 : r === 'B' ? 523 : 330, .12, 'triangle', .04);
      table(); kings(); later(week, speed);
    }
    function finish() {
      const rank = table(), best = ls.get('draft_best', 0); if (me.p > best) ls.set('draft_best', me.p);
      if (typeof Scores !== 'undefined') { Scores.report('draft', me.p, { rank }); const sn = snapshot(); if (sn) Scores.saveSquad(sn); }
      const fin = sorted(), pos = {}; fin.forEach((t, i) => pos[t.id] = i + 1);
      const list = Object.values(stats);
      list.forEach(s => { const tp = pos[s.tid]; s.score = s.g * 1.0 + s.a * .7 + (s.r - 72) * .35 + (s.pos === 'KL' ? s.cs * .45 : (s.pos === 'ST' || s.pos === 'BK') ? s.cs * .18 : 0) + (tp === 1 ? 4 : tp <= 4 ? 1.5 : 0); });
      const top = (arr, f, n) => arr.slice().sort(f).slice(0, n);
      S.last = {
        out: out.name, rank, pts: me.p, w: me.w, d: me.d, l: me.l, gf: me.gf, ga: me.ga, best: me.p > best, prevBest: best,
        table: fin.map(t => ({ name: t.name, id: t.id, c1: t.c1, me: !!t.me, p: t.p, w: t.w, d: t.d, l: t.l, gf: t.gf, ga: t.ga, form: t.form.slice(-5).join('') })),
        scorers: top(list.filter(s => s.g), (a, b) => b.g - a.g || b.a - a.a || b.r - a.r, 15),
        assists: top(list.filter(s => s.a), (a, b) => b.a - a.a || b.g - a.g || b.r - a.r, 15),
        gk: top(list.filter(s => s.pos === 'KL'), (a, b) => b.cs - a.cs || b.r - a.r, 5),
        poy: top(list, (a, b) => b.score - a.score, 5),
        mine: list.filter(s => s.tid === 'me').sort((a, b) => b.g + b.a - (a.g + a.a) || b.r - a.r)
      };
      S.phase = 'stats'; S.tab = 'awards'; save();
      if (rank === 1 && typeof confetti === 'function') confetti();
      renderStats();
    }
    later(week, 400);
    window.__draftSeason = { fast: () => { speed = 1; } };
  }

  /* ---------------- sezon sonu istatistikleri ---------------- */
  function renderStats() {
    const L = S.last; if (!L) { S.phase = 'tactics'; return renderTactics(); }
    const tab = S.tab || 'awards';
    const msg = L.w === 34 ? T('34’te 34! Efsane sezon!', '34 out of 34! A legendary season!') : L.rank === 1 ? T('Şampiyon!', 'Champions!') : L.rank <= 4 ? T('Avrupa’ya gidiyoruz.', 'We’re going to Europe.') : L.rank <= 10 ? T('Orta sıralar.', 'Mid-table.') : L.rank >= 16 ? T('Küme düştük…', 'Relegated…') : T('Zor bir sezon.', 'A tough season.');
    const award = (ic, ttl, s, val) => s ? `<div class="award"><span class="aw-ic">${ic}</span><span class="eyebrow">${ttl}</span><b>${esc(s.name)}</b><small><i class="dot" style="background:${s.c1}"></i>${esc(TN(s.team))}</small><em>${val}</em></div>` : '';
    const row = (s, i, val) => `<tr class="${s.tid === 'me' ? 'me' : ''}"><td>${i + 1}</td><td><b>${esc(s.name)}</b><small class="muted"> ${PZ(s.pos)}</small></td><td><i class="dot" style="background:${s.c1}"></i>${esc(TN(s.team))}</td><td><b>${val(s)}</b></td></tr>`;
    const body = {
      awards: `<div class="awards">${award('⚽', T('Gol kralı', 'Top scorer'), L.scorers[0], L.scorers[0] ? L.scorers[0].g + T(' gol', ' goals') : '')}${award('🎯', T('Asist kralı', 'Most assists'), L.assists[0], L.assists[0] ? L.assists[0].a + T(' asist', ' assists') : '')}${award('⭐', T('Yılın oyuncusu', 'Player of the season'), L.poy[0], L.poy[0] ? `${L.poy[0].g} ${T('gol', 'goals')} · ${L.poy[0].a} ${T('asist', 'assists')}` : '')}${award('🧤', T('Altın eldiven', 'Golden Glove'), L.gk[0], L.gk[0] ? L.gk[0].cs + T(' gol yemedi', ' clean sheets') : '')}</div>
        <div class="poy-list"><span class="eyebrow">${T('Yılın oyuncusu oylaması', 'Player of the season vote')}</span>${L.poy.map((s, i) => `<div class="mk ${s.tid === 'me' ? 'me' : ''}"><span>${i + 1}</span><i class="dot" style="background:${s.c1}"></i><b>${esc(s.name)}</b><small>${esc(TN(s.team))}</small><em>${s.g}${T('G', 'G')} ${s.a}${T('A', 'A')}</em></div>`).join('')}</div>`,
      table: `<table class="tbl"><thead><tr><th>#</th><th>${T('Takım', 'Team')}</th><th>${T('O', 'P')}</th><th>${T('G', 'W')}</th><th>${T('B', 'D')}</th><th>${T('M', 'L')}</th><th>${T('A', 'GD')}</th><th class="form">Form</th><th>${T('P', 'Pts')}</th></tr></thead><tbody>${L.table.map((t, i) => `<tr class="${t.me ? 'me' : ''} ${i >= 15 ? 'rel' : i < 4 ? 'eur' : ''}"><td>${i + 1}</td><td><i class="dot" style="background:${t.c1}"></i>${esc(TN(t.name))}</td><td>${t.w + t.d + t.l}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf - t.ga}</td><td class="form">${t.form.split('').map(c => `<i class="f${c}">${FL(c)}</i>`).join('')}</td><td><b>${t.p}</b></td></tr>`).join('')}</tbody></table>`,
      goals: `<table class="tbl"><thead><tr><th>#</th><th>${T('Oyuncu', 'Player')}</th><th>${T('Takım', 'Team')}</th><th>${T('Gol', 'Goals')}</th></tr></thead><tbody>${L.scorers.map((s, i) => row(s, i, s => s.g)).join('')}</tbody></table>`,
      assists: `<table class="tbl"><thead><tr><th>#</th><th>${T('Oyuncu', 'Player')}</th><th>${T('Takım', 'Team')}</th><th>${T('Asist', 'Assists')}</th></tr></thead><tbody>${L.assists.map((s, i) => row(s, i, s => s.a)).join('')}</tbody></table>`,
      mine: `<table class="tbl"><thead><tr><th>${T('Oyuncu', 'Player')}</th><th>${T('Mevki', 'Pos.')}</th><th>${T('Maç', 'Apps')}</th><th>${T('Gol', 'Goals')}</th><th>${T('Asist', 'Assists')}</th><th>${T('GY', 'CS')}</th></tr></thead><tbody>${L.mine.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${PZ(s.pos)}</td><td>${s.apps}</td><td>${s.g}</td><td>${s.a}</td><td>${s.cs}</td></tr>`).join('')}</tbody></table><p class="muted sm">${T('GY: gol yenmeyen maç (kaleci ve defans)', 'CS: clean sheets (goalkeeper and defence)')}</p>`
    }[tab];
    el.innerHTML = `<section class="dr-hero"><p class="eyebrow">${T('Sezon sonu', 'End of season')} · ${T(`${esc(L.out)}'in yerini sen aldın`, `you took ${esc(L.out)}’s place`)}</p>
      <div class="end-head"><div class="big-pts">${L.pts}<small>/102</small></div><div><h2>${T(L.rank + '. sıra', 'Finished ' + L.rank + ([, 'st', 'nd', 'rd'][L.rank % 10 > 3 || [11, 12, 13].includes(L.rank % 100) ? 0 : L.rank % 10] || 'th'))} · ${msg}</h2><p class="muted">${L.w}${FL('G')} ${L.d}${FL('B')} ${L.l}${FL('M')} · ${T('Gol', 'Goals')} ${L.gf}:${L.ga}</p>${L.best ? `<span class="chip on">🏆 ${T('Yeni rekor', 'New record')}</span>` : `<span class="chip">${T('Rekor', 'Record')} ${Math.max(L.prevBest, L.pts)}</span>`}</div></div></section>
      <nav class="st-tabs">${[['awards', T('🏅 Ödüller', '🏅 Awards')], ['table', T('Puan durumu', 'League table')], ['goals', T('Gol krallığı', 'Top scorers')], ['assists', T('Asist krallığı', 'Top assists')], ['mine', T('Takımım', 'My team')]].map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</nav>
      <section class="st-body">${body}</section>
      <div class="dr-actions"><button class="pill ghost" data-a="tac">${T('Taktiği değiştir', 'Change tactics')}</button><button class="pill ghost" data-a="again">${T('Aynı kadroyla tekrar', 'Replay with the same squad')}</button><button class="pill" data-a="new">${T('Yeni draft', 'New draft')}</button></div>`;
    el.querySelectorAll('.st-tabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.t; save(); renderStats(); });
    el.querySelector('[data-a=tac]').onclick = () => { S.phase = 'tactics'; render(); };
    el.querySelector('[data-a=again]').onclick = () => season();
    el.querySelector('[data-a=new]').onclick = () => { S = fresh(S.mode); render(); };
    save();
  }

  /* ---------- Draft düellosu: kayıtlı iki kadro arasında tek maç (aynı tohumla herkes aynı sonucu görür) ---------- */
  function snapshot() {
    if (!S) { const st0 = ls.get('draft_state', null); if (!st0 || st0.v !== 3) return null; S = st0; }
    const xi = DRAFT_SLOTS.map(s => S.picks[s.id]).filter(Boolean);
    if (xi.length < 11 || S.coach === null) return null;
    const st = strength(), m = mods(st.xi), f = x => Math.round(x * 100) / 100;
    return { v: 1, att: f(st.att), def: f(st.def), cp: st.cp, ma: f(m.a * 1000) / 1000, md: f(m.d * 1000) / 1000, avg: Math.round(avg(st.xi.map(p => p.r))), coach: DRAFT_COACHES[S.coach].name, tac: Object.assign({}, S.tac),
      xi: st.xi.map(p => ({ n: p.name, p: p.pos, r: p.r })), bench: S.bench.filter(Boolean).map(p => ({ n: p.name, p: p.pos, r: p.r })) };
  }
  function h2h(H, A, seed) {
    let s0 = seed >>> 0;
    const R = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const G = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const pois = l => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= R(); } while (p > L); return k - 1; };
    const pick = (arr, wf) => { const w = arr.map(wf), tot = w.reduce((a, b) => a + b, 0) || 1; let r = R() * tot; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; };
    const lam = (att, def) => Math.max(.12, Math.min(4.2, CFG.base * Math.exp((att - def) / CFG.K)));
    const fh = G() * CFG.noise, fa = G() * CFG.noise;
    const lh = lam(H.att + fh, A.def + fa) * CFG.home * (H.ma || 1) / (A.md || 1), la = lam(A.att + fa, H.def + fh) * CFG.away * (A.ma || 1) / (H.md || 1);
    const hs = Math.min(12, pois(lh)), as = Math.min(12, pois(la)), ev = [];
    const goals = (T, side, n) => { for (let k = 0; k < n; k++) { const sc = pick(T.xi, p => (SC_W[p.p] || .5) * Math.pow(p.r / 75, 2)); const as_ = R() < .78 ? pick(T.xi.filter(p => p !== sc), p => (AS_W[p.p] || 1) * Math.pow(p.r / 75, 4)) : null; ev.push({ s: side, sc: sc.n, as: as_ && as_.n, min: 1 + Math.floor(R() * 90) }); } };
    goals(H, 'h', hs); goals(A, 'a', as); ev.sort((x, y) => x.min - y.min);
    return { hs, as, ev };
  }

  return { open, stop, snapshot, h2h, _cfg: CFG, get state() { return S; }, _take: take, _spin: spin, _draw: () => drawClub() };
})();

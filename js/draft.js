"use strict";
/* =====================================================================
   SÜPER LİG EFSANELER DRAFT — çark çevir, 11+2 kur, taktik seç, 34 maç oyna
   ===================================================================== */
const Draft = (() => {
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 70;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let S = null, el = null, timers = [];
  const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
  function stop() { timers.forEach(clearTimeout); timers = []; }

  function fresh(mode) {
    return { v: 2, bag: shuffle(DRAFT_CLUBS.map((c, i) => i)), mode: mode || ls.get('draft_mode', 'normal'), picks: {}, bench: [null, null], jokers: 2, club: null, rot: 0, coach: null, tac: { tempo: 'dengeli', pres: 'orta', hat: 'dengeli', yon: 'dengeli' }, phase: 'draft' };
  }
  const picked = () => [...Object.values(S.picks), ...S.bench].filter(Boolean);
  const count = () => picked().length;
  const openSlotsFor = pos => DRAFT_SLOTS.filter(s => s.pos === pos && !S.picks[s.id]);
  const benchOpen = () => S.bench.findIndex(b => !b);
  const canTake = p => !picked().some(q => q.name === p[0]) && (openSlotsFor(p[1]).length > 0 || benchOpen() >= 0);
  const hide = () => S.mode === 'sefir';

  /* ---------------- ana çizim ---------------- */
  function open(root) { el = root; stop(); S = ls.get('draft_state', null); if (!S || S.v !== 2) S = fresh(); if (S.phase === 'season') S.phase = 'tactics'; render(); }
  function save() { ls.set('draft_state', S); }
  function render() {
    save();
    if (S.phase === 'tactics') return renderTactics();
    const n = count();
    el.innerHTML = `
      <section class="dr-hero"><p class="eyebrow">Süper Lig · 18 kulüp · son 10 yıl</p><h1 class="display">Kadro<br>kur. <em>102</em><br>puanı vur.</h1>
        <div class="dr-meta"><span class="chip">Seçim <b>${n}/13</b></span><span class="chip">Joker <b>${S.jokers}</b></span>
          <button class="chip toggle ${hide() ? 'on' : ''}" data-a="mode">${hide() ? '🙈 Ligin Sefiri' : '👁 Normal mod'}</button>
          <span class="chip">🏆 Rekor <b>${ls.get('draft_best', 0)}</b></span></div></section>
      <section class="dr-grid">
        <div class="dr-left">
          <div class="wheel-box"><div class="wheel-pin"></div><svg class="wheel" viewBox="-100 -100 200 200" style="transform:rotate(${S.rot}deg)">${wheelSvg()}</svg>
            <button class="pill big" data-a="spin" ${n >= 13 || S.club ? 'disabled' : ''}>${n >= 13 ? 'Kadro tamam' : S.club ? 'Oyuncu seç ↓' : 'ÇEVİR'}</button></div>
          <div class="pick-panel">${pickPanel()}</div>
        </div>
        <div class="dr-right">
          <div class="pitch">${DRAFT_SLOTS.map(slotHtml).join('')}<div class="pitch-lines"></div></div>
          <div class="bench"><span class="eyebrow">Yedekler</span>${S.bench.map((p, i) => `<div class="bslot ${p ? 'full' : ''}">${p ? cardInner(p) : '<span>Yedek ' + (i + 1) + '</span>'}</div>`).join('')}</div>
          <div class="dr-actions"><button class="pill ghost" data-a="reset">Sıfırla</button><button class="pill" data-a="next" ${n < 13 ? 'disabled' : ''}>Teknik direktör ve taktik →</button></div>
        </div>
      </section>`;
    bind();
  }
  function wheelSvg() {
    const n = DRAFT_CLUBS.length, a = 360 / n;
    return DRAFT_CLUBS.map((c, i) => {
      const a0 = (i * a - 90) * Math.PI / 180, a1 = ((i + 1) * a - 90) * Math.PI / 180, mid = ((i + .5) * a - 90) * Math.PI / 180;
      return `<path data-club="${c.id}" d="M0 0 L${96 * Math.cos(a0)} ${96 * Math.sin(a0)} A96 96 0 0 1 ${96 * Math.cos(a1)} ${96 * Math.sin(a1)}Z" fill="${c.c1}" stroke="#fff" stroke-width="2"/>
        <text x="${64 * Math.cos(mid)}" y="${64 * Math.sin(mid)}" fill="${c.c2}" font-size="10.5" font-weight="900" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(i + .5) * a - 90 + ((i + .5) * a > 180 ? 180 : 0)} ${64 * Math.cos(mid)} ${64 * Math.sin(mid)})">${c.short}</text>`;
    }).join('') + '<circle r="16" fill="#111"/><circle r="6" fill="#fff"/>';
  }
  const rating = p => hide() ? '?' : p[2];
  const eraTxt = e => e === 'FC27' ? 'EA FC 27' : e.startsWith('~FC') ? 'güncel · tahmini' : e.replace('~', '') + ' · tahmini';
  function cardInner(p) { const c = DRAFT_CLUBS.find(c => c.id === p.club); return `<i style="background:${c.c1}"></i><b>${esc(p.name)}</b><small>${p.pos} · ${hide() ? '??' : p.r}</small>`; }
  function slotHtml(s) { const p = S.picks[s.id]; return `<div class="slot ${p ? 'full' : ''}" style="left:${s.x}%;top:${s.y}%">${p ? cardInner(p) : `<span>${s.pos}</span>`}</div>`; }
  function pickPanel() {
    if (!S.club) return `<p class="muted">Çarkı çevir: 18 kulübün her biri torbada bir kez var, hepsinin gelme şansı eşit. Gelen takımın son 10 yıllık kadrosundan bir oyuncu seç. Yerleşeceği mevki boşsa sahaya, değilse yedeğe geçer.</p>`;
    const c = DRAFT_CLUBS.find(c => c.id === S.club);
    return `<div class="club-head"><i style="background:linear-gradient(90deg,${c.c1} 50%,${c.c2} 50%)"></i><h3>${c.name}</h3>${S.jokers > 0 ? `<button class="pill ghost sm" data-a="joker">↻ Joker (${S.jokers})</button>` : ''}</div>
      <div class="plist">${c.players.map((p, i) => { const ok = canTake(p); return `<button class="pl ${ok ? '' : 'no'}" data-i="${i}" ${ok ? '' : 'disabled'}><span class="pos">${p[1]}</span><b>${esc(p[0])}<small class="era ${p[3] === 'FC27' ? 'off' : ''}">${eraTxt(p[3])}</small></b><span class="rt">${rating(p)}</span></button>`; }).join('')}</div>`;
  }
  function bind() {
    const q = s => el.querySelector(s);
    q('[data-a=mode]').onclick = () => { S.mode = hide() ? 'normal' : 'sefir'; ls.set('draft_mode', S.mode); render(); };
    const sp = q('[data-a=spin]'); if (sp) sp.onclick = spin;
    const jk = q('[data-a=joker]'); if (jk) jk.onclick = () => { S.jokers--; S.club = null; spin(); };
    q('[data-a=reset]').onclick = () => { S = fresh(S.mode); render(); };
    q('[data-a=next]').onclick = () => { S.phase = 'tactics'; render(); };
    el.querySelectorAll('.pl:not(.no)').forEach(b => b.onclick = () => take(+b.dataset.i));
  }
  function spin() {
    stop();
    const k = drawClub();
    if (k < 0) return;
    const n = DRAFT_CLUBS.length, seg = 360 / n;
    const target = 360 - (k * seg + seg / 2);
    S.rot = S.rot - (S.rot % 360) + 360 * 5 + target;
    const w = el.querySelector('.wheel'); w.style.transition = 'transform 2.6s cubic-bezier(.12,.75,.12,1)'; w.style.transform = `rotate(${S.rot}deg)`;
    el.querySelector('[data-a=spin]').disabled = true;
    tickSound();
    later(() => { S.club = DRAFT_CLUBS[k].id; render(); }, 2700);
  }
  /* eşit şans: 18 kulüp karıştırılmış bir torbada; torba bitince yeniden doldurulur.
     Böylece hiçbir kulüp (ör. Trabzonspor) atlanamaz, her biri aynı olasılıkla gelir. */
  function drawClub() {
    if (!Array.isArray(S.bag)) S.bag = [];
    for (let tries = 0; tries < DRAFT_CLUBS.length * 2; tries++) {
      if (!S.bag.length) S.bag = shuffle(DRAFT_CLUBS.map((c, i) => i));
      const k = S.bag.shift();
      if (DRAFT_CLUBS[k].players.some(canTake)) return k;
    }
    return -1;
  }
  function tickSound() { if (typeof AdvAudio === 'undefined') return; for (let i = 0; i < 18; i++) later(() => AdvAudio.note(900, .03, 'square', .02), i * i * 8); }
  function take(i) {
    const c = DRAFT_CLUBS.find(c => c.id === S.club), p = c.players[i];
    const o = { name: p[0], pos: p[1], r: p[2], club: c.id };
    const s = openSlotsFor(p[1])[0];
    if (s) S.picks[s.id] = o; else S.bench[benchOpen()] = o;
    S.club = null; render();
  }

  /* ---------------- teknik direktör ve taktik ---------------- */
  const TAC = {
    tempo: ['Pas temposu', [['yavas', 'Yavaş'], ['dengeli', 'Dengeli'], ['hizli', 'Hızlı']]],
    pres: ['Pres', [['dusuk', 'Düşük'], ['orta', 'Orta'], ['yuksek', 'Yüksek']]],
    hat: ['Savunma hattı', [['geride', 'Geride'], ['dengeli', 'Dengeli'], ['onde', 'Önde']]],
    yon: ['Hücum yönü', [['kanat', 'Kanatlar'], ['dengeli', 'Dengeli'], ['merkez', 'Merkez']]]
  };
  function renderTactics() {
    save();
    const st = strength();
    el.innerHTML = `<section class="dr-hero"><p class="eyebrow">Adım 2 / 2</p><h1 class="display">Teknik<br>direktör &amp; <em>taktik.</em></h1>
      <div class="dr-meta"><span class="chip">Hücum <b>${hide() ? '??' : st.att.toFixed(1)}</b></span><span class="chip">Savunma <b>${hide() ? '??' : st.def.toFixed(1)}</b></span><span class="chip">Uyum <b>+${st.chem.toFixed(1)}</b></span></div></section>
      <section class="tac">
        <div class="tac-block"><span class="eyebrow">Teknik direktör</span><div class="coaches">${DRAFT_COACHES.map((c, i) => `<button class="coach ${S.coach === i ? 'on' : ''}" data-c="${i}"><b>${c.name}</b><small>${c.note}</small><span>H ${c.att >= 0 ? '+' : ''}${c.att} · S ${c.def >= 0 ? '+' : ''}${c.def}</span></button>`).join('')}</div></div>
        ${Object.entries(TAC).map(([k, [lbl, opts]]) => `<div class="tac-block"><span class="eyebrow">${lbl}</span><div class="seg2">${opts.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${S.tac[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('')}
        <div class="dr-actions"><button class="pill ghost" data-a="back">← Kadroya dön</button><button class="pill big" data-a="play" ${S.coach === null ? 'disabled' : ''}>OYNA · 34 maç</button></div>
      </section>`;
    el.querySelectorAll('.coach').forEach(b => b.onclick = () => { S.coach = +b.dataset.c; renderTactics(); });
    el.querySelectorAll('.seg2 button').forEach(b => b.onclick = () => { S.tac[b.dataset.k] = b.dataset.v; renderTactics(); });
    el.querySelector('[data-a=back]').onclick = () => { S.phase = 'draft'; render(); };
    el.querySelector('[data-a=play]').onclick = () => { if (S.coach !== null) season(); };
  }
  function strength() {
    const xi = DRAFT_SLOTS.map(s => S.picks[s.id]).filter(Boolean), by = pos => xi.filter(p => p.pos === pos).map(p => p.r);
    let att = .45 * avg([...by('FV'), ...by('KN')]) + .35 * avg(by('OS')) + .2 * avg([...by('FV'), ...by('OS')]);
    let def = .35 * avg(by('KL')) + .45 * avg([...by('ST'), ...by('BK')]) + .2 * avg(by('OS'));
    const clubs = {}; xi.forEach(p => clubs[p.club] = (clubs[p.club] || 0) + 1);
    const chem = Math.min(3, Object.values(clubs).reduce((s, n) => s + Math.max(0, n - 1) * .35, 0));
    const benchAvg = avg(S.bench.filter(Boolean).map(p => p.r)); att += (benchAvg - 75) * .02; def += (benchAvg - 75) * .02;
    if (S.coach !== null) { att += DRAFT_COACHES[S.coach].att; def += DRAFT_COACHES[S.coach].def; }
    return { att: att + chem, def: def + chem, chem, xi };
  }
  function mods(xi) {
    const t = S.tac; let a = 1, d = 1;
    if (t.tempo === 'hizli') { a *= 1.08; d *= 1.05; } else if (t.tempo === 'yavas') { a *= .95; d *= .94; }
    if (t.pres === 'yuksek') { a *= 1.06; d *= .95; } else if (t.pres === 'dusuk') { a *= .95; d *= 1.04; }
    if (t.hat === 'onde') { a *= 1.05; d *= 1.07; } else if (t.hat === 'geride') { a *= .94; d *= .9; }
    const kn = avg(xi.filter(p => p.pos === 'KN').map(p => p.r)), os = avg(xi.filter(p => p.pos === 'OS').map(p => p.r));
    if (t.yon === 'kanat') a *= kn >= os ? 1.06 : .98; else if (t.yon === 'merkez') a *= os >= kn ? 1.06 : .98;
    return { a, d };
  }
  const poisson = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };

  /* ---------------- sezon ---------------- */
  function season() {
    stop(); S.phase = 'season'; save();
    const st = strength(), m = mods(st.xi), ME = 'Senin Takımın';
    const out = DRAFT_LEAGUE[rnd(DRAFT_LEAGUE.length)];
    const teams = [{ name: ME, s: 0, me: true }, ...DRAFT_LEAGUE.filter(x => x !== out).map(([name, s]) => ({ name, s }))];
    teams.forEach(t => Object.assign(t, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }));
    // çember yöntemiyle fikstür (17 hafta) + rövanş
    const N = teams.length, idx = teams.map((_, i) => i), rounds = [];
    for (let r = 0; r < N - 1; r++) { const pr = []; for (let i = 0; i < N / 2; i++) pr.push(r % 2 ? [idx[N - 1 - i], idx[i]] : [idx[i], idx[N - 1 - i]]); rounds.push(pr); idx.splice(1, 0, idx.pop()); }
    const all = [...rounds, ...rounds.map(r => r.map(([h, a]) => [a, h]))];
    const scorers = {}, xi = st.xi;
    const pickScorer = () => { const w = xi.map(p => ({ p, w: ({ FV: 5, KN: 3, OS: 2, ST: .4, BK: .6, KL: 0 }[p.pos]) * Math.pow(p.r / 80, 3) })); let r = Math.random() * w.reduce((s, x) => s + x.w, 0); for (const x of w) { r -= x.w; if (r <= 0) return x.p.name; } return w[0].p.name; };
    const lam = (att, def) => Math.max(.15, Math.min(3.6, 1.38 * Math.exp((att - def) / 17)));
    function play(h, a) {
      const H = teams[h], A = teams[a];
      let lh, la;
      if (H.me) { lh = lam(st.att, A.s) * m.a * 1.08; la = lam(A.s, st.def) / m.d * .95; }
      else if (A.me) { lh = lam(H.s, st.def) / m.d * 1.05; la = lam(st.att, H.s) * m.a; }
      else { lh = lam(H.s, A.s) * 1.08; la = lam(A.s, H.s); }
      const gh = poisson(lh), ga = poisson(la);
      H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
      if (gh > ga) { H.w++; H.p += 3; A.l++; } else if (gh < ga) { A.w++; A.p += 3; H.l++; } else { H.d++; A.d++; H.p++; A.p++; }
      const mine = H.me ? gh : A.me ? ga : 0; for (let k = 0; k < mine; k++) { const n = pickScorer(); scorers[n] = (scorers[n] || 0) + 1; }
      return { h, a, gh, ga };
    }
    el.innerHTML = `<section class="dr-hero"><p class="eyebrow">Sezon simülasyonu</p><h1 class="display">Hafta <em class="wk">0</em><span class="slash">/34</span></h1>
      <div class="dr-meta"><span class="chip">Puan <b class="pts">0</b></span><span class="chip">G-B-M <b class="wdl">0-0-0</b></span><span class="chip">Gol <b class="gl">0:0</b></span><button class="chip toggle" data-a="fast">⏩ Hızlandır</button></div></section>
      <section class="season"><div class="live"><div class="live-card"><span class="eyebrow lc-t">Bu sezon ${esc(out[0])}'in yerini sen aldın</span><div class="score"><span class="tn h">—</span><b class="sc">0 – 0</b><span class="tn a">—</span></div><div class="minute"><i></i></div><div class="feed"></div></div>
        <div class="bar"><i></i></div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>A</th><th>P</th></tr></thead><tbody></tbody></table></div></section>`;
    const q = s => el.querySelector(s), me = teams[0];
    let wk = 0, speed = 700;
    q('[data-a=fast]').onclick = e => { speed = speed > 100 ? 60 : 700; e.target.classList.toggle('on', speed < 100); e.target.textContent = speed < 100 ? '▶ Normal hız' : '⏩ Hızlandır'; };
    function table() {
      const s = teams.slice().sort((x, y) => y.p - x.p || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
      q('.tbl tbody').innerHTML = s.map((t, i) => `<tr class="${t.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(t.name)}</td><td>${t.w + t.d + t.l}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf - t.ga}</td><td><b>${t.p}</b></td></tr>`).join('');
      return s.indexOf(me) + 1;
    }
    table();
    function week() {
      if (wk >= all.length) return finish();
      const res = all[wk].map(([h, a]) => play(h, a)), mine = res.find(r => teams[r.h].me || teams[r.a].me);
      wk++;
      q('.wk').textContent = wk; q('.pts').textContent = me.p; q('.wdl').textContent = `${me.w}-${me.d}-${me.l}`; q('.gl').textContent = `${me.gf}:${me.ga}`;
      q('.bar i').style.width = (wk / 34 * 100) + '%';
      const home = teams[mine.h].me, opp = teams[home ? mine.a : mine.h];
      q('.lc-t').textContent = `${wk}. hafta · ${home ? 'İç saha' : 'Deplasman'}`;
      q('.tn.h').textContent = teams[mine.h].name; q('.tn.a').textContent = teams[mine.a].name;
      const myG = home ? mine.gh : mine.ga, opG = home ? mine.ga : mine.gh, r = myG > opG ? 'G' : myG < opG ? 'M' : 'B';
      const mn = q('.minute i'); mn.style.transition = 'none'; mn.style.width = '0'; void mn.offsetWidth; mn.style.transition = `width ${Math.max(40, speed * .7)}ms linear`; mn.style.width = '100%';
      q('.sc').textContent = `${mine.gh} – ${mine.ga}`; q('.live-card').dataset.r = r;
      const f = q('.feed'); f.insertAdjacentHTML('afterbegin', `<div class="fr ${r}"><span>${wk}</span><b>${r}</b> ${home ? '' : '@ '}${esc(opp.name)} <em>${myG}–${opG}</em></div>`); while (f.children.length > 6) f.lastChild.remove();
      if (typeof AdvAudio !== 'undefined' && speed > 100) AdvAudio.note(r === 'G' ? 784 : r === 'B' ? 523 : 330, .12, 'triangle', .04);
      table(); later(week, speed);
    }
    function finish() {
      const rank = table(), top = Object.entries(scorers).sort((a, b) => b[1] - a[1])[0];
      const best = ls.get('draft_best', 0); if (me.p > best) ls.set('draft_best', me.p);
      S.phase = 'tactics'; save();
      const perfect = me.w === 34;
      const msg = perfect ? '34-0! Efsane sezon!' : rank === 1 ? 'Şampiyon!' : rank <= 4 ? 'Avrupa’ya gidiyoruz.' : rank <= 10 ? 'Orta sıralar.' : 'Zor bir sezon.';
      q('.live').innerHTML = `<div class="result"><span class="eyebrow">Sezon sonu</span><div class="big-pts">${me.p}<small>/102</small></div><h2>${rank}. sıra · ${msg}</h2>
        <p>${me.w}G ${me.d}B ${me.l}M · Gol ${me.gf}:${me.ga}${top ? ` · Gol kralın: <b>${esc(top[0])}</b> (${top[1]})` : ''}</p>
        ${me.p > best ? '<span class="chip on">🏆 Yeni rekor</span>' : `<span class="chip">Rekor ${best}</span>`}
        <div class="dr-actions"><button class="pill ghost" data-a="again">Aynı kadroyla tekrar</button><button class="pill" data-a="new">Yeni draft</button></div></div>`;
      if (rank === 1 && typeof confetti === 'function') confetti();
      q('[data-a=again]').onclick = () => season();
      q('[data-a=new]').onclick = () => { S = fresh(S.mode); render(); };
    }
    later(week, 400);
    window.__draftSeason = { fast: () => { speed = 1; } };
  }

  return { open, stop, get state() { return S; }, _take: take, _spin: spin, _draw: () => drawClub() };
})();

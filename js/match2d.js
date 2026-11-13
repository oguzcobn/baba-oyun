/* =====================================================================
   BABA. Draft — 2D maç özeti motoru (FM2006 tarzı, kuşbakışı)
   Sadece önemli pozisyonlar: goller + büyük fırsatlar. Tüm maçı izleme yok.
   Match2D.show(opts, onDone)
     opts: { home:{name,short,c1,c2,kit,logo,style,xi:[{name,pos,r,traits?}], slots:[{x,y}]}, away:{…}, gh, ga,
             ev:[{t:'h'|'a',sc,as,min,how?,style?}], cards:[{t,name,min,red,dogso}], lh, la }
   Motor: bölgesel karar ağacı (getZone/decidePlayerAction), baskı algılama (isUnderPressure),
          top sürme hız cezası, destek koşuları, ip gibi savunma çizgisi + tek kişilik pres ve kademe,
          ver-kaç, ters top, bindirme + cutback/orta, ara pas, pivot istasyonu, içe kat edip plase,
          durum makinesi PLAYING / CORNER / FREEKICK / PENALTY / CARD_SHOWN, kart ve efektler
   ===================================================================== */
const Match2D = (() => {
  'use strict';
  const T = (tr, en) => (typeof I18N !== 'undefined' && I18N.lang === 'en') ? en : tr;
  const W = 105, H = 68, GY0 = 30.34, GY1 = 37.66;
  const STAND = 11; // metres of stadium surrounding the pitch
  const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)], lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const poisson = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const SCW = { FV: 3, KN: 2.2, OS: 1.2, ST: .3, BK: .35, KL: 0 }, ASW = { FV: 1.5, KN: 3.5, OS: 3, ST: .3, BK: 1.4, KL: 0 };
  const wpick = (arr, f) => { const w = arr.map(f), t = w.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[0]; };
  const surname = n => { const p = String(n).split(' '); return p.length > 1 && p[p.length - 1].length > 2 ? p.slice(1).join(' ') : n; };

  // renk çakışmasını önle
  function hex2rgb(h) { h = String(h || '#888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const cdist = (a, b) => { const x = hex2rgb(a), y = hex2rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const lum = c => { const [r, g, b] = hex2rgb(c); return (r * 299 + g * 587 + b * 114) / 1000; };

  /* =====================================================================
     KLİPLER — goller, büyük fırsatlar, kırmızı kartlar
     Her klibin bir "plan"ı vardır: hangi hücum seti (overlap, through, target, cutin, counter,
     corner, fk, pen, red) ile hangi oyuncunun hangi sonuca (goal/save/miss/post/block) ulaşacağı.
     ===================================================================== */
  const HOWSET = { pen: 'pen', fk: 'fk', corner: 'corner', header: 'cross', cross: 'cross', through: 'through', long: 'target', rebound: 'overlap', cutin: 'cutin', target: 'target', counter: 'counter', cutback: 'overlap', one: 'through' };
  function makeClips(o) {
    const clips = o.ev.map(e => ({ side: e.t, min: e.min, sc: e.sc, as: e.as, trail: e.trail, out: 'goal', how: e.how, style: e.style })), ch = [];
    (o.cards || []).filter(c => c.red).forEach(c => clips.push({ side: c.t === 'h' ? 'a' : 'h', min: c.min, kind: 'red', fouler: c.name, dogso: c.dogso !== false, out: pick(['save', 'miss', 'block']) }));
    ['h', 'a'].forEach(side => {
      const team = o[side === 'h' ? 'home' : 'away'], n = Math.min(3, poisson((side === 'h' ? o.lh : o.la) * 1.15 + .35));
      for (let i = 0; i < n; i++) {
        const sc = wpick(team.xi, p => SCW[p.pos] || .2), as = Math.random() < .8 ? wpick(team.xi.filter(p => p !== sc), p => ASW[p.pos] || .2) : null;
        ch.push({ side, min: 2 + rnd(88), sc: sc.name, as: as && as.name, out: pick(['save', 'save', 'miss', 'miss', 'post', 'block']) });
      }
    });
    ch.sort(() => Math.random() - .5).slice(0, Math.max(2, 10 - clips.length)).forEach(c => clips.push(c));
    clips.sort((a, b) => a.min - b.min);
    for (let i = 1; i < clips.length; i++) if (clips[i].min <= clips[i - 1].min) clips[i].min = Math.min(90, clips[i - 1].min + 1);
    return clips;
  }
  // Hücum planları (maç içi taktik): kısa pas, kanat ortası, ara pas, uzun top, kontra, dengeli
  const STYLES = () => ({ dengeli: T('Dengeli', 'Balanced'), kisa: T('Kısa pasla çık', 'Play out short'), kanat: T('Kanatlardan orta', 'Cross from wide'), arapas: T('Ara pas & derin koşu', 'Through balls'), uzun: T('Uzun top & pivot', 'Long ball to target'), kontra: T('Kontra atak', 'Counter-attack') });
  const BUILD = { kisa: [4, 6], dengeli: [2, 3], kanat: [2, 3], arapas: [2, 3], uzun: [0, 1], kontra: [0, 1] };

  /* --------- dizilişler --------- */
  // slot (x: 0-100 genişlik, y: 0 hücum – 100 kale) → sağa hücum eden takım için saha koordinatı
  const shape = s => ({ x: 3 + (100 - s.y) / 100 * 52, y: 4 + s.x / 100 * 60 });
  const zoneOf = x => x < 35 ? 1 : x < 70 ? 2 : 3; // getZone(): 1 savunma, 2 orta saha, 3 hücum (hücum yönü sağa)
  const RUN = 8.2, JOG = 6.4, DRIB = .78; // m/s; top sürerken hız %22 düşer (DRIB)
  const has = (p, t) => p && p.traits && p.traits.includes(t);
  const runSp = p => RUN * (has(p, 'SPEED_DRIBBLER') ? 1.18 : 1);
  const dribSp = p => RUN * DRIB * (has(p, 'SPEED_DRIBBLER') ? 1.3 : 1);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function show(o, onDone) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clips = makeClips(o);
    const matchStats = { h: { shots: 0, on: 0, xg: 0 }, a: { shots: 0, on: 0, xg: 0 } };
    const shotQuality = c => { const base = c.out === 'goal' ? .27 : c.out === 'save' ? .19 : c.out === 'post' ? .13 : c.out === 'block' ? .09 : .07; return Math.min(.65, base + (c.as ? .035 : 0)); };
    clips.forEach(c => { const st = matchStats[c.side]; st.shots++; if (c.out === 'goal' || c.out === 'save') st.on++; st.xg += shotQuality(c); });
    if (o.physics) { ['h', 'a'].forEach((side, i) => { matchStats[side] = { shots: o.physics.shots[i], on: o.physics.on[i], xg: o.physics.xg[i] }; }); }
    const pct = o.physics ? o.physics.possession[0] : clamp(Math.round(50 + ((o.lh || 1) - (o.la || 1)) * 7), 30, 70);
    let hc = o.home.c1 || '#c00', ac = o.away.c1 || '#036';
    if (cdist(hc, ac) < 120) ac = (o.away.c2 && cdist(hc, o.away.c2) > 120) ? o.away.c2 : (lum(hc) > 140 ? '#1d1d1d' : '#f4f4f4');
    const styleOf = side => (side === 'h' ? o.home.style : o.away.style) || 'dengeli';
    const ov = document.createElement('div'); ov.className = 'm2d-ov';
    ov.innerHTML = `<div class="m2d" role="dialog" aria-modal="true" aria-label="${T('Maç özeti', 'Match highlights')}">
      <header class="m2d-top"><span class="m2d-tm">${o.home.logo || `<i style="background:${hc}"></i>`}${esc(o.home.short || o.home.name)}</span><b class="m2d-sc">0 – 0</b><span class="m2d-tm r">${esc(o.away.short || o.away.name)}${o.away.logo || `<i style="background:${ac}"></i>`}</span><em class="m2d-min">0'</em></header>
      <div class="m2d-pitch"><canvas width="1050" height="680"></canvas><div class="m2d-flash" hidden></div><span class="m2d-state" hidden></span></div>
      <div class="m2d-analytics" aria-label="${T('Maç istatistikleri', 'Match statistics')}"><div class="m2d-analytics-row"><strong>${pct}%</strong><span>${T('Tahmini topa sahip olma', 'Estimated possession')}</span><strong>${100 - pct}%</strong></div><div class="m2d-possession"><i style="width:${pct}%"></i></div><div class="m2d-analytics-row"><strong>${matchStats.h.shots}</strong><span>${T('Şut', 'Shots')}</span><strong>${matchStats.a.shots}</strong></div><div class="m2d-analytics-row"><strong>${matchStats.h.on}</strong><span>${T('İsabetli şut', 'Shots on target')}</span><strong>${matchStats.a.on}</strong></div><div class="m2d-analytics-row"><strong>${matchStats.h.xg.toFixed(2)}</strong><span>${T('Pozisyon xG (tahmini)', 'Highlight xG (estimate)')}</span><strong>${matchStats.a.xg.toFixed(2)}</strong></div></div>
      <div class="m2d-com" aria-live="polite"><span class="m2d-cm">0'</span><p>${T('Maç başlıyor…', 'Kick-off…')}</p></div>
      <div class="m2d-bar"><span class="m2d-cnt">0/${clips.length}</span><button data-k="spd">⏩ 2x</button><button data-k="next">⏭ ${T('Sonraki pozisyon', 'Next highlight')}</button><button data-k="end" class="pr">${T('Özeti bitir', 'Skip to full time')}</button></div></div>`;
    document.body.appendChild(ov); document.body.classList.add('m2d-open');
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), q = s => ov.querySelector(s);
    const vert = innerWidth < 640 && innerHeight > innerWidth;
    if (vert) ov.querySelector('.m2d').classList.add('vert');
    const SC = 10, proj = (x, y) => vert ? [(H - y + STAND) * SC, (x + STAND) * SC] : [(x + STAND) * SC, (y + STAND) * SC];
    cv.width = (vert ? H : W) * SC + STAND * 2 * SC;
    cv.height = (vert ? W : H) * SC + STAND * 2 * SC;
    let speed = 1, score = [0, 0], ci = -1, raf = 0, closed = false;
    const com = (min, txt, cls) => { q('.m2d-cm').textContent = min + "'"; const p = q('.m2d-com p'); p.textContent = txt; p.className = cls || ''; };

    /* --------- oyuncu nesneleri (Player) ---------
       { name, pos, num, side, base, x, y, tx, ty, traits:[...], off:false, run:{x,y,sp}|null } */
    function num(pos, i) { return ({ KL: 1, BK: [2, 3][i % 2], ST: [4, 5][i % 2], OS: [6, 8, 10][i % 3], KN: [7, 11][i % 2], FV: 9 })[pos] || i + 1; }
    const mk = (team, side) => team.xi.map((p, i) => { const s = team.slots[i] || { x: 50, y: 50 }, b = shape(s); return { name: p.name, pos: p.pos, r: p.r || 75, num: num(p.pos, i), side, base: b, x: b.x, y: b.y, tx: b.x, ty: b.y, traits: p.traits || (typeof Traits !== 'undefined' ? Traits.of(p.name, p.pos, p.r || 75) : []), off: false, run: null }; });
    const P = { h: mk(o.home, 'h'), a: mk(o.away, 'a') };
    const ball = { x: W / 2, y: H / 2, z: 0, tx: W / 2, ty: H / 2, trail: [] };
    let dir = { h: 1, a: -1 }, att = 'h', holder = null, beats = [], beat = null, bt = 0, flash = '', plan = null, seg = 0, state = 'PLAYING', carryDist = 0;
    const fx = { bubbles: [], cards: [], shakeUntil: 0, aim: null };
    // Playwright testleri için isteğe bağlı tanılama (normal oyuncularda kapalı)
    const diagnostics = window.__BABA_MATCH_TEST__ === true ? { frames: [], goals: [], passes: [], runs: [], states: [], stadium: { margin: STAND, width: cv.width, height: cv.height }, done: false } : null;
    if (diagnostics) window.__BABA_MATCH_DIAGNOSTICS__ = diagnostics;
    let lastSample = 0;

    const toField = (side, pt) => dir[side] > 0 ? { x: pt.x, y: pt.y } : { x: W - pt.x, y: H - pt.y }; // kendi-hücum çerçevesi ↔ saha (kendinin tersi)
    const AF = p => toField(att, p); // saha → hücum çerçevesi (ve tersi)
    const def = () => att === 'h' ? 'a' : 'h';
    const live = side => P[side].filter(p => !p.off);
    const find = (side, name) => live(side).find(p => p.name === name) || null;
    const nearest = (side, pt, ex) => live(side).filter(p => p.pos !== 'KL' && !(ex || []).includes(p)).sort((a, b) => dist(a, pt) - dist(b, pt));
    const tn = p => surname(p.name);
    const bubble = (txt, at, col) => fx.bubbles.push({ txt, x: at.x, y: at.y, t: performance.now(), col: col || '#111' });
    const shake = ms => { fx.shakeUntil = performance.now() + (ms || 380); };
    const setState = s => { state = s; const el = q('.m2d-state'); el.hidden = s === 'PLAYING'; el.textContent = { CORNER: T('KORNER', 'CORNER'), FREEKICK: T('FRİKİK', 'FREE KICK'), PENALTY: T('PENALTI', 'PENALTY'), CARD_SHOWN: T('KART', 'CARD') }[s] || ''; if (diagnostics) diagnostics.states.push(s); };

    /* --------- baskı algılama: önündeki 45° koni içinde 5 m'den yakın rakip ya da 2,5 m içinde herhangi bir rakip --------- */
    function isUnderPressure(p) {
      const a = AF(p);
      return live(def()).some(d => { const b = AF(d), dx = b.x - a.x, dy = Math.abs(b.y - a.y), dd = Math.hypot(dx, dy); return dd < 2.5 || (dx > 0 && dy <= dx && dd < 5); });
    }
    // pas kanalı açık mı? rakip, pas çizgisine 1,6 m'den yakınsa kanal kapalıdır
    function laneOpen(a, b) {
      return !live(def()).some(d => { const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1, t = clamp(((d.x - a.x) * vx + (d.y - a.y) * vy) / L, 0, 1); return Math.hypot(a.x + vx * t - d.x, a.y + vy * t - d.y) < 1.6 && t > .1 && t < .95; });
    }

    /* --------- plan kurulumu --------- */
    function setFor(c, shooter) {
      if (c.kind === 'red') return 'red';
      if (c.how && HOWSET[c.how]) return HOWSET[c.how];
      const st = styleOf(c.side), pos = shooter ? shooter.pos : 'FV';
      const W8 = { overlap: 2, through: 2, target: 1.1, cutin: 1, cross: 1, counter: .5, corner: .55, fk: .35, pen: .2 };
      const mul = { kisa: { through: 1.4, overlap: 1.2 }, kanat: { overlap: 2.3, cross: 2.5, cutin: 1.3 }, arapas: { through: 2.6, counter: 1.3 }, uzun: { target: 2.6, cross: 1.6 }, kontra: { counter: 4, through: 1.3 } }[st] || {};
      const ok = { FV: ['through', 'cross', 'overlap', 'counter', 'pen', 'corner'], KN: ['cutin', 'through', 'overlap', 'counter', 'pen'], OS: ['target', 'overlap', 'through', 'fk', 'pen'], ST: ['corner', 'fk'], BK: ['corner', 'overlap', 'fk'], KL: ['pen'] }[pos] || ['through'];
      const list = ok.filter(s => s !== 'fk' || has(shooter, 'FREEKICK_MASTER') || pos === 'OS');
      return wpick(list, s => (W8[s] || .5) * (mul[s] || 1) * (s === 'cross' && has(shooter, 'AERIAL_THREAT') ? 2.4 : 1) * (s === 'cutin' && has(shooter, 'FINESSE_SHOT') ? 3 : 1) * (s === 'through' && has(shooter, 'SPEED_DRIBBLER') ? 1.6 : 1) * (s === 'target' && live(c.side).some(p => p.pos === 'FV' && has(p, 'AERIAL_THREAT')) ? 1.8 : 1));
    }
    function setupClip(c) {
      att = c.side; seg++; setState('PLAYING');
      const second = c.min > 45; dir = { h: second ? -1 : 1, a: second ? 1 : -1 };
      P.h.concat(P.a).forEach(p => { p.run = null; });
      let shooter = c.sc ? find(att, c.sc) : null;
      if (!shooter) shooter = wpick(live(att).filter(p => p.pos !== 'KL'), p => SCW[p.pos] || .2);
      const assister = c.as ? find(att, c.as) : null;
      plan = { c, set: setFor(c, shooter), shooter, assister, out: c.out, stage: 'build', dec: 0, style: styleOf(att) };
      if (c.kind === 'red') { plan.fouler = find(def(), c.fouler) || nearest(def(), AF({ x: 85, y: 34 }))[0]; plan.shooter = wpick(live(att).filter(p => p.pos === 'FV' || p.pos === 'KN'), p => has(p, 'SPEED_DRIBBLER') ? 3 : 1) || shooter; }
      const br = BUILD[plan.set === 'counter' ? 'kontra' : plan.style] || BUILD.dengeli; plan.maxBuild = br[0] + rnd(br[1] - br[0] + 1);
      // başlangıç: kısa pasla çıkışta kaleci/stoper, kontra ve kırmızı kart pozisyonunda geriden top kazanımı
      const startPool = plan.set === 'counter' ? live(att).filter(p => p.pos === 'ST' || p.pos === 'OS') : plan.style === 'kisa' ? live(att).filter(p => p.pos === 'KL' || p.pos === 'ST') : live(att).filter(p => p.pos === 'ST' || p.pos === 'BK' || p.pos === 'OS');
      const starter = pick(startPool.length ? startPool : live(att));
      const sa = { x: starter.base.x, y: starter.base.y }; // base zaten takımın kendi hücum çerçevesinde
      const startAt = { x: clamp(starter.pos === 'KL' ? 8 : plan.set === 'counter' ? 26 + rnd(10) : sa.x + 6, 6, 50), y: clamp(sa.y, 8, 60) };
      // herkes formasyonunda, top ilk oyuncuda
      ['h', 'a'].forEach(s => P[s].forEach(p => { if (p.off) return; const f = toField(s, shapeFor(p, s, startAt.x, startAt.y)); p.x = p.tx = f.x; p.y = p.ty = f.y; }));
      const f0 = toField(att, startAt); Object.assign(starter, { x: f0.x, y: f0.y, tx: f0.x, ty: f0.y });
      holder = starter; ball.x = f0.x + dir[att] * .9; ball.y = f0.y; ball.z = 0; ball.trail = []; carryDist = 0;
      beats = [{ k: 'hold', d: .8, txt: c.min + "' " + (plan.set === 'counter' ? T(`${tn(holder)} topu kaptı — kontra atak!`, `${tn(holder)} wins it back — counter-attack!`) : plan.style === 'kisa' ? T(`${tn(holder)} kısa pasla oyunu kuruyor`, `${tn(holder)} plays out from the back`) : T(`${tn(holder)} topla buluştu`, `${tn(holder)} picks up the ball`)) }];
      if (plan.set === 'counter') bubble(T('KONTRA!', 'COUNTER!'), f0, '#ff4d00');
      beat = null; bt = 0; flash = ''; q('.m2d-flash').hidden = true;
      q('.m2d-min').textContent = c.min + "'"; q('.m2d-cnt').textContent = (ci + 1) + '/' + clips.length;
    }

    /* --------- takım şekilleri: hücumda yayılma, savunmada ip gibi hareket eden çizgi --------- */
    function shapeFor(p, side, bx, by) {
      const s = p.base;
      if (side === att) { const push = clamp((bx - 30) * .6, 0, 34) * (p.pos === 'KL' ? .3 : 1); return { x: clamp(s.x + push, 2, 100), y: s.y }; }
      const own = W - bx, oy = H - by, line = clamp(own - 18, 6, 40); // savunma çizgisi: topun 18 m gerisi
      const off = { KL: 0, ST: 0, BK: 1, OS: p.base.x < 26 ? 9 : 16, KN: 24, FV: 33 }[p.pos] || 14, pull = { ST: .28, BK: .28, OS: .38, KN: .22, FV: .2 }[p.pos] || .25;
      if (p.pos === 'KL') return { x: s.x, y: s.y };
      return { x: clamp(line + off, 4, 70), y: clamp(lerp(lerp(s.y, 34, .25), oy, pull), 3, 65) };
    }
    // Pres ve kademe: yalnızca en yakın 1 savunmacı baskı yapar, ikinci adam kademede durur
    function defenseUpdate() {
      const d = def(), outfield = live(d).filter(p => p.pos !== 'KL'), ord = outfield.slice().sort((a, b) => dist(a, ball) - dist(b, ball));
      const presser = ord[0], cover = ord[1], goalSide = dir[att];
      if (presser && state === 'PLAYING') { presser.tx = ball.x + goalSide * 1.7; presser.ty = ball.y; presser.sp = 7.4; }
      if (cover && state === 'PLAYING') { cover.tx = lerp(ball.x + goalSide * 8, cover.tx, .4); cover.ty = lerp(ball.y, 34, .35); cover.sp = 6.8; }
      // bölge 3'te ve orta ihtimalinde stoperler ceza sahasındaki hücumculara yapışır
      const bA = AF(ball);
      if (bA.x > 76 && state === 'PLAYING') {
        const box = live(att).filter(p => { const a = AF(p); return a.x > 86 && a.y > 18 && a.y < 50; });
        live(d).filter(p => p.pos === 'ST' || p.pos === 'BK').forEach(m => { if (m === presser) return; const t = box.sort((a, b) => dist(a, m) - dist(b, m))[0]; if (t && dist(t, m) < 14) { m.tx = t.x + goalSide * 1.1; m.ty = t.y + (m.y < t.y ? -.6 : .6); m.sp = 7.2; } });
      }
      return { presser, cover };
    }
    // destek koşuları: top sahibine en yakın 2 takım arkadaşı boş alana açılır (üçgen)
    function supportRuns(ex) {
      if (!holder) return;
      const h = AF(holder), mates = live(att).filter(p => p !== holder && p.pos !== 'KL' && !(ex || []).includes(p) && !p.run).sort((a, b) => dist(a, holder) - dist(b, holder)).slice(0, 2);
      mates.forEach((m, i) => {
        const side = h.y < 34 ? 1 : -1, cand = [{ x: h.x + 9, y: h.y + side * 10 }, { x: h.x + 4, y: h.y - side * 12 }, { x: h.x - 6, y: h.y + side * 13 }, { x: h.x + 14, y: h.y }];
        const best = cand.map(c => ({ c: { x: clamp(c.x, 4, 100), y: clamp(c.y, 4, 64) } })).map(o => Object.assign(o, { s: Math.min(...live(def()).map(d => dist(AF(d), o.c))) })).sort((a, b) => b.s - a.s)[i] || { c: cand[0] };
        const f = toField(att, best.c); m.run = { x: f.x, y: f.y, sp: JOG + 1 };
      });
    }

    /* --------- karar mekanizması: decidePlayerAction() --------- */
    const passTo = (to, at, o2) => Object.assign({ k: 'pass', to, at }, o2 || {});
    const towards = (p, at, m) => { const a = AF(p), dx = at.x - a.x, dy = at.y - a.y, L = Math.hypot(dx, dy) || 1, k = Math.min(1, m / L); return { x: a.x + dx * k, y: a.y + dy * k }; };
    function decidePlayerAction() {
      plan.dec++;
      const a = AF(ball), z = zoneOf(a.x), mates = live(att).filter(p => p !== holder), pressed = isUnderPressure(holder);
      if (plan.stage === 'build' && (plan.dec > plan.maxBuild || z === 3)) plan.stage = 'final';
      if (plan.stage === 'final') return finalPhase();
      // 1. BÖLGE — geriden oyun kurma: topla depar yok, kısa pas / bek / stoper / kaleci
      if (z === 1) {
        const longOk = (plan.style === 'uzun' || has(holder, 'PLAYMAKER')) && !pressed;
        if (longOk) { const tgt = wpick(mates.filter(p => p.pos === 'FV' || p.pos === 'KN'), p => has(p, 'AERIAL_THREAT') ? 3 : 1); if (tgt) return [passTo(tgt, { x: clamp(AF(tgt).x + 6, 55, 84), y: AF(tgt).y }, { lob: true, txt: T(`${tn(holder)} uzun diyagonal topu gönderdi`, `${tn(holder)} sends a long diagonal`) })]; }
        if (pressed) { const back = mates.filter(p => (p.pos === 'KL' || p.pos === 'ST') && laneOpen(holder, p)).sort((x, y) => dist(x, holder) - dist(y, holder))[0]; if (back) return [passTo(back, AF(back), { txt: T(`${tn(holder)} baskı altında, geri döndü`, `${tn(holder)} under pressure, plays it back`) })]; }
        const opts = mates.filter(p => (p.pos === 'OS' || p.pos === 'BK' || p.pos === 'ST') && laneOpen(holder, p) && AF(p).x > a.x - 8);
        const t = wpick(opts.length ? opts : mates.filter(p => p.pos !== 'KL'), p => ({ OS: 3, BK: 2, ST: 1 })[p.pos] || .5);
        return [passTo(t, { x: clamp(AF(t).x + 3, 6, 60), y: AF(t).y }, { txt: T(`${tn(holder)} → ${tn(t)}`, `${tn(holder)} finds ${tn(t)}`) })];
      }
      // 2. BÖLGE — oyunun yönünü değiştirme, ver-kaç, ters top
      const crowd = live(def()).filter(d => dist(d, holder) < 9).length;
      const near = mates.filter(p => p.pos !== 'KL' && dist(p, holder) < 16 && laneOpen(holder, p)).sort((x, y) => dist(x, holder) - dist(y, holder))[0];
      if (crowd >= 2 && near && plan.dec < plan.maxBuild + 2) {
        // Ver-kaç (one-two): pas ver, hemen ileri koş, top boşlukta seni bulsun
        const runTo = { x: clamp(a.x + 13, 40, 88), y: clamp(a.y + (a.y < 34 ? 3 : -3), 6, 62) }, me = holder;
        return [passTo(near, AF(near), { txt: T(`${tn(holder)} ile ${tn(near)} arasında duvar pas…`, `${tn(holder)} plays a one-two with ${tn(near)}…`), runs: [{ p: me, at: runTo, sp: runSp(me) }] }), { k: 'call', fn: () => [passTo(me, runTo, { through: true, txt: T(`…ve top geri ${tn(me)}'de!`, `…and it comes back to ${tn(me)}!`) })] }];
      }
      const central = a.y > 22 && a.y < 46, centerClosed = live(def()).filter(d => { const b = AF(d); return b.x > a.x && b.x < a.x + 18 && b.y > 22 && b.y < 46; }).length >= 3;
      if (central && centerClosed) {
        const far = mates.filter(p => (p.pos === 'BK' || p.pos === 'KN') && Math.abs(AF(p).y - a.y) > 18).sort((x, y) => AF(y).x - AF(x).x)[0];
        if (far) return [passTo(far, { x: clamp(AF(far).x + 5, 45, 80), y: AF(far).y < 34 ? 7 : 61 }, { lob: true, txt: T(`Merkez kapalı: ${tn(holder)} oyunu ${tn(far)}'a çevirdi`, `Centre blocked: ${tn(holder)} switches play to ${tn(far)}`) })];
      }
      if (!pressed && carryDist < 8 && Math.random() < .35) return [{ k: 'carry', to: holder, at: towards(holder, { x: a.x + 8, y: a.y }, 7), txt: T(`${tn(holder)} topu taşıyor`, `${tn(holder)} drives forward`) }];
      const fwd = mates.filter(p => p.pos !== 'KL' && AF(p).x > a.x - 2 && laneOpen(holder, p));
      const t = wpick(fwd.length ? fwd : mates.filter(p => p.pos !== 'KL'), p => (AF(p).x - a.x + 12) * (p === plan.assister ? 1.6 : 1));
      return [passTo(t, { x: clamp(AF(t).x + 4, 30, 82), y: AF(t).y }, { txt: T(`${tn(holder)} → ${tn(t)}`, `${tn(holder)} finds ${tn(t)}`) })];
    }

    /* --------- 3. BÖLGE — hücum setleri (evaluateAttackOptions) --------- */
    function wideMan() { const pref = plan.assister && (plan.assister.pos === 'KN' || plan.assister.pos === 'BK') ? plan.assister : null; return pref || wpick(live(att).filter(p => p.pos === 'KN' && p !== plan.shooter), p => has(p, 'SPEED_DRIBBLER') ? 2 : 1) || live(att).find(p => p.pos === 'BK'); }
    function getTo(p, at, txt) {
      if (p !== holder) return [passTo(p, at, { txt })];
      if (dist(AF(holder), at) <= 14) return [];
      // top zaten bu oyuncudaysa ve hedef uzaksa: solo koşu yerine ver-kaç ile ilerle
      const mate = live(att).filter(m => m !== holder && m.pos !== 'KL' && laneOpen(holder, m)).sort((a, b) => dist(a, holder) - dist(b, holder))[0];
      if (!mate) return [];
      return [passTo(mate, AF(mate), { txt: T(`${tn(holder)} verdi ve koştu`, `${tn(holder)} gives and goes`), runs: [{ p: holder, at, sp: runSp(holder) }] }), { k: 'call', fn: () => [passTo(p, at, { follow: true, txt })] }];
    }
    function finalPhase() {
      const S = plan.shooter, set = plan.set, out = plan.out; plan.stage = 'done';
      const gy = out === 'miss' ? (Math.random() < .5 ? GY0 - 1.5 - Math.random() * 3 : GY1 + 1.5 + Math.random() * 3) : out === 'post' ? (Math.random() < .5 ? GY0 : GY1) : GY0 + .8 + Math.random() * 5.7;
      const shot = (o2) => Object.assign({ k: 'shot', out, gy, txt: T(`${tn(S)} vuruyor…`, `${tn(S)} shoots…`) }, o2 || {});
      const L = [];
      if (set === 'overlap' || set === 'cross') {
        const Wm = wideMan() || plan.assister || S, flank = AF(Wm).y < 34 ? 6 : 62, fb = live(att).find(p => p.pos === 'BK' && Math.abs(AF(p).y - flank) < 26 && p !== Wm);
        L.push(...getTo(Wm, { x: 76 + rnd(6), y: flank }, T(`Top kanatta ${tn(Wm)}'de`, `It's out wide to ${tn(Wm)}`)));
        const runs = [{ p: S, at: { x: 92 + rnd(3), y: set === 'cross' ? (flank < 34 ? 40 : 28) : 34 + (Math.random() - .5) * 6 }, sp: runSp(S) }];
        if (fb) runs.push({ p: fb, at: { x: 95, y: flank < 34 ? 3 : 65 }, sp: runSp(fb) });
        L.push({ k: 'hold', d: .45, runs, txt: fb ? T(`${tn(fb)} bindirmeye çıkıyor!`, `${tn(fb)} overlaps!`) : '' });
        let crosser = Wm;
        if (fb && !has(Wm, 'SPEED_DRIBBLER') && Math.random() < .6) { L.push(passTo(fb, { x: 95, y: flank < 34 ? 3 : 65 }, { through: true, txt: T(`${tn(Wm)} bindiren ${tn(fb)}'i gördü`, `${tn(Wm)} releases the overlapping ${tn(fb)}`) })); crosser = fb; }
        else L.push({ k: 'carry', to: Wm, at: { x: 96, y: flank < 34 ? 4 : 64 }, txt: T(`${tn(Wm)} çizgiye iniyor`, `${tn(Wm)} gets to the byline`) });
        if (set === 'cross' || has(S, 'AERIAL_THREAT')) { L.push({ k: 'call', fn: () => [passTo(S, null, { lob: true, cross: true, follow: true, txt: T(`${tn(crosser)} arka direğe ortaladı…`, `${tn(crosser)} crosses to the back post…`) }), shot({ header: true, txt: T(`${tn(S)} kafayı vurdu!`, `${tn(S)} rises for the header!`) })] }); }
        else L.push({ k: 'call', fn: () => [passTo(S, null, { follow: true, txt: T(`${tn(crosser)} geri çıkardı (cutback)!`, `${tn(crosser)} pulls it back!`) }), shot({ power: true })] });
        return L;
      }
      if (set === 'through' || set === 'counter') {
        const pm = (plan.assister && plan.assister.pos === 'OS' ? plan.assister : null) || live(att).filter(p => p.pos === 'OS' && p !== S).sort((a, b) => (has(b, 'PLAYMAKER') - has(a, 'PLAYMAKER')) || b.r - a.r)[0] || plan.assister;
        if (pm && pm !== S) L.push(...getTo(pm, { x: set === 'counter' ? 58 : 66 + rnd(6), y: 30 + rnd(10) }, T(`${tn(pm)} topu ayağına aldı, kafasını kaldırdı`, `${tn(pm)} takes it, head up`)));
        const lineX = (() => { const ds = live(def()).filter(p => p.pos === 'ST' || p.pos === 'BK').map(p => AF(p).x); return ds.length ? Math.max(...ds) : 88; })();
        const spot = { x: clamp(Math.max(lineX + 6, 86), 84, 93), y: 30 + rnd(8) };
        L.push({ k: 'hold', d: .35, runs: [{ p: S, at: towards(S, spot, 4), sp: runSp(S) }], txt: T(`${tn(S)} stoperlerin arasına çapraz koşuya başladı`, `${tn(S)} darts between the centre-backs`) });
        L.push({ k: 'call', fn: () => { if (has(pm, 'PLAYMAKER')) bubble(T(`${tn(pm)}'ten kilit pas!`, `Killer ball from ${tn(pm)}!`), holder, '#0b3d91'); return [passTo(S, spot, { through: true, txt: T(`Savunma arkasına ara pas — ${tn(S)} kaleciyle karşı karşıya!`, `Through ball — ${tn(S)} is one-on-one!`) }), shot({ oneOnOne: true })]; } });
        return L;
      }
      if (set === 'target') {
        const tg = live(att).filter(p => p.pos === 'FV' && p !== S).sort((a, b) => has(b, 'AERIAL_THREAT') - has(a, 'AERIAL_THREAT'))[0] || plan.assister || live(att).find(p => p.pos === 'KN' && p !== S);
        if (tg && tg !== S) {
          const tAt = { x: 80 + rnd(4), y: 30 + rnd(8) };
          L.push(...getTo(tg, tAt, T(`Uzun top pivot ${tn(tg)}'e`, `Long ball up to ${tn(tg)}`)).map(b => Object.assign(b, { lob: plan.style === 'uzun' || dist(AF(holder), tAt) > 28 })));
          L.push({ k: 'hold', d: .9, hold: true, runs: [{ p: S, at: { x: 76 + rnd(3), y: tAt.y + (Math.random() < .5 ? -7 : 7) }, sp: runSp(S) }], txt: T(`${tn(tg)} stoperi sırtına aldı, topu saklıyor`, `${tn(tg)} holds it up with his back to goal`) });
          L.push({ k: 'call', fn: () => [passTo(S, null, { follow: true, txt: T(`${tn(tg)} tek pasla ${tn(S)}'e indirdi`, `${tn(tg)} lays it off to ${tn(S)}`) }), shot({ power: true })] });
          return L;
        }
      }
      if (set === 'cutin' || set === 'target') {
        const flank = AF(S).y < 34 ? 8 : 60;
        L.push(...getTo(S, { x: 78 + rnd(5), y: flank }, T(`${tn(S)} sağ çaprazda topla buluştu`, `${tn(S)} picks it up out wide`)));
        L.push({ k: 'carry', to: S, at: { x: 85, y: flank < 34 ? 24 : 44 }, txt: T(`${tn(S)} içeri kat ediyor…`, `${tn(S)} cuts inside…`) });
        L.push(shot({ curve: true, far: true, txt: T(`${tn(S)} uzak köşeye plase!`, `${tn(S)} curls it towards the far corner!`) }));
        return L;
      }
      if (set === 'corner') {
        const sh = wpick(live(att).filter(p => p.pos === 'FV' || p.pos === 'KN' || p.pos === 'OS'), p => SCW[p.pos] || 1);
        L.push(...getTo(sh, { x: 84, y: 30 + rnd(8) }, T(`${tn(sh)} ceza sahası önünde`, `${tn(sh)} on the edge of the box`)));
        L.push({ k: 'shot', out: 'corner', gy: Math.random() < .5 ? GY0 + 1 : GY1 - 1, txt: T(`${tn(sh)}'in şutu savunmadan sekti…`, `${tn(sh)}'s shot is deflected…`) });
        return L;
      }
      if (set === 'fk' || set === 'pen' || set === 'red') {
        const victim = set === 'red' ? S : (live(att).filter(p => p.pos === 'KN' || p.pos === 'FV' || p.pos === 'OS').sort((a, b) => has(b, 'SPEED_DRIBBLER') - has(a, 'SPEED_DRIBBLER'))[0] || S);
        const inBox = set === 'pen' || (set === 'red' && Math.random() < .35);
        const at = inBox ? { x: 91 + rnd(3), y: 28 + rnd(12) } : { x: 79 + rnd(4), y: 24 + rnd(20) };
        if (set === 'red') { const pm = live(att).find(p => p.pos === 'OS'); if (pm) L.push(...getTo(pm, { x: 62, y: 34 })); L.push(passTo(victim, towards(victim, at, 30), { through: true, txt: T(`${tn(victim)} savunma arkasına sarktı, kaleye gidiyor!`, `${tn(victim)} breaks clear and heads for goal!`) })); }
        else { L.push(...getTo(victim, { x: at.x - 9, y: at.y }, T(`${tn(victim)} topla ceza sahasına yaklaşıyor`, `${tn(victim)} approaches the box`))); L.push({ k: 'carry', to: victim, at, txt: T(`${tn(victim)} çalıma gidiyor…`, `${tn(victim)} takes on his man…`) }); }
        L.push({ k: 'foul', victim, fouler: plan.fouler || null, card: set === 'red' ? 'R' : (Math.random() < .55 ? 'Y' : null), dogso: set === 'red' && plan.c.dogso, next: inBox ? 'PENALTY' : 'FREEKICK' });
        return L;
      }
      // yedek: düz bitiriş
      L.push(...getTo(S, { x: 86, y: 34 }));
      L.push(shot());
      return L;
    }

    /* --------- duran toplar: CORNER / FREEKICK / PENALTY ve kart gösterimi --------- */
    function place(p, at) { if (!p || p.off) return; const f = toField(p.side, p.side === att ? at : at); Object.assign(p, { x: f.x, y: f.y, tx: f.x, ty: f.y, run: null }); }
    const placeAF = (p, at) => { const f = AF(at); Object.assign(p, { x: f.x, y: f.y, tx: f.x, ty: f.y, run: null }); }; // hücum çerçevesinde konumla (her iki takım için)
    function setPiece(kind, spotAF, nextOut) {
      seg++; setState(kind); holder = null; ball.trail = [];
      const A = live(att), D = live(def()), kp = D.find(p => p.pos === 'KL'), S = plan.shooter;
      const taker = kind === 'PENALTY' ? (A.find(p => has(p, 'FREEKICK_MASTER') && plan.c.out === 'goal' && !plan.c.sc) || S) : (A.filter(p => has(p, 'FREEKICK_MASTER'))[0] || (kind === 'CORNER' ? A.find(p => p.pos === 'KN') : null) || A.filter(p => p.pos === 'OS').sort((a, b) => b.r - a.r)[0] || S);
      if (kind === 'FREEKICK' && plan.c.out === 'goal' && plan.c.sc) plan.shooter = taker === S ? S : (has(taker, 'FREEKICK_MASTER') ? S : S);
      if (kp) placeAF(kp, { x: 104.3, y: 34 });
      if (kind === 'CORNER') {
        const fy = Math.random() < .5 ? .6 : 67.4; placeAF(taker, { x: 104.6, y: fy < 34 ? -.6 : 68.6 }); ball.x = AF({ x: 104.6, y: fy }).x; ball.y = AF({ x: 104.6, y: fy }).y;
        const tall = A.filter(p => p !== taker && p.pos !== 'KL').sort((a, b) => (has(b, 'AERIAL_THREAT') - has(a, 'AERIAL_THREAT')) || ({ ST: 3, FV: 2, OS: 1 }[b.pos] || 0) - ({ ST: 3, FV: 2, OS: 1 }[a.pos] || 0));
        const spots = [{ x: 96, y: 30 }, { x: 97.5, y: 37 }, { x: 94, y: 34 }, { x: 99, y: 33 }, { x: 93, y: 40 }, { x: 88, y: 26 }, { x: 87, y: 42 }, { x: 84, y: 34 }];
        tall.forEach((p, i) => placeAF(p, i < spots.length ? spots[i] : { x: 55 + i * 2, y: 20 + (i % 3) * 14 }));
        D.filter(p => p !== kp).forEach((d, i) => { const m = tall[i]; placeAF(d, m && i < 6 ? { x: Math.min(103, AF(m).x + 1.2), y: AF(m).y + .7 } : { x: 100 - (i - 6) * 9, y: i % 2 ? 26 : 42 }); });
        const hd = tall.find(p => p === S) || tall[0]; plan.shooter = hd; plan.cornerTaker = taker;
        beats = [{ k: 'hold', d: 1.3, txt: T(`Korner! ${tn(taker)} topun başında, uzun boylular ceza sahasında`, `Corner! ${tn(taker)} stands over it, the big men go up`) },
          { k: 'aim', d: .7, at: AF(hd) },
          passTo(hd, AF(hd), { lob: true, cross: true, curve: true, follow: true, txt: T(`${tn(taker)} ortayı açtı…`, `${tn(taker)} whips it in…`) }),
          { k: 'shot', out: nextOut, header: true, gy: nextOut === 'miss' ? GY1 + 2 : nextOut === 'post' ? GY0 : GY0 + 1 + Math.random() * 5, txt: T(`${tn(hd)} kafayı vurdu!`, `${tn(hd)} heads it!`) }];
        holder = null; ball.z = 0; return;
      }
      const sp = spotAF;
      if (kind === 'PENALTY') {
        placeAF(taker, { x: 91.5, y: 34 }); plan.shooter = taker;
        A.concat(D).filter(p => p !== taker && p !== kp).forEach((p, i) => placeAF(p, i < 16 ? { x: 86 - (i % 2) * 3, y: 15 + i * 2.5 } : { x: 70 - (i - 16) * 6, y: 20 + (i % 2) * 24 }));
        const f = AF({ x: 94, y: 34 }); ball.x = f.x; ball.y = f.y; ball.z = 0;
        const gy = nextOut === 'miss' ? (Math.random() < .5 ? GY0 - 1.2 : GY1 + 1.2) : nextOut === 'post' ? GY1 : (Math.random() < .5 ? GY0 + 1 : GY1 - 1);
        beats = [{ k: 'hold', d: 1.5, txt: T(`PENALTI! ${tn(taker)} topu noktaya koydu`, `PENALTY! ${tn(taker)} places the ball on the spot`) }, { k: 'aim', d: .8, at: { x: 105, y: gy } }, { k: 'shot', out: nextOut, gy, pen: true, txt: T(`${tn(taker)} vurdu…`, `${tn(taker)} strikes…`) }];
        return;
      }
      // FREEKICK: baraj 9,15 m, frikik ustası kavisli şut
      placeAF(taker, { x: sp.x - 2, y: sp.y + (sp.y < 34 ? -1 : 1) }); plan.shooter = (plan.c.out === 'goal' && plan.c.sc) ? S : taker; if (plan.shooter !== taker) placeAF(plan.shooter, { x: sp.x - 1.5, y: sp.y + (sp.y < 34 ? 1.5 : -1.5) });
      const f = AF(sp); ball.x = f.x; ball.y = f.y; ball.z = 0;
      const gx = 105, gyC = 34, vx = gx - sp.x, vy = gyC - sp.y, L = Math.hypot(vx, vy) || 1, wx = sp.x + vx / L * 9.15, wy = sp.y + vy / L * 9.15;
      const wallers = D.filter(p => p !== kp).sort((a, b) => ({ ST: 0, OS: 1, FV: 2, KN: 2, BK: 1 }[a.pos] - { ST: 0, OS: 1, FV: 2, KN: 2, BK: 1 }[b.pos])).slice(0, 4);
      wallers.forEach((p, i) => placeAF(p, { x: wx, y: wy + (i - 1.5) * 1.4 }));
      const others = D.filter(p => p !== kp && !wallers.includes(p)), box = A.filter(p => p !== taker && p !== plan.shooter && p.pos !== 'KL');
      box.forEach((p, i) => placeAF(p, i < 5 ? { x: 92 + (i % 2) * 2, y: 26 + i * 4 } : { x: 60 - i * 3, y: 20 + (i % 3) * 14 }));
      others.forEach((d, i) => placeAF(d, i < 5 && box[i] ? { x: AF(box[i]).x + 1.2, y: AF(box[i]).y + .6 } : { x: 70 - i * 4, y: 24 + (i % 3) * 10 }));
      plan.wall = wallers;
      const gy = nextOut === 'miss' ? GY1 + 1.8 : nextOut === 'post' ? GY0 : (sp.y < 34 ? GY1 - 1 : GY0 + 1);
      beats = [{ k: 'hold', d: 1.4, txt: T(`Frikik! Baraj kuruldu, ${tn(plan.shooter)} topun başında`, `Free kick! The wall is set, ${tn(plan.shooter)} over the ball`) }, { k: 'aim', d: .9, at: { x: 105, y: gy } }, { k: 'shot', out: nextOut, gy, curve: true, fk: true, txt: T(`${tn(plan.shooter)} kavisli vurdu!`, `${tn(plan.shooter)} bends it!`) }];
    }

    /* --------- beat başlatma --------- */
    function applyRuns(runs) { (runs || []).forEach(r => { if (!r.p || r.p.off) return; const f = AF(r.at); r.p.run = { x: f.x, y: f.y, sp: Math.min(r.sp || RUN, 10) }; if (diagnostics) diagnostics.runs.push({ name: r.p.name, sp: r.sp }); }); }
    function startBeat() {
      beat = beats.shift(); bt = 0;
      if (!beat) { if (plan && plan.stage !== 'over') { beats = decidePlayerAction() || []; if (!beats.length) return nextClip(); return startBeat(); } return nextClip(); }
      if (beat.k === 'call') { const more = beat.fn() || []; beats = more.concat(beats); return startBeat(); }
      if (beat.txt) com(clips[ci].min, beat.txt);
      applyRuns(beat.runs);
      if (beat.k === 'hold' && holder) supportRuns();
      if (beat.k === 'pass') {
        const r = beat.to; if (!r || r.off) { beat.k = 'hold'; beat.d = .3; return; }
        let S = beat.at ? AF(beat.at) : { x: r.x, y: r.y };
        if (beat.follow) S = { x: r.run ? r.run.x : r.x, y: r.run ? r.run.y : r.y }; // koşu yapan oyuncunun varacağı nokta
        if (beat.cross) S = { x: S.x, y: S.y };
        beat.rFrom = { x: r.x, y: r.y };
        const v = beat.lob ? 17 : beat.through ? 18 : 16, sp = runSp(r);
        let d, end;
        if (beat.through || beat.follow) { d = Math.max(dist(r, S) / sp, dist(ball, S) / 24, .5); end = S; }
        else { d = clamp(dist(ball, S) / v, .45, 1.6); for (let it = 0; it < 2; it++) { const L = dist(r, S) || 1, m = Math.min(L, sp * d); end = { x: r.x + (S.x - r.x) / L * m, y: r.y + (S.y - r.y) / L * m }; d = clamp(dist(ball, end) / v, .45, 1.7); } }
        beat.d = Math.min(d, 3.2); beat.rTo = end; beat.from = { x: ball.x, y: ball.y }; beat.dest = { x: end.x + dir[att] * (beat.cross ? .2 : .9), y: end.y };
        if (beat.curve) { const mx = (beat.from.x + beat.dest.x) / 2, my = (beat.from.y + beat.dest.y) / 2; beat.ctrl = { x: mx - dir[att] * 3, y: my + (beat.dest.y > beat.from.y ? -6 : 6) }; }
        r.run = null; r.tx = end.x; r.ty = end.y; holder = null; carryDist = 0;
        if (diagnostics) diagnostics.passes.push({ duration: beat.d, distance: dist(beat.from, beat.dest), start: performance.now(), end: null, type: beat.through ? 'through' : beat.lob ? 'lob' : 'ground' });
      }
      if (beat.k === 'carry') {
        const r = beat.to, f = AF(beat.at), L = dist(r, f), m = Math.min(L, 12); // kesintisiz top sürme en çok 12 m (solo koşu yok)
        const end = { x: r.x + (f.x - r.x) / (L || 1) * m, y: r.y + (f.y - r.y) / (L || 1) * m };
        // önünde rakip varsa (baskı) hız kesilir ve sürme kısalır
        const k = isUnderPressure(r) ? .45 : 1;
        beat.rFrom = { x: r.x, y: r.y }; beat.rTo = { x: lerp(r.x, end.x, k), y: lerp(r.y, end.y, k) }; beat.d = Math.max(.6, dist(r, beat.rTo) / dribSp(r)); holder = r; r.run = null;
        carryDist += dist(r, beat.rTo);
      }
      if (beat.k === 'aim') { fx.aim = { from: { x: ball.x, y: ball.y }, to: AF(beat.at) }; }
      if (beat.k === 'shot') startShot(beat);
      if (beat.k === 'foul') {
        const v = beat.victim, d = beat.fouler && !beat.fouler.off ? beat.fouler : wpick(nearest(def(), v).slice(0, 2), p => has(p, 'AGGRESSIVE_TACKLER') ? 3 : 1);
        beat.fouler = d; beat.d = 1.1; holder = null;
        if (d) { d.run = null; d.tx = v.x - dir[att] * .2; d.ty = v.y + .9; }
        com(clips[ci].min, beat.card === 'R' ? T(`${tn(d)} arkadan sert kaydı — düdük!`, `${tn(d)} slides in from behind — whistle!`) : T(`${tn(d)} müdahale etti, ${tn(v)} yerde — faul!`, `${tn(d)} goes in, ${tn(v)} is down — foul!`), 'miss');
        bubble(T('FAUL!', 'FOUL!'), v, '#111');
        if (typeof AdvAudio !== 'undefined') AdvAudio.note(2100, .35, 'square', .02);
      }
      if (beat.k === 'card') {
        setState('CARD_SHOWN'); const p = beat.p; fx.cards.push({ p, red: beat.red, t: performance.now() });
        bubble(beat.red ? (beat.dogso ? T('KIRMIZI KART! Son adam indirildi!', 'RED CARD! Last man brought down!') : T('KIRMIZI KART!', 'RED CARD!')) : T(`SARI KART — ${tn(p)}`, `YELLOW — ${tn(p)}`), p, beat.red ? '#c8102e' : '#c99a00');
        com(clips[ci].min, beat.red ? T(`🟥 ${p.name} kırmızı kartla oyun dışı! ${p.side === 'h' ? o.home.name : o.away.name} 10 kişi.`, `🟥 ${p.name} is sent off! ${p.side === 'h' ? o.home.name : o.away.name} are down to ten.`) : T(`🟨 ${p.name} sarı kart gördü.`, `🟨 ${p.name} is booked.`), beat.red ? 'red' : '');
        if (beat.red) shake(300);
      }
      if (beat.k === 'result') showResult(beat);
    }
    function startShot(b) {
      const S = plan.shooter, kp = live(def()).find(p => p.pos === 'KL'), out = b.out;
      const gx = dir[att] > 0 ? (out === 'goal' ? W + 1.2 : out === 'miss' ? W + .5 : W - .4) : (out === 'goal' ? -1.2 : out === 'miss' ? -.5 : .4);
      let gy = dir[att] > 0 ? b.gy : H - b.gy;
      if (b.far && holder) { const fy = AF(ball).y < 34 ? GY1 - .7 : GY0 + .7; if (out === 'goal' || out === 'save') gy = dir[att] > 0 ? fy : H - fy; }
      b.from = { x: ball.x, y: ball.y }; b.dest = { x: gx, y: gy }; holder = null;
      const L = dist(b.from, b.dest); b.d = clamp(L / (b.header ? 15 : b.pen ? 26 : b.power ? 28 : 24), .35, 1.4);
      if (b.curve) { const mx = (b.from.x + b.dest.x) / 2, my = (b.from.y + b.dest.y) / 2, side = (AF(ball).y < 34 ? 1 : -1) * dir[att]; b.ctrl = { x: mx, y: my - side * Math.min(7, L * .22) }; }
      if (out === 'save' && kp) { const t = b.oneOnOne && has(kp, 'WALL_GK') ? .7 : .9; b.dest = b.ctrl ? bez(b.from, b.ctrl, { x: gx, y: gy }, .93) : { x: lerp(b.from.x, gx, t), y: lerp(b.from.y, gy, t) }; kp.run = null; kp.tx = b.dest.x; kp.ty = b.dest.y; kp.sp = 9.5; }
      if (out === 'goal' && kp) { kp.run = null; kp.tx = kp.x; kp.ty = clamp(kp.y + (gy > kp.y ? -2.5 : 2.5), GY0 - 1, GY1 + 1); kp.sp = 8; } // ters köşeye uçar
      if (out === 'block' || out === 'corner') {
        const blk = (plan.wall && plan.wall[0]) || nearest(def(), ball)[0];
        if (out === 'block') { b.dest = { x: lerp(b.from.x, gx, .22), y: lerp(b.from.y, gy, .22) }; b.ctrl = null; if (blk && !plan.wall) { blk.run = null; blk.tx = b.dest.x; blk.ty = b.dest.y; } }
        else { b.dest = { x: dir[att] > 0 ? W + 1 : -1, y: gy < 34 ? GY0 - 6 : GY1 + 6 }; b.ctrl = { x: lerp(b.from.x, b.dest.x, .5), y: lerp(b.from.y, gy, .5) }; }
      }
      if (b.oneOnOne && kp && has(kp, 'WALL_GK')) { const towardsBall = { x: lerp(kp.x, ball.x, .3), y: lerp(kp.y, ball.y, .3) }; kp.tx = towardsBall.x; kp.ty = towardsBall.y; }
      if (b.header || b.power || out === 'post') shake(b.header ? 340 : 240);
      if (b.curve || b.fk) ball.trail = [{ x: ball.x, y: ball.y }];
      fx.aim = null;
    }
    const bez = (a, c, b, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });

    function showResult(b) {
      const c = plan.c, S = plan.shooter, out = b.out;
      if (out === 'goal') {
        if (diagnostics) diagnostics.goals.push({ side: att, x: ball.x, y: ball.y, goalLine: dir[att] > 0 ? W : 0, valid: dir[att] > 0 ? ball.x >= W : ball.x <= 0 });
        c.counted = true; if (att === 'h') score[0]++; else score[1]++; q('.m2d-sc').textContent = score[0] + ' – ' + score[1]; flash = 'GOL!'; startCheer(att);
        showFlash(T('GOOOL!', 'GOAL!'), tn(S), att === 'h' ? hc : ac); shake(450);
        const flair = b.header && has(S, 'AERIAL_THREAT') ? T(`${tn(S)} kule gibi yükseldi!`, `${tn(S)} towers above everyone!`) : b.curve && has(S, 'FINESSE_SHOT') ? T(`${tn(S)}'tan falsolu plase!`, `A curler from ${tn(S)}!`) : b.fk ? T('Barajın üstünden ağlara!', 'Over the wall and in!') : b.pen ? T('Penaltıyı gole çevirdi!', 'Penalty converted!') : null;
        if (flair) bubble(flair, S, att === 'h' ? hc : ac);
        com(c.min, T(`GOOOL! ${S.name}${c.as ? ' (asist: ' + c.as + ')' : ''}! Skor ${score[0]}–${score[1]}`, `GOAL! ${S.name}${c.as ? ' (assist: ' + c.as + ')' : ''}! It’s ${score[0]}–${score[1]}`), 'goal');
        if (typeof AdvAudio !== 'undefined') { AdvAudio.note(784, .15, 'triangle', .05); setTimeout(() => AdvAudio.note(1046, .25, 'triangle', .05), 140); }
        S.run = { x: dir[att] > 0 ? 97 : 8, y: Math.random() < .5 ? 5 : 63, sp: 7 }; live(att).forEach(p => { if (p !== S && p.pos !== 'KL') p.run = { x: lerp(p.x, S.run.x, .55), y: lerp(p.y, S.run.y, .55), sp: 6 }; });
      } else {
        com(c.min, { save: has(live(def()).find(p => p.pos === 'KL'), 'WALL_GK') ? T('Panter gibi uzandı! Kaleci gole izin vermiyor.', 'What a reflex save — like a panther!') : T('Kaleci müthiş bir kurtarışla gole izin vermiyor!', 'What a save from the goalkeeper!'), miss: T(`${tn(S)} topu az farkla auta gönderdi.`, `${tn(S)} drags it just wide.`), post: T(`Direkten döndü! ${tn(S)} inanamıyor.`, `Off the post! ${tn(S)} can’t believe it.`), block: plan.wall ? T('Top baraja çarptı.', 'It hits the wall.') : T('Son anda araya giren savunma topu blokladı.', 'Blocked at the last moment.') }[out] || '', 'miss');
        if (out === 'post') bubble(T('DİREK!', 'POST!'), ball, '#111');
        if (out === 'post') { ball.tx = ball.x - dir[att] * 8; ball.ty = ball.y + (Math.random() - .5) * 14; }
        if (out === 'save') { ball.tx = ball.x - dir[att] * 6; ball.ty = clamp(ball.y + (Math.random() < .5 ? -10 : 10), 2, 66); }
      }
    }
    function showFlash(big, small, col) { const f = q('.m2d-flash'); f.innerHTML = `<b style="--c:${col}">${esc(big)}</b><span>${esc(small)}</span>`; f.hidden = false; }
    function endBeat(b) {
      if (b.k === 'pass' || b.k === 'carry') { holder = b.to; if (diagnostics && b.k === 'pass') { const last = diagnostics.passes[diagnostics.passes.length - 1]; if (last) last.end = performance.now(); } }
      if (b.k === 'foul') { const red = b.card === 'R'; if (b.card) beats.unshift({ k: 'card', p: b.fouler, red, dogso: b.dogso, d: 1.5 }); beats.splice(b.card ? 1 : 0, 0, { k: 'call', fn: () => { if (red && b.fouler) b.fouler.off = true; const v = AF(b.victim); setPiece(b.next, { x: clamp(v.x, 70, 92), y: clamp(v.y, 10, 58) }, plan.out); plan.stage = 'over'; return []; } }); }
      if (b.k === 'shot') { if (b.out === 'corner') { beats = [{ k: 'hold', d: .6, txt: T('Kornere çıktı.', 'Out for a corner.') }, { k: 'call', fn: () => { setPiece('CORNER', null, plan.out); plan.stage = 'over'; return []; } }]; } else beats = [{ k: 'result', d: b.out === 'goal' ? 2.4 : 1.6, out: b.out, header: b.header, curve: b.curve, fk: b.fk, pen: b.pen }]; plan.stage = 'over'; }
      if (b.k === 'card') setState(plan.set === 'pen' ? 'PENALTY' : state);
      if (b.k === 'aim') fx.aim = null;
      if (b.k === 'result') { plan.stage = 'over'; beats = []; }
    }
    function nextClip() { ci++; if (ci >= clips.length) return fullTime(); setupClip(clips[ci]); startBeat(); }
    function fullTime() {
      cancelAnimationFrame(raf); score = [o.gh, o.ga]; q('.m2d-sc').textContent = o.gh + ' – ' + o.ga; q('.m2d-min').textContent = T('MS', 'FT'); setState('PLAYING');
      com(90, T(`Maç sona erdi: ${o.home.name} ${o.gh} – ${o.ga} ${o.away.name}`, `Full time: ${o.home.name} ${o.gh} – ${o.ga} ${o.away.name}`), 'end');
      if (diagnostics) diagnostics.done = true; ov.querySelector('.m2d').classList.add('ft');
      draw(); const b = q('[data-k=next]'); b.textContent = T('Devam ▶', 'Continue ▶'); b.classList.add('pr'); q('[data-k=end]').hidden = true; q('[data-k=spd]').hidden = true;
      b.onclick = close; b.focus();
    }
    function close() { if (closed) return; closed = true; cancelAnimationFrame(raf); ov.remove(); document.body.classList.remove('m2d-open'); document.removeEventListener('keydown', onKey); onDone && onDone(); }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); ci = clips.length; fullTime(); } }
    document.addEventListener('keydown', onKey);

    /* --------- ana döngü: updateMatch() + ballPhysics() --------- */
    let last = 0;
    function ballPhysics(dt) {
      if (!beat) return;
      const k = clamp(bt / beat.d, 0, 1);
      if (beat.k === 'pass') {
        const r = beat.to; r.x = r.tx = lerp(beat.rFrom.x, beat.rTo.x, k); r.y = r.ty = lerp(beat.rFrom.y, beat.rTo.y, k);
        // çim sürtünmesi: yerden pas yavaşlayarak gider; havadan top parabol çizer
        const e = beat.lob ? k : 1 - Math.pow(1 - k, 1.7), p = beat.ctrl ? bez(beat.from, beat.ctrl, beat.dest, e) : { x: lerp(beat.from.x, beat.dest.x, e), y: lerp(beat.from.y, beat.dest.y, e) };
        ball.x = p.x; ball.y = p.y; ball.z = beat.lob ? Math.sin(k * Math.PI) * (beat.cross ? 4.5 : 5.5) : 0;
      } else if (beat.k === 'carry') {
        const r = beat.to; r.x = r.tx = lerp(beat.rFrom.x, beat.rTo.x, k); r.y = r.ty = lerp(beat.rFrom.y, beat.rTo.y, k); ball.x = r.x + dir[att] * .9; ball.y = r.y; ball.z = 0;
      } else if (beat.k === 'shot') {
        const e = 1 - Math.pow(1 - k, 1.25), p = beat.ctrl ? bez(beat.from, beat.ctrl, beat.dest, e) : { x: lerp(beat.from.x, beat.dest.x, e), y: lerp(beat.from.y, beat.dest.y, e) };
        ball.x = p.x; ball.y = p.y; ball.z = beat.header ? 1.6 * (1 - k) + .3 : beat.fk ? Math.sin(k * Math.PI) * 2.4 : Math.sin(k * Math.PI) * 1.1;
        if (ball.trail.length) { ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 40) ball.trail.shift(); }
      } else if (beat.k === 'result') { if (beat.out === 'post' || beat.out === 'save') { ball.x = lerp(ball.x, ball.tx, dt * 3); ball.y = lerp(ball.y, ball.ty, dt * 3); } ball.z = Math.max(0, ball.z - dt * 3); }
      else if (beat.k === 'foul' || beat.k === 'card') ball.z = 0;
    }
    function updateMatch(ts, dt) {
      if (beat) { bt += dt; ballPhysics(dt); if (bt >= beat.d) { const b = beat; endBeat(b); startBeat(); } }
      // top ayakta: hafifçe ilerle (sürme hızı topsuzdan yavaş), top oyuncunun önünde
      if (holder && beat && beat.k === 'hold' && state === 'PLAYING' && !beat.hold) { const a = AF(holder); if (!isUnderPressure(holder) && a.x < 96) { const f = AF({ x: a.x + dt * dribSp(holder) * .35, y: a.y }); holder.x = holder.tx = f.x; holder.y = holder.ty = f.y; } ball.x = holder.x + dir[att] * .9; ball.y = holder.y; }
      if (!beat) return;
      if (state !== 'PLAYING' && state !== 'CARD_SHOWN') { movePlayers(dt, ts); return; }
      if (beat.k === 'result' || beat.k === 'foul' || beat.k === 'card') { movePlayers(dt, ts); return; }
      const bA = AF(ball);
      ['h', 'a'].forEach(s => live(s).forEach(p => {
        if (locked(p)) return;
        if (p.run) { p.tx = p.run.x; p.ty = p.run.y; p.sp = p.run.sp; return; }
        if (s !== att && p.pos === 'KL') { const gx = dir[s] > 0 ? 1.5 : W - 1.5; if (!(beat.k === 'shot' && (beat.out === 'save' || beat.out === 'goal'))) { p.tx = gx + (dir[s] > 0 ? 1 : -1) * clamp(Math.abs(ball.x - gx) * .05, 0, 4); p.ty = clamp(lerp(34, ball.y, .55), GY0 - 1, GY1 + 1); p.sp = 6; } return; }
        if (beat.k === 'shot' && Math.hypot(p.tx - beat.dest.x, p.ty - beat.dest.y) < .2) return;
        const f = toField(s, shapeFor(p, s, bA.x, bA.y)); p.tx = f.x + Math.sin(ts / 900 + p.num) * .5; p.ty = f.y + Math.cos(ts / 1100 + p.num) * .5; p.sp = JOG;
      }));
      if (beat.k !== 'shot') defenseUpdate();
      // pivot topu saklarken en yakın stoper sırtına yapışır
      if (beat.hold && holder) { const m = nearest(def(), holder)[0]; if (m) { m.tx = holder.x + dir[att] * 1.3; m.ty = holder.y + .4; } }
      movePlayers(dt, ts);
    }
    const locked = p => p === holder || (beat && (beat.k === 'pass' || beat.k === 'carry') && beat.to === p);
    function movePlayers(dt) {
      ['h', 'a'].forEach(s => live(s).forEach(p => { if (locked(p) && beat && beat.k !== 'result') return; const sp = Math.min(p.sp || JOG, 10) * dt, dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d > .01) { const m = Math.min(d, sp); p.x += dx / d * m; p.y += dy / d * m; } if (p.run && Math.hypot(p.run.x - p.x, p.run.y - p.y) < .4 && !(beat && beat.k === 'result')) p.run = null; }));
      const all = live('h').concat(live('a'));
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const A = all[i], B = all[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .01; if (d < 2.6 && state === 'PLAYING') { const m = (2.6 - d) / 2, ux = dx / d, uy = dy / d; if (!locked(A)) { A.x -= ux * m; A.y -= uy * m; } if (!locked(B)) { B.x += ux * m; B.y += uy * m; } } }
      P.h.concat(P.a).forEach(p => { p.x = clamp(p.x, -2, W + 2); p.y = clamp(p.y, -1.5, H + 1.5); });
    }
    function tick(ts) {
      const dt = Math.min(.05, (ts - (last || ts)) / 1000) * speed; last = ts;
      updateMatch(ts, dt);
      if (diagnostics && ts - lastSample >= 120) { lastSample = ts; diagnostics.frames.push({ time: ts, clip: seg, beat: beat && beat.k, state, ball: { x: ball.x, y: ball.y }, players: P.h.concat(P.a).map(p => ({ x: p.x, y: p.y, name: p.name, off: p.off })) }); if (diagnostics.frames.length > 1500) diagnostics.frames.shift(); }
      draw();
      if (!closed && ci < clips.length) raf = requestAnimationFrame(tick);
    }
    function draw() {
      const s = SC;
      const now = performance.now();
      if (vert) ctx.setTransform(0, s, -s, 0, (H+STAND)*s, STAND*s); else ctx.setTransform(s, 0, 0, s, STAND*s, STAND*s);
      drawStadium(now);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2f8f3a' : '#2a8434'; ctx.fillRect(i * W / 12, 0, W / 12, H); }
      const lg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 70); lg.addColorStop(0, 'rgba(255,255,255,.06)'); lg.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = .28;
      ctx.strokeRect(.5, .5, W - 1, H - 1); ctx.beginPath(); ctx.moveTo(W / 2, .5); ctx.lineTo(W / 2, H - .5); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 9.15, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, H / 2, .35, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
      [[.5, 1], [W - .5, -1]].forEach(([x, d]) => { ctx.strokeRect(d > 0 ? x : x - 16.5, H / 2 - 20.16, 16.5, 40.32); ctx.strokeRect(d > 0 ? x : x - 5.5, H / 2 - 9.16, 5.5, 18.32); ctx.beginPath(); ctx.arc(x + d * 11, H / 2, .3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + d * 11, H / 2, 9.15, d > 0 ? -.93 : Math.PI - .93, d > 0 ? .93 : Math.PI + .93); ctx.stroke();
        // file: çizginin dışında, ağ desenli
        const gx0 = d > 0 ? x - .5 - 2.2 : x + .5, gx1 = gx0 + 2.2; ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(gx0, GY0, 2.2, GY1 - GY0);
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .07; for (let yy = GY0; yy <= GY1; yy += .45) { ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke(); } for (let xx = gx0; xx <= gx1; xx += .45) { ctx.beginPath(); ctx.moveTo(xx, GY0); ctx.lineTo(xx, GY1); ctx.stroke(); }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = .32; ctx.beginPath(); const lx = d > 0 ? x - .5 : x + .5, bx2 = d > 0 ? gx0 : gx1; ctx.moveTo(lx, GY0); ctx.lineTo(bx2, GY0); ctx.lineTo(bx2, GY1); ctx.lineTo(lx, GY1); ctx.stroke(); ctx.restore(); ctx.fillStyle = '#fff'; });
      // kavisli şut / frikik izi
      if (ball.trail.length > 1) { ctx.save(); for (let i = 1; i < ball.trail.length; i++) { const a = ball.trail[i - 1], b = ball.trail[i]; ctx.strokeStyle = `rgba(255,255,255,${(i / ball.trail.length) * .75})`; ctx.lineWidth = .18 + (i / ball.trail.length) * .35; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } ctx.restore(); }
      // duran top çizgisi
      if (fx.aim) { ctx.save(); ctx.setLineDash([.9, .7]); ctx.strokeStyle = 'rgba(255,240,120,.9)'; ctx.lineWidth = .22; ctx.beginPath(); ctx.moveTo(fx.aim.from.x, fx.aim.from.y); ctx.lineTo(fx.aim.to.x, fx.aim.to.y); ctx.stroke(); ctx.restore(); }
      if (plan && plan.wall && state === 'FREEKICK') { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([.5, .5]); ctx.lineWidth = .14; ctx.beginPath(); ctx.arc(ball.x, ball.y, 9.15, 0, 7); ctx.stroke(); ctx.restore(); }
      // oyuncular
      ['h', 'a'].forEach(sd => live(sd).forEach(p => {
        const col = p.pos === 'KL' ? (sd === 'h' ? '#f6d32d' : '#9be15d') : sd === 'h' ? hc : ac;
        ctx.beginPath(); ctx.arc(p.x + .25, p.y + .35, 1.55, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.55, 0, 7); ctx.fillStyle = col; ctx.fill();
        const tm = sd === 'h' ? o.home : o.away, kit = tm.kit, k2 = tm.c2;
        if (p.pos !== 'KL' && kit && kit !== 'duz' && k2 && !(sd === 'a' && ac !== (o.away.c1 || ac))) { ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, 1.55, 0, 7); ctx.clip(); ctx.fillStyle = k2;
          // ekranda dikey görünsün: dikey sahada eksenler döner
          const V = (a, b, w, h) => vert ? ctx.fillRect(p.x + b, p.y + a, h, w) : ctx.fillRect(p.x + a, p.y + b, w, h);
          if (kit === 'dikey') { V(-1.05, -2, .5, 4); V(.15, -2, .5, 4); } else if (kit === 'ince') { [-1, -.35, .3, .95].forEach(a => V(a, -2, .14, 4)); } else if (kit === 'yatay') { V(-2, -.95, 4, .55); V(-2, .4, 4, .55); }
          else if (kit === 'yarim') V(0, -2, 2, 4); else if (kit === 'bant') V(-2, -.45, 4, .7); else if (kit === 'kol') { ctx.lineWidth = .7; ctx.strokeStyle = k2; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, 7); ctx.stroke(); }
          else if (kit === 'capraz') { ctx.beginPath(); ctx.moveTo(p.x - 2, p.y - 1.2); ctx.lineTo(p.x - 1.2, p.y - 2); ctx.lineTo(p.x + 2, p.y + 1.2); ctx.lineTo(p.x + 1.2, p.y + 2); ctx.fill(); }
          ctx.restore(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.55, 0, 7); ctx.lineWidth = .22; ctx.strokeStyle = lum(col) > 150 ? '#222' : '#fff'; ctx.stroke();
      }));
      // yazılar ekran koordinatında (döndürülmüş sahada da düz okunur)
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ['h', 'a'].forEach(sd => live(sd).forEach(p => { const col = p.pos === 'KL' ? (sd === 'h' ? '#f6d32d' : '#9be15d') : sd === 'h' ? hc : ac, [X, Y] = proj(p.x, p.y);
        ctx.font = `bold ${1.6 * SC}px system-ui,sans-serif`; const tm = sd === 'h' ? o.home : o.away, striped = p.pos !== 'KL' && tm.kit && tm.kit !== 'duz';
        if (striped) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(p.num, X, Y + 1); ctx.fillStyle = '#fff'; } else ctx.fillStyle = lum(col) > 150 ? '#111' : '#fff'; ctx.fillText(p.num, X, Y + 1); }));
      // top sahibi / hedef oyuncunun adı
      const lab = holder || (beat && beat.to);
      if (lab) { const t = surname(lab.name), [X, Y] = proj(lab.x, lab.y); ctx.font = `600 ${1.8 * SC}px system-ui,sans-serif`; const w = ctx.measureText(t).width + 14; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(X - w / 2, Y - 46, w, 24); ctx.fillStyle = '#fff'; ctx.fillText(t, X, Y - 34); }
      // kart simgeleri
      fx.cards = fx.cards.filter(c => now - c.t < 2200); fx.cards.forEach(c => { const [X, Y] = proj(c.p.x, c.p.y), up = Math.min(1, (now - c.t) / 250); ctx.save(); ctx.translate(X + 18, Y - 30 - up * 14); ctx.rotate(.18); ctx.fillStyle = c.red ? '#d0021b' : '#f8d000'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.fillRect(-9, -13, 18, 26); ctx.strokeRect(-9, -13, 18, 26); ctx.restore(); });
      // aksiyon baloncukları
      fx.bubbles = fx.bubbles.filter(b => now - b.t < 2000); fx.bubbles.forEach(b => { const [X, Y] = proj(b.x, b.y), a = Math.min(1, (2000 - (now - b.t)) / 400), rise = Math.min(1, (now - b.t) / 300) * 18;
        ctx.save(); ctx.globalAlpha = a; ctx.font = `800 ${2.1 * SC}px system-ui,sans-serif`; const w = ctx.measureText(b.txt).width + 28, bx = clamp(X, w / 2 + 6, cv.width - w / 2 - 6), by = Math.max(40, Y - 70 - rise);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = b.col; ctx.lineWidth = 4; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx - w / 2, by - 22, w, 44, 22); else ctx.rect(bx - w / 2, by - 22, w, 44); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - 8, by + 20); ctx.lineTo(clamp(X, bx - 30, bx + 30), by + 36); ctx.lineTo(bx + 8, by + 20); ctx.fill(); ctx.fillStyle = b.col; ctx.fillText(b.txt, bx, by + 1); ctx.restore(); });
      // ekran titremesi
      cv.style.transform = now < fx.shakeUntil ? `translate(${(Math.random() - .5) * 9}px,${(Math.random() - .5) * 7}px)` : '';
      if (vert) ctx.setTransform(0, s, -s, 0, (H+STAND)*s, STAND*s); else ctx.setTransform(s, 0, 0, s, STAND*s, STAND*s);
      // top
      ctx.beginPath(); ctx.arc(ball.x + .3 + ball.z * .3, ball.y + .4 + ball.z * .3, .6, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ball.x, ball.y - ball.z * .5, .7 + ball.z * .06, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = .15; ctx.strokeStyle = '#111'; ctx.stroke();
      drawConfetti();
    }
    /* --------- stadyum: tribün, taraftar, reklam panoları, ışıklar --------- */
    const SEAT0 = 3.6, fans = [], groups = new Map(), confetti = [];
    let cheer = null; // {side, t}
    (function buildCrowd() {
      const awayEnd = Math.random() < .5 ? 'L' : 'R';
      const pal = (c1, c2) => [c1, c1, c1, c1, c2 || '#d9d9d9', '#262c33', '#343a42', '#2c3238'];
      const hp = pal(hc, o.home.c2 && cdist(o.home.c2, hc) > 60 ? o.home.c2 : '#ffffff'), ap = pal(ac, o.away.c2 && cdist(o.away.c2, ac) > 60 ? o.away.c2 : '#ffffff');
      for (let x = -STAND + .5; x < W + STAND - .4; x += .95) for (let y = -STAND + .5; y < H + STAND - .4; y += .95) {
        if (x > -SEAT0 && x < W + SEAT0 && y > -SEAT0 && y < H + SEAT0) continue;
        if (Math.random() < .07) continue; // boş koltuk
        const away = awayEnd === 'R' ? (x > W + SEAT0 && y < H * .55) : (x < -SEAT0 && y > H * .45);
        const col = pick(away ? ap : hp), f = { x, y, side: away ? 'a' : 'h', ph: Math.random() * 6.28, ang: (Math.atan2(y - H / 2, x - W / 2) + Math.PI) / (2 * Math.PI) };
        fans.push(f); if (!groups.has(col)) groups.set(col, []); groups.get(col).push(f);
      }
    })();
    function drawStadium(now) {
      const t = now / 1000;
      // dış tribün zemini ve basamaklar
      ctx.fillStyle = '#1c2228'; ctx.fillRect(-STAND, -STAND, W + STAND * 2, H + STAND * 2);
      for (let r = SEAT0; r < STAND; r += 1.9) { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(-r - .95, -r - .95, W + 2 * r + 1.9, .95); ctx.fillRect(-r - .95, H + r, W + 2 * r + 1.9, .95); ctx.fillRect(-r - .95, -r, .95, H + 2 * r); ctx.fillRect(W + r, -r, .95, H + 2 * r); }
      // merdiven boşlukları
      ctx.fillStyle = '#14181d'; for (let x = 8; x < W; x += 16) { ctx.fillRect(x, -STAND, .7, STAND - SEAT0); ctx.fillRect(x, H + SEAT0, .7, STAND - SEAT0); } for (let y = 10; y < H; y += 16) { ctx.fillRect(-STAND, y, STAND - SEAT0, .7); ctx.fillRect(W + SEAT0, y, STAND - SEAT0, .7); }
      // taraftarlar
      const since = cheer ? (now - cheer.t) / 1000 : 99, wave = (t * .07) % 1;
      groups.forEach((list, col) => {
        ctx.fillStyle = col; ctx.beginPath();
        for (const f of list) {
          let sz = .56 + Math.sin(t * 1.3 + f.ph) * .04;
          if (cheer && since < 5 && f.side === cheer.side) sz += Math.abs(Math.sin(t * 10 + f.ph)) * .34 * (1 - since / 5) + .08;
          else if (cheer && since < 3 && f.side !== cheer.side) sz -= .12;
          else { const dw = Math.abs(f.ang - wave), dd = Math.min(dw, 1 - dw); if (dd < .035 && !cheer) sz += (1 - dd / .035) * .3; }
          ctx.rect(f.x - sz / 2, f.y - sz / 2, sz, sz);
        }
        ctx.fill();
      });
      // gol sevinci: meşaleler ve flaşlar
      if (cheer && since < 5) {
        const mine = fans.filter((f, i) => f.side === cheer.side && i % 97 === 0);
        mine.forEach((f, i) => { const r = 1.6 + Math.sin(t * 14 + i) * .4, g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); g.addColorStop(0, 'rgba(255,230,160,.95)'); g.addColorStop(.35, 'rgba(255,70,30,.7)'); g.addColorStop(1, 'rgba(255,40,20,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2); });
        ctx.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { const f = fans[rnd(fans.length)]; ctx.fillRect(f.x - .25, f.y - .25, .5, .5); }
      }
      // tribün çatı gölgesi
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-STAND, -STAND, W + STAND * 2, 1.2); ctx.fillRect(-STAND, H + STAND - 1.2, W + STAND * 2, 1.2); ctx.fillRect(-STAND, -STAND, 1.2, H + STAND * 2); ctx.fillRect(W + STAND - 1.2, -STAND, 1.2, H + STAND * 2);
      // koşu bandı ve saha kenarı çimi
      ctx.fillStyle = '#3b3f45'; ctx.fillRect(-SEAT0, -SEAT0, W + SEAT0 * 2, H + SEAT0 * 2);
      ctx.fillStyle = '#236b2c'; ctx.fillRect(-2.4, -2.4, W + 4.8, H + 4.8);
      // reklam panoları (kurgusal)
      const ads = ['#ff4d00', '#0e2a47', '#f4f1e8', '#7b1e3b', '#111'], txt = ['BABA.', 'LİMAN', 'CBN', 'HAYAT.', 'DRAFT'];
      const board = (x, y, w, h, i) => { ctx.fillStyle = ads[i % ads.length]; ctx.fillRect(x, y, w, h); };
      let i = 0; for (let x = 0; x < W; x += 7, i++) { board(x, -3.1, 6.8, .55, i); board(x, H + 2.55, 6.8, .55, i + 2); }
      for (let y = 0; y < H; y += 7, i++) { if (y + 7 > GY0 - 2 && y < GY1 + 2) continue; board(-3.1, y, .55, 6.8, i); board(W + 2.55, y, .55, 6.8, i + 1); }
      ctx.font = 'bold .42px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; i = 0;
      for (let x = 0; x < W; x += 7, i++) { ctx.fillStyle = (i % ads.length) === 2 ? '#111' : '#fff'; ctx.fillText(txt[i % txt.length], x + 3.4, -2.82); ctx.fillStyle = ((i + 2) % ads.length) === 2 ? '#111' : '#fff'; ctx.fillText(txt[(i + 2) % txt.length], x + 3.4, H + 2.84); }
      // yedek kulübeleri
      [[W / 2 - 14, 'h'], [W / 2 + 6, 'a']].forEach(([x, sd]) => { ctx.fillStyle = 'rgba(200,230,255,.35)'; ctx.fillRect(x, H + .7, 8, 1.4); ctx.fillStyle = sd === 'h' ? hc : ac; for (let k = 0; k < 6; k++) ctx.fillRect(x + .6 + k * 1.25, H + 1.15, .6, .6); });
      // dördüncü hakem alanı
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .1; ctx.strokeRect(W / 2 - 1, H + .9, 2, 1);
      // ışık direkleri
      [[-STAND + 1.5, -STAND + 1.5], [W + STAND - 1.5, -STAND + 1.5], [-STAND + 1.5, H + STAND - 1.5], [W + STAND - 1.5, H + STAND - 1.5]].forEach(([x, y]) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, 'rgba(255,255,230,.32)'); g.addColorStop(1, 'rgba(255,255,230,0)'); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
        ctx.fillStyle = '#e9eef2'; ctx.fillRect(x - 1, y - 1, 2, 2); });
    }
    function startCheer(side) {
      cheer = { side, t: performance.now() };
      const cols = side === 'h' ? [hc, o.home.c2 || '#fff', '#fff'] : [ac, o.away.c2 || '#fff', '#fff'];
      const gx = dir[side] > 0 ? W + 5 : -5;
      for (let i = 0; i < 160; i++) confetti.push({ x: gx + (Math.random() - .5) * 8, y: Math.random() * H, vx: -dir[side] * (2 + Math.random() * 6), vy: (Math.random() - .5) * 4, life: 2.5 + Math.random() * 2, rot: Math.random() * 6, col: pick(cols) });
      for (let i = 0; i < 80; i++) { const f = fans[rnd(fans.length)]; if (f.side === side) confetti.push({ x: f.x, y: f.y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, life: 2 + Math.random() * 2, rot: 0, col: pick(cols) }); }
    }
    let lastConf = 0;
    function drawConfetti() {
      const now = performance.now(), dt = lastConf ? Math.min(.05, (now - lastConf) / 1000) : 0; lastConf = now;
      for (let i = confetti.length - 1; i >= 0; i--) { const c = confetti[i]; c.life -= dt; if (c.life <= 0) { confetti.splice(i, 1); continue; } c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .985; c.vy *= .985; c.rot += dt * 6;
        ctx.globalAlpha = Math.min(1, c.life); ctx.fillStyle = c.col; const w = .35 + Math.abs(Math.sin(c.rot)) * .35; ctx.fillRect(c.x - w / 2, c.y - .2, w, .4); }
      ctx.globalAlpha = 1;
    }


    /* --------- kontroller --------- */
    q('[data-k=next]').onclick = () => {
      cancelAnimationFrame(raf);
      const c = clips[ci];
      if (c) { // atlanan pozisyonun sonucunu uygula: gol skora, kırmızı kart sahaya
        if (c.out === 'goal' && !c.counted) { c.counted = true; if (c.side === 'h') score[0]++; else score[1]++; q('.m2d-sc').textContent = score[0] + ' – ' + score[1]; }
        if (c.kind === 'red') { const f = (plan && plan.fouler) || find(c.side === 'h' ? 'a' : 'h', c.fouler); if (f) f.off = true; }
      }
      beats = []; beat = null; nextClip(); if (ci < clips.length) { last = 0; raf = requestAnimationFrame(tick); }
    };
    q('[data-k=end]').onclick = () => { ci = clips.length; fullTime(); };
    q('[data-k=spd]').onclick = e => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; e.target.textContent = speed === 1 ? '⏩ 2x' : speed === 2 ? '⏩ 4x' : '▶ 1x'; };
    // hücum planı etiketleri (canlı maçta seçilen taktik)
    const tag = side => { const s = styleOf(side); return s !== 'dengeli' ? `<small class="m2d-style">📋 ${esc(STYLES()[s] || s)}</small>` : ''; };
    q('.m2d-tm').insertAdjacentHTML('beforeend', tag('h')); q('.m2d-tm.r').insertAdjacentHTML('afterbegin', tag('a'));
    if (!clips.length) { com(1, T('Maçta kayda değer bir pozisyon olmadı.', 'There were no notable chances in this match.')); fullTime(); return; }
    if (reduce) speed = 2;
    nextClip(); raf = requestAnimationFrame(tick);
  }
  return { show, STYLES };
})();

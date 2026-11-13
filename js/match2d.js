/* =====================================================================
   BABA. Draft — 2D maç özeti motoru (FM2006 tarzı, kuşbakışı)
   Sadece önemli pozisyonlar: goller + büyük fırsatlar. Tüm maçı izleme yok.
   Match2D.show(opts, onDone)
     opts: { home:{name,short,c1,c2,xi:[{name,pos}], slots:[{x,y}]}, away:{…}, gh, ga, ev:[{t:'h'|'a',sc,as,min}], lh, la }
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

  /* --------- klipleri oluştur: goller + kaçan / kurtarılan büyük fırsatlar --------- */
  function makeClips(o) {
    const clips = o.ev.map(e => ({ side: e.t, min: e.min, sc: e.sc, as: e.as, trail:e.trail, out: 'goal' })), ch = [];
    ['h', 'a'].forEach(side => {
      const team = o[side === 'h' ? 'home' : 'away'], n = Math.min(3, poisson((side === 'h' ? o.lh : o.la) * 1.15 + .35));
      for (let i = 0; i < n; i++) {
        const sc = wpick(team.xi, p => SCW[p.pos] || .2), as = Math.random() < .8 ? wpick(team.xi.filter(p => p !== sc), p => ASW[p.pos] || .2) : null;
        ch.push({ side, min: 2 + rnd(88), sc: sc.name, as: as && as.name, out: pick(['save', 'save', 'miss', 'miss', 'post', 'block']) });
      }
    });
    ch.sort(() => Math.random() - .5).slice(0, Math.max(2, 10 - clips.length)).forEach(c => clips.push(c));
    clips.sort((a, b) => a.min - b.min);
    // aynı dakikaya düşenleri ayır
    for (let i = 1; i < clips.length; i++) if (clips[i].min <= clips[i - 1].min) clips[i].min = Math.min(90, clips[i - 1].min + 1);
    return clips;
  }

  /* --------- dizilişler --------- */
  // slot (x: 0-100 genişlik, y: 0 hücum – 100 kale) → sahaya göre, sağa hücum eden takım için
  const shape = s => ({ x: 3 + (100 - s.y) / 100 * 52, y: 4 + s.x / 100 * 60 });

  function show(o, onDone) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clips = makeClips(o);
    const matchStats={h:{shots:0,on:0,xg:0},a:{shots:0,on:0,xg:0}};
    const shotQuality=c=>{const base=c.out==='goal'?.27:c.out==='save'?.19:c.out==='post'?.13:c.out==='block'?.09:.07;return Math.min(.65,base+(c.as?.035:0));};
    clips.forEach(c=>{const st=matchStats[c.side];st.shots++;if(c.out==='goal'||c.out==='save')st.on++;st.xg+=shotQuality(c)});
    if(o.physics){['h','a'].forEach((side,i)=>{matchStats[side]={shots:o.physics.shots[i],on:o.physics.on[i],xg:o.physics.xg[i]};});}
    const pct=o.physics?o.physics.possession[0]:clamp(Math.round(50+((o.lh||1)-(o.la||1))*7),30,70);
    let hc = o.home.c1 || '#c00', ac = o.away.c1 || '#036';
    if (cdist(hc, ac) < 120) ac = (o.away.c2 && cdist(hc, o.away.c2) > 120) ? o.away.c2 : (lum(hc) > 140 ? '#1d1d1d' : '#f4f4f4');
    const ov = document.createElement('div'); ov.className = 'm2d-ov';
    ov.innerHTML = `<div class="m2d" role="dialog" aria-modal="true" aria-label="${T('Maç özeti', 'Match highlights')}">
      <header class="m2d-top"><span class="m2d-tm"><i style="background:${hc}"></i>${esc(o.home.short || o.home.name)}</span><b class="m2d-sc">0 – 0</b><span class="m2d-tm r">${esc(o.away.short || o.away.name)}<i style="background:${ac}"></i></span><em class="m2d-min">0'</em></header>
      <div class="m2d-pitch"><canvas width="1050" height="680"></canvas><div class="m2d-flash" hidden></div></div>
      <div class="m2d-analytics" aria-label="${T('Maç istatistikleri','Match statistics')}"><div class="m2d-analytics-row"><strong>${pct}%</strong><span>${T('Tahmini topa sahip olma','Estimated possession')}</span><strong>${100-pct}%</strong></div><div class="m2d-possession"><i style="width:${pct}%"></i></div><div class="m2d-analytics-row"><strong>${matchStats.h.shots}</strong><span>${T('Şut','Shots')}</span><strong>${matchStats.a.shots}</strong></div><div class="m2d-analytics-row"><strong>${matchStats.h.on}</strong><span>${T('İsabetli şut','Shots on target')}</span><strong>${matchStats.a.on}</strong></div><div class="m2d-analytics-row"><strong>${matchStats.h.xg.toFixed(2)}</strong><span>${T('Pozisyon xG (tahmini)','Highlight xG (estimate)')}</span><strong>${matchStats.a.xg.toFixed(2)}</strong></div></div>
      <div class="m2d-com" aria-live="polite"><span class="m2d-cm">0'</span><p>${T('Maç başlıyor…', 'Kick-off…')}</p></div>
      <div class="m2d-bar"><span class="m2d-cnt">0/${clips.length}</span><button data-k="spd">⏩ 2x</button><button data-k="next">⏭ ${T('Sonraki pozisyon', 'Next highlight')}</button><button data-k="end" class="pr">${T('Özeti bitir', 'Skip to full time')}</button></div></div>`;
    document.body.appendChild(ov); document.body.classList.add('m2d-open');
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), q = s => ov.querySelector(s);
    // dar ve dikey ekranlarda saha dikey çizilir (oyuncular daha büyük görünür)
    const vert = innerWidth < 640 && innerHeight > innerWidth;
    if (vert) { cv.width = 680; cv.height = 1050; ov.querySelector('.m2d').classList.add('vert'); }
    const SC = 10, proj = (x, y) => vert ? [(H - y + STAND) * SC, (x + STAND) * SC] : [(x + STAND) * SC, (y + STAND) * SC];
    cv.width = (vert ? H : W) * SC + STAND * 2 * SC;
    cv.height = (vert ? W : H) * SC + STAND * 2 * SC;
    let speed = 1, score = [0, 0], ci = -1, raf = 0, closed = false;
    const com = (min, txt, cls) => { q('.m2d-cm').textContent = min + "'"; const p = q('.m2d-com p'); p.textContent = txt; p.className = cls || ''; };

    // oyuncu nesneleri
    const mk = (team, side) => team.xi.map((p, i) => { const s = team.slots[i] || { x: 50, y: 50 }; const b = shape(s); return { name: p.name, pos: p.pos, num: num(p.pos, i), side, base: b, x: b.x, y: b.y, tx: b.x, ty: b.y }; });
    function num(pos, i) { return ({ KL: 1, BK: [2, 3][i % 2], ST: [4, 5][i % 2], OS: [6, 8, 10][i % 3], KN: [7, 11][i % 2], FV: 9 })[pos] || i + 1; }
    const P = { h: mk(o.home, 'h'), a: mk(o.away, 'a') };
    // Stable formations: opponents keep their own half; possession drives compact defensive shifts.
    const ball = { x: W / 2, y: H / 2, z: 0, tx: W / 2, ty: H / 2 };
    let dir = { h: 1, a: -1 }, att = 'h', holder = null, beats = [], beat = null, bt = 0, flash = '';
    // Opt-in diagnostics for real-browser Playwright checks; never enabled for normal players.
    const diagnostics=window.__BABA_MATCH_TEST__===true?{frames:[],goals:[],passes:[],runs:[],stadium:{margin:STAND,width:cv.width,height:cv.height},done:false}:null;
    if(diagnostics)window.__BABA_MATCH_DIAGNOSTICS__=diagnostics;
    let lastSample=0;


    const toField = (side, pt) => dir[side] > 0 ? pt : { x: W - pt.x, y: H - pt.y };
    const find = (side, name) => P[side].find(p => p.name === name) || wpick(P[side], p => SCW[p.pos] || .2);

    function setupClip(c) {
      att = c.side; const def = att === 'h' ? 'a' : 'h', second = c.min > 45;
      dir = { h: second ? -1 : 1, a: second ? 1 : -1 };
      const shooter = find(att, c.sc), assister = c.as ? find(att, c.as) : null;
      // atak hattı: derinden başlayan oyuncu → ara pas(lar) → asist → şut
      const deep = wpick(P[att].filter(p => p !== shooter && p !== assister && p.pos !== 'KL'), p => ({ ST: 1.5, BK: 1.5, OS: 3, KN: 1, FV: .2 })[p.pos] || .5);
      const mid = wpick(P[att].filter(p => p !== shooter && p !== assister && p !== deep && p.pos !== 'KL'), p => ({ OS: 3, KN: 2, BK: 1, FV: .6, ST: .4 })[p.pos] || .5);
      const lane = 8 + Math.random() * 52, wide = assister && (assister.pos === 'KN' || assister.pos === 'BK');
      const pts = [
        { p: deep, at: { x: 34 + rnd(12), y: clamp(lane + (Math.random() - .5) * 20, 6, 62) } },
        { p: mid, at: { x: 55 + rnd(10), y: clamp(lane + (Math.random() - .5) * 24, 6, 62) } },
        { p: assister || mid, at: wide ? { x: 84 + rnd(12), y: Math.random() < .5 ? 6 + rnd(8) : 54 + rnd(8) } : { x: 74 + rnd(8), y: 18 + rnd(32) } },
        { p: shooter, at: { x: 86 + rnd(10), y: 22 + rnd(24) } }
      ].filter((x, i, a) => i === 0 || x.p !== a[i - 1].p);
      // Reuse actual possession pass participants and target locations for simulated goals.
      if(Array.isArray(c.trail)&&c.trail.some(x=>x.type==='pass')){
        const passes=c.trail.filter(x=>x.type==='pass').slice(-3);
        const actual=passes.map(x=>({p:find(att,x.to),at:{x:dir[att]===1?x.tx:105-x.tx,y:dir[att]===1?x.ty:68-x.ty}}));
        const shot=c.trail.findLast?c.trail.findLast(x=>x.type==='shot'):c.trail.filter(x=>x.type==='shot').pop();
        if(shot)actual.push({p:shooter,at:{x:dir[att]===1?shot.x:105-shot.x,y:dir[att]===1?shot.y:68-shot.y}});
        if(actual.length>1){pts.splice(0,pts.length,{p:find(att,passes[0].player),at:{x:dir[att]===1?passes[0].x:105-passes[0].x,y:dir[att]===1?passes[0].y:68-passes[0].y}},...actual.filter((v,i,a)=>i===0||v.p!==a[i-1].p));}
      }
      // herkesi formasyonuna yerleştir, topu ilk oyuncuya ver
      ['h', 'a'].forEach(s => P[s].forEach(p => { const f = toField(s, shapeFor(p, s, pts[0].at.x, pts[0].at.y)); p.x = p.tx = f.x; p.y = p.ty = f.y; }));
      const f0 = toField(att, pts[0].at); Object.assign(pts[0].p, { x: f0.x, y: f0.y, tx: f0.x, ty: f0.y });
      // pas alacak oyuncular zaten koşuya başlamış olsun
      for (let i = 1; i < pts.length; i++) { const p = pts[i].p, f = toField(att, pts[i].at), k = .45 + i * .1; p.x = p.tx = lerp(p.x, f.x, k); p.y = p.ty = lerp(p.y, f.y, k); }
      holder = pts[0].p; ball.x = f0.x; ball.y = f0.y; ball.z = 0;
      beats = [];
      const tn = n => surname(n.name);
      beats.push({ k: 'hold', d: .9, txt: c.min + "' " + T(`${tn(holder)} topla ileri çıkıyor`, `${tn(holder)} brings the ball forward`) });
      for (let i = 1; i < pts.length; i++) {
        const last = i === pts.length - 1, cross = last && wide;
        beats.push({ k: 'pass', d: cross ? 1.0 : .75, to: pts[i].p, at: pts[i].at, lob: cross, txt: cross ? T(`${tn(pts[i - 1].p)} ortayı yapıyor…`, `${tn(pts[i - 1].p)} whips in a cross…`) : i === pts.length - 1 ? T(`${tn(pts[i - 1].p)} ara pası attı, ${tn(pts[i].p)} kaleyle karşı karşıya!`, `${tn(pts[i - 1].p)} slides it through — ${tn(pts[i].p)} is clean through!`) : T(`${tn(pts[i - 1].p)} → ${tn(pts[i].p)}`, `${tn(pts[i - 1].p)} finds ${tn(pts[i].p)}`) });
        beats.push({ k: 'hold', d: last ? .35 : .55 });
      }
      const gy = c.out === 'miss' ? (Math.random() < .5 ? GY0 - 2 - Math.random() * 4 : GY1 + 2 + Math.random() * 4) : c.out === 'post' ? (Math.random() < .5 ? GY0 : GY1) : GY0 + 1 + Math.random() * 5.3;
      // Do not animate implausible full-pitch shots: carry possession into the final third first.
      const finalPoint=pts[pts.length-1].at;
      if(finalPoint.x<72){
        const strikerPoint={x:clamp(82+Math.random()*9,82,94),y:clamp(finalPoint.y,22,46)};
        beats.push({k:'carry',d:Math.max(1.5,(strikerPoint.x-finalPoint.x)/9),at:strikerPoint,to:shooter,txt:T('Hücum üçüncü bölgeye taşınıyor…','The attack advances into the final third…')});
      }
      beats.push({ k: 'shot', d: .85, out: c.out, gy, txt: T(`${tn(shooter)} vuruyor…`, `${tn(shooter)} shoots…`) });
      beats.push({ k: 'result', d: c.out === 'goal' ? 2.4 : 1.6, out: c.out, shooter, assister, c });
      beat = null; bt = 0; flash = ''; q('.m2d-flash').hidden = true;
      q('.m2d-min').textContent = c.min + "'"; q('.m2d-cnt').textContent = (ci + 1) + '/' + clips.length;
    }
    // ballX: atak takımının top konumu (hücum yönü sağa); savunma takımı geriye çekilir
    function shapeFor(p, side, bx, by) {
      const s = p.base, attacking = side === att;
      if (attacking) { const push = clamp((bx - 30) * .6, 0, 34) * (p.pos === 'KL' ? .3 : 1); return { x: clamp(s.x + push, 2, 100), y: s.y }; }
      // savunan takım için koordinatlar kendi yönüne göre: önce kendi çerçevesinde hesapla
      const own = 105 - bx, back = clamp((own - 52) * .4, -12, 8);
      return { x: clamp(s.x + back + (p.pos === 'KL' ? 0 : 6), 2, 55), y: p.pos === 'KL' ? s.y : lerp(lerp(s.y, 34, .3), H - by, .22) };
    }
    function startBeat() {
      beat = beats.shift(); bt = 0; if (!beat) return nextClip();
      if (beat.txt) com(clips[ci].min, beat.txt);
      if (beat.k === 'pass' || beat.k === 'carry') {
        const f = toField(att, beat.at), r = beat.to, run = beat.k === 'carry' ? 7 : 8;
        beat.rFrom = { x: r.x, y: r.y };
        if (beat.k === 'pass') {
          // alıcı koşu hızıyla ulaşabileceği noktaya kadar koşar; pas o noktaya atılır (top ileri gidip geri dönmez)
          let d = clamp(Math.hypot(f.x - ball.x, f.y - ball.y) / 17, .45, 1.3), end = f;
          for (let it = 0; it < 2; it++) { const dx = f.x - r.x, dy = f.y - r.y, L = Math.hypot(dx, dy) || 1, m = Math.min(L, run * d); end = { x: r.x + dx / L * m, y: r.y + dy / L * m }; d = clamp(Math.hypot(end.x - ball.x, end.y - ball.y) / (beat.lob ? 14 : 17), .45, 1.4); }
          beat.d = d; beat.rTo = end; beat.dest = { x: end.x + dir[att] * .9, y: end.y }; holder = null;
        } else { beat.d = Math.max(.8, Math.hypot(f.x - r.x, f.y - r.y) / run); beat.rTo = f; beat.dest = { x: f.x + dir[att] * .9, y: f.y }; holder = r; }
        beat.from = { x: ball.x, y: ball.y }; r.tx = beat.rTo.x; r.ty = beat.rTo.y;
        if(diagnostics&&beat.k==='pass')diagnostics.passes.push({duration:beat.d,distance:Math.hypot(beat.dest.x-ball.x,beat.dest.y-ball.y),start:performance.now(),end:null}); }
      if (beat.k === 'shot') { const gx = dir[att] > 0 ? W - (beat.out === 'goal' ? -1.1 : beat.out === 'miss' ? -.4 : .5) : (beat.out === 'goal' ? -1.1 : beat.out === 'miss' ? -.4 : .5), gy = dir[att] > 0 ? beat.gy : H - beat.gy;
        beat.from = { x: ball.x, y: ball.y }; beat.dest = { x: gx, y: gy };
        const kp = P[att === 'h' ? 'a' : 'h'].find(p => p.pos === 'KL');
        if (beat.out === 'save' && kp) { const t = .82; beat.dest = { x: lerp(ball.x, gx, t), y: lerp(ball.y, gy, t) }; kp.tx = beat.dest.x; kp.ty = beat.dest.y; }
        if (beat.out === 'block') { const dp = P[att === 'h' ? 'a' : 'h'].filter(p => p.pos === 'ST' || p.pos === 'BK').sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0]; beat.dest = { x: lerp(ball.x, gx, .25), y: lerp(ball.y, gy, .25) }; if (dp) { dp.tx = beat.dest.x; dp.ty = beat.dest.y; } }
        holder = null; }
      if (beat.k === 'result') {
        const c = beat.c, tn = surname(c.sc);
        if (beat.out === 'goal') { if(diagnostics)diagnostics.goals.push({side:att,x:ball.x,y:ball.y,goalLine:dir[att]>0?W:0,valid:dir[att]>0?ball.x>=W:ball.x<=0}); if (att === 'h') score[0]++; else score[1]++; q('.m2d-sc').textContent = score[0] + ' – ' + score[1]; flash = 'GOL!'; startCheer(att); showFlash(T('GOOOL!', 'GOAL!'), tn, att === 'h' ? hc : ac);
          com(c.min, T(`GOOOL! ${c.sc}${c.as ? ' (asist: ' + c.as + ')' : ''}! Skor ${score[0]}–${score[1]}`, `GOAL! ${c.sc}${c.as ? ' (assist: ' + c.as + ')' : ''}! It’s ${score[0]}–${score[1]}`), 'goal');
          if (typeof AdvAudio !== 'undefined') { AdvAudio.note(784, .15, 'triangle', .05); setTimeout(() => AdvAudio.note(1046, .25, 'triangle', .05), 140); } }
        else com(c.min, { save: T(`Kaleci müthiş bir kurtarışla gole izin vermiyor!`, `What a save from the goalkeeper!`), miss: T(`${tn} topu az farkla auta gönderdi.`, `${tn} drags it just wide.`), post: T(`Direkten döndü! ${tn} inanamıyor.`, `Off the post! ${tn} can’t believe it.`), block: T(`Son anda araya giren savunma topu blokladı.`, `Blocked at the last moment by the defence.`) }[beat.out], 'miss');
        // topun son hali
        if (beat.out === 'post') { ball.tx = ball.x - dir[att] * 8; ball.ty = ball.y + (Math.random() - .5) * 14; }
        if (beat.out === 'save') { ball.tx = ball.x - dir[att] * 6; ball.ty = clamp(ball.y + (Math.random() < .5 ? -10 : 10), 2, 66); }
        // sevinç / hayal kırıklığı koşusu
        if (beat.out === 'goal') { const s = beat.shooter; s.tx = dir[att] > 0 ? 96 : 9; s.ty = Math.random() < .5 ? 4 : 64; P[att].forEach(p => { if (p !== s && p.pos !== 'KL') { p.tx = lerp(p.x, s.tx, .5); p.ty = lerp(p.y, s.ty, .5); } }); }
      }
    }
    function showFlash(big, small, col) { const f = q('.m2d-flash'); f.innerHTML = `<b style="--c:${col}">${esc(big)}</b><span>${esc(small)}</span>`; f.hidden = false; }
    function nextClip() {
      ci++;
      if (ci >= clips.length) return fullTime();
      setupClip(clips[ci]); startBeat();
    }
    function fullTime() {
      cancelAnimationFrame(raf); score = [o.gh, o.ga]; q('.m2d-sc').textContent = o.gh + ' – ' + o.ga; q('.m2d-min').textContent = T('MS', 'FT');
      com(90, T(`Maç sona erdi: ${o.home.name} ${o.gh} – ${o.ga} ${o.away.name}`, `Full time: ${o.home.name} ${o.gh} – ${o.ga} ${o.away.name}`), 'end');
      if(diagnostics)diagnostics.done=true; ov.querySelector('.m2d').classList.add('ft');
      draw(); const b = q('[data-k=next]'); b.textContent = T('Devam ▶', 'Continue ▶'); b.classList.add('pr'); q('[data-k=end]').hidden = true; q('[data-k=spd]').hidden = true;
      b.onclick = close; b.focus();
    }
    function close() { if (closed) return; closed = true; cancelAnimationFrame(raf); ov.remove(); document.body.classList.remove('m2d-open'); document.removeEventListener('keydown', onKey); onDone && onDone(); }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); ci = clips.length; fullTime(); } }
    document.addEventListener('keydown', onKey);

    /* --------- döngü --------- */
    let last = 0;
    function tick(ts) {
      const dt = Math.min(.05, (ts - (last || ts)) / 1000) * speed; last = ts;
      if (beat) {
        bt += dt; const k = clamp(bt / beat.d, 0, 1);
        if (beat.k === 'pass' || beat.k === 'carry') {
          // top yerde yavaşlar (pas), taşımada oyuncunun ayağında kalır; alıcı tam varış anında topla buluşur
          const e = beat.k === 'pass' && !beat.lob ? 1 - Math.pow(1 - k, 1.6) : k, r = beat.to;
          r.x = r.tx = lerp(beat.rFrom.x, beat.rTo.x, k); r.y = r.ty = lerp(beat.rFrom.y, beat.rTo.y, k);
          if (beat.k === 'carry') { ball.x = r.x + dir[att] * .9; ball.y = r.y; } else { ball.x = lerp(beat.from.x, beat.dest.x, e); ball.y = lerp(beat.from.y, beat.dest.y, e); }
          ball.z = beat.lob ? Math.sin(k * Math.PI) * 4 : 0; }
        else if (beat.k === 'shot') { const e = 1 - Math.pow(1 - k, 1.3); ball.x = lerp(beat.from.x, beat.dest.x, e); ball.y = lerp(beat.from.y, beat.dest.y, e); ball.z = Math.sin(k * Math.PI) * 1.2; }
        else if (beat.k === 'result') { if (beat.out === 'post' || beat.out === 'save') { ball.x = lerp(ball.x, ball.tx, dt * 3); ball.y = lerp(ball.y, ball.ty, dt * 3); } ball.z = 0; }
        if (k >= 1) { if(diagnostics&&beat.k==='pass')diagnostics.passes[diagnostics.passes.length-1].end=performance.now(); if (beat.k === 'pass' || beat.k === 'carry') { holder = beat.to; } startBeat(); }
      }
      if (holder && (!beat || (beat.k !== 'pass' && beat.k !== 'shot' && beat.k !== 'carry'))) { holder.x = holder.tx = clamp(holder.x + dir[att] * dt * 3, 1, W - 1); ball.x = holder.x + dir[att] * .9; ball.y = holder.y; }
      // takım şekilleri topa göre
      const bxAtt = dir[att] > 0 ? ball.x : W - ball.x, byAtt = dir[att] > 0 ? ball.y : H - ball.y;
      if (beat && beat.k !== 'result') ['h', 'a'].forEach(s => P[s].forEach(p => {
        if (p === holder || (beat && beat.to === p)) return;
        if (s !== att && p.pos === 'KL') { const gx = dir[s] > 0 ? 2 : W - 2; if (!(beat.k === 'shot' && beat.out === 'save')) { p.tx = gx + (dir[s] > 0 ? 1 : -1) * clamp(Math.abs(ball.x - gx) * .06, 0, 4); p.ty = clamp(lerp(34, ball.y, .55), GY0 - 1, GY1 + 1); } return; }
        if (beat.k === 'shot' && (beat.out === 'save' || beat.out === 'block') && Math.hypot(p.tx - beat.dest.x, p.ty - beat.dest.y) < .1) return;
        const f = toField(s, shapeFor(p, s, bxAtt, byAtt));
        p.tx = f.x + Math.sin(ts / 900 + p.num) * .6; p.ty = f.y + Math.cos(ts / 1100 + p.num) * .6;
      }));
      // en yakın savunmacı baskı yapar
      if (beat && beat.k !== 'result' && beat.k !== 'shot') { const def = att === 'h' ? 'a' : 'h'; const pr = P[def].filter(p => p.pos !== 'KL').sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0]; if (pr) { pr.tx = lerp(pr.tx, ball.x - dir[att] * 1.8, .5); pr.ty = lerp(pr.ty, ball.y, .5); } }
      const locked = p => p === holder || (beat && (beat.k === 'pass' || beat.k === 'carry') && beat.to === p);
      ['h', 'a'].forEach(s => P[s].forEach(p => { if (locked(p)) return; const sp = 6.5 * dt, dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d > .01) { const m = Math.min(d, sp); p.x += dx / d * m; p.y += dy / d * m; } }));
      // üst üste binmeyi önle (top sahibine dokunma)
      const all = P.h.concat(P.a);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const A = all[i], B = all[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .01; if (d < 3) { const m = (3 - d) / 2, ux = dx / d, uy = dy / d; if (!locked(A)) { A.x -= ux * m; A.y -= uy * m; } if (!locked(B)) { B.x += ux * m; B.y += uy * m; } } }
      if(diagnostics&&ts-lastSample>=120){lastSample=ts;diagnostics.frames.push({time:ts,clip:ci,beat:beat&&beat.k,ball:{x:ball.x,y:ball.y},players:P.h.concat(P.a).map(p=>({x:p.x,y:p.y,name:p.name}))});if(diagnostics.frames.length>1200)diagnostics.frames.shift();}
      draw();
      if (!closed && ci < clips.length) raf = requestAnimationFrame(tick);
    }

    /* --------- çizim --------- */
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
      // oyuncular
      ['h', 'a'].forEach(sd => P[sd].forEach(p => {
        const col = p.pos === 'KL' ? (sd === 'h' ? '#f6d32d' : '#9be15d') : sd === 'h' ? hc : ac;
        ctx.beginPath(); ctx.arc(p.x + .25, p.y + .35, 1.55, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.55, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = .22; ctx.strokeStyle = lum(col) > 150 ? '#222' : '#fff'; ctx.stroke();
      }));
      // yazılar ekran koordinatında (döndürülmüş sahada da düz okunur)
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ['h', 'a'].forEach(sd => P[sd].forEach(p => { const col = p.pos === 'KL' ? (sd === 'h' ? '#f6d32d' : '#9be15d') : sd === 'h' ? hc : ac, [X, Y] = proj(p.x, p.y);
        ctx.fillStyle = lum(col) > 150 ? '#111' : '#fff'; ctx.font = `bold ${1.6 * SC}px system-ui,sans-serif`; ctx.fillText(p.num, X, Y + 1); }));
      // top sahibi / hedef oyuncunun adı
      const lab = holder || (beat && beat.to);
      if (lab) { const t = surname(lab.name), [X, Y] = proj(lab.x, lab.y); ctx.font = `600 ${1.8 * SC}px system-ui,sans-serif`; const w = ctx.measureText(t).width + 14; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(X - w / 2, Y - 46, w, 24); ctx.fillStyle = '#fff'; ctx.fillText(t, X, Y - 34); }
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

    q('[data-k=next]').onclick = () => { cancelAnimationFrame(raf); if (ci >= 0 && clips[ci] && beats.length + (beat ? 1 : 0)) { // kalan gol varsa skora işle
        const c = clips[ci]; if (c.out === 'goal' && !(beat && beat.k === 'result')) { if (c.side === 'h') score[0]++; else score[1]++; q('.m2d-sc').textContent = score[0] + ' – ' + score[1]; } }
      beats = []; beat = null; nextClip(); if (ci < clips.length) { last = 0; raf = requestAnimationFrame(tick); } };
    q('[data-k=end]').onclick = () => { ci = clips.length; fullTime(); };
    q('[data-k=spd]').onclick = e => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; e.target.textContent = speed === 1 ? '⏩ 2x' : speed === 2 ? '⏩ 4x' : '▶ 1x'; };
    if (!clips.length) { com(1, T('Maçta kayda değer bir pozisyon olmadı.', 'There were no notable chances in this match.')); fullTime(); return; }
    if (reduce) speed = 2;
    nextClip(); raf = requestAnimationFrame(tick);
  }
  return { show };
})();

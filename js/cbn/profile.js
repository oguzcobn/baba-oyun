"use strict";
/* CBN · Profil ve avatar — kısa bir soru sihirbazı yanıtlara göre özgün, yumuşak 3B çizgi film
   tarzında bir SVG avatar üretir (hazır görsel ya da ücretli servis kullanılmaz; tamamı tarayıcıda çizilir). */
(() => {
  const { S, L, esc, modal, toast } = CBN;
  const SKIN = ['#FFE0C4', '#F6C9A0', '#E3A978', '#C68650', '#9A5F38', '#6B3F25'];
  const HAIR = ['#1F1A17', '#4A2F1B', '#8A5A2B', '#D2A24C', '#B5452C', '#9AA0A6', '#EDE8DF'];
  const SHIRT = ['#E63946', '#FFC53D', '#2F5DFF', '#12B981', '#FF6FAE', '#8B5CF6', '#F97316', '#14B8A6'];
  const STYLES = { short: ['Kısa', 'Short'], long: ['Uzun', 'Long'], curly: ['Kıvırcık', 'Curly'], bun: ['Topuz', 'Bun'], bald: ['Saçsız', 'Bald'] };
  const GENRES = { adventure: ['Macera', 'Adventure', '#FFD98A', '#F08A2B'], scifi: ['Bilim kurgu', 'Sci-fi', '#8C9BFF', '#2B1F6B'], comedy: ['Komedi', 'Comedy', '#FFEB85', '#FF9F1C'], animation: ['Animasyon', 'Animation', '#8FEAF4', '#2F8FE0'], horror: ['Korku / gerilim', 'Horror / thriller', '#7A6AA8', '#1B1630'], romance: ['Romantik', 'Romance', '#FFD0DF', '#F0558B'], documentary: ['Belgesel', 'Documentary', '#C9EDB9', '#3E9B6A'] };
  const MOODS = { happy: ['Neşeli', 'Cheerful'], calm: ['Sakin', 'Calm'], bold: ['Kararlı', 'Determined'] };
  const mix = (hex, to, f) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), a = p(hex), b = p(to); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
  const dark = (h, f) => mix(h, '#000000', f), lite = (h, f) => mix(h, '#ffffff', f);
  const pick = (arr, i, d) => arr[Number.isInteger(+i) && +i >= 0 && +i < arr.length ? +i : d];
  /* içe aktarılan / eski kayıtlar için her alan doğrulanır */
  const clean = a => { a = a && typeof a === 'object' ? a : {}; return { g: ['m', 'f', 'x'].includes(a.g) ? a.g : 'x', skin: SKIN.indexOf(pick(SKIN, a.skin, 1)), hc: HAIR.indexOf(pick(HAIR, a.hc, 1)), hair: STYLES[a.hair] ? a.hair : 'short', glasses: !!a.glasses, beard: !!a.beard, genre: GENRES[a.genre] ? a.genre : 'adventure', mood: MOODS[a.mood] ? a.mood : 'happy', shirt: SHIRT.indexOf(pick(SHIRT, a.shirt, 2)) }; };
  let seq = 0;

  function svg(av, size) {
    const a = clean(av), id = 'av' + (++seq), sk = SKIN[a.skin], hc = HAIR[a.hc], sh = SHIRT[a.shirt], G = GENRES[a.genre], fem = a.g === 'f';
    const motif = {
      adventure: '<path d="M10 150 60 78l28 40 22-28 80 60z" fill="#fff" opacity=".28"/><circle cx="156" cy="46" r="14" fill="#fff" opacity=".5"/>',
      scifi: '<circle cx="158" cy="48" r="13" fill="#fff" opacity=".35"/><ellipse cx="158" cy="48" rx="24" ry="6" fill="none" stroke="#fff" stroke-width="2.5" opacity=".5" transform="rotate(-20 158 48)"/><g fill="#fff" opacity=".8"><circle cx="34" cy="40" r="2"/><circle cx="52" cy="70" r="1.5"/><circle cx="28" cy="96" r="1.6"/><circle cx="170" cy="100" r="1.8"/><circle cx="120" cy="22" r="1.4"/></g>',
      comedy: '<g opacity=".7"><circle cx="34" cy="44" r="5" fill="#E63946"/><circle cx="166" cy="62" r="6" fill="#2F5DFF"/><circle cx="150" cy="28" r="4" fill="#12B981"/><circle cx="26" cy="104" r="4" fill="#fff"/><rect x="56" y="24" width="8" height="8" rx="2" fill="#FF6FAE" transform="rotate(20 60 28)"/></g>',
      animation: '<g fill="#fff" opacity=".75"><path d="M160 34l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M36 60l2.500 6.500L45 69l-6.500 2.500L36 78l-2.500-6.500L27 69l6.500-2.500z"/><circle cx="170" cy="96" r="2.500"/></g>',
      horror: '<path d="M168 32a20 20 0 1 0 6 36 16 16 0 0 1-6-36z" fill="#F4F1D0" opacity=".85"/><g fill="#fff" opacity=".5"><circle cx="40" cy="44" r="1.500"/><circle cx="60" cy="24" r="1.200"/><circle cx="26" cy="80" r="1.300"/></g>',
      romance: '<g fill="#fff" opacity=".7"><path d="M160 40c-5-9-18-3-12 6l12 12 12-12c6-9-7-15-12-6z"/><path d="M36 70c-3-5.500-11-2-7.500 3.500L36 81l7.500-7.500C47 68 39 64.500 36 70z"/></g>',
      documentary: '<g fill="#fff" opacity=".45"><path d="M150 30c22 4 28 26 20 44-18-2-28-22-20-44z"/><path d="M30 50c14-2 24 10 22 26-14 0-24-12-22-26z"/></g>'
    }[a.genre];
    const emblem = { adventure: '<circle r="9" fill="none" stroke="#fff" stroke-width="2.200"/><path d="M0-6 2.500 0 0 6-2.500 0z" fill="#fff"/>', scifi: '<circle r="6" fill="#fff"/><ellipse rx="11" ry="3" fill="none" stroke="#fff" stroke-width="2" transform="rotate(-18)"/>', comedy: '<circle r="9" fill="#fff"/><circle cx="-3" cy="-2" r="1.300" fill="#14110F"/><circle cx="3" cy="-2" r="1.300" fill="#14110F"/><path d="M-4.500 2.500Q0 7 4.500 2.500" fill="none" stroke="#14110F" stroke-width="1.500" stroke-linecap="round"/>', animation: '<path d="M0-10l2.900 6.500 7.100.7-5.300 4.700 1.500 7L0 5l-6.200 3.900 1.500-7-5.300-4.700 7.100-.7z" fill="#fff"/>', horror: '<path d="M3-9a9 9 0 1 0 5 15A7.500 7.500 0 0 1 3-9z" fill="#fff"/>', romance: '<path d="M0-3c-3.500-6-12-1.500-8 4.500L0 10l8-8.500c4-6-4.500-10.500-8-4.500z" fill="#fff"/>', documentary: '<path d="M-7 7C-9-5 2-11 9-9 10 1 4 9-7 7z" fill="#fff"/><path d="M-6 6 4-4" stroke="' + sh + '" stroke-width="1.400"/>' }[a.genre];
    const back = { long: `<path d="M48 96c-6-44 18-70 52-70s58 26 52 70c-2 26 4 50 10 64H38c6-14 12-38 10-64z" fill="url(#${id}h)"/>`, bun: `<circle cx="100" cy="30" r="19" fill="url(#${id}h)"/><path d="M52 92c-4-40 18-62 48-62s52 22 48 62z" fill="url(#${id}h)"/>`, curly: `<g fill="url(#${id}h)"><circle cx="58" cy="70" r="21"/><circle cx="142" cy="70" r="21"/><circle cx="76" cy="44" r="23"/><circle cx="124" cy="44" r="23"/><circle cx="100" cy="36" r="23"/><circle cx="52" cy="98" r="15"/><circle cx="148" cy="98" r="15"/></g>`, short: `<path d="M53 90c-6-40 16-62 47-62s53 22 47 62z" fill="url(#${id}h)"/>`, bald: '' }[a.hair];
    const front = { long: `<path d="M56 86c2-30 20-46 44-46s42 16 44 46c-10-14-26-22-44-22-14 0-32 6-44 22z" fill="url(#${id}h)"/>`, bun: `<path d="M56 84c4-28 22-42 44-42s40 14 44 42c-12-12-28-18-44-18s-32 6-44 18z" fill="url(#${id}h)"/>`, curly: `<g fill="url(#${id}h)"><circle cx="72" cy="58" r="14"/><circle cx="92" cy="50" r="15"/><circle cx="112" cy="50" r="15"/><circle cx="130" cy="58" r="14"/></g>`, short: `<path d="M56 84c0-30 20-44 44-44s44 14 44 44c-8-16-18-24-30-26-10 8-34 8-48 4-4 6-8 14-10 22z" fill="url(#${id}h)"/>`, bald: '' }[a.hair];
    const brow = a.mood === 'bold' ? ['M70 76l22 5', 'M130 76l-22 5'] : a.mood === 'calm' ? ['M70 78q11-4 22 0', 'M108 78q11-4 22 0'] : ['M70 77q11-7 22-1', 'M108 76q11-6 22 1'];
    const mouth = a.mood === 'happy' ? `<path d="M82 122q18 20 36 0z" fill="#5A1E22"/><path d="M90 131q10 7 20 0-10-5-20 0z" fill="#F0808A"/><path d="M84 122.500h32" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` : a.mood === 'calm' ? `<path d="M86 124q14 9 28 0" fill="none" stroke="${dark(sk, .55)}" stroke-width="3.200" stroke-linecap="round"/>` : `<path d="M86 126q16 6 30-5" fill="none" stroke="${dark(sk, .55)}" stroke-width="3.200" stroke-linecap="round"/>`;
    const eye = x => `<ellipse cx="${x}" cy="97" rx="11.500" ry="13.500" fill="#fff"/><circle cx="${x + (x < 100 ? 1.500 : -1.500)}" cy="98.500" r="7.500" fill="${a.hc < 3 ? '#5B3A1E' : a.hc === 3 ? '#3E7C5A' : '#3B6FB5'}"/><circle cx="${x + (x < 100 ? 1.500 : -1.500)}" cy="98.500" r="3.800" fill="#14110F"/><circle cx="${x + (x < 100 ? 4.500 : 1.500)}" cy="95" r="2.600" fill="#fff"/>${fem ? `<path d="M${x - 11} 90q11-9 22 0" fill="none" stroke="#14110F" stroke-width="2.400" stroke-linecap="round"/>` : ''}`;
    return `<svg class="cbn-av" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${L('Profil avatarı', 'Profile avatar')}"><defs>
      <radialGradient id="${id}b" cx=".35" cy=".25" r="1"><stop offset="0" stop-color="${G[2]}"/><stop offset="1" stop-color="${G[3]}"/></radialGradient>
      <radialGradient id="${id}s" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${lite(sk, .22)}"/><stop offset=".6" stop-color="${sk}"/><stop offset="1" stop-color="${dark(sk, .2)}"/></radialGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lite(hc, .22)}"/><stop offset="1" stop-color="${dark(hc, .22)}"/></linearGradient>
      <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lite(sh, .16)}"/><stop offset="1" stop-color="${dark(sh, .22)}"/></linearGradient>
      <clipPath id="${id}c"><circle cx="100" cy="100" r="100"/></clipPath></defs>
      <g clip-path="url(#${id}c)"><rect width="200" height="200" fill="url(#${id}b)"/>${motif}${back}
        <path d="M88 136h24v26H88z" fill="${dark(sk, .16)}"/>
        <path d="M30 206c0-34 28-50 70-50s70 16 70 50z" fill="url(#${id}t)"/><path d="M82 158q18 16 36 0" fill="none" stroke="${dark(sh, .3)}" stroke-width="5" stroke-linecap="round"/>
        <g transform="translate(100 186)">${emblem}</g>
        <circle cx="55" cy="100" r="9" fill="${dark(sk, .1)}"/><circle cx="145" cy="100" r="9" fill="${dark(sk, .1)}"/>
        <ellipse cx="100" cy="94" rx="45" ry="50" fill="url(#${id}s)"/>
        ${a.beard ? `<path d="M58 104c2 34 22 44 42 44s40-10 42-44c-6 16-16 22-26 22-6-6-26-6-32 0-10 0-20-6-26-22z" fill="${hc}" opacity=".88"/>` : ''}
        <circle cx="72" cy="116" r="8" fill="#FF7A7A" opacity=".22"/><circle cx="128" cy="116" r="8" fill="#FF7A7A" opacity=".22"/>
        ${front}${eye(82)}${eye(118)}
        <path d="${brow[0]}" fill="none" stroke="${dark(hc, a.hc > 4 ? .5 : .1)}" stroke-width="4" stroke-linecap="round"/><path d="${brow[1]}" fill="none" stroke="${dark(hc, a.hc > 4 ? .5 : .1)}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="100" cy="111" rx="5" ry="3.600" fill="${dark(sk, .18)}"/><ellipse cx="98.500" cy="109.500" rx="2" ry="1.200" fill="${lite(sk, .35)}"/>
        ${mouth}
        ${a.glasses ? `<g fill="rgba(255,255,255,.18)" stroke="#14110F" stroke-width="3.200"><circle cx="82" cy="97" r="15.500"/><circle cx="118" cy="97" r="15.500"/><path d="M97.500 96h5M66.500 95l-10-3M133.500 95l10-3" fill="none"/></g>` : ''}
        <ellipse cx="82" cy="60" rx="20" ry="8" fill="#fff" opacity="${a.hair === 'bald' ? .28 : 0}"/></g></svg>`;
  }
  const prof = () => S.settings.profile && typeof S.settings.profile === 'object' ? S.settings.profile : null;
  const name = () => { const p = prof(); return (p && typeof p.name === 'string' && p.name.trim().slice(0, 40)) || (CBN.me() || {}).name || ''; };
  const mine = size => { const p = prof(); return p && p.avatar ? svg(p.avatar, size) : ''; };

  function wizard() {
    const p = prof() || {}, a = clean(p.avatar), touched = !!p.avatar; let nm = name(), i = 0, hairSet = touched;
    const opt = (k, v, label) => `<button type="button" class="pf-o${a[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}" role="radio" aria-checked="${a[k] === v}">${esc(label)}</button>`;
    const sw = (k, arr) => arr.map((c, j) => `<button type="button" class="pf-sw${a[k] === j ? ' on' : ''}" data-k="${k}" data-v="${j}" role="radio" aria-checked="${a[k] === j}" aria-label="${L('Renk', 'Colour')} ${j + 1}" style="background:${c}"></button>`).join('');
    const yn = (k, label) => `<label class="st-sw big"><input type="checkbox" data-c="${k}" ${a[k] ? 'checked' : ''}> ${esc(label)}</label>`;
    const steps = [
      [L('Sana nasıl hitap edelim?', 'What should we call you?'), () => `<input class="pf-name" maxlength="40" value="${esc(nm)}" aria-label="${L('Görünen ad', 'Display name')}">`],
      [L('Avatarın nasıl görünsün?', 'How should your avatar look?'), () => opt('g', 'm', L('Erkek', 'Man')) + opt('g', 'f', L('Kadın', 'Woman')) + opt('g', 'x', L('Fark etmez', 'No preference'))],
      [L('Ten tonun hangisine yakın?', 'Which skin tone is closest?'), () => sw('skin', SKIN)],
      [L('Saçın nasıl?', 'What is your hair like?'), () => Object.keys(STYLES).map(k => opt('hair', k, L(STYLES[k][0], STYLES[k][1]))).join('') + `<div class="pf-row">${sw('hc', HAIR)}</div>`],
      [L('Gözlük ya da sakal?', 'Glasses or a beard?'), () => yn('glasses', L('Gözlük takıyorum', 'I wear glasses')) + yn('beard', L('Sakalım var', 'I have a beard'))],
      [L('Hangi film türünü en çok seversin?', 'Which film genre do you like most?'), () => Object.keys(GENRES).map(k => opt('genre', k, L(GENRES[k][0], GENRES[k][1]))).join('')],
      [L('Seni en iyi hangisi anlatır?', 'Which describes you best?'), () => Object.keys(MOODS).map(k => opt('mood', k, L(MOODS[k][0], MOODS[k][1]))).join('')],
      [L('En sevdiğin renk?', 'Your favourite colour?'), () => sw('shirt', SHIRT)]
    ];
    modal({ title: L('Profilini oluştur', 'Create your profile'), html: `<div class="pf"><div class="pf-prev"></div><p class="pf-step"></p><h3 class="pf-q"></h3><div class="pf-opts" role="radiogroup"></div><div class="cbn-actions"><button type="button" class="cbn-btn ghost" data-a="back">${L('Geri', 'Back')}</button><span class="sp"></span><button type="button" class="cbn-btn" data-a="next"></button></div></div>`,
      onOpen(box, close) {
        const $ = q => box.querySelector(q), prev = () => $('.pf-prev').innerHTML = svg(a, 150);
        const draw = () => {
          $('.pf-step').textContent = `${i + 1} / ${steps.length}`; $('.pf-q').textContent = steps[i][0]; $('.pf-opts').innerHTML = steps[i][1](); $('[data-a=back]').disabled = !i; $('[data-a=next]').textContent = i === steps.length - 1 ? L('Avatarı oluştur', 'Create avatar') : L('İleri', 'Next'); prev();
          box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; a[k] = /^\d+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; if (k === 'hair') hairSet = true; if (k === 'g' && !hairSet) a.hair = a.g === 'f' ? 'long' : 'short'; if (k === 'g' && a.g === 'f') a.beard = false; draw(); const f = box.querySelector(`[data-k="${k}"].on`); if (f) f.focus(); });
          box.querySelectorAll('[data-c]').forEach(c => c.onchange = () => { a[c.dataset.c] = c.checked; prev(); });
          const n = $('.pf-name'); if (n) { n.oninput = () => nm = n.value; n.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-a=next]').click(); } }; setTimeout(() => n.focus(), 30); }
        };
        $('[data-a=back]').onclick = () => { if (i) { i--; draw(); } };
        $('[data-a=next]').onclick = async () => {
          if (i < steps.length - 1) { i++; return draw(); }
          S.settings.profile = { name: nm.trim().slice(0, 40), avatar: clean(a), at: Date.now() }; await CBN.saveSettings(); close(); CBN.redraw(); toast(L('Avatarın hazır', 'Your avatar is ready'));
        };
        draw();
      } });
  }
  CBN.profile = { svg, mine, name, wizard, has: () => !!(prof() && prof().avatar) };
})();

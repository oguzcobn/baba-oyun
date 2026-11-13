/* =====================================================================
   BABA. Draft — Kulüp kimliği: isim, kısaltma, şehir, renkler, forma, logo
   Tüm görseller özgün SVG'dir (gerçek kulüp logoları kopyalanmaz).
   ClubID.get() · ClubID.set(o) · ClubID.editor(el, onChange) · ClubID.logo(id, px) · ClubID.shirt(id, px)
   ===================================================================== */
const ClubID = (() => {
  'use strict';
  const KEY = 'draft_identity_v1';
  const T = (tr, en) => (typeof I18N !== 'undefined' && I18N.lang === 'en') ? en : tr;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CITIES = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];
  const PRESETS = [['#7b1e3b', '#5aa9e6'], ['#ffd200', '#0b2a5b'], ['#f5b400', '#c8102e'], ['#111111', '#ffffff'], ['#0b7a33', '#ffffff'], ['#d40000', '#ffffff'], ['#ff4d00', '#111111'], ['#5b2a86', '#ffffff'], ['#0e4da4', '#ffffff'], ['#1a8f8a', '#f4d35e']];
  const KITS = () => [['duz', T('Düz', 'Plain')], ['dikey', T('Dikey çizgili', 'Vertical stripes')], ['ince', T('İnce çizgili', 'Pinstripes')], ['yatay', T('Yatay şeritli', 'Hoops')], ['yarim', T('Yarım yarım', 'Halves')], ['capraz', T('Çapraz kuşak', 'Sash')], ['bant', T('Göğüs bandı', 'Chest band')], ['kol', T('Renkli kollar', 'Contrast sleeves')]];
  const SHAPES = () => [['kalkan', T('Kalkan', 'Shield')], ['yuvarlak', T('Yuvarlak', 'Roundel')], ['altigen', T('Altıgen', 'Hexagon')], ['elmas', T('Elmas', 'Diamond')], ['rozet', T('Klasik rozet', 'Classic crest')]];
  const SYMS = () => [['yildiz', '★', T('Yıldız', 'Star')], ['top', '⚽', T('Top', 'Ball')], ['gemi', '⛵', T('Yelkenli', 'Sailboat')], ['dalga', '🌊', T('Dalga', 'Wave')], ['dag', '⛰️', T('Dağ', 'Mountain')], ['tac', '👑', T('Taç', 'Crown')], ['simsek', '⚡', T('Şimşek', 'Lightning')], ['capa', '⚓', T('Çapa', 'Anchor')], ['gunes', '☀️', T('Güneş', 'Sun')], ['yok', '∅', T('Sembolsüz', 'No symbol')]];
  const DEF = { name: '', short: '', city: '', c1: '#7b1e3b', c2: '#5aa9e6', kit: 'dikey', shape: 'kalkan', sym: 'gemi', txt: '', year: new Date().getFullYear(), bg: true };
  const get = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); return o ? Object.assign({}, DEF, o) : null; } catch (e) { return null; } };
  const set = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const autoShort = n => { const w = String(n || '').trim().toLocaleUpperCase('tr-TR').split(/\s+/).filter(Boolean); if (!w.length) return 'SEN'; return (w.length > 1 ? w.slice(0, 3).map(x => x[0]).join('') : w[0].slice(0, 3)).replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '').slice(0, 3) || 'SEN'; };
  const lum = c => { const h = String(c).replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000; };
  let uidN = 0;

  /* -------- desen (forma ve logo arka planı) -------- */
  function pattern(kit, c1, c2, w, h, id) {
    let s = `<rect width="${w}" height="${h}" fill="${c1}"/>`;
    if (kit === 'dikey') for (let x = w / 9; x < w; x += w * 2 / 9) s += `<rect x="${x}" width="${w / 9}" height="${h}" fill="${c2}"/>`;
    if (kit === 'ince') for (let x = w / 14; x < w; x += w / 7) s += `<rect x="${x}" width="${w / 40}" height="${h}" fill="${c2}"/>`;
    if (kit === 'yatay') for (let y = h / 8; y < h; y += h / 4) s += `<rect y="${y}" width="${w}" height="${h / 8}" fill="${c2}"/>`;
    if (kit === 'yarim') s += `<rect x="${w / 2}" width="${w / 2}" height="${h}" fill="${c2}"/>`;
    if (kit === 'capraz') s += `<path d="M${w * .05} 0 L${w * .38} 0 L${w * .95} ${h} L${w * .62} ${h} Z" fill="${c2}" transform="scale(-1 1) translate(-${w} 0)"/>`;
    if (kit === 'bant') s += `<rect y="${h * .34}" width="${w}" height="${h * .16}" fill="${c2}"/>`;
    return s;
  }
  /* -------- forma -------- */
  function shirt(o, px) {
    o = Object.assign({}, DEF, o || {}); const id = 'cs' + (++uidN), num = lum(o.kit === 'duz' || o.kit === 'kol' ? o.c1 : o.c1) > 150 ? '#111' : '#fff';
    const body = 'M30 8 L42 4 Q50 12 58 4 L70 8 L94 22 L84 42 L74 37 L74 96 L26 96 L26 37 L16 42 L6 22 Z';
    return `<svg class="cid-shirt" viewBox="0 0 100 100" width="${px || 80}" height="${px || 80}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
      <g clip-path="url(#${id})">${pattern(o.kit, o.c1, o.c2, 100, 100)}${o.kit === 'kol' ? `<path d="M6 22 L30 8 L26 37 L16 42 Z M94 22 L70 8 L74 37 L84 42 Z" fill="${o.c2}"/>` : ''}</g>
      <path d="${body}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><path d="M42 4 Q50 14 58 4" fill="none" stroke="${o.c2 === o.c1 ? '#fff' : o.c2}" stroke-width="4"/>
      <g transform="translate(58 30) scale(.16)">${crestInner(o)}</g><text x="50" y="76" text-anchor="middle" font-size="18" font-weight="900" font-family="system-ui,sans-serif" fill="${o.kit === 'dikey' || o.kit === 'yarim' ? '#fff' : num}" stroke="rgba(0,0,0,.35)" stroke-width=".8">9</text></svg>`;
  }
  /* -------- logo -------- */
  const SHAPE_PATH = { kalkan: 'M10 8 H90 V58 Q90 96 50 114 Q10 96 10 58 Z', altigen: 'M50 4 L94 30 L94 86 L50 114 L6 86 L6 30 Z', elmas: 'M50 2 L98 58 L50 116 L2 58 Z', yuvarlak: 'M50 6 A52 52 0 1 1 49.9 6 Z', rozet: 'M50 6 A52 52 0 1 1 49.9 6 Z' };
  function symbol(sym, col) {
    const st = `fill="${col}"`;
    return ({
      yildiz: `<path ${st} d="M50 30 L56.5 46 L74 47 L60.5 58 L65 75 L50 65.5 L35 75 L39.5 58 L26 47 L43.5 46 Z"/>`,
      top: `<circle cx="50" cy="54" r="21" ${st}/><path fill="rgba(0,0,0,.55)" d="M50 44 L59 50.5 L55.5 61 L44.5 61 L41 50.5 Z"/><path stroke="rgba(0,0,0,.45)" stroke-width="2" fill="none" d="M50 44 V33 M59 50.5 L69 46 M55.5 61 L62 70 M44.5 61 L38 70 M41 50.5 L31 46"/>`,
      gemi: `<path ${st} d="M48 26 L48 64 L28 64 Z"/><path ${st} opacity=".8" d="M52 32 L52 64 L68 64 Z"/><path ${st} d="M24 68 H76 L68 78 H32 Z"/><path fill="none" stroke="${col}" stroke-width="2.5" d="M22 84 q7 -5 14 0 t14 0 t14 0 t14 0"/>`,
      dalga: `<path fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" d="M24 44 q7 -8 13 0 t13 0 t13 0 t13 0 M24 58 q7 -8 13 0 t13 0 t13 0 t13 0 M24 72 q7 -8 13 0 t13 0 t13 0 t13 0"/>`,
      dag: `<path ${st} d="M20 76 L42 38 L52 54 L60 44 L80 76 Z"/><path fill="rgba(255,255,255,.85)" d="M42 38 L48 48 L44 46 L40 50 L37 47 Z"/>`,
      tac: `<path ${st} d="M24 70 L28 40 L40 54 L50 34 L60 54 L72 40 L76 70 Z"/><rect ${st} x="24" y="72" width="52" height="7" rx="2"/>`,
      simsek: `<path ${st} d="M56 26 L34 58 H48 L42 84 L66 48 H52 Z"/>`,
      capa: `<g fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"><circle cx="50" cy="32" r="5"/><path d="M50 37 V80 M38 46 H62 M28 64 Q32 80 50 80 Q68 80 72 64"/></g>`,
      gunes: `<circle cx="50" cy="56" r="13" ${st}/><g stroke="${col}" stroke-width="4" stroke-linecap="round">${Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return `<path d="M${50 + Math.cos(a) * 19} ${56 + Math.sin(a) * 19} L${50 + Math.cos(a) * 27} ${56 + Math.sin(a) * 27}"/>`; }).join('')}</g>`,
      yok: ''
    })[sym] || '';
  }
  function crestInner(o, id) {
    id = id || 'cl' + (++uidN);
    const path = SHAPE_PATH[o.shape] || SHAPE_PATH.kalkan, ink = lum(o.c1) > 165 && !o.bg ? '#111' : '#fff';
    const txt = (o.txt || o.short || autoShort(o.name)).slice(0, 4), round = o.shape === 'yuvarlak' || o.shape === 'rozet';
    const symCol = o.bg && o.kit !== 'duz' ? '#fff' : (o.c2 && Math.abs(lum(o.c2) - lum(o.c1)) > 40 ? o.c2 : ink);
    let s = `<defs><clipPath id="${id}"><path d="${path}" transform="translate(-4 -2)"/></clipPath></defs>
      <path d="${path}" transform="translate(-4 -2)" fill="${o.c2}"/><g clip-path="url(#${id})"><g transform="translate(6 8) scale(.88)"><path d="${path}" transform="translate(-4 -2)" fill="${o.c1}"/></g>
      ${o.bg ? `<g opacity=".9" transform="translate(6 8) scale(.88)">${pattern(o.kit === 'duz' ? 'dikey' : o.kit, o.c1, o.c2, 100, 120)}</g>` : ''}</g>`;
    if (o.shape === 'rozet') { const rid = id + 'r'; s += `<circle cx="46" cy="58" r="38" fill="${o.c1}" stroke="${o.c2}" stroke-width="2"/><path id="${rid}" d="M18 58 A28 28 0 1 1 74 58" fill="none"/><text font-size="9" font-weight="800" letter-spacing="1.2" fill="#fff" font-family="system-ui,sans-serif"><textPath href="#${rid}" startOffset="50%" text-anchor="middle">${esc((o.name || 'KULÜBÜM').toLocaleUpperCase('tr-TR').slice(0, 22))}</textPath></text>`; }
    s += `<g transform="translate(-4 ${round ? 2 : -4}) ${o.shape === 'rozet' ? 'translate(13 18) scale(.72)' : ''}">${symbol(o.sym, symCol)}</g>`;
    if (o.sym === 'yok' || o.shape !== 'rozet') s += `<text x="46" y="${o.sym === 'yok' ? 66 : round ? 30 : 26}" text-anchor="middle" font-size="${o.sym === 'yok' ? 26 : 12}" font-weight="900" letter-spacing="1" font-family="system-ui,sans-serif" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".6">${esc(txt)}</text>`;
    if (o.year) s += `<text x="46" y="${o.shape === 'rozet' ? 104 : round ? 100 : 98}" text-anchor="middle" font-size="8.5" font-weight="800" font-family="system-ui,sans-serif" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".4">${esc(String(o.year).slice(0, 4))}</text>`;
    return s;
  }
  function logo(o, px) { o = Object.assign({}, DEF, o || {}); return `<svg class="cid-logo" viewBox="-6 -4 104 124" width="${px || 64}" height="${(px || 64) * 124 / 104}" role="img" aria-label="${esc(o.name || T('Kulüp logosu', 'Club crest'))}">${crestInner(o)}</svg>`; }

  /* -------- düzenleyici -------- */
  function editor(el, onChange) {
    let o = get() || Object.assign({}, DEF);
    const preview = () => `<div class="cid-art">${logo(o, 112)}${shirt(o, 120)}</div><div><p class="eyebrow">${esc(o.city || T('Şehir seç', 'Pick a city'))} · ${T('Kuruluş', 'Founded')} ${esc(o.year)}</p><h3>${esc(o.name || T('Kulübüne bir isim ver', 'Name your club'))}</h3><p class="cid-short">${esc(o.short || autoShort(o.name))}</p></div>`;
    const presets = () => PRESETS.map(([a, b], i) => `<button type="button" data-pre="${i}" title="${a} / ${b}" style="--a:${a};--b:${b}" class="${o.c1 === a && o.c2 === b ? 'on' : ''}"></button>`).join('');
    const kits = () => KITS().map(([k, l]) => `<button type="button" data-kit="${k}" class="${o.kit === k ? 'on' : ''}">${shirt(Object.assign({}, o, { kit: k }), 46)}<small>${l}</small></button>`).join('');
    const shapes = () => SHAPES().map(([k, l]) => `<button type="button" data-shape="${k}" class="${o.shape === k ? 'on' : ''}">${logo(Object.assign({}, o, { shape: k }), 40)}<small>${l}</small></button>`).join('');
    const syms = () => SYMS().map(([k, e, l]) => `<button type="button" data-sym="${k}" class="${o.sym === k ? 'on' : ''}" title="${l}"><span>${e}</span><small>${l}</small></button>`).join('');
    el.innerHTML = `<div class="cid">
        <div class="cid-preview"></div>
        <div class="cid-grid">
          <label>${T('Kulüp adı', 'Club name')}<input data-f="name" maxlength="26" value="${esc(o.name)}" placeholder="${T('Örn. Liman Gücü SK', 'e.g. Harbour Athletic')}"></label>
          <label>${T('Kısaltma', 'Short name')}<input data-f="short" maxlength="3" value="${esc(o.short)}" placeholder="${esc(autoShort(o.name))}"></label>
          <label>${T('Şehir', 'City')}<input data-f="city" list="cidCities" maxlength="24" value="${esc(o.city)}" placeholder="${T('Şehir yaz ya da seç', 'Type or pick a city')}"><datalist id="cidCities">${CITIES.map(c => `<option value="${c}">`).join('')}</datalist></label>
          <label>${T('Kuruluş yılı', 'Founded')}<input data-f="year" type="number" min="1850" max="2100" value="${esc(o.year)}"></label>
        </div>
        <p class="eyebrow">${T('Renkler', 'Colours')}</p>
        <div class="cid-colors"><label>${T('Ana renk', 'Primary')}<input type="color" data-f="c1" value="${o.c1}"></label><label>${T('İkinci renk', 'Secondary')}<input type="color" data-f="c2" value="${o.c2}"></label><div class="cid-presets"></div></div>
        <p class="eyebrow">${T('Forma', 'Kit')}</p><div class="cid-opts kits"></div>
        <p class="eyebrow">${T('Logo tasarımı', 'Crest design')}</p><div class="cid-opts shapes"></div><div class="cid-opts syms"></div>
        <div class="cid-grid"><label>${T('Logodaki yazı (en çok 4 harf)', 'Crest letters (max 4)')}<input data-f="txt" maxlength="4" value="${esc(o.txt)}" placeholder="${esc(o.short || autoShort(o.name))}"></label>
          <label class="cid-check"><input type="checkbox" data-f="bg" ${o.bg ? 'checked' : ''}> ${T('Logoda forma deseni kullan', 'Use the kit pattern in the crest')}</label></div>
      </div>`;
    const q = s => el.querySelector(s);
    // form alanları bir kez çizilir; yalnızca önizlemeler yenilenir (yazarken odak kaybolmaz)
    function refresh(thumbs) {
      q('.cid-preview').innerHTML = preview();
      q('[data-f=short]').placeholder = autoShort(o.name); q('[data-f=txt]').placeholder = o.short || autoShort(o.name);
      if (!thumbs) return;
      q('.cid-presets').innerHTML = presets(); q('.kits').innerHTML = kits(); q('.shapes').innerHTML = shapes(); q('.syms').innerHTML = syms();
      el.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { [o.c1, o.c2] = PRESETS[+b.dataset.pre]; q('[data-f=c1]').value = o.c1; q('[data-f=c2]').value = o.c2; commit(true); });
      el.querySelectorAll('[data-kit]').forEach(b => b.onclick = () => { o.kit = b.dataset.kit; commit(true); });
      el.querySelectorAll('[data-shape]').forEach(b => b.onclick = () => { o.shape = b.dataset.shape; commit(true); });
      el.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => { o.sym = b.dataset.sym; commit(true); });
    }
    let tmr = 0;
    const commit = thumbs => { set(o); onChange && onChange(o); refresh(thumbs); };
    el.querySelectorAll('[data-f]').forEach(i => {
      const read = () => { const f = i.dataset.f; o[f] = i.type === 'checkbox' ? i.checked : f === 'short' || f === 'txt' ? i.value.toLocaleUpperCase('tr-TR') : f === 'year' ? (parseInt(i.value, 10) || '') : i.value; };
      if (i.type === 'color' || i.type === 'checkbox') i.addEventListener(i.type === 'color' ? 'input' : 'change', () => { read(); commit(true); });
      else i.addEventListener('input', () => { read(); commit(false); clearTimeout(tmr); tmr = setTimeout(() => refresh(true), 350); });
    });
    refresh(true);
  }
  return { get, set, editor, logo, shirt, autoShort, CITIES };
})();

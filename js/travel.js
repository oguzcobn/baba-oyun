"use strict";
/* =====================================================================
   SEYAHAT — Booking · Airbnb · Skyscanner kısayolları + GEZİLERİM (3D dünya).
   Şehirler önce yerleşik listeden, bulunamazsa OpenStreetMap Nominatim
   ile (tarayıcıdan, anahtar gerekmez) bulunur. Geziler yalnızca bu cihazda.
   ===================================================================== */
const Travel = (() => {
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mapOf = s => Object.fromEntries(s.split('|').map(x => x.split(':')));
  const C_EN = mapOf('Hollanda:Netherlands|Almanya:Germany|İsviçre:Switzerland|Fransa:France|Türkiye:Turkey|İskoçya:Scotland|Birleşik Krallık:United Kingdom|Belçika:Belgium|Lüksemburg:Luxembourg|Avusturya:Austria|Çekya:Czechia|Macaristan:Hungary|Polonya:Poland|İtalya:Italy|İspanya:Spain|Portekiz:Portugal|Yunanistan:Greece|Danimarka:Denmark|İsveç:Sweden|Norveç:Norway|Finlandiya:Finland|İzlanda:Iceland|İrlanda:Ireland|Hırvatistan:Croatia|Bosna-Hersek:Bosnia and Herzegovina|Romanya:Romania|Bulgaristan:Bulgaria|Gürcistan:Georgia|BAE:UAE|Katar:Qatar|Mısır:Egypt|Fas:Morocco|ABD:USA|Kanada:Canada|Japonya:Japan|Güney Kore:South Korea|Singapur:Singapore|Tayland:Thailand|Endonezya:Indonesia|Avustralya:Australia|Brezilya:Brazil|Arjantin:Argentina|Güney Afrika:South Africa|Diğer:Other'), N_EN = mapOf('Zürih:Zurich|Strazburg:Strasbourg|İstanbul:Istanbul|İzmir:Izmir|Kapadokya:Cappadocia|Londra:London|Marsilya:Marseille|Münih:Munich|Köln:Cologne|Lahey:The Hague|Brüksel:Brussels|Brugge:Bruges|Anvers:Antwerp|Lüksemburg:Luxembourg|Cenevre:Geneva|Lozan:Lausanne|Viyana:Vienna|Prag:Prague|Budapeşte:Budapest|Varşova:Warsaw|Krakov:Kraków|Roma:Rome|Milano:Milan|Venedik:Venice|Floransa:Florence|Napoli:Naples|Barselona:Barcelona|Sevilla:Seville|Valensiya:Valencia|Lizbon:Lisbon|Atina:Athens|Selanik:Thessaloniki|Kopenhag:Copenhagen|Saraybosna:Sarajevo|Bükreş:Bucharest|Sofya:Sofia|Tiflis:Tbilisi|Batum:Batumi|Kahire:Cairo|Marakeş:Marrakesh|Seul:Seoul|Singapur:Singapore|Sidney:Sydney');
  const cn = c => I18N.lang === 'en' ? (C_EN[c] || c) : c, tn = n => I18N.lang === 'en' ? (N_EN[n] || n) : n;   // kayıtlar Türkçe saklanır, İngilizcede adları çevrilir
  const SITES = [
    { t: 'Booking.com', d: ['Otel, apart ve konaklama', 'Hotels, apartments and stays'], u: 'https://www.booking.com/index.tr.html', c: 'tv-bk', e: '🏨' },
    { t: 'Airbnb', d: ['Ev, oda ve deneyimler', 'Homes, rooms and experiences'], u: 'https://www.airbnb.com.tr/', c: 'tv-ab', e: '🏡' },
    { t: 'Skyscanner', d: ['Uçuş, araç ve otel karşılaştırma', 'Compare flights, car hire and hotels'], u: 'https://www.skyscanner.com.tr/', c: 'tv-ss', e: '✈️' }
  ];
  // yerleşik şehir listesi: [ad, enlem, boylam, ülke, eş adlar]
  const GAZ = [
    ['Amsterdam', 52.3676, 4.9041, 'Hollanda'], ['Düsseldorf', 51.2277, 6.7735, 'Almanya', 'dusseldorf'], ['Zürih', 47.3769, 8.5417, 'İsviçre', 'zurich,zürich,zurih'], ['Basel', 47.5596, 7.5886, 'İsviçre'],
    ['Colmar', 48.0794, 7.3585, 'Fransa'], ['Strazburg', 48.5734, 7.7521, 'Fransa', 'strasbourg,strassburg'], ['İstanbul', 41.0082, 28.9784, 'Türkiye', 'istanbul'], ['Ankara', 39.9334, 32.8597, 'Türkiye'],
    ['Antalya', 36.8969, 30.7133, 'Türkiye'], ['Trabzon', 41.0027, 39.7168, 'Türkiye'], ['İzmir', 38.4237, 27.1428, 'Türkiye', 'izmir'], ['Bodrum', 37.0344, 27.4305, 'Türkiye'], ['Kapadokya', 38.6431, 34.8289, 'Türkiye', 'göreme,goreme,cappadocia'],
    ['Edinburgh', 55.9533, -3.1883, 'İskoçya', 'edinburg'], ['Glasgow', 55.8642, -4.2518, 'İskoçya'], ['Aberdeen', 57.1497, -2.0943, 'İskoçya'], ['Inverness', 57.4778, -4.2247, 'İskoçya'], ['Londra', 51.5072, -0.1276, 'Birleşik Krallık', 'london'],
    ['Paris', 48.8566, 2.3522, 'Fransa'], ['Lyon', 45.764, 4.8357, 'Fransa'], ['Nice', 43.7102, 7.262, 'Fransa'], ['Marsilya', 43.2965, 5.3698, 'Fransa', 'marseille'], ['Berlin', 52.52, 13.405, 'Almanya'], ['Münih', 48.1351, 11.582, 'Almanya', 'munich,münchen,munih'],
    ['Köln', 50.9375, 6.9603, 'Almanya', 'koln,cologne'], ['Frankfurt', 50.1109, 8.6821, 'Almanya'], ['Hamburg', 53.5511, 9.9937, 'Almanya'], ['Stuttgart', 48.7758, 9.1829, 'Almanya'], ['Heidelberg', 49.3988, 8.6724, 'Almanya'], ['Freiburg', 47.999, 7.8421, 'Almanya'],
    ['Rotterdam', 51.9244, 4.4777, 'Hollanda'], ['Lahey', 52.0705, 4.3007, 'Hollanda', 'den haag,the hague'], ['Utrecht', 52.0907, 5.1214, 'Hollanda'], ['Gorinchem', 51.8306, 4.9742, 'Hollanda'], ['Brüksel', 50.8503, 4.3517, 'Belçika', 'brussels,bruxelles'], ['Brugge', 51.2093, 3.2247, 'Belçika', 'bruges'], ['Anvers', 51.2194, 4.4025, 'Belçika', 'antwerp,antwerpen'],
    ['Lüksemburg', 49.6116, 6.1319, 'Lüksemburg', 'luxembourg'], ['Cenevre', 46.2044, 6.1432, 'İsviçre', 'geneva,genève'], ['Bern', 46.948, 7.4474, 'İsviçre'], ['Luzern', 47.0502, 8.3093, 'İsviçre', 'lucerne'], ['Lozan', 46.5197, 6.6323, 'İsviçre', 'lausanne'], ['Interlaken', 46.6863, 7.8632, 'İsviçre'],
    ['Viyana', 48.2082, 16.3738, 'Avusturya', 'vienna,wien'], ['Salzburg', 47.8095, 13.055, 'Avusturya'], ['Prag', 50.0755, 14.4378, 'Çekya', 'prague,praha'], ['Budapeşte', 47.4979, 19.0402, 'Macaristan', 'budapest'], ['Varşova', 52.2297, 21.0122, 'Polonya', 'warsaw'], ['Krakov', 50.0647, 19.945, 'Polonya', 'krakow,kraków'],
    ['Roma', 41.9028, 12.4964, 'İtalya', 'rome'], ['Milano', 45.4642, 9.19, 'İtalya', 'milan'], ['Venedik', 45.4408, 12.3155, 'İtalya', 'venice,venezia'], ['Floransa', 43.7696, 11.2558, 'İtalya', 'florence,firenze'], ['Napoli', 40.8518, 14.2681, 'İtalya', 'naples'], ['Como', 45.8081, 9.0852, 'İtalya'],
    ['Madrid', 40.4168, -3.7038, 'İspanya'], ['Barselona', 41.3874, 2.1686, 'İspanya', 'barcelona'], ['Sevilla', 37.3891, -5.9845, 'İspanya', 'seville'], ['Valensiya', 39.4699, -0.3763, 'İspanya', 'valencia'], ['Lizbon', 38.7223, -9.1393, 'Portekiz', 'lisbon,lisboa'], ['Porto', 41.1579, -8.6291, 'Portekiz'],
    ['Atina', 37.9838, 23.7275, 'Yunanistan', 'athens'], ['Selanik', 40.6401, 22.9444, 'Yunanistan', 'thessaloniki'], ['Kopenhag', 55.6761, 12.5683, 'Danimarka', 'copenhagen'], ['Stockholm', 59.3293, 18.0686, 'İsveç'], ['Oslo', 59.9139, 10.7522, 'Norveç'], ['Helsinki', 60.1699, 24.9384, 'Finlandiya'], ['Reykjavik', 64.1466, -21.9426, 'İzlanda'],
    ['Dublin', 53.3498, -6.2603, 'İrlanda'], ['Dubrovnik', 42.6507, 18.0944, 'Hırvatistan'], ['Saraybosna', 43.8563, 18.4131, 'Bosna-Hersek', 'sarajevo'], ['Bükreş', 44.4268, 26.1025, 'Romanya', 'bucharest'], ['Sofya', 42.6977, 23.3219, 'Bulgaristan', 'sofia'], ['Tiflis', 41.7151, 44.8271, 'Gürcistan', 'tbilisi'], ['Batum', 41.6168, 41.6367, 'Gürcistan', 'batumi'],
    ['Dubai', 25.2048, 55.2708, 'BAE'], ['Doha', 25.2854, 51.531, 'Katar'], ['Kahire', 30.0444, 31.2357, 'Mısır', 'cairo'], ['Marakeş', 31.6295, -7.9811, 'Fas', 'marrakech'], ['New York', 40.7128, -74.006, 'ABD'], ['Los Angeles', 34.0522, -118.2437, 'ABD'], ['Miami', 25.7617, -80.1918, 'ABD'],
    ['Toronto', 43.6532, -79.3832, 'Kanada'], ['Tokyo', 35.6762, 139.6503, 'Japonya'], ['Kyoto', 35.0116, 135.7681, 'Japonya'], ['Seul', 37.5665, 126.978, 'Güney Kore', 'seoul'], ['Singapur', 1.3521, 103.8198, 'Singapur', 'singapore'], ['Bangkok', 13.7563, 100.5018, 'Tayland'], ['Bali', -8.4095, 115.1889, 'Endonezya'],
    ['Hanoi', 21.0278, 105.8342, 'Vietnam'], ['Ho Chi Minh', 10.8231, 106.6297, 'Vietnam', 'saigon'], ['Sidney', -33.8688, 151.2093, 'Avustralya', 'sydney'], ['Rio de Janeiro', -22.9068, -43.1729, 'Brezilya'], ['Buenos Aires', -34.6037, -58.3816, 'Arjantin'], ['Cape Town', -33.9249, 18.4241, 'Güney Afrika']
  ];
  const DEFAULT_TRIPS = ['Amsterdam', 'Düsseldorf', 'Zürih', 'Basel', 'Colmar', 'Strazburg'];
  const trips = () => { let t = ls.get('trips', null); if (!t) { t = DEFAULT_TRIPS.map(n => { const g = GAZ.find(x => x[0] === n); return { id: uid(), name: g[0], lat: g[1], lon: g[2], country: g[3], date: '', note: '' }; }); ls.set('trips', t); } return t; };
  const saveT = t => ls.set('trips', t);
  const fold = s => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').trim();
  function findLocal(q) { const f = fold(q); return GAZ.find(g => fold(g[0]) === f || (g[4] || '').split(',').some(a => fold(a) === f)); }
  async function geocode(q) {
    const g = findLocal(q); if (g) return { name: g[0], lat: g[1], lon: g[2], country: g[3] };
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=' + I18N.lang + '&addressdetails=1&q=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } });
    const j = await r.json(); if (!j.length) return null;
    const a = j[0].address || {};
    return { name: a.city || a.town || a.village || j[0].name || q, lat: +j[0].lat, lon: +j[0].lon, country: a.country || '' };
  }
  function loadScript(src) { return new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }

  let el = null, globe = null, tab = 'seyahat';
  function open(root, r) { el = root; tab = r === 'gezilerim' ? 'gezilerim' : 'seyahat'; draw(); }
  function leave() { if (globe) { globe.dispose(); globe = null; } }
  function draw() {
    leave();
    el.innerHTML = `<div class="tv">
      <header class="tv-head"><p class="tv-eye">BABA. / ${T('SEYAHAT', 'TRAVEL')}</p><h1>${T('Bir sonraki<br><em>rota</em> nereye?', 'Where’s the<br>next <em>route</em>?')}</h1>
        <nav class="tv-tabs"><a href="#seyahat" class="${tab === 'seyahat' ? 'on' : ''}">${T('Rezervasyon', 'Bookings')}</a><a href="#gezilerim" class="${tab === 'gezilerim' ? 'on' : ''}">🌍 ${T('Gezilerim', 'My Travels')}</a></nav></header>
      ${tab === 'seyahat' ? bookingHtml() : globeHtml()}
    </div>`;
    if (tab === 'gezilerim') mountGlobe(); else if (typeof Flights !== 'undefined') Flights.mount(el);
  }
  function bookingHtml() {
    const t = trips(), c = new Set(t.map(x => x.country).filter(Boolean));
    return `<section class="tv-sites">${SITES.map(s => `<a class="tv-site ${s.c}" href="${s.u}" target="_blank" rel="noopener"><span class="tv-e">${s.e}</span><h2>${s.t}</h2><p>${T(s.d[0], s.d[1])}</p><span class="tv-go">${T('Siteye git', 'Visit site')} ↗</span></a>`).join('')}</section>
      ${typeof Flights !== 'undefined' ? Flights.html() : ''}
      <a class="tv-promo" href="#gezilerim"><div><span class="tv-eye">${T('GEZİLERİM', 'MY TRAVELS')}</span><h2>${t.length} ${T('şehir', 'cities')} · ${c.size} ${T('ülke', 'countries')}</h2><p>${T('Gezdiğin şehirleri 3D dünyada pinle, 360° döndür.', 'Pin the cities you have visited on a 3D globe and spin it 360°.')}</p></div><span class="tv-orb">🌍</span></a>`;
  }
  function globeHtml() {
    return `<section class="gz">
      <div class="gz-stage"><div class="gz-globe"><div class="gz-loading">${T('Dünya yükleniyor…', 'Loading the globe…')}</div></div>
        <div class="gz-hud"><span class="gz-stat"></span><button class="gz-btn" data-a="spin">⟳ ${T('Döndür', 'Spin')}</button><button class="gz-btn" data-a="home">⌂</button></div>
        <div class="gz-card" hidden></div></div>
      <aside class="gz-side">
        <form class="gz-add"><input name="q" placeholder="${T('Şehir ekle (ör. Lizbon, Kyoto…)', 'Add a city (e.g. Lisbon, Kyoto…)')}" required maxlength="80"><div class="gz-row"><input name="d" type="month" title="${T('Ne zaman?', 'When?')}"><button class="gz-btn gz-pri">📍 ${T('Pinle', 'Pin')}</button></div><input name="n" placeholder="${T('Kısa not (isteğe bağlı)', 'Short note (optional)')}" maxlength="140"><p class="gz-msg"></p></form>
        <div class="gz-list"></div>
      </aside></section>`;
  }
  async function mountGlobe() {
    const host = el.querySelector('.gz-globe');
    try {
      await loadScript('js/vendor/topojson-client.min.js');
      const mod = await import('./globe.js');
      if (!el.querySelector('.gz-globe')) return;
      globe = await mod.createGlobe(host, { onPick: i => showCard(i) }); window.__globe = globe;
      host.querySelector('.gz-loading') && host.querySelector('.gz-loading').remove();
      refresh();
      const t = trips(); if (t.length) setTimeout(() => globe && globe.flyTo(t[0].lat, t[0].lon, 2.6), 300);
    } catch (e) { host.innerHTML = `<div class="gz-loading">${T('3D dünya bu cihazda açılamadı (WebGL gerekli).', 'The 3D globe could not open on this device (WebGL is required).')}</div>`; console.warn(e); }
    const f = el.querySelector('.gz-add'), msg = f.querySelector('.gz-msg');
    f.onsubmit = async e => {
      e.preventDefault(); const q = f.q.value.trim(); if (!q) return; msg.textContent = T('Aranıyor…', 'Searching…');
      try {
        const g = await geocode(q); if (!g) { msg.textContent = T('Şehir bulunamadı. Yazımı kontrol et.', 'City not found. Check the spelling.'); return; }
        const t = trips(); if (t.some(x => Math.abs(x.lat - g.lat) < .01 && Math.abs(x.lon - g.lon) < .01)) { msg.textContent = T(g.name + ' zaten pinli.', tn(g.name) + ' is already pinned.'); return; }
        t.push({ id: uid(), name: g.name, lat: g.lat, lon: g.lon, country: g.country, date: f.d.value, note: f.n.value.trim() }); saveT(t);
        f.reset(); msg.textContent = '📍 ' + T(g.name + ' eklendi', tn(g.name) + ' added'); refresh(); globe && globe.flyTo(g.lat, g.lon); showCard(t.length - 1);
      } catch (err) { msg.textContent = T('Bağlantı yok: yerleşik listede olmayan şehirler için internet gerekir.', 'No connection: cities outside the built-in list need the internet.'); }
    };
    el.querySelector('[data-a=spin]').onclick = () => globe && globe.spin(true);
    el.querySelector('[data-a=home]').onclick = () => { const t = trips(); globe && t.length && globe.flyTo(t[0].lat, t[0].lon, 2.8); };
  }
  const fmtM = m => { if (!m) return ''; const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString(I18N.locale, { month: 'long', year: 'numeric' }); };
  function refresh() {
    const t = trips(), countries = new Set(t.map(x => x.country).filter(Boolean));
    if (globe) globe.setPins(t.map(x => Object.assign({}, x, { name: tn(x.name) })));
    const st = el.querySelector('.gz-stat'); if (st) st.innerHTML = `<b>${t.length}</b> ${T('şehir', 'cities')} · <b>${countries.size}</b> ${T('ülke', 'countries')}`;
    const byC = {}; t.forEach((x, i) => (byC[x.country || 'Diğer'] = byC[x.country || 'Diğer'] || []).push([x, i]));
    el.querySelector('.gz-list').innerHTML = Object.entries(byC).map(([c, arr]) => `<div class="gz-grp"><span class="tv-eye">${esc(cn(c))} · ${arr.length}</span>${arr.map(([x, i]) => `<div class="gz-item" data-i="${i}"><button class="gz-go">📍 <b>${esc(tn(x.name))}</b>${x.date ? `<small>${fmtM(x.date)}</small>` : ''}</button><button class="gz-del" data-del="${x.id}" title="${T('Sil', 'Delete')}">✕</button></div>`).join('')}</div>`).join('') || `<p class="tv-eye">${T('Henüz şehir yok.', 'No cities yet.')}</p>`;
    el.querySelectorAll('.gz-go').forEach(b => b.onclick = () => { const i = +b.parentNode.dataset.i, x = trips()[i]; globe && globe.flyTo(x.lat, x.lon); showCard(i); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const t2 = trips(), x = t2.find(y => y.id === b.dataset.del); if (!x || !confirm(T(x.name + ' pini silinsin mi?', 'Remove the pin for ' + tn(x.name) + '?'))) return; saveT(t2.filter(y => y !== x)); el.querySelector('.gz-card').hidden = true; refresh(); });
  }
  function showCard(i) {
    const x = trips()[i], c = el.querySelector('.gz-card'); if (!x || !c) return;
    c.hidden = false;
    c.innerHTML = `<button class="gz-x">✕</button><span class="tv-eye">${esc(cn(x.country || ''))}</span><h3>${esc(tn(x.name))}</h3>${x.date ? `<p>🗓 ${fmtM(x.date)}</p>` : ''}${x.note ? `<p>${esc(x.note)}</p>` : ''}<p class="gz-ll">${x.lat.toFixed(3)}°, ${x.lon.toFixed(3)}°</p>
      <div class="gz-row"><a class="gz-btn" target="_blank" rel="noopener" href="https://www.booking.com/searchresults.tr.html?ss=${encodeURIComponent(x.name)}">Booking</a><a class="gz-btn" target="_blank" rel="noopener" href="https://www.airbnb.com.tr/s/${encodeURIComponent(x.name)}/homes">Airbnb</a><button class="gz-btn" data-edit>✎ ${T('Not', 'Note')}</button></div>`;
    c.querySelector('.gz-x').onclick = () => c.hidden = true;
    c.querySelector('[data-edit]').onclick = () => { const t = trips(), y = t.find(z => z.id === x.id); const n = prompt(T('Not', 'Note'), y.note || ''); if (n === null) return; const d = prompt(T('Ne zaman? (YYYY-AA, ör. 2025-06)', 'When? (YYYY-MM, e.g. 2025-06)'), y.date || ''); y.note = n.trim(); if (d !== null && (/^\d{4}-\d{2}$/.test(d.trim()) || !d.trim())) y.date = d.trim(); saveT(t); refresh(); showCard(t.indexOf(y)); };
  }
  return { open, leave, _geocode: geocode };
})();

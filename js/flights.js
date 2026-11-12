"use strict";
/* Seyahat › Antalya kalkışlı en ucuz uçuşlar.
   - Her zaman: Google Flights / Skyscanner / Aviasales'e hazır aramalar (AYT → şehir, seçilen ay, tek yön).
   - İsteğe bağlı canlı fiyat: Supabase "flights" fonksiyonu (Travelpayouts ücretsiz Data API). Kurulu değilse sessizce gizlenir. */
const Flights = (() => {
  const FN = 'https://zjzbpeiuhreyfdihzzzj.supabase.co/functions/v1/flights';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DEST = [
    ['TZX', ['Trabzon', 'Trabzon'], 'TR', 'tzx'], ['IST', ['İstanbul (İST)', 'Istanbul (IST)'], 'TR', 'ist'], ['SAW', ['İstanbul (SAW)', 'Istanbul (SAW)'], 'TR', 'saw'],
    ['EDI', ['Edinburgh', 'Edinburgh'], 'GB', 'edi'], ['GLA', ['Glasgow', 'Glasgow'], 'GB', 'gla'], ['LON', ['Londra', 'London'], 'GB', 'lond'],
    ['AMS', ['Amsterdam', 'Amsterdam'], 'NL', 'ams'], ['DUS', ['Düsseldorf', 'Düsseldorf'], 'DE', 'dus'], ['ZRH', ['Zürih', 'Zurich'], 'CH', 'zrh'], ['BSL', ['Basel', 'Basel'], 'CH', 'bsl']];
  const flag = cc => cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0))) : '✈️';
  const months = () => { const d = new Date(), out = []; for (let i = 0; i < 7; i++) { const x = new Date(d.getFullYear(), d.getMonth() + i, 1); out.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0')); } return out; };
  const mName = (m, long) => new Date(m + '-01T12:00:00').toLocaleDateString(I18N.locale, long ? { month: 'long', year: 'numeric' } : { month: 'short' });
  let month = months()[0], live = null, liveFor = '', loading = false, host = null;
  try { const s = localStorage.getItem('fl_month'); if (s && months().includes(s)) month = s; } catch (e) {}

  const gUrl = code => `https://www.google.com/travel/flights?q=${encodeURIComponent(`one way flights from AYT to ${code} in ${new Date(month + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`)}&hl=${I18N.lang === 'en' ? 'en-GB' : 'tr'}&curr=TRY`;
  const yymm = () => month.slice(2, 4) + month.slice(5, 7);
  const sUrl = sky => `https://www.skyscanner.com.tr/transport/flights/ayt/${sky}/?adultsv2=1&cabinclass=economy&rtn=0&oym=${yymm()}&preferdirects=false`;
  const sAny = () => `https://www.skyscanner.com.tr/transport/flights-from/ayt/?adultsv2=1&rtn=0&oym=${yymm()}`;
  const tl = n => new Intl.NumberFormat(I18N.locale, { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
  const day = iso => new Date(iso).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short', weekday: 'short' });
  const stops = n => n ? T(`${n} aktarma`, `${n} stop${n > 1 ? 's' : ''}`) : T('aktarmasız', 'direct');

  function html() {
    return `<section class="fl" aria-labelledby="flH">
      <div class="fl-head"><div><span class="tv-eye">${T('ANTALYA KALKIŞLI', 'FROM ANTALYA')} · AYT</span><h2 id="flH">${T('En ucuz <em>uçuşlar</em>', 'Cheapest <em>flights</em>')}</h2></div>
        <div class="fl-months" role="group" aria-label="${T('Ay seç', 'Choose a month')}">${months().map(m => `<button type="button" data-m="${m}" class="${m === month ? 'on' : ''}" aria-pressed="${m === month}">${mName(m)}</button>`).join('')}</div></div>
      <div class="fl-grid"></div>
      <div class="fl-any"></div>
      <p class="fl-note"></p></section>`;
  }
  function draw() {
    if (!host || !host.isConnected) return;
    const L = live && liveFor === month && live.ok ? live : null;
    host.querySelector('.fl-grid').innerHTML = DEST.map(([code, nm, cc, sky]) => {
      const f = L && L.fav && L.fav[code];
      return `<article class="fl-card"><div class="fl-top"><span class="fl-flag">${flag(cc)}</span><span class="fl-code">AYT → ${code}</span></div><h3>${esc(T(nm[0], nm[1]))}</h3>
        ${f ? `<p class="fl-price">${tl(f.price)}<small>${T('’den', ' from')}</small></p><p class="fl-meta">${day(f.at)} · ${stops(f.transfers)}${f.airline ? ' · ' + esc(f.airline) : ''}</p>` : loading ? `<p class="fl-price sk">…</p><p class="fl-meta">&nbsp;</p>` : L ? `<p class="fl-meta">${T('Bu ay için kayıtlı fiyat yok — aramaya bak', 'No saved price this month — try a search')}</p>` : `<p class="fl-meta">${esc(mName(month, true))} · ${T('tek yön', 'one way')}</p>`}
        <div class="fl-go">${f && f.link ? `<a class="hot" href="${esc(f.link)}" target="_blank" rel="noopener">${T('Bu bileti gör', 'See this fare')} ↗</a>` : ''}<a href="${gUrl(code)}" target="_blank" rel="noopener">Google Flights ↗</a><a href="${sUrl(sky)}" target="_blank" rel="noopener">Skyscanner ↗</a></div></article>`;
    }).join('');
    const any = L && L.any && L.any.length ? L.any : null;
    host.querySelector('.fl-any').innerHTML = `<div class="fl-any-h"><h3>${T('Her yere en ucuz', 'Cheapest to anywhere')}</h3><a class="fl-btn" href="${sAny()}" target="_blank" rel="noopener">${T('Tüm yerleri keşfet', 'Explore everywhere')} ↗</a></div>
      ${any ? `<ol class="fl-list">${any.slice(0, 12).map((x, i) => `<li><a href="${esc(x.link || sUrl(x.to.toLowerCase()))}" target="_blank" rel="noopener"><span class="fl-n">${String(i + 1).padStart(2, '0')}</span><span class="fl-flag">${flag(x.cc)}</span><b>${esc(x.name)}</b><small>${esc(x.to)} · ${day(x.at)} · ${stops(x.transfers)}</small><em>${tl(x.price)}</em></a></li>`).join('')}</ol>` : `<p class="fl-meta">${T('Skyscanner’ın “Her yere” aramasıyla Antalya’dan bu ay nereye en ucuza gidebileceğini gör.', 'Use Skyscanner’s “Everywhere” search to see where you can fly cheapest from Antalya this month.')}</p>`}`;
    const note = host.querySelector('.fl-note');
    note.innerHTML = L ? T(`Fiyatlar tek yön, kişi başı ve yaklaşıktır; son günlerde yapılan aramalardan gelir (Aviasales). Satın almadan önce sitede kontrol et. Güncelleme: ${new Date(L.at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`, `Prices are one way, per person and approximate; they come from recent searches (Aviasales). Check on the site before you buy. Updated: ${new Date(L.at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`)
      : (live && live.error === 'no-token' && App.isOwner()) ? T('Kartlarda canlı fiyat görmek istersen: Travelpayouts’a ücretsiz üye ol, Supabase’de “flights” fonksiyonunu kur ve TP_TOKEN anahtarını ekle. Şimdilik düğmeler seni seçtiğin ay için hazır aramaya götürür.', 'To see live prices on the cards: sign up to Travelpayouts for free, deploy the “flights” function in Supabase and add the TP_TOKEN secret. For now, the buttons take you to a ready search for the month you chose.')
      : T('Düğmeler seni seçtiğin ay için hazır, tek yön aramaya götürür; sitede tarih ve kişi sayısını değiştirebilirsin.', 'The buttons take you to a ready one-way search for the month you chose; you can change the dates and passengers on the site.');
  }
  async function load() {
    const m = month;
    try { const c = JSON.parse(localStorage.getItem('fl_cache_' + m) || 'null'); if (c && Date.now() - c.t < 3 * 3600e3) { live = c.d; liveFor = m; draw(); return; } } catch (e) {}
    loading = true; draw();
    try { const r = await fetch(FN + '?m=' + m, { signal: AbortSignal.timeout(15000) }); const d = await r.json(); if (m !== month) return; live = d; liveFor = m; if (d && d.ok) try { localStorage.setItem('fl_cache_' + m, JSON.stringify({ t: Date.now(), d })); } catch (e) {} }
    catch (e) { if (m === month) { live = null; liveFor = ''; } }
    finally { if (m === month) { loading = false; draw(); } }
  }
  function mount(root) {
    host = root.querySelector('.fl'); if (!host) return;
    host.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { month = b.dataset.m; try { localStorage.setItem('fl_month', month); } catch (e) {} host.querySelectorAll('[data-m]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); load(); });
    draw(); load();
  }
  return { html, mount };
})();

"use strict";
/* =====================================================================
   FOTOĞRAF — Pexels sayfam, günün fotoğrafçısı, sözler, 3D sokak galerisi.
   Galeri, Wikimedia Commons'taki KAMU MALI (telif süresi dolmuş) sokak
   fotoğraflarını canlı çeker (Atget, Jacob Riis, Lewis Hine…). Telifli
   çağdaş ustaların fotoğrafları kopyalanmaz; onlar için bağlantı verilir.
   ===================================================================== */
const Foto = (() => {
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PEXELS = 'https://www.pexels.com/@oguzcobn';
  // [ad, yıllar, ülke, kısa tanıtım (kendi sözlerimle), bu hafta dene, wikipedia]
  const PH = [
    ['Ara Güler', '1928–2018', 'Türkiye', 'Yarım asır boyunca İstanbul’un insanlarını, sokaklarını ve kayıklarını siyah-beyaz belgeledi; “İstanbul’un gözü” diye anılır.', 'Eminönü ya da Karaköy’de bir sabah: insanı mekânla birlikte, geniş açıyla çerçevele.', 'https://tr.wikipedia.org/wiki/Ara_G%C3%BCler'],
    ['Henri Cartier-Bresson', '1908–2004', 'Fransa', 'Magnum’un kurucularından. Geometri ile hareketin buluştuğu anı yakalama fikrini — “belirleyici an” — fotoğrafın merkezine koydu.', 'İlginç bir arka plan bul, bekle; doğru kişi kadraja girene kadar deklanşöre basma.', 'https://tr.wikipedia.org/wiki/Henri_Cartier-Bresson'],
    ['Vivian Maier', '1926–2009', 'ABD', 'Hayatı boyunca dadı olarak çalıştı; 100 binden fazla negatifi ölümünden sonra bulununca sokak fotoğrafının büyük isimlerinden biri olarak tanındı.', 'Kendi yansımanı vitrinlerde, aynalarda, gölgende ara — bir otoportre serisi çek.', 'https://en.wikipedia.org/wiki/Vivian_Maier'],
    ['Saul Leiter', '1923–2013', 'ABD', 'Renkli sokak fotoğrafının öncülerinden. Buğulu camların, yağmurun, şemsiyelerin ardından ressam gözüyle New York.', 'Yağmurlu bir günde bir camın ya da şemsiyenin arkasından çek; ön planı bulanık bırak.', 'https://en.wikipedia.org/wiki/Saul_Leiter'],
    ['Garry Winogrand', '1928–1984', 'ABD', 'New York sokaklarını büyük bir enerjiyle, eğik kadrajlar ve kalabalık sahnelerle fotoğrafladı.', 'Geniş açı, yakın mesafe: kalabalığın içine gir ve kadrajı biraz yatır.', 'https://en.wikipedia.org/wiki/Garry_Winogrand'],
    ['Robert Doisneau', '1912–1994', 'Fransa', 'Paris’in gündelik hayatını mizah ve sıcaklıkla anlatan hümanist fotoğrafın simgesi.', 'Bir kafe ya da meydanda insanlar arasındaki küçük, komik etkileşimleri ara.', 'https://tr.wikipedia.org/wiki/Robert_Doisneau'],
    ['Elliott Erwitt', '1928–2023', 'ABD', 'Magnum fotoğrafçısı; ironi ve mizahla dolu kareleri, özellikle köpek fotoğraflarıyla ünlü.', 'Bugün yalnızca “komik” bir an arayarak yürü; köpekler ve sahipleri iyi bir başlangıç.', 'https://en.wikipedia.org/wiki/Elliott_Erwitt'],
    ['Helen Levitt', '1913–2009', 'ABD', 'New York’un işçi mahallelerinde oynayan çocukları, kaldırım tebeşir çizimlerini şiirsel bir dille kaydetti.', 'Oyun oynayan çocukları (ailelerinden izin alarak) ya da duvar yazılarını gözle.', 'https://en.wikipedia.org/wiki/Helen_Levitt'],
    ['Fan Ho', '1931–2016', 'Hong Kong', '1950–60’ların Hong Kong’unda ışık huzmeleri, duman ve gölgelerle neredeyse sinematik kompozisyonlar kurdu.', 'Sert ışığın düştüğü bir sokak bul, gölgeye pozla ve ışığa birinin girmesini bekle.', 'https://en.wikipedia.org/wiki/Fan_Ho'],
    ['Daido Moriyama', '1938', 'Japonya', 'Tokyo’yu grenli, bulanık, yüksek kontrastlı karelerle anlatan; “kaba, bulanık, odak dışı” estetiğin ustası.', 'Siyah-beyaza geç, kontrastı sonuna kadar aç; vizöre bakmadan, belden çek.', 'https://en.wikipedia.org/wiki/Daid%C5%8D_Moriyama'],
    ['Joel Meyerowitz', '1938', 'ABD', 'Sokak fotoğrafında rengi ciddiye alan ilk kuşaktan; 11 Eylül sonrası Ground Zero’nun tek resmî arşivini de o oluşturdu.', 'Rengi konu edin: aynı renkte üç öğenin bir araya geldiği bir kare ara.', 'https://en.wikipedia.org/wiki/Joel_Meyerowitz'],
    ['Bruce Gilden', '1946', 'ABD', 'Magnum fotoğrafçısı; flaşla çok yakından çektiği sert, cesur sokak portreleriyle tanınır.', 'Cesaret egzersizi: birinden izin isteyip çok yakından, yüz dolduran bir portre çek.', 'https://en.wikipedia.org/wiki/Bruce_Gilden'],
    ['Robert Frank', '1924–2019', 'İsviçre / ABD', '“The Americans” kitabıyla 1950’lerin Amerikası’na yabancı ve sorgulayan bir bakış getirdi; fotoğraf kitabı fikrini değiştirdi.', 'Bir yolculukta 20 kare çek, sonra bunları bir hikâye sırasına diz.', 'https://en.wikipedia.org/wiki/Robert_Frank'],
    ['Lee Friedlander', '1934', 'ABD', 'Yansımalar, tabelalar ve çerçeve içinde çerçevelerle katman katman, oyunbaz kompozisyonlar kurar.', 'Bir vitrinin hem içini hem yansımasını aynı karede dengele.', 'https://en.wikipedia.org/wiki/Lee_Friedlander'],
    ['Alex Webb', '1952', 'ABD', 'Magnum fotoğrafçısı; yoğun renkler ve birden fazla planda olan olaylarla dolu, karmaşık ama dengeli kareler.', 'Ön, orta ve arka planda üç ayrı hikâye olan bir kare kurmayı dene.', 'https://en.wikipedia.org/wiki/Alex_Webb_(photographer)'],
    ['Brassaï', '1899–1984', 'Macaristan / Fransa', '1930’ların gece Paris’ini — sisli sokak lambalarını, kafeleri, gece hayatını — ilk kez bu kadar etkileyici fotoğrafladı.', 'Gece çık: sokak lambası, ıslak zemin ve tek bir insan silueti.', 'https://tr.wikipedia.org/wiki/Brassa%C3%AF'],
    ['Eugène Atget', '1857–1927', 'Fransa', 'Kaybolmakta olan eski Paris’in sokaklarını, vitrinlerini ve esnafını binlerce kareyle belgeledi; galerideki birçok fotoğraf onun.', 'Mahallende yakında değişecek bir şeyi — eski bir dükkânı, bir tabelayı — belgele.', 'https://tr.wikipedia.org/wiki/Eug%C3%A8ne_Atget'],
    ['Dorothea Lange', '1895–1965', 'ABD', 'Büyük Buhran döneminin insanlarını anlatan belgesel fotoğraflarıyla, özellikle “Göçmen Anne” ile tanınır.', 'Bir esnafla sohbet et, sonra onun hikâyesini anlatan tek bir portre çek.', 'https://tr.wikipedia.org/wiki/Dorothea_Lange'],
    ['Josef Koudelka', '1938', 'Çekya', 'Prag 1968 işgalini ve Avrupa’daki Roman toplulukları güçlü siyah-beyaz karelerle belgeleyen Magnum fotoğrafçısı.', 'Siyah-beyaz, geniş açı ve güçlü bir ufuk çizgisiyle bir panorama dene.', 'https://en.wikipedia.org/wiki/Josef_Koudelka'],
    ['Sebastião Salgado', '1944–2025', 'Brezilya', 'İşçiler, göçler ve doğa üzerine destansı siyah-beyaz projeleriyle tanınan belgesel fotoğrafçı.', 'Uzun bir proje düşün: aynı konuyu (ör. tersane işçileri) haftalarca takip et.', 'https://tr.wikipedia.org/wiki/Sebasti%C3%A3o_Salgado'],
    ['Steve McCurry', '1950', 'ABD', 'Güçlü renk ve portreleriyle tanınır; “Afgan Kız” dünyanın en bilinen dergi kapaklarından biri oldu.', 'Bir pazar yerinde doygun renklerin önünde bir portre çek.', 'https://tr.wikipedia.org/wiki/Steve_McCurry'],
    ['Trent Parke', '1971', 'Avustralya', 'Magnum fotoğrafçısı; Avustralya’nın sert güneşini ve derin gölgelerini dramatik bir sokak diline çevirdi.', 'Gün batımına yakın, uzayan gölgelerle insanları grafik birer şekil gibi çek.', 'https://en.wikipedia.org/wiki/Trent_Parke'],
    ['Matt Stuart', '1974', 'Birleşik Krallık', 'Londra sokaklarında tesadüflerden doğan zekice, esprili kareleriyle tanınır; Magnum üyesi.', 'Bir köşede 20 dakika bekle; iki şeyin “kafiyeli” göründüğü anı yakala.', 'https://en.wikipedia.org/wiki/Matt_Stuart'],
    ['Diane Arbus', '1923–1971', 'ABD', 'Toplumun kenarında kalan insanları doğrudan, kare formatlı portrelerle fotoğrafladı.', 'Tanımadığın biriyle konuşup onu kendi ortamında, doğrudan kameraya bakarken çek.', 'https://tr.wikipedia.org/wiki/Diane_Arbus']
  ];
  // kısa, kaynağı bilinen sözler (Türkçe çeviri + özgün)
  const Q = [
    ['İlk 10.000 fotoğrafın, en kötüleridir.', 'Your first 10,000 photographs are your worst.', 'Henri Cartier-Bresson'],
    ['Fotoğrafların yeterince iyi değilse, yeterince yakın değilsin.', 'If your pictures aren’t good enough, you’re not close enough.', 'Robert Capa'],
    ['Fotoğraf çekilmez, yapılır.', 'You don’t take a photograph, you make it.', 'Ansel Adams'],
    ['Fotoğraf makinesi, insanlara makine olmadan görmeyi öğreten bir araçtır.', 'The camera is an instrument that teaches people how to see without a camera.', 'Dorothea Lange'],
    ['Fotoğraf, bir sır hakkında bir sırdır. Sana ne kadar çok şey anlatırsa, o kadar az bilirsin.', 'A photograph is a secret about a secret. The more it tells you the less you know.', 'Diane Arbus'],
    ['Bir şeyin fotoğrafı çekildiğinde neye benzeyeceğini görmek için fotoğraf çekerim.', 'I photograph to find out what something will look like photographed.', 'Garry Winogrand'],
    ['Göz, bakmadan önce dinlemeyi öğrenmeli.', 'The eye should learn to listen before it looks.', 'Robert Frank'],
    ['Bana göre fotoğraf bir gözlem sanatıdır.', 'To me, photography is an art of observation.', 'Elliott Erwitt'],
    ['Fotoğrafa bakınca sokağın kokusunu alabiliyorsan, o bir sokak fotoğrafıdır.', 'If you can smell the street by looking at the photo, it’s a street photograph.', 'Bruce Gilden'],
    ['Fotoğraf çekmek; aklı, gözü ve kalbi aynı hizaya getirmektir.', 'To photograph is to put on the same line of sight the head, the eye and the heart.', 'Henri Cartier-Bresson'],
    ['Bulanık bir fikrin keskin bir görüntüsünden daha kötü bir şey yoktur.', 'There is nothing worse than a sharp image of a fuzzy concept.', 'Ansel Adams'],
    ['Yalnızca sen ve makinen varsınız. Fotoğrafındaki sınırlar sendedir; çünkü ne görüyorsak oyuz.', 'There is only you and your camera. The limitations in your photography are in yourself, for what we see is what we are.', 'Ernst Haas']
  ];
  const CATS = [
    'Category:Photographs by Eugène Atget in the Metropolitan Museum of Art',
    'Category:Photographs by Eugène Atget in the J. Paul Getty Museum',
    'Category:How the Other Half Lives',
    'Category:Photographs by Jacob Riis',
    'Category:Photographs by Lewis Hine'
  ];
  const FALLBACK = [
    ['Eugène Atget, Street Musicians, 1898–99.jpg', 'Eugène Atget', '1898–99', 'Sokak müzisyenleri, Paris'],
    ['Sleeping, homeless children - Jacob Riis.jpg', 'Jacob Riis', 'c. 1890', 'Sokakta uyuyan çocuklar, New York'],
    ['Mulberry Bend, New York.jpg', 'Jacob Riis', 'c. 1890', 'Mulberry Bend, New York']
  ].map(([f, a, y, t]) => ({ src: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=900', page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.replace(/ /g, '_')), artist: a, year: y, title: t, lic: 'Kamu malı' }));
  const strip = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent.trim(); };

  async function loadPhotos() {
    const cache = ls.get('foto_cache', null);
    if (cache && Date.now() - cache.at < 86400000 && cache.list.length > 8) return cache.list;
    const out = [];
    await Promise.all(CATS.map(async cat => {
      try {
        const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=categorymembers&gcmtype=file&gcmlimit=50&gcmtitle=' + encodeURIComponent(cat) + '&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=900&iiextmetadatafilter=LicenseShortName|Artist|DateTimeOriginal|ObjectName';
        const j = await fetch(u).then(r => r.json());
        Object.values((j.query && j.query.pages) || {}).forEach(p => {
          const ii = p.imageinfo && p.imageinfo[0]; if (!ii || ii.mime !== 'image/jpeg') return;
          const m = ii.extmetadata || {}, lic = (m.LicenseShortName && m.LicenseShortName.value) || '';
          if (!/public domain|^pd|cc0|no restrictions/i.test(lic)) return;
          out.push({ src: ii.thumburl, page: ii.descriptionurl, artist: strip(m.Artist && m.Artist.value).replace(/\s+/g, ' ').slice(0, 60) || cat.replace(/.*by |Category:| in the.*/g, ''), year: strip(m.DateTimeOriginal && m.DateTimeOriginal.value).slice(0, 24), title: strip(m.ObjectName && m.ObjectName.value).slice(0, 90) || p.title.replace(/^File:|\.jpe?g$/gi, ''), lic: 'Kamu malı' });
        });
      } catch (e) { /* çevrimdışı ya da kategori yok */ }
    }));
    for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [out[i], out[k]] = [out[k], out[i]]; }
    const list = out.slice(0, 42);
    if (list.length > 8) ls.set('foto_cache', { at: Date.now(), list });
    return list.length ? list : FALLBACK;
  }

  let el = null, raf = 0, offs = [];
  const day = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  function open(root) {
    el = root;
    const d = day(), p = PH[d % PH.length], q0 = d % Q.length;
    el.innerHTML = `<div class="ft">
      <header class="ft-head"><p class="ft-eye">BABA. / FOTOĞRAF</p><h1>Işığı <em>yakala.</em></h1>
        <a class="ft-pexels" href="${PEXELS}" target="_blank" rel="noopener"><span>Pexels</span><b>@oguzcobn</b><i>Sayfama git ↗</i></a></header>
      <section class="ft-grid">
        <article class="ft-day"><span class="ft-eye">GÜNÜN FOTOĞRAFÇISI · ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
          <h2>${esc(p[0])}</h2><p class="ft-meta">${esc(p[1])} · ${esc(p[2])}</p><p>${esc(p[3])}</p>
          <div class="ft-try"><span class="ft-eye">BU HAFTA DENE</span><p>${esc(p[4])}</p></div>
          <div class="ft-links"><a href="${p[5]}" target="_blank" rel="noopener">Hayatı ↗</a><a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p[0] + ' photography')}" target="_blank" rel="noopener">Fotoğraflarına bak ↗</a></div>
          <div class="ft-next"><span class="ft-eye">YARIN</span> ${esc(PH[(d + 1) % PH.length][0])}</div></article>
        <article class="ft-quote"><span class="ft-eye">SÖZLER</span><blockquote></blockquote><cite></cite><small class="ft-orig"></small>
          <div class="ft-qnav"><button data-q="-1">←</button><span class="ft-qi"></span><button data-q="1">→</button></div></article>
      </section>
      <section class="ft-gal"><div class="ft-gal-head"><div><span class="ft-eye">3D SOKAK GALERİSİ</span><h2>Sokakların ustaları</h2></div><p>Kaydır, sürükle ya da oklarla ilerle. Fotoğraflar Wikimedia Commons’taki kamu malı arşivlerden canlı gelir.</p></div>
        <div class="ft-tunnel" tabindex="0"><div class="ft-world"></div><div class="ft-load">Galeri yükleniyor…</div>
          <div class="ft-ctrl"><button data-z="-1">↑</button><span class="ft-pos"></span><button data-z="1">↓</button></div></div>
        <div class="ft-masters"><span class="ft-eye">ÇAĞDAŞ USTALAR (fotoğrafları telifli — kendi sayfalarında bak)</span><div>${PH.filter(x => !/Atget|Lange/.test(x[0])).map(x => `<a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(x[0] + ' street photography')}" target="_blank" rel="noopener">${esc(x[0])}</a>`).join('')}</div></div>
      </section>
      <div class="ft-lb" hidden></div>
    </div>`;
    let qi = q0; const showQ = () => { const q = Q[(qi % Q.length + Q.length) % Q.length]; el.querySelector('blockquote').textContent = '“' + q[0] + '”'; el.querySelector('cite').textContent = '— ' + q[2]; el.querySelector('.ft-orig').textContent = q[1]; el.querySelector('.ft-qi').textContent = ((qi % Q.length + Q.length) % Q.length + 1) + '/' + Q.length; };
    showQ(); el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { qi += +b.dataset.q; showQ(); });
    loadPhotos().then(build);
  }
  function build(list) {
    if (!el || !el.isConnected) return;
    const world = el.querySelector('.ft-world'), tun = el.querySelector('.ft-tunnel'), lb = el.querySelector('.ft-lb');
    el.querySelector('.ft-load').remove();
    const GAP = 560, N = list.length;
    world.innerHTML = list.map((p, i) => `<figure class="ft-fr" data-i="${i}"><img src="${p.src}" alt="${esc(p.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').classList.add('bad')"><figcaption><b>${esc(p.artist)}</b>${p.year ? ' · ' + esc(p.year) : ''}</figcaption></figure>`).join('');
    const frames = [...world.children];
    let z = 0, tz = 0, auto = true;
    const max = (N - 1) * GAP;
    const go = d => { auto = false; tz = Math.max(0, Math.min(max, tz + d)); };
    tun.addEventListener('wheel', e => { e.preventDefault(); go(e.deltaY * 1.4); }, { passive: false });
    let ty = null; tun.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    tun.addEventListener('touchmove', e => { if (ty == null) return; const y = e.touches[0].clientY; go((ty - y) * 3); ty = y; e.preventDefault(); }, { passive: false });
    tun.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(GAP); if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(-GAP); });
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => go(+b.dataset.z * GAP));
    frames.forEach(f => f.onclick = () => { const p = list[+f.dataset.i]; lb.hidden = false; lb.innerHTML = `<div class="ft-lb-in"><img src="${p.src}" alt=""><div><span class="ft-eye">${esc(p.lic)}</span><h3>${esc(p.title)}</h3><p>${esc(p.artist)}${p.year ? ' · ' + esc(p.year) : ''}</p><a href="${p.page}" target="_blank" rel="noopener">Wikimedia Commons’ta gör ↗</a></div><button>✕</button></div>`; lb.onclick = e => { if (e.target === lb || e.target.tagName === 'BUTTON') lb.hidden = true; }; });
    const pos = el.querySelector('.ft-pos');
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (auto) tz = Math.min(max, tz + 0.6);
      z += (tz - z) * .08;
      // yakındaki kare ortaya kayar, uzaktakiler iki yana açılır
      const W = tun.clientWidth, spread = Math.min(W * .44, 320);
      frames.forEach((f, i) => {
        const d = -i * GAP + z - 320, o = d > 160 ? 0 : d < -4200 ? 0 : d < -3000 ? (4200 + d) / 1200 : d > 0 ? 1 - d / 160 : 1;
        f.style.opacity = o.toFixed(3); f.style.visibility = o < .02 ? 'hidden' : 'visible'; if (o < .02) return;
        const k = Math.max(0, Math.min(1, (-d - 330) / 900)), side = i % 2 ? 1 : -1;
        const x = side * spread * k, y = (((i * 53) % 120) - 60) * k, ry = -side * 22 * k;
        f.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${d.toFixed(1)}px) rotateY(${ry.toFixed(1)}deg)`;
        f.style.zIndex = String(Math.round(5000 + d));
      });
      pos.textContent = Math.min(N, Math.round(z / GAP) + 1) + ' / ' + N;
    };
    cancelAnimationFrame(raf); loop();
  }
  function leave() { cancelAnimationFrame(raf); raf = 0; }
  return { open, leave, _load: loadPhotos };
})();

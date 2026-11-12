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
  // İngilizce: [ülke, tanıtım, bu hafta dene] — PH ile aynı sırada
  const PH_EN = [["Turkey", "For half a century he documented Istanbul’s people, streets and boats in black and white; he is remembered as “the eye of Istanbul”.", "A morning in Eminönü or Karaköy: frame people together with their surroundings, using a wide angle."], ["France", "A co-founder of Magnum. He put the idea of capturing the instant when geometry and movement meet — the “decisive moment” — at the heart of photography.", "Find an interesting background and wait; don’t press the shutter until the right person steps into the frame."], ["USA", "She worked as a nanny all her life; when more than 100,000 negatives were found after her death, she was recognised as one of the great street photographers.", "Look for your own reflection in shop windows, mirrors and your shadow — shoot a self-portrait series."], ["USA", "A pioneer of colour street photography: New York seen with a painter’s eye through steamed-up windows, rain and umbrellas.", "On a rainy day, shoot through a window or past an umbrella; leave the foreground blurred."], ["USA", "He photographed the streets of New York with tremendous energy, tilted frames and crowded scenes.", "Wide angle, close distance: step into the crowd and tilt the frame slightly."], ["France", "An icon of humanist photography who told the story of everyday Parisian life with humour and warmth.", "In a café or a square, look for small, funny interactions between people."], ["USA", "A Magnum photographer famous for pictures full of irony and humour, especially his photographs of dogs.", "Today, walk while looking only for a “funny” moment; dogs and their owners are a good place to start."], ["USA", "She poetically recorded children playing in New York’s working-class neighbourhoods and their chalk drawings on the pavement.", "Look out for children at play (with their parents’ permission) or for graffiti."], ["Hong Kong", "In the Hong Kong of the 1950s and 60s he built almost cinematic compositions from shafts of light, smoke and shadow.", "Find a street where hard light falls, expose for the shadows and wait for someone to step into the light."], ["Japan", "The master of the “rough, blurred, out of focus” aesthetic, portraying Tokyo in grainy, blurry, high-contrast frames.", "Switch to black and white, push the contrast all the way and shoot from the hip without looking through the viewfinder."], ["USA", "One of the first generation to take colour seriously in street photography; after 9/11 he also created the only official archive of Ground Zero.", "Make colour the subject: look for a frame where three things of the same colour come together."], ["USA", "A Magnum photographer known for harsh, bold street portraits taken very close up with flash.", "A courage exercise: ask someone for permission and take a frame-filling portrait from very close."], ["Switzerland / USA", "With his book “The Americans” he brought an outsider’s questioning eye to 1950s America and changed the idea of the photobook.", "Take 20 frames on a journey, then arrange them into the order of a story."], ["USA", "He builds layered, playful compositions from reflections, signs and frames within frames.", "Balance both the inside of a shop window and its reflection in the same frame."], ["USA", "A Magnum photographer whose frames are complex yet balanced, packed with saturated colour and events happening on several planes.", "Try to build a frame with three separate stories in the foreground, middle ground and background."], ["Hungary / France", "He photographed 1930s Paris by night — misty street lamps, cafés and nightlife — more strikingly than anyone before him.", "Go out at night: a street lamp, wet ground and a single human silhouette."], ["France", "He documented the disappearing streets, shop windows and tradespeople of old Paris in thousands of frames; many of the photographs in the gallery are his.", "Document something in your neighbourhood that will soon change — an old shop, a sign."], ["USA", "Known for her documentary photographs of people during the Great Depression, especially “Migrant Mother”.", "Chat with a shopkeeper, then take a single portrait that tells their story."], ["Czechia", "A Magnum photographer who documented the 1968 invasion of Prague and Roma communities across Europe in powerful black-and-white frames.", "Try a panorama in black and white, with a wide angle and a strong horizon line."], ["Brazil", "A documentary photographer known for epic black-and-white projects about workers, migration and nature.", "Think of a long project: follow the same subject (e.g. shipyard workers) for weeks."], ["USA", "Known for strong colour and portraits; “Afghan Girl” became one of the best-known magazine covers in the world.", "Take a portrait in a market against a backdrop of saturated colours."], ["Australia", "A Magnum photographer who turned Australia’s harsh sun and deep shadows into a dramatic street language.", "Close to sunset, use the lengthening shadows to photograph people as graphic shapes."], ["United Kingdom", "Known for clever, witty frames born of coincidences on the streets of London; a Magnum member.", "Wait on a corner for 20 minutes; catch the moment when two things seem to “rhyme”."], ["USA", "She photographed people on the margins of society in direct, square-format portraits.", "Talk to a stranger, then photograph them in their own surroundings, looking straight into the camera."]];
  const ph = (p, i) => I18N.lang === 'en' ? [p[0], p[1], PH_EN[i][0], PH_EN[i][1], PH_EN[i][2], p[5].replace('//tr.wikipedia', '//en.wikipedia')] : p;
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
    ['Eugène Atget, Street Musicians, 1898–99.jpg', 'Eugène Atget', '1898–99', ['Sokak müzisyenleri, Paris', 'Street musicians, Paris']],
    ['Sleeping, homeless children - Jacob Riis.jpg', 'Jacob Riis', 'c. 1890', ['Sokakta uyuyan çocuklar, New York', 'Children sleeping on the street, New York']],
    ['Mulberry Bend, New York.jpg', 'Jacob Riis', 'c. 1890', 'Mulberry Bend, New York']
  ].map(([f, a, y, t]) => ({ src: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=900', page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.replace(/ /g, '_')), artist: a, year: y, title: t, lic: 'pd' }));
  const strip = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent.trim(); };

  async function loadPhotos() {
    const cache = ls.get('foto_cache2', null);
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
          out.push({ src: ii.thumburl, page: ii.descriptionurl, artist: strip(m.Artist && m.Artist.value).replace(/\s+/g, ' ').slice(0, 60) || cat.replace(/.*by |Category:| in the.*/g, ''), year: ((strip(m.DateTimeOriginal && m.DateTimeOriginal.value).match(/1[89]\d\d/) || [''])[0]), title: strip(m.ObjectName && m.ObjectName.value).slice(0, 90) || p.title.replace(/^File:|\.jpe?g$/gi, ''), lic: 'pd' });
        });
      } catch (e) { /* çevrimdışı ya da kategori yok */ }
    }));
    for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [out[i], out[k]] = [out[k], out[i]]; }
    const list = out.slice(0, 42);
    if (list.length > 8) ls.set('foto_cache2', { at: Date.now(), list });
    return list.length ? list : FALLBACK;
  }

  let el = null, raf = 0, offs = [];
  const day = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  function open(root) {
    el = root;
    const d = day(), p = ph(PH[d % PH.length], d % PH.length), q0 = d % Q.length;
    el.innerHTML = `<div class="ft">
      <header class="ft-head"><p class="ft-eye">BABA. / ${T('FOTOĞRAF', 'PHOTOGRAPHY')}</p><h1>${T('Işığı <em>yakala.</em>', 'Catch the <em>light.</em>')}</h1>
        <a class="ft-pexels" href="${PEXELS}" target="_blank" rel="noopener"><span>Pexels</span><b>@oguzcobn</b><i>${T('Sayfama git', 'Visit my page')} ↗</i></a></header>
      <section class="ft-grid">
        <article class="ft-day"><span class="ft-eye">${T('GÜNÜN FOTOĞRAFÇISI', 'PHOTOGRAPHER OF THE DAY')} · ${new Date().toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long' })}</span>
          <h2>${esc(p[0])}</h2><p class="ft-meta">${esc(p[1])} · ${esc(p[2])}</p><p>${esc(p[3])}</p>
          <div class="ft-try"><span class="ft-eye">${T('BU HAFTA DENE', 'TRY THIS WEEK')}</span><p>${esc(p[4])}</p></div>
          <div class="ft-links"><a href="${p[5]}" target="_blank" rel="noopener">${T('Hayatı', 'Biography')} ↗</a><a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p[0] + ' photography')}" target="_blank" rel="noopener">${T('Fotoğraflarına bak', 'See their photographs')} ↗</a></div>
          <div class="ft-next"><span class="ft-eye">${T('YARIN', 'TOMORROW')}</span> ${esc(PH[(d + 1) % PH.length][0])}</div></article>
        <article class="ft-quote"><span class="ft-eye">${T('SÖZLER', 'QUOTES')}</span><blockquote></blockquote><cite></cite><small class="ft-orig"></small>
          <div class="ft-qnav"><button data-q="-1">←</button><span class="ft-qi"></span><button data-q="1">→</button></div></article>
      </section>
      <section class="ft-gal"><div class="ft-gal-head"><div><span class="ft-eye">${T('3D SOKAK GALERİSİ', '3D STREET GALLERY')}</span><h2>${T('Sokakların ustaları', 'Masters of the street')}</h2></div><p>${T('Parmağınla sağa-sola kaydır ya da oklarla ilerle; ortadakine dokununca büyür. Fotoğraflar Wikimedia Commons’taki kamu malı arşivlerden canlı gelir.', 'Swipe left and right or use the arrows; tap the centre frame to enlarge it. The photographs load live from public-domain archives on Wikimedia Commons.')}</p></div>
        <div class="ft-tunnel" tabindex="0"><div class="ft-world"></div><div class="ft-load">${T('Galeri yükleniyor…', 'Loading the gallery…')}</div>
          <div class="ft-ctrl"><button data-z="-1">←</button><span class="ft-pos"></span><button data-z="1">→</button></div></div>
        <div class="ft-masters"><span class="ft-eye">${T('ÇAĞDAŞ USTALAR (fotoğrafları telifli — kendi sayfalarında bak)', 'CONTEMPORARY MASTERS (their photographs are copyrighted — see them on their own pages)')}</span><div>${PH.filter(x => !/Atget|Lange/.test(x[0])).map(x => `<a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(x[0] + ' street photography')}" target="_blank" rel="noopener">${esc(x[0])}</a>`).join('')}</div></div>
      </section>
      <div class="ft-lb" hidden></div>
    </div>`;
    let qi = q0; const showQ = () => { const q = Q[(qi % Q.length + Q.length) % Q.length], en = I18N.lang === 'en'; el.querySelector('blockquote').textContent = '“' + (en ? q[1] : q[0]) + '”'; el.querySelector('cite').textContent = '— ' + q[2]; el.querySelector('.ft-orig').textContent = en ? '' : q[1]; el.querySelector('.ft-qi').textContent = ((qi % Q.length + Q.length) % Q.length + 1) + '/' + Q.length; };
    showQ(); el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { qi += +b.dataset.q; showQ(); });
    loadPhotos().then(build);
  }
  // basit kapak akışı: yatay kaydırma (scroll-snap); ortadaki kare düz, yanlardakiler hafif döner
  function build(list) {
    if (!el || !el.isConnected) return;
    const tun = el.querySelector('.ft-tunnel'), lb = el.querySelector('.ft-lb');
    const ld = el.querySelector('.ft-load'); if (ld) ld.remove();
    const flow = el.querySelector('.ft-world');
    flow.className = 'ft-flow';
    flow.innerHTML = list.map((p, i) => `<figure class="ft-fr" data-i="${i}"><img src="${p.src}" alt="${esc(Array.isArray(p.title) ? T(p.title[0], p.title[1]) : p.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').classList.add('bad')"><figcaption><b>${esc(p.artist)}</b>${p.year ? ' · ' + esc(p.year) : ''}</figcaption></figure>`).join('');
    const frames = [...flow.children], pos = el.querySelector('.ft-pos'), N = frames.length;
    let ticking = false, cur = 0;
    function paint() {
      ticking = false;
      const c = flow.scrollLeft + flow.clientWidth / 2;
      let best = 0, bd = 1e9;
      frames.forEach((f, i) => {
        const fc = f.offsetLeft + f.offsetWidth / 2, off = (fc - c) / f.offsetWidth, a = Math.max(-1.4, Math.min(1.4, off));
        f.style.transform = `perspective(900px) rotateY(${(-a * 28).toFixed(1)}deg) scale(${(1 - Math.min(1, Math.abs(a)) * .16).toFixed(3)})`;
        f.style.opacity = (1 - Math.min(1, Math.abs(a)) * .45).toFixed(2);
        if (Math.abs(off) < bd) { bd = Math.abs(off); best = i; }
      });
      cur = best; pos.textContent = (best + 1) + ' / ' + N;
    }
    flow.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener('resize', paint);
    const goTo = i => { i = Math.max(0, Math.min(N - 1, i)); const f = frames[i]; flow.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - flow.clientWidth / 2, behavior: 'smooth' }); };
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => goTo(cur + +b.dataset.z));
    tun.addEventListener('keydown', e => { if (e.key === 'ArrowRight') goTo(cur + 1); if (e.key === 'ArrowLeft') goTo(cur - 1); });
    frames.forEach(f => f.onclick = () => { const i = +f.dataset.i; if (i !== cur) return goTo(i); const p = list[i]; lb.hidden = false; lb.innerHTML = `<div class="ft-lb-in"><img src="${p.src}" alt=""><div><span class="ft-eye">${T('Kamu malı', 'Public domain')}</span><h3>${esc(Array.isArray(p.title) ? T(p.title[0], p.title[1]) : p.title)}</h3><p>${esc(p.artist)}${p.year ? ' · ' + esc(p.year) : ''}</p><a href="${p.page}" target="_blank" rel="noopener">${T('Wikimedia Commons’ta gör', 'View on Wikimedia Commons')} ↗</a></div><button>✕</button></div>`; lb.onclick = e => { if (e.target === lb || e.target.tagName === 'BUTTON') lb.hidden = true; }; });
    paint(); setTimeout(paint, 300);
  }
  function leave() { }
  return { open, leave, _load: loadPhotos };
})();

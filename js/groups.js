"use strict";
/* =====================================================================
   BABA. merkez sayfaları: KEŞFET · HAYAT · SOSYAL · İŞ
   Yalnızca görünüm: eski rotalar ve kayıtlı veriler aynen kalır.
   Her merkezin kendi kimliği var (awwwards Sites of the Day ve büyük markaların dilinden esinlenildi):
   - KEŞFET  → OpenAI: kırık beyaz, yumuşak aurora gradyanı, editoryal tipografi
   - HAYAT   → Apple: siyah sahne, gün batımı gradyanlı dev başlık, ürün sahnesi gibi bento
   - SOSYAL  → iOS Mesajlar sıcaklığı: pastel gradyan, uçuşan baloncuklar, nefes alan daire
   - İŞ      → Mercedes: siyah-gümüş, ışık süzmesi, ince çizgiler ve hassas grid
   Logo ya da marka görseli kullanılmaz; tamamı bu uygulamaya özgü CSS/SVG.
   ===================================================================== */
const BABAGroups = (() => {
  const tr = (a, b) => I18N.lang === 'en' ? b : a;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };

  const groups = {
    kesfet: { theme: 'kesfet', title: 'KEŞFET.', eyebrow: ['Merak et, oku, izle', 'Wonder, read, watch'], subtitle: ['Haberler, kişisel akış ve medya bir arada.', 'News, personal feed and media in one place.'],
      items: [['gundem', 'GÜNDEM.', ['Haber kaynakları, ilgi alanları ve sonra oku listesi', 'News sources, topics and a read-later list'], 'news'], ['akis', 'AKIŞ.', ['Kendi paylaşımların ve notların', 'Your own posts and notes'], 'feed'], ['play', 'PLAY.', ['Dizi, film, müzik ve podcast rafın', 'Your shelf of shows, films, music and podcasts'], 'play']] },
    hayat: { theme: 'hayat', title: 'HAYAT.', eyebrow: ['Yolculuklar · Kareler · Anılar', 'Journeys · Frames · Memories'], subtitle: ['Yolculuklar ve fotoğraflar tek yerde.', 'Travel and photography in one place.'],
      items: [['seyahat', 'SEYAHAT.', ['Antalya’dan en ucuz uçuşlar, rezervasyon ve 3D dünya', 'Cheapest flights from Antalya, bookings and a 3D globe'], 'travel'], ['foto', 'FOTOĞRAF.', ['Günün fotoğrafçısı ve 3D sokak galerisi', 'Photographer of the day and a 3D street gallery'], 'photo']] },
    sosyal: { theme: 'sosyal', title: 'SOSYAL.', eyebrow: ['Konuş · Paylaş · Nefes al', 'Talk · Share · Breathe'], subtitle: ['Mesajlaşma ve iyi hissetme alanı.', 'Messaging and wellbeing in one place.'],
      items: [['msn', 'MESSENGER.', ['Aile, arkadaşlar ve iş — gruplar, titreşim, grup sohbeti', 'Family, friends and work — groups, nudges, group chats'], 'chat'], ['dost', 'DOST.', ['Psikoloji okuma alanı ve nefes molası', 'A psychology reading room and a breathing break'], 'breath']] },
    ismerkez: { theme: 'is', title: 'İŞ.', eyebrow: ['Hassasiyet · Düzen · Odak', 'Precision · Order · Focus'], subtitle: ['İş bağlantıları ve CBN iş araçları.', 'Work links and CBN work tools.'],
      items: [['is', 'İŞ MERKEZİ.', ['DSAn bağlantıları, hatırlatmalar ve takvim', 'DSAn links, reminders and calendar'], 'dial'], ['cbn/work', 'CBN İŞ ARAÇLARI.', ['Projeler, görevler ve iş alanı', 'Projects, tasks and the work space'], 'board']] }
  };

  /* ---------- kartların illüstrasyonları (özgün SVG/CSS) ---------- */
  const ART = {
    news: () => `<div class="hb-art hb-news" aria-hidden="true"><i></i><i></i><i></i><b></b><b></b><b></b><b></b><b></b><b></b></div>`,
    feed: () => `<div class="hb-art hb-feed" aria-hidden="true"><span></span><span></span><span></span></div>`,
    play: () => `<div class="hb-art hb-play" aria-hidden="true"><em>▶</em><div>${Array.from({ length: 22 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div></div>`,
    travel: () => `<svg class="hb-art hb-travel" viewBox="0 0 400 220" aria-hidden="true"><defs><radialGradient id="hbG" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#1b2a55"/><stop offset="1" stop-color="#05070f"/></radialGradient><linearGradient id="hbArc" x1="0" x2="1"><stop offset="0" stop-color="#ff9a3c"/><stop offset="1" stop-color="#ff2d6f"/></linearGradient></defs>
      <circle cx="200" cy="250" r="190" fill="url(#hbG)"/>${Array.from({ length: 90 }, (_, i) => { const a = i * 2.4, r = 30 + (i * 37) % 160, x = 200 + Math.cos(a) * r, y = 250 - Math.abs(Math.sin(a) * r * .6); return y < 228 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#8fb4ff" opacity="${(.25 + (i % 5) / 8).toFixed(2)}"/>` : ''; }).join('')}
      <path class="hb-arc" d="M70 170 Q 200 20 330 150" fill="none" stroke="url(#hbArc)" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="170" r="5" fill="#ff9a3c"/><circle cx="330" cy="150" r="5" fill="#ff2d6f"/>
      <g class="hb-plane"><path d="M-9 0 L9 0 M0 -7 L4 0 L0 7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
      <text x="62" y="196" fill="#ffb27a" font-size="13" font-weight="700" font-family="system-ui">AYT</text><text x="318" y="176" fill="#ff7aa5" font-size="13" font-weight="700" font-family="system-ui">EDI</text></svg>`,
    photo: () => `<div class="hb-art hb-photo" aria-hidden="true"><span class="p1"></span><span class="p2"></span><span class="p3"></span><span class="p4"></span></div>`,
    chat: () => `<div class="hb-art hb-chat" aria-hidden="true"><p class="l">${tr('Akşam ne yiyoruz? 🍝', 'What’s for dinner? 🍝')}</p><p class="r">${tr('Mantı! 😋', 'Dumplings! 😋')}</p><p class="l">${tr('📳 Titreşim!', '📳 Nudge!')}</p><p class="r t"><i></i><i></i><i></i></p></div>`,
    breath: () => `<div class="hb-art hb-breath" aria-hidden="true"><span></span><span></span><span></span><em>${tr('nefes al', 'breathe in')}</em></div>`,
    dial: () => `<svg class="hb-art hb-dial" viewBox="0 0 220 220" aria-hidden="true"><defs><linearGradient id="hbSil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#8a9099"/><stop offset="1" stop-color="#e6e9ec"/></linearGradient></defs>
      <circle cx="110" cy="110" r="96" fill="none" stroke="url(#hbSil)" stroke-width="1.5"/><circle cx="110" cy="110" r="78" fill="none" stroke="#2a2d33" stroke-width="1"/>
      ${Array.from({ length: 60 }, (_, i) => { const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 88 : 82, x1 = 110 + Math.cos(a) * r1, y1 = 110 + Math.sin(a) * r1, x2 = 110 + Math.cos(a) * 94, y2 = 110 + Math.sin(a) * 94; return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${i % 5 ? '#4a4f57' : '#d9dde2'}" stroke-width="${i % 5 ? 1 : 2}"/>`; }).join('')}
      <g class="hb-hand"><line x1="110" y1="110" x2="110" y2="36" stroke="url(#hbSil)" stroke-width="2.5" stroke-linecap="round"/></g><g class="hb-hand2"><line x1="110" y1="110" x2="160" y2="110" stroke="#c9ced4" stroke-width="4" stroke-linecap="round"/></g><circle cx="110" cy="110" r="6" fill="url(#hbSil)"/></svg>`,
    board: () => `<div class="hb-art hb-board" aria-hidden="true">${[[3, 'a'], [2, 'b'], [4, 'c']].map(([n, c]) => `<div class="${c}">${Array.from({ length: n }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`).join('')}</div>`
  };

  /* ---------- canlı küçük bilgiler (yalnızca bu cihazdaki veriler) ---------- */
  function live(route) {
    try {
      if (route === 'seyahat') { const t = lsGet('trips', null); if (Array.isArray(t)) { const c = new Set(t.map(x => x.country).filter(Boolean)); return tr(`${t.length} şehir · ${c.size} ülke`, `${t.length} cities · ${c.size} countries`); } return tr('Gezilerim · 3D dünya', 'My travels · 3D globe'); }
      if (route === 'msn') { const b = document.querySelector('.nav a[data-r=msn] .ms-nb'); return b && b.textContent ? tr(`${b.textContent} okunmamış`, `${b.textContent} unread`) : tr('Çevrimiçi ol', 'Go online'); }
      if (route === 'dost') return tr('12 yazı · 1–5 dk nefes', '12 articles · 1–5 min breathing');
      if (route === 'foto') return tr('24 usta fotoğrafçı', '24 master photographers');
      if (route === 'gundem') return new Intl.DateTimeFormat(I18N.locale, { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date());
      if (route === 'is') { const d = new Date(), j = new Date(d.getFullYear(), 0, 1), w = Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); return tr(`${w}. hafta`, `Week ${w}`); }
    } catch (e) {}
    return '';
  }

  function heroArt(theme) {
    if (theme === 'kesfet') return `<div class="hb-aurora" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
    if (theme === 'hayat') return `<svg class="hb-horizon" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><radialGradient id="hbSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff1d6"/><stop offset=".35" stop-color="#ffb35c"/><stop offset="1" stop-color="#ff3d6e" stop-opacity="0"/></radialGradient><linearGradient id="hbSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f2e"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
      <circle class="hb-sun" cx="600" cy="330" r="240" fill="url(#hbSun)"/><rect y="320" width="1200" height="100" fill="url(#hbSea)"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${600 - (120 - i * 11)}" y="${330 + i * 9}" width="${(120 - i * 11) * 2}" height="2" rx="1" fill="#ffb35c" opacity="${(.5 - i * .05).toFixed(2)}"/>`).join('')}
      <g class="hb-jet"><path d="M0 0 l26 4 -26 4 6 -4z" fill="#fff"/><path d="M-160 4 H0" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/></g></svg>`;
    if (theme === 'sosyal') return `<div class="hb-bubbles" aria-hidden="true">${['💬', '❤️', '😂', '👋', '📳', '🌿', '☕', '🎉'].map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>`;
    return `<div class="hb-precision" aria-hidden="true"><i></i></div>`;
  }

  function open(host, id) {
    const g = groups[id]; if (!g) return;
    const letters = [...g.title].map((ch, i) => `<span style="--d:${i * 55}ms">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    host.innerHTML = `<section class="bb-group-page hb hb-${g.theme}">
      <header class="hb-hero">${heroArt(g.theme)}
        <div class="hb-hero-in"><a class="bb-group-back" href="#">← ${tr('Ana sayfa', 'Home')}</a>
          <p class="eyebrow hb-eye">BABA. / ${esc(g.title)} <span>${esc(tr(...g.eyebrow))}</span></p>
          <h1 aria-label="${esc(g.title)}"><span class="hb-split" aria-hidden="true">${letters}</span></h1>
          <p class="bb-group-sub">${esc(tr(...g.subtitle))}</p>
          <nav class="hb-jump" aria-label="${tr('Bölümler', 'Sections')}">${g.items.map(([r, l]) => `<a href="#${r}">${esc(l)}</a>`).join('')}</nav>
        </div>
        <span class="hb-scroll" aria-hidden="true">${tr('Kaydır', 'Scroll')}<i></i></span>
      </header>
      <div class="bb-group-grid hb-bento n${g.items.length}">${g.items.map(([route, label, desc, art], i) => `<a class="bb-group-card hb-card" href="#${route}" style="--i:${i}">
          <div class="hb-card-art">${ART[art]()}</div>
          <div class="hb-card-txt"><span class="bb-group-number">0${i + 1}</span><h2>${esc(label)}</h2><p>${esc(tr(...desc))}</p>${live(route) ? `<small class="hb-live">${esc(live(route))}</small>` : ''}</div>
          <span class="hb-go" aria-hidden="true">↗</span></a>`).join('')}</div>
      <footer class="hb-foot"><p class="bb-group-hint">${tr('Eski kategori bağlantıları çalışmaya devam eder.', 'Existing category links continue to work.')}</p></footer>
    </section>`;
    // imleç ışığı (spotlight) ve görünür olunca yükselen kartlar
    host.querySelectorAll('.hb-card').forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .15 }) : null;
    host.querySelectorAll('.hb-card').forEach(c => io ? io.observe(c) : c.classList.add('in'));
    requestAnimationFrame(() => host.querySelector('.hb') && host.querySelector('.hb').classList.add('ready'));
  }

  function injectCbn() {
    const r = location.hash.slice(1);
    if (r !== 'cbn' && !r.startsWith('cbn/')) return;
    const el = document.getElementById('cbnRoot'); if (!el || el.querySelector('.bb-cbn-shortcuts')) return;
    const box = document.createElement('nav'); box.className = 'bb-cbn-shortcuts'; box.setAttribute('aria-label', tr('CBN bağlantıları', 'CBN shortcuts'));
    box.innerHTML = '<a href="#today">' + tr('BUGÜN. / Bildirimler', 'TODAY / Notifications') + '</a><a href="#lab">' + tr('AI ARAÇLARI (LAB.)', 'AI TOOLS (LAB.)') + '</a><a href="#cbn/work">' + tr('İŞ ARAÇLARI', 'WORK TOOLS') + '</a>';
    el.prepend(box);
  }
  function injectWork() {
    if (location.hash !== '#is') return; const el = document.getElementById('isRoot'); if (!el || el.querySelector('.bb-work-shortcut')) return;
    const a = document.createElement('a'); a.className = 'bb-work-shortcut'; a.href = '#cbn/work'; a.textContent = tr('CBN İş Araçlarını Aç ↗', 'Open CBN Work Tools ↗'); el.prepend(a);
  }
  function refresh() {
    const r = location.hash.slice(1);
    document.body.classList.toggle('hb-mode', ['kesfet', 'hayat', 'sosyal', 'ismerkez', 'today'].includes(r));
    injectCbn(); injectWork();
  }
  return { open, refresh, groups };
})();

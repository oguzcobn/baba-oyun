/* =====================================================================
   BABA. — Futbol giriş sayfası (#futbol): "Tarafını seç"
   Solda Draft Modu, sağda Menajerlik Kariyeri. Bölünmüş ekran, iri ortak başlık, neon düğmeler.
   (Tasarım esin kaynağı: bölünmüş "taraf seç" kampanya sayfaları; tüm görseller özgün SVG.)
   ===================================================================== */
const FootballHub = (() => {
  'use strict';
  const T = (tr, en) => (typeof I18N !== 'undefined' && I18N.lang === 'en') ? en : tr;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  // sol: havada süzülen draft kartları (özgün çizim)
  const DRAFT_ART = `<svg class="fh-art fh-art-l" viewBox="0 0 420 360" aria-hidden="true">
    <defs><linearGradient id="fhCard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ff3a"/><stop offset="1" stop-color="#b7d900"/></linearGradient>
      <linearGradient id="fhCard2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1b1b"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient></defs>
    <g class="fh-c fh-c1" transform="translate(70 70) rotate(-16)"><rect width="150" height="210" rx="16" fill="url(#fhCard2)"/><rect x="10" y="10" width="130" height="190" rx="10" fill="none" stroke="#e9ff3a" stroke-width="2" opacity=".6"/><text x="22" y="48" font-size="34" font-weight="900" fill="#e9ff3a" font-family="system-ui">86</text><text x="22" y="70" font-size="13" font-weight="800" fill="#fff" font-family="system-ui">FV</text><circle cx="75" cy="120" r="34" fill="#2a2a2a"/><path d="M41 190 Q75 140 109 190" fill="#2a2a2a"/></g>
    <g class="fh-c fh-c2" transform="translate(180 40) rotate(9)"><rect width="160" height="224" rx="16" fill="url(#fhCard)"/><rect x="10" y="10" width="140" height="204" rx="10" fill="none" stroke="#111" stroke-width="2.5" opacity=".7"/><text x="22" y="52" font-size="38" font-weight="900" fill="#111" font-family="system-ui">89</text><text x="22" y="76" font-size="14" font-weight="800" fill="#111" font-family="system-ui">KNT</text><circle cx="80" cy="128" r="36" fill="#111" opacity=".85"/><path d="M42 204 Q80 150 118 204" fill="#111" opacity=".85"/><g fill="#111"><rect x="22" y="188" width="30" height="5" rx="2"/><rect x="58" y="188" width="44" height="5" rx="2"/></g></g>
    <g class="fh-ball"><circle cx="330" cy="290" r="34" fill="#fff"/><path d="M330 268 L349 282 L342 304 L318 304 L311 282 Z" fill="#111"/><g stroke="#111" stroke-width="2.4" fill="none"><path d="M330 268 V256 M349 282 L361 277 M342 304 L350 316 M318 304 L310 316 M311 282 L299 277"/></g></g>
  </svg>`;
  // sağ: taktik tahtası + kupa (özgün çizim)
  const CAREER_ART = `<svg class="fh-art fh-art-r" viewBox="0 0 420 360" aria-hidden="true">
    <defs><linearGradient id="fhCup" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2ff6a"/><stop offset=".55" stop-color="#c8ea00"/><stop offset="1" stop-color="#7c9300"/></linearGradient></defs>
    <g class="fh-board" transform="translate(30 70) rotate(-8)"><rect width="230" height="160" rx="14" fill="#0f3d2a" stroke="#e9ff3a" stroke-width="3"/><g stroke="#fff" stroke-opacity=".55" fill="none" stroke-width="2"><rect x="12" y="12" width="206" height="136" rx="4"/><line x1="115" y1="12" x2="115" y2="148"/><circle cx="115" cy="80" r="20"/></g>
      <g fill="#e9ff3a">${[[40, 50], [40, 110], [70, 80], [100, 45], [100, 115], [150, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g><g fill="#fff">${[[178, 45], [178, 115], [196, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g>
      <path d="M70 80 Q120 30 172 48" fill="none" stroke="#e9ff3a" stroke-width="3" stroke-dasharray="7 6"/><path d="M168 42 l10 6 -11 4" fill="#e9ff3a"/></g>
    <g class="fh-cup" transform="translate(255 70)"><path d="M20 10 H120 V60 Q120 120 70 130 Q20 120 20 60 Z" fill="url(#fhCup)"/><path d="M20 26 Q-14 26 -6 60 Q2 88 30 92" fill="none" stroke="#c8ea00" stroke-width="10"/><path d="M120 26 Q154 26 146 60 Q138 88 110 92" fill="none" stroke="#c8ea00" stroke-width="10"/><rect x="58" y="128" width="24" height="40" fill="#a7c400"/><rect x="34" y="166" width="72" height="22" rx="4" fill="#e9ff3a"/><rect x="24" y="186" width="92" height="22" rx="4" fill="#111"/><text x="70" y="78" text-anchor="middle" font-size="26" font-weight="900" fill="#111" font-family="system-ui" opacity=".75">1.</text></g>
  </svg>`;

  function open(el) {
    const best = (typeof ls !== 'undefined' && ls.get) ? ls.get('draft_best', 0) : (read('draft_best') || 0);
    const hist = read('draft_history_v1') || [], car = read('baba_career_save');
    const carMe = car && car.teams ? car.teams.find(t => t.me) : null;
    const carRank = carMe && car.table ? car.teams.slice().sort((a, b) => { const x = car.table[a.id], y = car.table[b.id]; return y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga); }).findIndex(t => t.me) + 1 : 0;
    el.innerHTML = `<section class="fh" id="football-hub">
      <a class="fh-side fh-left" href="#draft" aria-label="${T('Draft Modu', 'Draft Mode')}">
        <div class="fh-grain"></div>${DRAFT_ART}
        <div class="fh-info"><p class="fh-k">01 · ${T('Tek sezonluk meydan okuma', 'One-season challenge')}</p><h2>${T('Draft<br>Modu', 'Draft<br>Mode')}</h2>
          <p>${T('18 kulüpten kura çek, efsanelerle 11 kur, kimyayı yakala, sezonu simüle et.', 'Draw from 18 clubs, build an XI with legends, nail the chemistry, simulate the season.')}</p>
          <p class="fh-meta">${best ? T(`En iyi: ${best} puan`, `Best: ${best} pts`) : T('Henüz oynanmadı', 'Not played yet')}${hist.length ? ' · ' + T(`${hist.length} sezon`, `${hist.length} seasons`) : ''}</p>
          <span class="fh-btn">${T('Draft’a başla', 'Start the Draft')}</span></div></a>
      <a class="fh-side fh-right" href="#career" aria-label="${T('Menajerlik Kariyeri', 'Manager Career')}">
        <div class="fh-mesh"></div>${CAREER_ART}
        <div class="fh-info"><p class="fh-k">02 · ${T('Sezonlar boyu süren kariyer', 'A career over many seasons')}</p><h2>${T('Menajerlik<br>Kariyeri', 'Manager<br>Career')}</h2>
          <p>${T('Bütçe, transfer, kondisyon, sponsor, tesis, altyapı ve canlı maçta taktik müdahale.', 'Budget, transfers, fitness, sponsors, facilities, academy and live tactical control.')}</p>
          <p class="fh-meta">${carMe ? `${esc(carMe.name)} · ${T('Sezon', 'Season')} ${car.season} · ${T('Hafta', 'Week')} ${Math.min(car.week + 1, 34)} · ${carRank}.` : T('Yeni kariyer seni bekliyor', 'A new career awaits')}</p>
          <span class="fh-btn">${carMe ? T('Kariyere devam et', 'Continue career') : T('Kariyere başla', 'Start a career')}</span></div></a>
      <div class="fh-title" aria-hidden="true"><b>${T('TARAFINI', 'PICK')}</b><b>${T('SEÇ.', 'YOUR SIDE.')}</b><small>${T('OYUNU SEN YÖNET', 'RUN THE GAME')}</small></div>
      <h1 class="fh-sr">${T('Futbol: Draft Modu ya da Menajerlik Kariyeri', 'Football: Draft Mode or Manager Career')}</h1>
    </section>`;
  }
  return { open };
})();

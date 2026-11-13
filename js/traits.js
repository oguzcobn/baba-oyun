/* =====================================================================
   BABA. — Oyuncu karakteristikleri (PlayStyles / Traits)
   Traits.of(name, pos, r) → ['FINESSE_SHOT', ...]
   Bilinen oyuncular adla, diğerleri mevki + reyting + isim hash'iyle (her seferinde aynı sonuç) belirlenir.
   ===================================================================== */
const Traits = (() => {
  'use strict';
  const LIST = {
    FINESSE_SHOT: ['Mohamed Salah', 'İrfan Can Kahveci', 'Hakim Ziyech', 'Leroy Sané', 'Marco Asensio', 'Yunus Akgün', 'Kerem Aktürkoğlu', 'Ricardo Quaresma', 'Arda Güler', 'Cengiz Ünder', 'Edin Višća', 'Anthony Nwakaeme'],
    AERIAL_THREAT: ['Paul Onuachu', 'Edin Džeko', 'Edin Dzeko', 'Victor Osimhen', 'Mauro Icardi', 'Simon Banza', 'Romelu Lukaku', 'Vincent Aboubakar', 'Youssef En-Nesyri', 'Vedat Muriqi', 'Alexander Sørloth', 'Andreas Cornelius', 'Bafétimbi Gomis', 'Demba Ba', 'Burak Yılmaz', 'Cenk Tosun', 'Michy Batshuayi', 'Mbaye Diagne'],
    SPEED_DRIBBLER: ['Barış Alper Yılmaz', 'Rafa Silva', 'Allan Saint-Maximin', 'Anthony Nwakaeme', 'Trézéguet', 'Trezeguet', 'Leroy Sané', 'Dorgeles Nene', 'Adama Traoré', 'Gift Orban', 'Nicolas Pépé', 'Ryan Babel', 'Henry Onyekuru', 'Kerem Aktürkoğlu', 'Jota', 'Cengiz Ünder', 'Ermal Krasniqi'],
    PLAYMAKER: ['Dries Mertens', 'Dušan Tadić', 'Muhammed Cham', 'Gedson Fernandes', 'Fred', 'Gabriel Sara', 'Mesut Özil', 'İlkay Gündoğan', 'Hakim Ziyech', 'Sebastian Szymański', 'Orkun Kökçü', 'Marco Asensio', 'Lucas Torreira', 'Younès Belhanda', 'Ianis Hagi', 'Ruslan Malinovskyi', 'Tolgay Arslan', 'Sérgio Oliveira'],
    FREEKICK_MASTER: ['Enis Bardhi', 'Gabriel Sara', 'Kerem Demirbay', 'Hakim Ziyech', 'Ricardo Quaresma', 'Edin Višća', 'Dušan Tadić', 'Mesut Özil', 'Hakan Çalhanoğlu', 'Ruslan Malinovskyi', 'Alexandru Maxim'],
    AGGRESSIVE_TACKLER: ['Davinson Sánchez', 'Batista Mendy', 'Alexander Djiku', 'Gabriel Paulista', 'Wilfred Ndidi', 'Lucas Torreira', 'Milan Škriniar', 'Pepe', 'Gary Medel', 'Domagoj Vida', 'Wilfried Singo', 'Jawad El Yamiq', 'Christian Luyindama'],
    WALL_GK: ['Uğurcan Çakır', 'Fernando Muslera', 'Dominik Livaković', 'Mert Günok', 'Ederson', 'André Onana', 'Altay Bayındır', 'Alban Lafont']
  };
  const BY = {}; Object.entries(LIST).forEach(([t, ns]) => ns.forEach(n => (BY[n] = BY[n] || []).push(t)));
  const LABEL = () => {
    const T = (tr, en) => (typeof I18N !== 'undefined' && I18N.lang === 'en') ? en : tr;
    return { FINESSE_SHOT: T('Plaseci', 'Finesse shot'), AERIAL_THREAT: T('Hava hakimiyeti', 'Aerial threat'), SPEED_DRIBBLER: T('Patlayıcı hız', 'Speed dribbler'), PLAYMAKER: T('Oyun kurucu', 'Playmaker'), FREEKICK_MASTER: T('Duran top ustası', 'Free-kick master'), AGGRESSIVE_TACKLER: T('Sert kesici', 'Aggressive tackler'), WALL_GK: T('Panter kaleci', 'Wall keeper') };
  };
  const ICON = { FINESSE_SHOT: '🎯', AERIAL_THREAT: '🗼', SPEED_DRIBBLER: '⚡', PLAYMAKER: '🧠', FREEKICK_MASTER: '🌀', AGGRESSIVE_TACKLER: '🛡️', WALL_GK: '🧤' };
  const h = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return (x >>> 0) % 100; };
  function of(name, pos, r) {
    if (BY[name]) return BY[name].slice();
    const t = [], k = h(name); r = r || 70;
    if (pos === 'KL' && r >= 80) t.push('WALL_GK');
    if (pos === 'FV' && r >= 74 && k < 45) t.push('AERIAL_THREAT');
    if (pos === 'ST' && k < 22) t.push('AERIAL_THREAT');
    if ((pos === 'KN' || pos === 'FV') && r >= 76 && k >= 45 && k < 80) t.push('SPEED_DRIBBLER');
    if (pos === 'KN' && r >= 77 && k >= 80) t.push('FINESSE_SHOT');
    if (pos === 'OS' && r >= 78 && k < 40) t.push('PLAYMAKER');
    if ((pos === 'OS' || pos === 'KN') && r >= 75 && k >= 90) t.push('FREEKICK_MASTER');
    if ((pos === 'ST' || pos === 'OS') && k >= 70 && k < 88) t.push('AGGRESSIVE_TACKLER');
    return t;
  }
  return { of, LIST, LABEL, ICON };
})();

/* =====================================================================
   BABA. HAYAT — yaşam evreni (v2)
   Kurgusal, çevrimdışı çalışır; kayıt bu tarayıcıda (localStorage) tutulur.
   Aşamalar: 1) Yaşayan şehir  2) Kariyer ve ekonomi  3) İlişkiler ve aile
             4) Dinamik olaylar  5) Çok oyunculu dünya (isteğe bağlı, açık rızayla; supabase/life.sql)
   Messenger mesajları oyun tarafından ASLA okunmaz ve oyun Messenger'a mesaj göndermez.
   Test sözleşmesi: .life-intro #lifeName #lifeStart .life-meters .life-time .life-budget .life-people,
                    [data-action="do:study"] [data-action="month"] [data-action="tab:money"] [data-action="tab:people"]
   ===================================================================== */
const LifeGame = (() => {
  'use strict';
  const KEY = 'baba_life_game_v1';
  const T = (tr, en) => (typeof I18N !== 'undefined' && I18N.lang === 'en') ? en : tr;
  const rand = n => Math.floor(Math.random() * n), pick = a => a[rand(a.length)], chance = p => Math.random() < p;
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const money = n => Math.round(n).toLocaleString(T('tr-TR', 'en-GB')) + ' ₺';
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------------- 1) şehir: semtler, konut, mekânlar, ulaşım ---------------- */
  const DIST = {
    merkez: { n: ['Merkez', 'City Centre'], e: '🏙️', rent: 22000, buy: 4800000, x: 50, y: 42, c: '#ff8a5c', places: ['plaza', 'bank', 'mall', 'resto'] },
    sahil: { n: ['Sahil', 'Seafront'], e: '🌊', rent: 28000, buy: 6200000, x: 78, y: 70, c: '#4cc9f0', places: ['park', 'cafe', 'resto', 'concert'] },
    eski: { n: ['Eski Şehir', 'Old Town'], e: '🏛️', rent: 13000, buy: 2600000, x: 22, y: 58, c: '#f4a261', places: ['museum', 'library', 'bazaar', 'cafe'] },
    tekno: { n: ['Teknopark', 'Tech Park'], e: '🔬', rent: 17000, buy: 3600000, x: 72, y: 22, c: '#9b5de5', places: ['uni', 'cowork', 'gym', 'plaza'] },
    vadi: { n: ['Yeşil Vadi', 'Green Valley'], e: '🌳', rent: 11000, buy: 2200000, x: 26, y: 20, c: '#52b788', places: ['hospital', 'school', 'stadium', 'bazaar'] }
  };
  const DK = Object.keys(DIST);
  const dn = k => T(...DIST[k].n);
  const PLACE = {
    plaza: ['🏢', ['İş merkezi', 'Business centre']], bank: ['🏦', ['Banka', 'Bank']], mall: ['🛍️', ['AVM', 'Shopping mall']], resto: ['🍽️', ['Restoran', 'Restaurant']],
    park: ['🏃', ['Sahil parkı', 'Seafront park']], cafe: ['☕', ['Kafe', 'Café']], concert: ['🎵', ['Konser alanı', 'Concert venue']], museum: ['🖼️', ['Müze', 'Museum']],
    library: ['📚', ['Kütüphane', 'Library']], bazaar: ['🧺', ['Pazar', 'Market']], uni: ['🎓', ['Üniversite', 'University']], cowork: ['💡', ['Ortak çalışma alanı', 'Co-working space']],
    gym: ['🏋️', ['Spor salonu', 'Gym']], hospital: ['🏥', ['Hastane', 'Hospital']], school: ['🏫', ['Okul', 'School']], stadium: ['🏟️', ['Stadyum', 'Stadium']]
  };
  const TRANS = { yuru: [['Yürüyerek', 'On foot'], 0, 1.6, 2], bisiklet: [['Bisiklet', 'Bicycle'], 300, 1.1, 0], toplu: [['Toplu taşıma', 'Public transport'], 1800, .8, 0], araba: [['Araba', 'Car'], 6500, .45, 0] };
  const distance = (a, b) => { const A = DIST[a], B = DIST[b]; return Math.hypot(A.x - B.x, A.y - B.y) / 10; };
  const EDU = () => [T('Lise', 'Secondary school'), T('Ön lisans', 'Associate degree'), T('Lisans', 'Bachelor’s degree'), T('Yüksek lisans', 'Master’s degree')];

  /* ---------------- 2) kariyer ve ekonomi ---------------- */
  const SECT = {
    tech: { n: ['Teknoloji', 'Technology'], sk: 'logic', d: 'tekno', base: 32000, t: [['Stajyer yazılımcı', 'Junior developer'], ['Yazılımcı', 'Developer'], ['Kıdemli yazılımcı', 'Senior developer'], ['Takım lideri', 'Team lead'], ['Teknoloji direktörü', 'Head of technology']] },
    health: { n: ['Sağlık', 'Health'], sk: 'knowledge', d: 'vadi', base: 30000, t: [['Hasta danışmanı', 'Patient adviser'], ['Hemşire', 'Nurse'], ['Uzman hemşire', 'Senior nurse'], ['Klinik sorumlusu', 'Clinic manager'], ['Hastane müdürü', 'Hospital director']] },
    edu: { n: ['Eğitim', 'Education'], sk: 'knowledge', d: 'eski', base: 26000, t: [['Asistan öğretmen', 'Teaching assistant'], ['Öğretmen', 'Teacher'], ['Kıdemli öğretmen', 'Senior teacher'], ['Müdür yardımcısı', 'Deputy head'], ['Okul müdürü', 'Head teacher']] },
    fin: { n: ['Finans', 'Finance'], sk: 'logic', d: 'merkez', base: 34000, t: [['Gişe yetkilisi', 'Bank teller'], ['Analist', 'Analyst'], ['Kıdemli analist', 'Senior analyst'], ['Şube müdürü', 'Branch manager'], ['Finans direktörü', 'Finance director']] },
    tour: { n: ['Turizm', 'Tourism'], sk: 'social', d: 'sahil', base: 24000, t: [['Resepsiyonist', 'Receptionist'], ['Misafir ilişkileri', 'Guest relations'], ['Ön büro şefi', 'Front office manager'], ['Otel müdür yrd.', 'Assistant hotel manager'], ['Otel genel müdürü', 'Hotel general manager']] },
    retail: { n: ['Perakende', 'Retail'], sk: 'social', d: 'merkez', base: 22000, t: [['Satış danışmanı', 'Sales assistant'], ['Kıdemli satış', 'Senior sales'], ['Mağaza müdür yrd.', 'Assistant store manager'], ['Mağaza müdürü', 'Store manager'], ['Bölge müdürü', 'Regional manager']] },
    media: { n: ['Medya ve tasarım', 'Media & design'], sk: 'creativity', d: 'eski', base: 25000, t: [['İçerik üreticisi', 'Content creator'], ['Tasarımcı', 'Designer'], ['Kıdemli tasarımcı', 'Senior designer'], ['Kreatif lider', 'Creative lead'], ['Kreatif direktör', 'Creative director']] },
    sea: { n: ['Denizcilik ve tersane', 'Maritime & shipyard'], sk: 'logic', d: 'sahil', base: 33000, t: [['Teknisyen', 'Technician'], ['Planlama uzmanı', 'Planning specialist'], ['Proje mühendisi', 'Project engineer'], ['Proje müdürü', 'Project manager'], ['Tersane direktörü', 'Shipyard director']] }
  };
  const SK = () => ({ health: T('Sağlık', 'Health'), happiness: T('Mutluluk', 'Happiness'), energy: T('Enerji', 'Energy'), stress: T('Stres', 'Stress'), knowledge: T('Bilgi', 'Knowledge'), social: T('Sosyal', 'Social'), logic: T('Mantık', 'Logic'), creativity: T('Yaratıcılık', 'Creativity'), fitness: T('Kondisyon', 'Fitness') });
  const ECO = () => ({ buyume: [T('Büyüme', 'Growth'), '📈'], durgun: [T('Durgunluk', 'Slowdown'), '➖'], kriz: [T('Kriz', 'Crisis'), '📉'] });
  const LOANK = () => ({ kart: T('Kredi kartı borcu', 'Credit card debt'), tuketici: T('İhtiyaç kredisi', 'Personal loan'), konut: T('Konut kredisi', 'Mortgage'), is: T('İşletme kredisi', 'Business loan') });
  function annualTax(gross) { const y = gross * 12; let t = 0, b = [[110000, .15], [230000, .2], [870000, .27], [Infinity, .35]], prev = 0; for (const [lim, r] of b) { if (y > prev) t += (Math.min(y, lim) - prev) * r; prev = lim; } return t / 12; }

  /* ---------------- 3) ilişkiler: kişilik, uyum ---------------- */
  const NAMES = ['Deniz', 'Ece', 'Mert', 'Zeynep', 'Can', 'Elif', 'Kerem', 'Defne', 'Arda', 'Selin', 'Emre', 'Ada', 'Bora', 'Nil', 'Kaan', 'Lara', 'Ozan', 'Mira', 'Efe', 'Yağmur', 'Alex', 'Leyla', 'Tuna', 'Asya'];
  const LIKES = () => [T('Müzik', 'Music'), T('Futbol', 'Football'), T('Sinema', 'Cinema'), T('Doğa', 'Nature'), T('Yemek', 'Cooking'), T('Teknoloji', 'Technology'), T('Kitap', 'Books'), T('Seyahat', 'Travel'), T('Sanat', 'Art'), T('Spor', 'Sport')];
  const TRAITS = () => ({ ext: [T('İçe dönük', 'Introverted'), T('Dışa dönük', 'Outgoing')], agr: [T('Sert', 'Blunt'), T('Uyumlu', 'Agreeable')], con: [T('Rahat', 'Easy-going'), T('Disiplinli', 'Disciplined')], neu: [T('Sakin', 'Calm'), T('Hassas', 'Sensitive')], ope: [T('Gelenekçi', 'Traditional'), T('Meraklı', 'Curious')] });
  const newTraits = () => ({ ext: rand(101), agr: rand(101), con: rand(101), neu: rand(101), ope: rand(101) });
  const traitText = tr => Object.entries(TRAITS()).map(([k, [lo, hi]]) => tr[k] >= 60 ? hi : tr[k] <= 40 ? lo : null).filter(Boolean).slice(0, 3).join(' · ') || T('Dengeli', 'Balanced');
  function npc(role, extra) {
    const L = LIKES(); const likes = [pick(L), pick(L)].filter((v, i, a) => a.indexOf(v) === i);
    return Object.assign({ id: uid(), name: pick(NAMES), emoji: pick(['🧑', '👩', '👨', '🧔', '👱', '👩‍🦱', '🧑‍🦰', '👨‍🦳']), role, traits: newTraits(), likes, bond: 20, history: [], age: 22 + rand(14) }, extra || {});
  }
  function compat(p) {
    const me = state.traits, t = p.traits; let d = 0; for (const k of ['ext', 'agr', 'con', 'ope']) d += Math.abs(me[k] - t[k]); d += Math.abs((100 - me.neu) - (100 - t.neu)) * .5;
    const shared = p.likes.filter(x => state.likes.includes(x)).length;
    return clamp(Math.round(100 - d / 4.5 + shared * 10 + (t.agr > 60 ? 6 : 0)));
  }
  const kidStage = m => m < 36 ? T('Bebek', 'Baby') : m < 144 ? T('Çocuk', 'Child') : m < 216 ? T('Ergen', 'Teenager') : T('Genç yetişkin', 'Young adult');
  const kidCost = m => m < 36 ? 5500 : m < 144 ? 4500 : m < 216 ? 7000 : 0;

  /* ---------------- durum ---------------- */
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (!s) return null; if (s.version === 2) return s; if (s.version === 1) return migrate(s); return null; } catch (e) { return null; } };
  let state = load(), host = null, tab = 'home', place = null, modal = null;
  function base(name) {
    return {
      version: 2, name: String(name || T('Oyuncu', 'Player')).slice(0, 32), avatar: '🧑', age: 18, month: 1, year: 2026, cash: 45000, savings: 10000, credit: 650,
      stats: { health: 80, happiness: 70, energy: 100, stress: 18, knowledge: 15, social: 15, logic: 15, creativity: 15, fitness: 40 },
      traits: newTraits(), likes: [], edu: 0, studying: null, exp: 0, job: null, career: [], company: null, loans: [], props: [],
      invest: { fund: 0, gold: 0, crypto: 0 }, prices: { fund: 100, gold: 100, crypto: 100 }, insurance: false,
      home: { district: 'eski', own: null, rent: 7500, shared: true }, location: 'eski', transport: 'toplu', car: 0,
      economy: { phase: 'buyume', months: 0, rate: 42 }, people: [], pending: null, market: [], marketAt: -99, choices: 0, log: [],
      prefs: { food: 'Mantı', music: 'Pop', film: T('Komedi', 'Comedy'), team: 'Trabzonspor' }, world: { joined: false, hide: false, applied: [] }, monthsPlayed: 0, ended: false
    };
  }
  function migrate(o) {
    const s = base(o.name); s.age = o.age || 18; s.month = o.month || 1; s.year = o.year || 2026; s.cash = o.cash || 0; s.savings = o.savings || 0;
    ['health', 'happiness', 'energy', 'stress', 'knowledge', 'social', 'logic'].forEach(k => { if (typeof o[k] === 'number') s.stats[k] = o[k]; });
    s.exp = o.exp || 0; s.choices = o.choices || 0; s.log = Array.isArray(o.log) ? o.log.slice(0, 40) : []; if (o.prefs) Object.assign(s.prefs, o.prefs);
    if (o.debt > 0) s.loans.push({ id: uid(), kind: 'tuketici', left: o.debt, rate: 48, pay: Math.ceil(o.debt / 24) });
    if (o.job > 0) { const sec = ['retail', 'retail', 'tour', 'tech', 'tech', 'fin'][o.job] || 'retail'; s.job = { sector: sec, level: Math.min(4, Math.floor(o.job / 2)), pay: SECT[sec].base * (1 + Math.min(4, Math.floor(o.job / 2)) * .45), perf: 60, months: 6 }; }
    if (o.partner) s.people.push(npc(o.partner.married ? 'es' : 'partner', { name: o.partner.name, bond: o.partner.bond || 50 }));
    (o.children || []).forEach(c => s.people.push(npc('cocuk', { name: c.name, age: 0, months: c.months || 0, grade: 70, mood: 70, bond: 70 })));
    (o.friends || []).forEach(f => s.people.push(npc('arkadas', { name: f.name, bond: f.bond || 40 })));
    if (o.car) { s.car = 600000; s.transport = 'araba'; }
    s.log.unshift(T('Hayatın yeni şehir evrenine taşındı. Kayıtların korundu.', 'Your life moved into the new city universe. Your save was kept.'));
    return s;
  }
  const create = name => { const s = base(name); s.job = { sector: 'retail', level: 0, pay: 22000, perf: 60, months: 0, company: 'Liman AVM', district: 'merkez' }; s.career.push('1/2026: ' + T('Satış danışmanı', 'Sales assistant') + ' · Liman AVM'); s.likes = [pick(LIKES()), pick(LIKES())].filter((v, i, a) => a.indexOf(v) === i); s.people.push(npc('arkadas', { bond: 45 }), npc('arkadas', { bond: 35 })); s.log.unshift(T(`${s.name} 18 yaşında; Eski Şehir’de paylaşımlı bir evde oda kiraladı ve Liman AVM’de satış danışmanı olarak çalışmaya başladı.`, `${s.name} is 18, renting a room in a shared house in the Old Town and working as a sales assistant at Harbour Mall.`)); return s; };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function note(x) { state.log.unshift(state.month + '/' + state.year + ' · ' + x); state.log = state.log.slice(0, 120); }
  function chg(d) { for (const [k, v] of Object.entries(d)) { if (k in state.stats) state.stats[k] = clamp(state.stats[k] + v); else if (k === 'cash') state.cash += v; else if (k === 'exp') state.exp = Math.max(0, state.exp + v); } }
  const S = () => state.stats;
  const toast = m => { const d = document.createElement('div'); d.className = 'life-toast'; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 2800); };
  function spend(cost, energy) { if (state.cash < cost) { toast(T('Yeterli nakit yok', 'Not enough cash')); return false; } if (S().energy < energy) { toast(T('Bu ay için enerjin kalmadı — ayı bitir', 'No energy left this month — end the month')); return false; } state.cash -= cost; S().energy = clamp(S().energy - energy); state.choices++; return true; }

  /* ---------------- iş piyasası ve mülakat ---------------- */
  function makeMarket() {
    const eco = state.economy.phase, n = eco === 'kriz' ? 3 : eco === 'durgun' ? 4 : 6, out = [];
    for (let i = 0; i < n; i++) {
      const key = pick(Object.keys(SECT)), sec = SECT[key], top = Math.min(4, Math.floor(state.exp / 30) + (state.edu >= 2 ? 1 : 0) + 1);
      const level = Math.max(0, Math.min(4, rand(top + 1))), pay = Math.round(sec.base * (1 + level * .45) * (eco === 'kriz' ? .9 : 1) * (.92 + Math.random() * .2) / 100) * 100;
      out.push({ id: uid(), sector: key, level, pay, req: { edu: Math.min(3, Math.max(0, level - 1)), skill: 10 + level * 16, exp: level * 18 }, district: sec.d, company: pick(['Atlas', 'Lima', 'Nova', 'Pera', 'Kuzey', 'Mavi', 'Zirve', 'Liman']) + ' ' + pick(['A.Ş.', 'Grup', 'Holding', 'Ltd.', 'Lab']) });
    }
    state.market = out; state.marketAt = state.monthsPlayed;
  }
  const jobTitle = j => T(...SECT[j.sector].t[j.level]);
  const QUESTIONS = () => [
    [T('Kendinden bahseder misin?', 'Tell us about yourself.'), [[T('Başarılarımı rakamlarla anlatırım', 'I talk through my results with numbers'), 'logic'], [T('Ekip çalışmasından örnek veririm', 'I give a teamwork example'), 'social'], [T('Yaptığım özgün bir projeyi gösteririm', 'I show an original project'), 'creativity']]],
    [T('Zor bir müşteriyle ne yaparsın?', 'How do you handle a difficult customer?'), [[T('Önce dinler, sakinleştiririm', 'Listen first and calm things down'), 'social'], [T('Sorunu adım adım çözerim', 'Solve it step by step'), 'logic'], [T('Kurala göre davranırım', 'Follow the rules'), 'knowledge']]],
    [T('5 yıl sonra kendini nerede görüyorsun?', 'Where do you see yourself in five years?'), [[T('Ekibimi yönetirken', 'Leading my own team'), 'social'], [T('Alanımda uzman olarak', 'As an expert in my field'), 'knowledge'], [T('Yeni şeyler üretirken', 'Creating new things'), 'creativity']]],
    [T('Bir hata yaptığında ne yaparsın?', 'What do you do when you make a mistake?'), [[T('Sebebini analiz eder, tekrarlamam', 'Analyse why and don’t repeat it'), 'logic'], [T('Açıkça söyler, özür dilerim', 'Own it and apologise'), 'social'], [T('Konuyu araştırıp öğrenirim', 'Research and learn'), 'knowledge']]],
    [T('Baskı altında nasıl çalışırsın?', 'How do you work under pressure?'), [[T('Öncelik listesi yaparım', 'I make a priority list'), 'logic'], [T('Ekiple işi bölüşürüm', 'Share the work with the team'), 'social'], [T('Pratik çözümler bulurum', 'Find practical shortcuts'), 'creativity']]]
  ];
  function interview(job) {
    const qs = QUESTIONS().sort(() => Math.random() - .5).slice(0, 3); let score = 0, i = 0;
    const step = () => {
      if (i >= qs.length) {
        const sk = S()[SECT[job.sector].sk], need = job.req.skill, ok = score + sk * .6 + rand(25) - (state.economy.phase === 'kriz' ? 10 : 0) >= need * .6 + 40;
        if (ok) { const old = state.job; state.job = { sector: job.sector, level: job.level, pay: job.pay, perf: 60, months: 0, company: job.company, district: job.district }; state.market = state.market.filter(x => x.id !== job.id); state.career.push(`${state.month}/${state.year}: ${jobTitle(job)} · ${job.company}`); note(T(`${job.company} şirketinde ${jobTitle(job)} olarak işe başladın (${money(job.pay)}/ay).`, `You started as ${jobTitle(job)} at ${job.company} (${money(job.pay)}/month).`)); chg({ happiness: 10, stress: -4 }); showModal(`<h3>🎉 ${T('Teklif aldın!', 'You got the offer!')}</h3><p>${T(`${job.company}, seni ${jobTitle(job)} olarak işe aldı.`, `${job.company} hired you as ${jobTitle(job)}.`)}${old ? ' ' + T('Eski işinden ayrıldın.', 'You left your old job.') : ''}</p><button data-close class="primary">${T('Harika', 'Great')}</button>`); }
        else { note(T(`${job.company} mülakatı olumsuz sonuçlandı.`, `The ${job.company} interview didn’t work out.`)); chg({ happiness: -5, stress: 5 }); showModal(`<h3>😕 ${T('Bu sefer olmadı', 'Not this time')}</h3><p>${T('Mülakat iyi geçmedi. Becerini geliştirip tekrar dene.', 'The interview didn’t go well. Build your skills and try again.')}</p><button data-close>${T('Tamam', 'OK')}</button>`); }
        save(); render(); return;
      }
      const [q, ans] = qs[i];
      showModal(`<p class="life-k">${T('Mülakat', 'Interview')} · ${esc(job.company)} · ${i + 1}/3</p><h3>${esc(q)}</h3><div class="life-choices">${ans.map(([t, sk], k) => `<button data-ans="${k}">${esc(t)}</button>`).join('')}</div>`, m => m.querySelectorAll('[data-ans]').forEach(b => b.onclick = () => { const sk = ans[+b.dataset.ans][1]; score += S()[sk] * .5 + (sk === SECT[job.sector].sk ? 12 : 4); i++; step(); }));
    };
    if (!spend(0, 10)) return; step();
  }

  /* ---------------- 4) dinamik olaylar ---------------- */
  const EVENTS = [
    { id: 'kriz', w: s => s.economy.phase === 'buyume' && s.monthsPlayed > 8 && s.economy.months > 12 ? 1.2 : 0, t: () => T('📉 Ekonomik kriz başladı', '📉 An economic crisis has begun'), d: () => T('Piyasalar düşüyor, şirketler işe alımı durduruyor, faizler yükseliyor.', 'Markets are falling, firms have stopped hiring and interest rates are rising.'),
      start: s => { s.economy = { phase: 'kriz', months: 0, rate: Math.min(65, s.economy.rate + 12) }; }, ch: [[T('Harcamaları kıs', 'Cut back spending'), s => { s.stats.stress += 4; s.frugal = 6; return T('Altı ay boyunca giderlerin %15 azalacak.', 'Your costs drop by 15% for six months.'); }], [T('Yatırımlarını sat', 'Sell your investments'), s => { const v = invValue(s); s.cash += v; s.invest = { fund: 0, gold: 0, crypto: 0 }; return T(`${money(v)} nakde çevrildi.`, `${money(v)} turned into cash.`); }], [T('Sakin kal, bekle', 'Stay calm and wait'), () => T('Fırtınanın geçmesini bekliyorsun.', 'You wait for the storm to pass.')]] },
    { id: 'toparlanma', w: s => s.economy.phase === 'kriz' && s.economy.months > 5 ? 8 : 0, t: () => T('📈 Ekonomi toparlanıyor', '📈 The economy is recovering'), d: () => T('İş ilanları artıyor, faizler düşmeye başladı.', 'Job ads are up and interest rates are starting to fall.'), start: s => { s.economy = { phase: 'buyume', months: 0, rate: Math.max(25, s.economy.rate - 10) }; makeMarket(); }, ch: [[T('Fırsatları değerlendir', 'Make the most of it'), s => { s.stats.happiness += 6; return T('Yeni ilanlar seni bekliyor.', 'New job ads are waiting for you.'); }]] },
    { id: 'isten', w: s => s.job && s.economy.phase === 'kriz' && s.job.perf < 65 ? 6 : 0, t: () => T('📦 İşten çıkarıldın', '📦 You’ve been made redundant'), d: () => T('Şirket küçülmeye gitti ve pozisyonun kaldırıldı.', 'The company is downsizing and your role has gone.'),
      start: s => { s.lastJob = s.job; s.job = null; s.benefit = 6; }, ch: [[T('Tazminatı al, iş ara', 'Take the severance and job-hunt'), s => { const v = Math.round((s.lastJob.pay || 0) * Math.max(1, Math.floor((s.lastJob.months || 0) / 12))); s.cash += v; makeMarket(); return T(`${money(v)} tazminat aldın.`, `You received ${money(v)} in severance.`); }], [T('Kendi işini kurmayı düşün', 'Think about starting your own business'), s => { s.stats.creativity += 6; return T('İş merkezinde ya da Teknopark’ta şirket kurabilirsin.', 'You can start a company in the business centre or Tech Park.'); }]] },
    { id: 'teklif', w: s => s.exp > 20 && s.economy.phase !== 'kriz' ? 3 : 0, t: () => T('📩 Beklenmedik bir iş teklifi', '📩 An unexpected job offer'), d: () => T('Eski bir tanıdığın seni daha iyi maaşlı bir pozisyona önerdi.', 'An old contact recommended you for a better-paid role.'),
      ch: [[T('Kabul et', 'Accept'), s => { const key = s.job ? s.job.sector : pick(Object.keys(SECT)), lv = Math.min(4, (s.job ? s.job.level : 0) + 1); s.job = { sector: key, level: lv, pay: Math.round(SECT[key].base * (1 + lv * .45) * 1.1), perf: 60, months: 0, company: 'Zirve Grup', district: SECT[key].d }; s.career.push(`${s.month}/${s.year}: ${jobTitle(s.job)} · Zirve Grup`); return T(`Yeni işin: ${jobTitle(s.job)}.`, `Your new job: ${jobTitle(s.job)}.`); }], [T('Teşekkür et, kal', 'Thank them and stay'), s => { if (s.job) s.job.perf += 6; return T('Sadakatin fark edildi.', 'Your loyalty was noticed.'); }]] },
    { id: 'miras', w: () => 1, t: () => T('🎁 Küçük bir miras', '🎁 A small inheritance'), d: () => T('Uzak bir akraban sana bir miktar para bıraktı.', 'A distant relative left you some money.'), ch: [[T('Biriktir', 'Save it'), s => { const v = 40000 + rand(80000); s.savings += v; return T(`${money(v)} birikimine eklendi.`, `${money(v)} added to your savings.`); }], [T('Tatile çık', 'Go on holiday'), s => { s.stats.happiness += 20; s.stats.stress -= 20; s.cash += 20000; return T('Harika bir tatil yaptın, kalanı cebinde.', 'You had a wonderful holiday and kept the rest.'); }]] },
    { id: 'kira', w: s => !s.home.own && s.home.rent < DIST[s.home.district].rent * 1.5 ? 2 : 0, t: () => T('🏠 Kira artışı', '🏠 Rent rise'), d: () => T('Ev sahibin kirayı %30 artırmak istiyor.', 'Your landlord wants to raise the rent by 30%.'), ch: [[T('Kabul et', 'Accept'), s => { s.home.rent = Math.round(s.home.rent * 1.3); return T(`Yeni kira: ${money(s.home.rent)}.`, `New rent: ${money(s.home.rent)}.`); }], [T('Pazarlık et', 'Negotiate'), s => { const ok = s.stats.social + rand(50) > 55; s.home.rent = Math.round(s.home.rent * (ok ? 1.12 : 1.3)); return ok ? T('Pazarlık işe yaradı: %12 artış.', 'Negotiation worked: a 12% rise.') : T('Ev sahibi geri adım atmadı.', 'The landlord didn’t budge.'); }], [T('Taşınmayı düşün', 'Think about moving'), () => T('Şehir haritasından yeni bir semt seçebilirsin.', 'You can pick a new district on the city map.')]] },
    { id: 'ucuzev', w: s => s.cash + s.savings > 400000 ? 2 : 0, t: () => T('🔑 Kaçırılmayacak ev fırsatı', '🔑 A home you can’t miss'), d: s => T(`${dn(s.tmpD = pick(DK))} semtinde piyasanın %15 altında bir daire satışta.`, `A flat in ${dn(s.tmpD = pick(DK))} is on sale 15% below market.`),
      ch: [[T('İncele ve satın al', 'View it and buy'), s => buyHome(s.tmpD, .85, true)], [T('Şimdilik geç', 'Pass for now'), () => T('Fırsatı değerlendirmedin.', 'You let it go.')]] },
    { id: 'grip', w: s => s.stats.health < 70 || s.stats.stress > 60 ? 4 : 1, t: () => T('🤒 Hastalandın', '🤒 You’re ill'), d: () => T('Ateşin var ve halsizsin.', 'You have a temperature and feel run-down.'),
      ch: [[T('Hastaneye git', 'Go to the hospital'), s => { const c = s.insurance ? 300 : 3500; s.cash -= c; s.stats.health += 12; return T(`Tedavi oldun (${money(c)}).`, `You were treated (${money(c)}).`); }], [T('Evde dinlen', 'Rest at home'), s => { s.stats.health += 5; s.stats.energy -= 25; if (s.job) s.job.perf -= 4; return T('Birkaç gün evde kaldın.', 'You stayed home for a few days.'); }]] },
    { id: 'saglik', w: s => s.stats.stress > 75 && s.age > 28 ? 3 : 0, t: () => T('⚠️ Ciddi bir sağlık uyarısı', '⚠️ A serious health warning'), d: () => T('Doktorun, yoğun stres yüzünden yaşam tarzını değiştirmen gerektiğini söylüyor.', 'Your doctor says you must change your lifestyle because of heavy stress.'),
      ch: [[T('İş temposunu düşür', 'Slow down at work'), s => { s.stats.stress -= 25; s.stats.health += 8; if (s.job) s.job.perf -= 8; return T('Daha dengeli bir hayata geçtin.', 'You moved to a more balanced life.'); }], [T('Tedavi ve terapi', 'Treatment and therapy'), s => { const c = s.insurance ? 2000 : 18000; s.cash -= c; s.stats.stress -= 18; s.stats.health += 15; return T(`Tedavi sürecine başladın (${money(c)}).`, `You began treatment (${money(c)}).`); }], [T('Görmezden gel', 'Ignore it'), s => { s.stats.health -= 15; return T('Sağlığın kötüleşti.', 'Your health got worse.'); }]] },
    { id: 'tartisma', w: s => partner(s) && (s.loans.length > 1 || s.stats.stress > 60) ? 4 : 0, t: () => T('💔 Evde gerginlik', '💔 Tension at home'), d: s => T(`${partner(s).name} ile para ve zaman yüzünden sık tartışıyorsunuz.`, `You and ${partner(s).name} keep arguing about money and time.`),
      ch: [[T('Açıkça konuş', 'Talk it through'), s => { const p = partner(s), ok = s.stats.social + p.traits.agr / 2 + rand(40) > 70; p.bond = clamp(p.bond + (ok ? 10 : -6)); p.history.unshift(ok ? T('Zor bir konuşmayla yakınlaştınız', 'A hard talk brought you closer') : T('Konuşma iyi geçmedi', 'The talk went badly')); return ok ? T('Birbirinizi daha iyi anladınız.', 'You understood each other better.') : T('Konuşma tartışmaya döndü.', 'The talk turned into a row.'); }], [T('Çift terapisi (3.000 ₺)', 'Couples counselling (₺3,000)'), s => { s.cash -= 3000; const p = partner(s); p.bond = clamp(p.bond + 14); p.history.unshift(T('Çift terapisine başladınız', 'You started couples counselling')); return T('Terapi ilişkinize iyi geldi.', 'Counselling helped your relationship.'); }], [T('Konuyu kapat', 'Drop the subject'), s => { const p = partner(s); p.bond = clamp(p.bond - 10); return T('Sorun çözülmedi, aranız soğudu.', 'Nothing was solved and things cooled off.'); }]] },
    { id: 'partnertasin', w: s => partner(s) && s.age > 24 ? 1 : 0, t: () => T('🧳 Hayatı değiştiren bir karar', '🧳 A life-changing decision'), d: s => T(`${partner(s).name} başka bir şehirde harika bir iş teklifi aldı.`, `${partner(s).name} has a great job offer in another city.`),
      ch: [[T('Birlikte gidelim (işini bırak)', 'Go together (leave your job)'), s => { s.job = null; partner(s).bond = clamp(partner(s).bond + 20); s.cash += 30000; partner(s).history.unshift(T('Onun için her şeyi geride bıraktın', 'You left everything behind for them')); return T('Yeni bir şehirde yeni bir başlangıç! (Oyunda aynı haritada devam ediyorsun.)', 'A fresh start in a new city! (You carry on on the same map.)'); }], [T('Uzak mesafe ilişki', 'Long-distance relationship'), s => { partner(s).bond = clamp(partner(s).bond - 15); return T('Zor ama deniyorsunuz.', 'It’s hard but you’re trying.'); }], [T('Gitmesini iste… ve ayrıl', 'Tell them to go… and split up'), s => { const p = partner(s); p.role = 'eski'; s.stats.happiness -= 18; return T(`${p.name} ile yollarınız ayrıldı.`, `You and ${p.name} went separate ways.`); }]] },
    { id: 'cocukokul', w: s => s.people.some(p => p.role === 'cocuk' && p.months >= 72 && p.months < 216) ? 3 : 0, t: () => T('🏫 Okuldan haber', '🏫 News from school'), d: s => { const k = s.tmpK = pick(s.people.filter(p => p.role === 'cocuk' && p.months >= 72 && p.months < 216)); return T(`${k.name}’nin öğretmeni seni görmek istiyor: notları düşüyor.`, `${k.name}’s teacher wants to see you: their grades are slipping.`); },
      ch: [[T('Birlikte ders çalış', 'Study together'), s => { const k = s.people.find(p => p.id === s.tmpK.id); k.grade = clamp(k.grade + 12); k.bond = clamp(k.bond + 8); s.stats.energy -= 15; return T('Notları düzelmeye başladı.', 'Their grades are picking up.'); }], [T('Özel ders tut (4.000 ₺)', 'Hire a tutor (₺4,000)'), s => { const k = s.people.find(p => p.id === s.tmpK.id); s.cash -= 4000; k.grade = clamp(k.grade + 15); return T('Özel ders işe yaradı.', 'The tutoring worked.'); }], [T('Kendi halletsin', 'Let them sort it out'), s => { const k = s.people.find(p => p.id === s.tmpK.id); k.grade = clamp(k.grade - 6); k.mood = clamp(k.mood - 5); return T('Çocuğun yalnız hissetti.', 'Your child felt left alone.'); }]] },
    { id: 'yetenek', w: s => s.people.some(p => p.role === 'cocuk' && p.months >= 60) ? 2 : 0, t: () => T('🌟 Gizli bir yetenek', '🌟 A hidden talent'), d: s => { const k = s.tmpK = pick(s.people.filter(p => p.role === 'cocuk' && p.months >= 60)); return T(`${k.name}’nin müzik ve resimde yetenekli olduğu ortaya çıktı.`, `${k.name} turns out to be gifted at music and art.`); },
      ch: [[T('Kursa yazdır (2.500 ₺/ay gibi)', 'Sign them up for lessons (~₺2,500)'), s => { const k = s.people.find(p => p.id === s.tmpK.id); s.cash -= 2500; k.mood = clamp(k.mood + 15); k.talent = true; return T('Çocuğun çok mutlu.', 'Your child is overjoyed.'); }], [T('Şimdilik bekle', 'Wait for now'), () => T('Belki ileride.', 'Maybe later.')]] },
    { id: 'eskidost', w: s => s.people.filter(p => p.role === 'arkadas').length < 6 ? 2 : 0, t: () => T('👋 Eski bir dost', '👋 An old friend'), d: () => T('Liseden bir arkadaşın şehre dönmüş ve seninle görüşmek istiyor.', 'A school friend is back in town and wants to meet up.'),
      ch: [[T('Hemen buluş', 'Meet straight away'), s => { const p = npc('arkadas', { bond: 50 }); p.history.unshift(T('Yıllar sonra yeniden buluştunuz', 'You met again after years')); s.people.push(p); s.stats.happiness += 8; return T(`${p.name} hayatına geri döndü.`, `${p.name} is back in your life.`); }], [T('Meşgulüm', 'I’m busy'), () => T('Belki başka zaman.', 'Maybe another time.')]] },
    { id: 'musteri', w: s => s.company ? 3 : 0, t: () => T('🤝 Büyük bir müşteri', '🤝 A big client'), d: () => T('Şirketine büyük bir sözleşme teklif edildi ama ekibini zorlayacak.', 'Your company has been offered a big contract, but it will stretch the team.'),
      ch: [[T('Kabul et', 'Take it'), s => { const ok = chance(.55 + s.stats.logic / 300); s.company.cash += ok ? 180000 : -60000; s.stats.stress += 12; return ok ? T('Proje başarıyla bitti!', 'The project was a success!') : T('Proje zararla kapandı.', 'The project ended at a loss.'); }], [T('Reddet', 'Turn it down'), () => T('Şirketi riske atmadın.', 'You didn’t risk the company.')]] },
    { id: 'yatirimci', w: s => s.company && s.company.value > 300000 ? 2 : 0, t: () => T('💼 Yatırımcı teklifi', '💼 An investor offer'), d: () => T('Bir yatırımcı şirketinin %30’u için teklif verdi.', 'An investor has bid for 30% of your company.'),
      ch: [[T('Hisse sat', 'Sell the stake'), s => { const v = Math.round(s.company.value * .3 * 1.2); s.cash += v; s.company.share = (s.company.share || 1) * .7; s.company.cash += v * .2; return T(`${money(v)} kazandın, şirket büyüyecek.`, `You made ${money(v)} and the company will grow.`); }], [T('Şirket benim', 'It stays mine'), () => T('Kontrolü elinde tuttun.', 'You kept control.')]] }
  ];
  const partner = s => s.people.find(p => p.role === 'partner' || p.role === 'es');
  function rollEvent() {
    const pool = EVENTS.map(e => [e, e.w(state)]).filter(x => x[1] > 0), tot = pool.reduce((a, b) => a + b[1], 0);
    if (!tot || !chance(.42)) return;
    let r = Math.random() * tot; for (const [e, w] of pool) { r -= w; if (r <= 0) { if (e.start) e.start(state); state.pending = { id: e.id, d: e.d(state), t: e.t() }; return; } }
  }
  function resolveEvent(i) {
    const e = EVENTS.find(x => x.id === state.pending.id); if (!e) { state.pending = null; return; }
    const res = e.ch[i][1](state); for (const k in state.stats) state.stats[k] = clamp(state.stats[k]);
    note(state.pending.t + ' — ' + res); state.pending = null; state.choices++; save(); render(); toast(res);
  }

  /* ---------------- ekonomi yardımcıları ---------------- */
  const invValue = s => s.invest.fund * s.prices.fund / 100 + s.invest.gold * s.prices.gold / 100 + s.invest.crypto * s.prices.crypto / 100;
  const propValue = s => s.props.reduce((a, p) => a + p.value, 0) + (s.home.own ? s.home.own.value : 0);
  const debtTotal = s => s.loans.reduce((a, l) => a + l.left, 0);
  const netWorth = s => s.cash + s.savings + invValue(s) + propValue(s) + (s.company ? s.company.value * (s.company.share || 1) : 0) + s.car * .6 - debtTotal(s);
  function loanRate(kind) { const r = state.economy.rate; const c = (750 - state.credit) / 25; return Math.max(8, Math.round((kind === 'konut' ? r * .55 : kind === 'is' ? r * .8 : r * 1.05) + c)); }
  function addLoan(kind, amount, months) { const rate = loanRate(kind), m = rate / 1200, pay = Math.ceil(amount * m / (1 - Math.pow(1 + m, -months))); state.loans.push({ id: uid(), kind, left: amount, rate, pay }); state.cash += amount; note(T(`${LOANK()[kind]}: ${money(amount)} · %${rate} · aylık ${money(pay)}`, `${LOANK()[kind]}: ${money(amount)} · ${rate}% · ${money(pay)} a month`)); return pay; }
  function buyHome(d, disc, viaEvent) {
    const price = Math.round(DIST[d].buy * (disc || 1) * (state.economy.phase === 'kriz' ? .88 : 1)), down = Math.round(price * .25);
    if (state.cash + state.savings < down) { return T(`Peşinat için ${money(down)} gerekiyor.`, `You need ${money(down)} for the deposit.`); }
    const r0 = loanRate('konut') / 1200, mPay = Math.ceil((price - down) * r0 / (1 - Math.pow(1 + r0, -180))), inc = state.job ? state.job.pay - annualTax(state.job.pay) : 0, other = state.loans.reduce((a, l) => a + l.pay, 0);
    if (mPay + other > inc * .5) return T(`Banka krediyi onaylamadı: aylık ${money(mPay)} taksit, net gelirinin yarısını aşıyor.`, `The bank declined: a ${money(mPay)} monthly payment would exceed half your net income.`);
    let need = down; const fromCash = Math.min(state.cash, need); state.cash -= fromCash; need -= fromCash; state.savings -= need;
    if (state.home.own) state.props.push(Object.assign({}, state.home.own, { rented: false }));
    state.loans.push({ id: uid(), kind: 'konut', left: price - down, rate: loanRate('konut'), pay: mPay, home: true });
    state.home = { district: d, own: { id: uid(), district: d, value: price }, rent: 0 }; state.location = d; state.stats.happiness = clamp(state.stats.happiness + 15);
    const msg = T(`${dn(d)} semtinde ev sahibi oldun! (${money(price)}, 15 yıl kredi)`, `You’re a homeowner in ${dn(d)}! (${money(price)}, 15-year mortgage)`); if (!viaEvent) note(msg); return msg;
  }

  /* ---------------- ay geçişi ---------------- */
  function month() {
    const s = state; if (s.ended) return;
    if (s.pending) { renderEvent(); return; }
    s.monthsPlayed++;
    const e = s.economy; e.months++;
    // ekonomi döngüsü
    if (e.phase === 'buyume' && e.months > 10 && chance(.06)) { e.phase = 'durgun'; e.months = 0; note(T('Ekonomi yavaşlıyor.', 'The economy is slowing.')); }
    else if (e.phase === 'durgun' && chance(.08)) { e.phase = chance(.5) ? 'buyume' : 'kriz'; e.months = 0; if (e.phase === 'kriz') e.rate = Math.min(65, e.rate + 10); }
    else if (e.phase === 'kriz' && e.months > 8 && chance(.15)) { e.phase = 'buyume'; e.months = 0; e.rate = Math.max(25, e.rate - 8); }
    // gelir ve vergi
    let gross = 0, tax = 0, net = 0;
    if (s.job) { gross = s.job.pay; tax = annualTax(gross); net = gross - tax; s.job.months++; s.exp += 3; s.job.perf = clamp(s.job.perf + (s.stats.energy > 30 ? 1 : -3) + (s.stats.stress > 75 ? -3 : 0)); }
    if (!s.job && !s.company && (s.benefit || 0) > 0) { net += 9000; s.benefit--; }
    if (s.side) { net += s.side; s.side = 0; }
    // şirket
    let biz = 0;
    if (s.company) {
      const c = s.company, mult = { buyume: 1.15, durgun: .95, kriz: .7 }[e.phase], skill = (s.stats.logic + s.stats.social + s.stats.creativity) / 300;
      const rev = Math.max(0, Math.round((c.staff * 42000 + 25000) * (.6 + skill) * mult * (1 + gauss() * .18))), cost = c.staff * 30000 + 12000;
      biz = rev - cost; const tx = biz > 0 ? biz * .25 : 0; c.cash += biz - tx; c.months++; c.value = Math.max(0, Math.round(c.value * (1 + (biz > 0 ? .02 : -.03)) + biz * .5)); c.last = biz - tx;
      if (c.cash < -150000) { note(T(`${c.name} iflas etti. Kalan borçlar kişisel borcuna eklendi.`, `${c.name} went bankrupt. Remaining debts were added to yours.`)); s.loans.push({ id: uid(), kind: 'is', left: -c.cash, rate: 40, pay: Math.ceil(-c.cash / 36) }); s.company = null; s.stats.stress += 25; s.stats.happiness -= 20; }
    }
    // giderler
    const kids = s.people.filter(p => p.role === 'cocuk');
    const rent = s.home.own ? Math.round(s.home.own.value * .0006) : s.home.rent;
    const living = Math.round((6000 + (partner(s) && partner(s).role === 'es' ? 4000 : 0)) * (s.frugal ? .85 : 1)), transport = TRANS[s.transport][1], kidc = kids.reduce((a, k) => a + kidCost(k.months), 0), ins = s.insurance ? 1500 : 0;
    const loanPay = s.loans.reduce((a, l) => a + Math.min(Math.max(l.pay, Math.ceil(l.left * (l.rate / 1200 + .008))), Math.ceil(l.left * (1 + l.rate / 1200))), 0);
    const rentIn = s.props.filter(p => p.rented).reduce((a, p) => a + Math.round(p.value * .0045), 0);
    s.cash += net + rentIn - rent - living - transport - kidc - ins;
    s.loans.forEach(l => { const interest = l.left * l.rate / 1200; l.pay = Math.max(l.pay, Math.ceil(interest + l.left * .008)); const pay = Math.min(l.pay, l.left + interest);
      if (s.cash >= pay) { s.cash -= pay; l.left = Math.max(0, Math.round(l.left + interest - pay)); l.miss = 0; s.credit = Math.min(900, s.credit + 2); }
      else { l.left = Math.round(l.left + interest); l.miss = (l.miss || 0) + 1; s.credit = Math.max(300, s.credit - 25); note(T('Kredi taksitini ödeyemedin, kredi notun düştü.', 'You missed a loan payment and your credit score fell.'));
        if (l.kind === 'konut' && l.miss >= 3) { const h = s.home.own && s.home.own.value ? s.home.own : s.props[0]; if (h) { const got = Math.round(h.value * .85) - l.left; l.left = 0; s.cash += Math.max(0, got); if (h === s.home.own) s.home = { district: s.home.district, own: null, rent: DIST[s.home.district].rent }; else s.props = s.props.filter(x => x !== h); s.stats.happiness -= 20; s.stats.stress += 15; note(T('🏚️ Üç taksit ödenmeyince banka evi icradan sattı.', '🏚️ After three missed payments the bank repossessed and sold the home.')); } } } });
    s.loans = s.loans.filter(l => l.left > 0);
    if (s.cash < 0) { const amt = -s.cash; s.cash = 0; let card = s.loans.find(l => l.kind === 'kart'); if (!card) { card = { id: uid(), kind: 'kart', left: 0, rate: Math.min(60, loanRate('tuketici') + 6), pay: 0 }; s.loans.push(card); } card.left += amt; card.pay = Math.max(1000, Math.ceil(card.left * .06)); s.credit = Math.max(300, s.credit - 30); s.stats.stress += 8; note(T(`Bütçe açığı: ${money(amt)} kredi kartı borcuna dönüştü.`, `Budget gap: ${money(amt)} became credit card debt.`)); }
    // yatırımlar ve mülkler
    const drift = { buyume: [1.2, .2, 2], durgun: [.2, .6, 0], kriz: [-3, 2, -6] }[e.phase];
    s.prices.fund = Math.max(10, s.prices.fund * (1 + (drift[0] + gauss() * 4) / 100)); s.prices.gold = Math.max(10, s.prices.gold * (1 + (drift[1] + gauss() * 3) / 100)); s.prices.crypto = Math.max(1, s.prices.crypto * (1 + (drift[2] + gauss() * 15) / 100));
    s.savings = Math.round(s.savings * (1 + e.rate * .75 / 1200));
    const pd = { buyume: .9, durgun: .3, kriz: -1.2 }[e.phase] / 100;
    s.props.forEach(p => p.value = Math.round(p.value * (1 + pd + gauss() * .004))); if (s.home.own) s.home.own.value = Math.round(s.home.own.value * (1 + pd));
    // eğitim
    if (s.studying) { s.studying.left--; chg({ knowledge: 2 }); if (s.studying.left <= 0) { s.edu = s.studying.level; note(T(`🎓 ${EDU()[s.edu]} mezunu oldun!`, `🎓 You graduated: ${EDU()[s.edu]}!`)); s.studying = null; chg({ happiness: 15, knowledge: 10 }); } }
    // terfi değerlendirmesi
    if (s.job && s.job.months % 6 === 0 && s.job.months > 0) {
      const sk = s.stats[SECT[s.job.sector].sk], need = 10 + (s.job.level + 1) * 16;
      if (s.job.level < 4 && s.job.perf >= 70 && sk >= need && s.edu >= Math.max(0, s.job.level) - 0 && chance(.7)) { s.job.level++; s.job.pay = Math.round(s.job.pay * 1.25); s.job.perf = 60; s.career.push(`${s.month}/${s.year}: ${jobTitle(s.job)}`); note(T(`⭐ Terfi! Artık ${jobTitle(s.job)} (${money(s.job.pay)}).`, `⭐ Promoted! You’re now ${jobTitle(s.job)} (${money(s.job.pay)}).`)); chg({ happiness: 12 }); }
      else if (s.job.perf < 40 && chance(.35)) { note(T('Performansın düşük olduğu için işten çıkarıldın.', 'You were let go because of low performance.')); s.job = null; s.benefit = 4; chg({ happiness: -15, stress: 12 }); }
      else if (s.job.perf >= 70 && sk < need) note(T('Terfi için becerini geliştirmen gerekiyor.', 'You need stronger skills to be promoted.'));
    }
    // ilişkiler
    s.people.forEach(p => {
      if (p.role === 'arkadas') p.bond = clamp(p.bond - 1);
      if (p.role === 'partner' || p.role === 'es') { p.bond = clamp(p.bond + (s.stats.stress > 65 ? -3 : 0) - (p.seen ? 0 : 1)); p.seen = false; if (p.bond < 12) { note(T(`${p.name} ile ilişkiniz sona erdi.`, `Your relationship with ${p.name} ended.`)); if (p.role === 'es') { s.cash = Math.round(s.cash / 2); s.savings = Math.round(s.savings / 2); } p.role = 'eski'; chg({ happiness: -20 }); } }
      if (p.role === 'cocuk') { p.months++; p.mood = clamp((p.mood || 70) + (p.seen ? 2 : -1)); p.seen = false; if (p.months % 12 === 0) note(T(`🎂 ${p.name} ${p.months / 12} yaşına girdi.`, `🎂 ${p.name} turned ${p.months / 12}.`)); if (p.months === 216) { p.role = 'yetiskin'; note(T(`${p.name} 18 yaşında, kendi hayatına başladı.`, `${p.name} is 18 and starting their own life.`)); } }
    });
    // beden ve zihin
    const unused = s.stats.energy; s.stats.stress = clamp(s.stats.stress - Math.round(unused / 12)); s.stats.health = clamp(s.stats.health + (unused > 50 ? 1 : 0));
    const commute = s.job ? distance(s.home.district, s.job.district || SECT[s.job.sector].d) * TRANS[s.transport][2] * 4 : 0;
    s.stats.energy = clamp(100 - Math.round(commute) - kids.filter(k => k.months < 144).length * 6);
    s.stats.stress = clamp(s.stats.stress + (s.job ? 3 + s.job.level : -2) + (debtTotal(s) > 200000 ? 3 : 0) - (s.stats.fitness > 60 ? 2 : 0));
    s.stats.health = clamp(s.stats.health + (s.stats.stress > 70 ? -2 : 1) + (s.age > 55 ? -1 : 0));
    s.stats.happiness = clamp(s.stats.happiness + (s.stats.stress > 70 ? -2 : 0) + (partner(s) ? 1 : 0) - (s.job || s.company ? 0 : 1));
    if (s.frugal) s.frugal--;
    if (s.month === 12) s.age++; s.month = s.month % 12 + 1; if (s.month === 1) s.year++;
    if (s.monthsPlayed - s.marketAt >= 3) makeMarket();
    note(T(`Ay sonu · Net maaş ${money(net)} · Vergi ${money(tax)} · Giderler ${money(rent + living + transport + kidc + ins + loanPay)}`, `Month end · Net pay ${money(net)} · Tax ${money(tax)} · Costs ${money(rent + living + transport + kidc + ins + loanPay)}`));
    s.lastMonth = { gross, tax, net, rent, living, transport, kidc, ins, loanPay, rentIn, biz };
    if (s.stats.health <= 0 && s.age < 70) { const c = s.insurance ? 5000 : 60000; s.cash -= c; s.stats.health = 35; s.stats.stress = 30; if (s.job) s.job.perf -= 15; note(T(`🏥 Sağlığın çöktü ve iki hafta hastanede kaldın (${money(c)}). Kendine iyi bakmalısın.`, `🏥 Your health collapsed and you spent two weeks in hospital (${money(c)}). Look after yourself.`)); rollEvent(); }
    else if (s.stats.health <= 0 || (s.age > 80 && chance((s.age - 80) / 40))) { s.ended = true; note(T('Bu hayat hikâyesi sona erdi.', 'This life story has come to an end.')); }
    else rollEvent();
    save(); render(); if (s.pending) renderEvent(); worldSync();
  }

  /* ---------------- eylemler ---------------- */
  const ACT = {
    study: { e: 15, c: 4500, f: () => { chg({ knowledge: 10, logic: 5, exp: 4 }); return T('Bir sertifika programı tamamladın.', 'You completed a certificate course.'); } },
    rest: { e: 0, c: 0, f: () => { chg({ energy: 20, stress: -12, health: 2 }); return T('Dinlendin.', 'You had a rest.'); } },
    exercise: { e: 12, c: 0, f: () => { chg({ health: 6, fitness: 8, stress: -8, happiness: 3 }); return T('Spor yaptın.', 'You exercised.'); } },
    cook: { e: 6, c: 600, f: () => { chg({ happiness: 5, health: 3 }); return T(`${state.prefs.food} pişirdin.`, `You cooked ${state.prefs.food}.`); } },
    side: { e: 22, c: 0, f: () => { const v = 3000 + Math.round((S().creativity + S().logic) * 60); state.side = (state.side || 0) + v; chg({ stress: 8, exp: 3 }); return T(`Serbest bir iş aldın: ay sonunda ${money(v)}.`, `You took a freelance gig: ${money(v)} at month end.`); } },
    work: { e: 18, c: 0, f: () => { if (!state.job) return T('Önce bir işin olmalı.', 'You need a job first.'); state.job.perf = clamp(state.job.perf + 8); chg({ stress: 8, exp: 4 }); return T('Fazla mesai yaptın, performansın arttı.', 'You worked overtime and your performance rose.'); } },
    // mekâna bağlı
    'plaza:jobs': { e: 0, c: 0, f: () => { tab = 'career'; return ''; } },
    'bank:open': { e: 0, c: 0, f: () => { tab = 'money'; return ''; } },
    'mall:shop': { e: 6, c: 3500, f: () => { chg({ happiness: 8, social: 3 }); return T('Kendine yeni kıyafetler aldın.', 'You bought yourself new clothes.'); } },
    'resto:eat': { e: 6, c: 1800, f: () => { chg({ happiness: 7, social: 2 }); const p = partner(state); if (p) { p.bond = clamp(p.bond + 8); p.seen = true; p.history.unshift(T('Romantik bir akşam yemeği', 'A romantic dinner')); } return p ? T(`${p.name} ile güzel bir akşam yemeği yediniz.`, `You had a lovely dinner with ${p.name}.`) : T('Güzel bir yemek yedin.', 'You had a lovely meal.'); } },
    'park:run': { e: 12, c: 0, f: () => { chg({ fitness: 10, health: 6, stress: -10 }); return T('Sahilde koştun.', 'You went for a run along the seafront.'); } },
    'cafe:meet': { e: 6, c: 450, f: () => meetSomeone() },
    'concert:go': { e: 10, c: 2200, f: () => { chg({ happiness: 14, stress: -8, social: 4 }); if (chance(.35)) return meetSomeone(); return T(`${state.prefs.music} konserine gittin.`, `You went to a ${state.prefs.music} concert.`); } },
    'museum:visit': { e: 8, c: 300, f: () => { chg({ creativity: 8, knowledge: 4, happiness: 4 }); return T('Müzede ilham aldın.', 'The museum inspired you.'); } },
    'library:read': { e: 10, c: 0, f: () => { chg({ knowledge: 7, logic: 3, stress: -3 }); return T('Kütüphanede çalıştın.', 'You studied at the library.'); } },
    'bazaar:shop': { e: 5, c: 300, f: () => { chg({ happiness: 3, health: 2 }); state.frugal = Math.max(state.frugal || 0, 1); return T('Pazardan taze ve ucuz alışveriş yaptın (bu ay gider -%15).', 'You shopped fresh and cheap at the market (costs -15% this month).'); } },
    'uni:enroll': { e: 0, c: 0, f: () => enroll() },
    'cowork:startup': { e: 0, c: 0, f: () => startCompany() },
    'gym:train': { e: 14, c: 900, f: () => { chg({ fitness: 12, health: 6, stress: -6, social: 2 }); if (chance(.25)) return meetSomeone(); return T('Antrenman yaptın.', 'You trained.'); } },
    'hospital:check': { e: 6, c: 0, f: () => { const c = state.insurance ? 200 : 1500; state.cash -= c; chg({ health: 10, stress: -3 }); return T(`Sağlık kontrolünden geçtin (${money(c)}).`, `You had a check-up (${money(c)}).`); } },
    'school:visit': { e: 8, c: 0, f: () => { const k = state.people.filter(p => p.role === 'cocuk' && p.months >= 72); if (!k.length) return T('Okulda görüşeceğin bir çocuğun yok.', 'You have no child to see at school.'); k.forEach(x => { x.grade = clamp((x.grade || 70) + 6); x.bond = clamp(x.bond + 4); x.seen = true; }); return T('Veli toplantısına katıldın.', 'You went to parents’ evening.'); } },
    'stadium:match': { e: 8, c: 1800, f: () => { chg({ happiness: 11, social: 4 }); state.people.filter(p => p.likes.includes(T('Futbol', 'Football'))).forEach(p => p.bond = clamp(p.bond + 4)); return T(`${state.prefs.team} maçına gittin.`, `You went to the ${state.prefs.team} match.`); } }
  };
  const PLACE_ACT = () => ({
    plaza: [['plaza:jobs', T('İş ilanlarına bak', 'Browse job ads')]], bank: [['bank:open', T('Banka işlemleri', 'Banking')]], mall: [['mall:shop', T('Alışveriş yap (3.500 ₺)', 'Go shopping (₺3,500)')]], resto: [['resto:eat', T('Akşam yemeği (1.800 ₺)', 'Dinner out (₺1,800)')]],
    park: [['park:run', T('Koşuya çık', 'Go for a run')]], cafe: [['cafe:meet', T('Kahve iç, insanlarla tanış', 'Have a coffee and meet people')]], concert: [['concert:go', T('Konsere git (2.200 ₺)', 'Go to a gig (₺2,200)')]],
    museum: [['museum:visit', T('Sergiyi gez (300 ₺)', 'See the exhibition (₺300)')]], library: [['library:read', T('Çalış ve oku', 'Study and read')]], bazaar: [['bazaar:shop', T('Pazar alışverişi', 'Market shopping')]],
    uni: [['uni:enroll', T('Eğitim programına başvur', 'Apply for a degree')]], cowork: [['cowork:startup', T('Şirket kur', 'Start a company')]], gym: [['gym:train', T('Antrenman (900 ₺)', 'Train (₺900)')]],
    hospital: [['hospital:check', T('Sağlık kontrolü', 'Check-up')]], school: [['school:visit', T('Veli toplantısı', 'Parents’ evening')]], stadium: [['stadium:match', T('Maça git (1.800 ₺)', 'Go to the match (₺1,800)')]]
  });
  function doAct(id) {
    const a = ACT[id]; if (!a) return;
    if (!spend(a.c, a.e)) return;
    const msg = a.f(); if (msg) { note(msg); toast(msg); }
    for (const k in state.stats) state.stats[k] = clamp(state.stats[k]);
    save(); render();
  }
  function meetSomeone() {
    const p = npc('tanidik'), c = compat(p);
    showModal(`<p class="life-k">${T('Yeni biriyle tanıştın', 'You met someone new')}</p><div class="life-person-big"><span>${p.emoji}</span><div><h3>${esc(p.name)}, ${p.age}</h3><p>${esc(traitText(p.traits))}</p><p>${T('Sevdikleri', 'Likes')}: ${esc(p.likes.join(', '))}</p><p class="life-compat">${T('Uyum', 'Compatibility')} <b>${c}%</b></p></div></div>
      <div class="life-choices"><button data-k="friend">${T('Numarasını al, arkadaş ol', 'Swap numbers, become friends')}</button><button data-k="bye">${T('Kibarca vedalaş', 'Politely say goodbye')}</button></div>`, m => {
      m.querySelector('[data-k=friend]').onclick = () => { p.role = 'arkadas'; p.bond = 25 + Math.round(c / 5); p.met = state.month + '/' + state.year; p.history.unshift(T(`${dn(state.location)}’de tanıştınız`, `You met in ${dn(state.location)}`)); state.people.push(p); chg({ social: 3, happiness: 4 }); note(T(`${p.name} ile arkadaş oldun.`, `You became friends with ${p.name}.`)); closeModal(); save(); render(); };
      m.querySelector('[data-k=bye]').onclick = closeModal;
    });
    return T('Kafede sohbet ettin.', 'You chatted at the café.');
  }
  function enroll() {
    if (state.studying) return T('Zaten bir programa devam ediyorsun.', 'You’re already on a course.');
    if (state.edu >= 3) return T('En yüksek eğitim seviyesindesin.', 'You’re at the highest level of education.');
    const lv = state.edu + 1, months = [0, 24, 36, 18][lv], cost = [0, 60000, 120000, 90000][lv];
    showModal(`<h3>🎓 ${EDU()[lv]}</h3><p>${T(`${months} ay sürer ve toplam ${money(cost)} tutar. Her ay bilgi kazanırsın; mezun olunca daha üst iş ilanlarına başvurabilirsin.`, `Takes ${months} months and costs ${money(cost)} in total. You gain knowledge each month and can apply for higher roles once you graduate.`)}</p>
      <div class="life-choices"><button data-k="cash">${T('Peşin öde', 'Pay up front')}</button><button data-k="loan">${T('Eğitim kredisiyle', 'With a student loan')}</button><button data-close>${T('Vazgeç', 'Cancel')}</button></div>`, m => {
      m.querySelector('[data-k=cash]').onclick = () => { if (state.cash < cost) return toast(T('Yeterli nakit yok', 'Not enough cash')); state.cash -= cost; state.studying = { level: lv, left: months }; note(T(`${EDU()[lv]} programına başladın.`, `You started a ${EDU()[lv]}.`)); closeModal(); save(); render(); };
      m.querySelector('[data-k=loan]').onclick = () => { addLoan('tuketici', cost, 48); state.cash -= cost; state.studying = { level: lv, left: months }; note(T(`${EDU()[lv]} programına krediyle başladın.`, `You started a ${EDU()[lv]} on a loan.`)); closeModal(); save(); render(); };
    });
    return '';
  }
  function startCompany() {
    if (state.company) { tab = 'career'; return ''; }
    showModal(`<h3>💡 ${T('Kendi şirketini kur', 'Start your own company')}</h3><form class="life-form" data-f="co"><label>${T('Şirket adı', 'Company name')}<input name="n" required maxlength="28" placeholder="${T('Örn. Liman Yazılım', 'e.g. Harbour Software')}"></label>
      <label>${T('Sektör', 'Sector')}<select name="s">${Object.entries(SECT).map(([k, v]) => `<option value="${k}">${esc(T(...v.n))}</option>`).join('')}</select></label>
      <label>${T('Başlangıç sermayesi', 'Starting capital')}<select name="c"><option value="50000">50.000 ₺</option><option value="150000">150.000 ₺</option><option value="400000">400.000 ₺</option></select></label>
      <label class="life-check"><input type="checkbox" name="loan"> ${T('Eksik kalanı işletme kredisiyle tamamla', 'Cover any shortfall with a business loan')}</label>
      <p class="life-small">${T('Şirketin her ay ekibine, becerine ve ekonomiye göre kâr ya da zarar eder. Kâr %25 kurumlar vergisine tabidir.', 'Each month your company makes a profit or loss based on your team, your skills and the economy. Profit is taxed at 25%.')}</p>
      <div class="life-choices"><button class="primary">${T('Şirketi kur', 'Start the company')}</button><button type="button" data-close>${T('Vazgeç', 'Cancel')}</button></div></form>`, m => {
      m.querySelector('form').onsubmit = e => { e.preventDefault(); const f = e.target, cap = +f.c.value; if (state.cash < cap) { if (!f.loan.checked) return toast(T('Yeterli nakit yok', 'Not enough cash')); addLoan('is', cap - state.cash, 60); }
        state.cash -= cap; state.company = { name: f.n.value.trim().slice(0, 28), sector: f.s.value, cash: cap, staff: 1, value: cap, months: 0, share: 1, last: 0 }; if (state.job && !confirm(T('Şirketine odaklanmak için işinden ayrılmak ister misin?', 'Leave your job to focus on your company?'))) {} else state.job = null;
        note(T(`🚀 ${state.company.name} kuruldu!`, `🚀 ${state.company.name} is up and running!`)); chg({ happiness: 12, stress: 10, creativity: 5 }); closeModal(); tab = 'career'; save(); render(); };
    });
    return '';
  }

  /* ---------------- modal ---------------- */
  function showModal(html, wire) {
    closeModal(); modal = document.createElement('div'); modal.className = 'life-ov';
    modal.innerHTML = `<div class="life-modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
    wire && wire(modal.querySelector('.life-modal'));
    const f = modal.querySelector('button,input'); if (f) f.focus();
  }
  function closeModal() { if (modal) { modal.remove(); modal = null; } }
  function renderEvent() {
    const p = state.pending; if (!p) return; const e = EVENTS.find(x => x.id === p.id); if (!e) { state.pending = null; return; }
    showModal(`<p class="life-k">${T('Hayat sana bir sürpriz hazırladı', 'Life has a surprise for you')}</p><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p><div class="life-choices">${e.ch.map((c, i) => `<button data-ev="${i}">${esc(c[0])}</button>`).join('')}</div>`,
      m => m.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { closeModal(); resolveEvent(+b.dataset.ev); }));
  }

  /* ---------------- görseller ---------------- */
  function cityMap(friends) {
    const by = {}; (friends || []).forEach(f => { const d = f.data && f.data.district; if (d && DIST[d]) (by[d] = by[d] || []).push(f); });
    return `<svg class="life-map" viewBox="0 0 100 92" role="img" aria-label="${T('Şehir haritası', 'City map')}">
      <defs><linearGradient id="lmSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd3f0"/><stop offset="1" stop-color="#2a8fc7"/></linearGradient><linearGradient id="lmLand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6e6"/><stop offset="1" stop-color="#ffe7c4"/></linearGradient></defs>
      <rect width="100" height="92" rx="6" fill="url(#lmSea)"/><path d="M0 0 H100 V58 Q 90 64 84 60 Q 72 52 64 62 Q 58 72 46 70 Q 32 68 26 78 Q 18 90 0 86 Z" fill="url(#lmLand)"/>
      <path d="M26 20 L50 42 L72 22 M22 58 L50 42 L78 70" stroke="#e9c79a" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="1 .1"/>
      <path class="life-bus" d="M26 20 L50 42 L78 70" stroke="#ff7a59" stroke-width=".8" fill="none" stroke-dasharray="2 2.5"/>
      ${DK.map(k => { const d = DIST[k], here = state.location === k, home = state.home.district === k, work = state.job && (state.job.district || SECT[state.job.sector].d) === k, f = by[k] || [];
        return `<g class="life-dist${here ? ' here' : ''}" data-d="${k}" tabindex="0" role="button" aria-label="${esc(dn(k))}"><circle cx="${d.x}" cy="${d.y}" r="9.5" fill="${d.c}" opacity=".22"/><circle cx="${d.x}" cy="${d.y}" r="6.8" fill="#fff" stroke="${d.c}" stroke-width="${here ? 1.6 : .8}"/>
          <text x="${d.x}" y="${d.y + 1.9}" text-anchor="middle" font-size="5.4">${d.e}</text><text x="${d.x}" y="${d.y + 12}" text-anchor="middle" class="life-dn">${esc(dn(k))}</text>
          ${home ? `<text x="${d.x - 7.5}" y="${d.y - 5}" font-size="3.6">🏠</text>` : ''}${work ? `<text x="${d.x + 4.5}" y="${d.y - 5}" font-size="3.6">💼</text>` : ''}${here ? `<text x="${d.x - 2}" y="${d.y - 8.2}" font-size="4.4" class="life-me">${esc(state.avatar)}</text>` : ''}
          ${f.slice(0, 3).map((x, i) => `<text x="${d.x + 6.5 + i * 3}" y="${d.y + 6}" font-size="3.6">${esc((x.data && x.data.avatar) || '🧑')}</text>`).join('')}</g>`; }).join('')}</svg>`;
  }
  const COVER = () => `<svg class="life-cover" viewBox="0 0 400 230" aria-hidden="true"><defs><linearGradient id="lcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset=".6" stop-color="#ff7a59"/><stop offset="1" stop-color="#c8486b"/></linearGradient><linearGradient id="lcSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a8fc7"/><stop offset="1" stop-color="#123d63"/></linearGradient></defs>
    <rect width="400" height="230" fill="url(#lcSky)"/><circle class="lc-sun" cx="300" cy="120" r="44" fill="#ffe9b0"/>
    <g fill="#5b2a4e" opacity=".55">${[[20, 70], [52, 100], [90, 60], [128, 110], [168, 80], [205, 120], [240, 70], [275, 96], [330, 66], [365, 104]].map(([x, h], i) => `<rect x="${x}" y="${170 - h}" width="${26 + (i % 3) * 6}" height="${h}" rx="3"/>`).join('')}</g>
    <g fill="#3a1b3d">${[[10, 52], [44, 74], [80, 44], [118, 88], [160, 60], [196, 96], [232, 52], [268, 76], [320, 48], [356, 82]].map(([x, h], i) => `<rect x="${x}" y="${180 - h}" width="${30 + (i % 2) * 8}" height="${h}" rx="3"/>`).join('')}
      ${Array.from({ length: 40 }, (_, i) => `<rect class="lc-win" x="${16 + (i * 37) % 360}" y="${110 + (i * 13) % 60}" width="4" height="5" fill="#ffd27a" style="--d:${(i % 7) * .4}s"/>`).join('')}</g>
    <rect y="178" width="400" height="52" fill="url(#lcSea)"/><g class="lc-boat"><path d="M0 0 h26 l-4 6 h-18z" fill="#fff"/><path d="M12 0 V-16 L22 -2 Z" fill="#7b1e3b"/></g>
    <g class="lc-heart"><text x="70" y="40" font-size="20">❤️</text></g><g class="lc-coin"><text x="190" y="34" font-size="18">💰</text></g><g class="lc-cap"><text x="330" y="44" font-size="20">🎓</text></g></svg>`;

  /* ---------------- 5) çok oyunculu dünya (isteğe bağlı) ---------------- */
  const SB = 'https://zjzbpeiuhreyfdihzzzj.supabase.co', SBK = 'sb_publishable_LyV2L0UpIAPnuGEdfgNc2Q_hrY8uqgG';
  let world = { friends: [], meets: [], names: new Map(), err: '', loading: false, at: 0 };
  const hasAcc = () => typeof CBN !== 'undefined' && CBN.sync && CBN.sync.user;
  async function api(path, o) {
    o = o || {};
    const h = { apikey: SBK, 'Content-Type': 'application/json', Authorization: 'Bearer ' + await CBN.sync.token() }; if (o.prefer) h.Prefer = o.prefer;
    const r = await fetch(SB + path, { method: o.method || 'GET', headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
    const tx = await r.text(); let j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
    if (!r.ok) { const e = new Error((j && j.message) || 'HTTP ' + r.status); e.status = r.status; e.code = j && j.code; throw e; } return j;
  }
  const publicCard = () => ({ name: state.name, avatar: state.avatar, age: state.age, job: state.job ? jobTitle(state.job) : state.company ? state.company.name : T('İş arıyor', 'Job-hunting'), district: state.world.hide ? null : state.location, mood: S().happiness > 65 ? '😊' : S().happiness > 35 ? '🙂' : '😔', year: state.year, month: state.month });
  async function worldSync() {
    if (!state || !state.world.joined || !hasAcc()) return;
    try { await api('/rest/v1/life_chars?on_conflict=member', { method: 'POST', body: { member: CBN.sync.user.id, data: publicCard() }, prefer: 'resolution=merge-duplicates,return=minimal' }); } catch (e) {}
  }
  async function worldLoad() {
    if (!hasAcc()) return; world.loading = true;
    try {
      const me = CBN.sync.user.id;
      const [chars, meets, prof] = await Promise.all([api('/rest/v1/life_chars?select=member,data,updated_at'), api(`/rest/v1/life_meets?select=*&or=(a.eq.${me},b.eq.${me})&order=id.desc&limit=40`), api('/rest/v1/msn_profiles?select=id,name')]);
      world.friends = (chars || []).filter(c => c.member !== me); world.meets = meets || []; world.names = new Map((prof || []).map(p => [p.id, p.name])); world.err = '';
      applyMeets(me);
    } catch (e) { world.err = (e.status === 404 || /PGRST20|42P01/.test(String(e.code))) ? 'setup' : e.message; }
    world.loading = false; world.at = Date.now();
  }
  function applyMeets(me) {   // kabul edilen tanışma ve etkinliklerin etkisini bir kez uygula
    world.meets.filter(m => m.status === 'accepted' && !state.world.applied.includes(m.id)).forEach(m => {
      const other = m.a === me ? m.b : m.a, ch = world.friends.find(f => f.member === other), nm = (ch && ch.data && ch.data.name) || '?';
      if (m.kind === 'meet') { if (!state.people.some(p => p.member === other)) state.people.push(npc('arkadas', { name: nm, emoji: (ch && ch.data.avatar) || '🧑', member: other, bond: 45, history: [T('Dünyada tanıştınız (gerçek bir oyuncu)', 'You met in the world (a real player)')] })); note(T(`🌍 ${nm} ile oyun dünyasında arkadaş oldun.`, `🌍 You became friends with ${nm} in the game world.`)); }
      else { chg({ happiness: 12, social: 6, stress: -8 }); const p = state.people.find(x => x.member === other); if (p) { p.bond = clamp(p.bond + 10); p.history.unshift(T(`Birlikte: ${m.activity}`, `Together: ${m.activity}`)); } note(T(`🌍 ${nm} ile birlikte ${m.activity}.`, `🌍 You and ${nm}: ${m.activity}.`)); }
      state.world.applied.push(m.id);
    });
    state.world.applied = state.world.applied.slice(-200); save();
  }
  const ACTIVITIES = () => [T('sinemaya gittiniz', 'went to the cinema'), T('maça gittiniz', 'went to a match'), T('sahilde kahve içtiniz', 'had coffee on the seafront'), T('konsere gittiniz', 'went to a gig'), T('pikniğe gittiniz', 'went for a picnic')];

  /* ---------------- ekranlar ---------------- */
  function top() {
    const e = ECO()[state.economy.phase];
    return `<header class="life-top"><div class="life-id"><span class="life-av">${esc(state.avatar)}</span><div><p class="eyebrow">BABA. / ${T('OYUNLAR', 'GAMES')} · ${T('HAYAT.', 'LIFE.')}</p><h1>${esc(state.name)}<span>.</span></h1><p>${state.job ? esc(jobTitle(state.job)) + ' · ' + esc(state.job.company || '') : state.company ? '🚀 ' + esc(state.company.name) : T('İş arıyor', 'Job-hunting')} · 📍 ${esc(dn(state.location))}</p></div></div>
      <div class="life-time"><b>${state.age} ${T('yaş', 'years old')}</b><small>${state.month}/${state.year} · ${e[1]} ${e[0]} · ${T('faiz %' + state.economy.rate, 'rate ' + state.economy.rate + '%')}</small><small>${T('Net varlık', 'Net worth')}: <b>${money(netWorth(state))}</b></small></div></header>
      <nav class="life-tabs" aria-label="${T('Bölümler', 'Sections')}">${[['home', '🏠 ' + T('Bugün', 'Today')], ['city', '🗺️ ' + T('Şehir', 'City')], ['career', '💼 ' + T('Kariyer', 'Career')], ['money', '💰 ' + T('Para', 'Money')], ['people', '❤️ ' + T('İlişkiler', 'People')], ['world', '🌍 ' + T('Dünya', 'World')], ['story', '📖 ' + T('Hikâye', 'Story')]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-action="tab:${k}">${l}</button>`).join('')}</nav>`;
  }
  function meters() { const L = SK(); return `<div class="life-meters">${Object.keys(L).map(k => `<div class="life-meter ${k}"><span>${L[k]}</span><i><b style="width:${S()[k]}%"></b></i><em>${S()[k]}</em></div>`).join('')}</div>`; }
  const btn = (label, action, cls) => `<button class="${cls || ''}" data-action="${action}">${label}</button>`;
  function home() {
    const pl = PLACE_ACT();
    return `${meters()}<div class="life-hero-row"><div class="life-energy"><b>${S().energy}</b><span>${T('bu ayki enerjin', 'energy left this month')}</span></div>${btn('⏭ ' + T('Ayı bitir', 'End the month'), 'month', 'primary big')}</div>
      <h2>${T('Bugün ne yapacaksın?', 'What will you do today?')}</h2>
      <div class="life-actions">${[['study', '📚 ' + T('Kurs al', 'Take a course'), T('4.500 ₺ · 15 enerji · bilgi', '₺4,500 · 15 energy · knowledge')], ['work', '💼 ' + T('Fazla mesai', 'Overtime'), T('18 enerji · performans', '18 energy · performance')], ['side', '🧾 ' + T('Serbest iş', 'Freelance gig'), T('22 enerji · ek gelir', '22 energy · extra income')], ['exercise', '🏃 ' + T('Spor', 'Exercise'), T('12 enerji · sağlık', '12 energy · health')], ['cook', '🍳 ' + T('Yemek yap', 'Cook'), T('600 ₺ · mutluluk', '₺600 · happiness')], ['rest', '🛌 ' + T('Dinlen', 'Rest'), T('enerji ve stres', 'energy and stress')]].map(([id, t, d]) => `<button class="life-act" data-action="do:${id}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
      <h2>📍 ${esc(dn(state.location))} ${T('semtindesin', '— where you are')}</h2><div class="life-actions">${DIST[state.location].places.map(p => (pl[p] || []).map(([id, t]) => `<button class="life-act place" data-action="do:${id}"><b>${PLACE[p][0]} ${esc(T(...PLACE[p][1]))}</b><small>${esc(t)}</small></button>`).join('')).join('')}</div>`;
  }
  function city() {
    const d = DIST[place || state.location], k = place || state.location, tr = TRANS[state.transport];
    return `<h2>🗺️ ${T('Liman Şehri', 'Harbour City')}</h2><p class="life-small">${T('Bir semte dokun: mekânlarını gör, oraya git, ev kirala ya da satın al. Ev ve iş arası mesafe, aylık enerjini etkiler.', 'Tap a district to see its places, travel there, or rent or buy a home. The distance between home and work affects your monthly energy.')}</p>
      <div class="life-city"><div class="life-mapbox">${cityMap(state.world.joined ? world.friends : [])}</div>
      <aside class="life-dpanel"><p class="life-k">${d.e} ${T('Semt', 'District')}</p><h3>${esc(dn(k))}</h3><ul class="life-places">${d.places.map(p => `<li>${PLACE[p][0]} ${esc(T(...PLACE[p][1]))}</li>`).join('')}</ul>
        <p>${T('Kira', 'Rent')}: <b>${money(d.rent)}</b>/${T('ay', 'month')} · ${T('Satın alma', 'Buy')}: <b>${money(d.buy * (state.economy.phase === 'kriz' ? .88 : 1))}</b></p>
        ${state.world.joined && world.friends.some(f => f.data && f.data.district === k) ? `<p class="life-friends-here">🌍 ${world.friends.filter(f => f.data && f.data.district === k).map(f => esc(f.data.avatar + ' ' + f.data.name)).join(', ')} ${T('burada', 'is here')}</p>` : ''}
        <div class="life-buttons">${k !== state.location ? btn('🚌 ' + T('Buraya git', 'Go here'), 'go:' + k, 'primary') : `<span class="life-tag">📍 ${T('Buradasın', 'You are here')}</span>`}${state.home.district !== k || state.home.shared ? btn('🔑 ' + T('Buraya taşın (kira)', 'Move here (rent)'), 'rent:' + k) + btn('🏡 ' + T('Ev satın al', 'Buy a home'), 'buy:' + k) : `<span class="life-tag">🏠 ${T('Evin burada', 'Your home is here')}</span>`}</div></aside></div>
      <h3>🚦 ${T('Ulaşım', 'Getting around')}</h3><div class="life-buttons">${Object.entries(TRANS).map(([id, t]) => `<button class="${state.transport === id ? 'on' : ''}" data-action="tr:${id}">${T(...t[0])} · ${t[1] ? money(t[1]) + '/' + T('ay', 'mo') : T('ücretsiz', 'free')}</button>`).join('')}</div>
      ${state.transport === 'araba' && !state.car ? `<p class="life-small">${T('Araba için 650.000 ₺ gerekir (taşıt kredisi seçeneğiyle).', 'A car costs ₺650,000 (car loan available).')}</p>` : ''}`;
  }
  function career() {
    const m = state.market.length ? state.market : (makeMarket(), state.market);
    const sk = state.job ? S()[SECT[state.job.sector].sk] : 0;
    return `<h2>💼 ${T('Kariyer', 'Career')}</h2>
      <div class="life-summary"><div><small>${T('Pozisyon', 'Position')}</small><b>${state.job ? esc(jobTitle(state.job)) : '—'}</b></div><div><small>${T('Brüt maaş', 'Gross pay')}</small><b>${state.job ? money(state.job.pay) : '—'}</b></div><div><small>${T('Performans', 'Performance')}</small><b>${state.job ? state.job.perf + '/100' : '—'}</b></div><div><small>${T('Eğitim', 'Education')}</small><b>${EDU()[state.edu]}${state.studying ? ' → ' + EDU()[state.studying.level] + ' (' + state.studying.left + T(' ay', ' mo') + ')' : ''}</b></div><div><small>${T('Deneyim', 'Experience')}</small><b>${state.exp}</b></div></div>
      ${state.job ? `<p class="life-small">${T(`Her 6 ayda bir terfi değerlendirmesi yapılır. Performans 70+ ve ${SK()[SECT[state.job.sector].sk]} ${10 + (state.job.level + 1) * 16}+ olmalı (şu an ${sk}).`, `There’s a promotion review every 6 months. You need 70+ performance and ${SK()[SECT[state.job.sector].sk]} of ${10 + (state.job.level + 1) * 16}+ (now ${sk}).`)}</p><div class="life-buttons">${btn('🚪 ' + T('İstifa et', 'Resign'), 'quit')}</div>` : ''}
      ${state.company ? `<h3>🚀 ${esc(state.company.name)}</h3><div class="life-summary"><div><small>${T('Şirket kasası', 'Company cash')}</small><b>${money(state.company.cash)}</b></div><div><small>${T('Değer', 'Value')} (${Math.round((state.company.share || 1) * 100)}%)</small><b>${money(state.company.value)}</b></div><div><small>${T('Çalışan', 'Staff')}</small><b>${state.company.staff}</b></div><div><small>${T('Geçen ay', 'Last month')}</small><b>${money(state.company.last || 0)}</b></div></div>
        <div class="life-buttons">${btn('➕ ' + T('Çalışan al', 'Hire'), 'hire')}${btn('➖ ' + T('Küçül', 'Downsize'), 'fire')}${btn('💸 ' + T('Kâr payı al (50.000 ₺)', 'Take a dividend (₺50,000)'), 'dividend')}${btn('🏷️ ' + T('Şirketi sat', 'Sell the company'), 'sellco')}</div>` : `<div class="life-buttons">${btn('💡 ' + T('Şirket kur', 'Start a company'), 'do:cowork:startup')}</div>`}
      <h3>📋 ${T('İş ilanları', 'Job ads')} <small>${ECO()[state.economy.phase][1]} ${T('her 3 ayda yenilenir', 'refreshed every 3 months')}</small></h3>
      <div class="life-jobs">${m.map(j => { const sec = SECT[j.sector], okE = state.edu >= j.req.edu, okS = S()[sec.sk] >= j.req.skill, okX = state.exp >= j.req.exp; return `<article class="life-job"><p class="life-k">${esc(T(...sec.n))} · ${esc(j.company)} · ${DIST[j.district].e} ${esc(dn(j.district))}</p><h4>${esc(jobTitle(j))}</h4><p class="life-pay">${money(j.pay)}<small>/${T('ay brüt', 'month gross')}</small></p>
        <ul><li class="${okE ? 'ok' : ''}">${EDU()[j.req.edu]}</li><li class="${okS ? 'ok' : ''}">${SK()[sec.sk]} ${j.req.skill}+</li><li class="${okX ? 'ok' : ''}">${T('Deneyim', 'Experience')} ${j.req.exp}+</li></ul>
        <button class="${okE && okX ? 'primary' : ''}" data-action="apply:${j.id}" ${okE && okX ? '' : 'disabled'}>${T('Başvur ve mülakata gir', 'Apply and interview')}</button></article>`; }).join('')}</div>
      ${state.career.length ? `<h3>${T('Kariyer geçmişi', 'Career history')}</h3><ul class="life-hist">${state.career.slice(-8).reverse().map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  }
  function finance() {
    const lm = state.lastMonth || {}, inv = state.invest, P = state.prices;
    return `<h2>💰 ${T('Para ve yatırım', 'Money and investing')}</h2>
      <div class="life-budget life-summary"><div><small>${T('Nakit', 'Cash')}</small><b>${money(state.cash)}</b></div><div><small>${T('Mevduat', 'Savings')} (${T('%' + Math.round(state.economy.rate * .75), Math.round(state.economy.rate * .75) + '%')})</small><b>${money(state.savings)}</b></div><div><small>${T('Yatırımlar', 'Investments')}</small><b>${money(invValue(state))}</b></div><div><small>${T('Gayrimenkul', 'Property')}</small><b>${money(propValue(state))}</b></div><div><small>${T('Borç', 'Debt')}</small><b>${money(debtTotal(state))}</b></div><div><small>${T('Kredi notu', 'Credit score')}</small><b>${state.credit}</b></div></div>
      ${state.lastMonth ? `<h3>${T('Geçen ayın dökümü', 'Last month’s breakdown')}</h3><table class="life-table"><tr><td>${T('Brüt maaş', 'Gross pay')}</td><td>${money(lm.gross)}</td></tr><tr><td>${T('Gelir vergisi', 'Income tax')}</td><td>−${money(lm.tax)}</td></tr><tr><td>${T('Kira / ev gideri', 'Rent / home costs')}</td><td>−${money(lm.rent)}</td></tr><tr><td>${T('Yaşam', 'Living')}</td><td>−${money(lm.living)}</td></tr><tr><td>${T('Ulaşım', 'Transport')}</td><td>−${money(lm.transport)}</td></tr><tr><td>${T('Çocuklar', 'Children')}</td><td>−${money(lm.kidc)}</td></tr><tr><td>${T('Sigorta', 'Insurance')}</td><td>−${money(lm.ins)}</td></tr><tr><td>${T('Kredi taksitleri', 'Loan repayments')}</td><td>−${money(lm.loanPay)}</td></tr><tr><td>${T('Kira geliri', 'Rental income')}</td><td>+${money(lm.rentIn)}</td></tr></table>` : ''}
      <h3>🏦 ${T('Banka', 'Bank')}</h3><div class="life-buttons">${btn(T('5.000 ₺ biriktir', 'Save ₺5,000'), 'save')}${btn(T('5.000 ₺ çek', 'Withdraw ₺5,000'), 'withdraw')}${btn(state.insurance ? '✅ ' + T('Sağlık sigortası var', 'Health insurance on') : '🩺 ' + T('Sağlık sigortası (1.500 ₺/ay)', 'Health insurance (₺1,500/mo)'), 'ins')}</div>
      <h3>📈 ${T('Yatırım', 'Investing')}</h3><div class="life-inv">${[['fund', '📊 ' + T('Endeks fonu', 'Index fund'), T('orta risk', 'medium risk')], ['gold', '🥇 ' + T('Altın', 'Gold'), T('krizlerde güvenli liman', 'safe haven in a crisis')], ['crypto', '🪙 ' + T('Kripto', 'Crypto'), T('çok yüksek risk', 'very high risk')]].map(([k, l, r]) => `<article><b>${l}</b><small>${r} · ${T('fiyat', 'price')} ${Math.round(P[k])}</small><p>${money(inv[k] * P[k] / 100)}</p><div>${btn('+10.000', 'buyinv:' + k)}${btn(T('Sat', 'Sell'), 'sellinv:' + k)}</div></article>`).join('')}</div>
      <h3>💳 ${T('Krediler', 'Loans')}</h3>${state.loans.length ? `<table class="life-table">${state.loans.map(l => `<tr><td>${LOANK()[l.kind]} · ${T('%' + l.rate, l.rate + '%')}</td><td>${money(l.left)} · ${money(l.pay)}/${T('ay', 'mo')} ${btn(T('10.000 ₺ öde', 'Pay ₺10,000'), 'repay:' + l.id)}</td></tr>`).join('')}</table>` : `<p class="life-small">${T('Borcun yok.', 'You have no debt.')}</p>`}
      <div class="life-buttons">${btn(T('İhtiyaç kredisi çek (50.000 ₺)', 'Take a personal loan (₺50,000)'), 'loan')}</div>
      <h3>🏘️ ${T('Gayrimenkul', 'Property')}</h3>${state.home.own ? `<p>🏠 ${T('Oturduğun ev', 'Your home')}: ${esc(dn(state.home.own.district))} · ${money(state.home.own.value)}</p>` : `<p class="life-small">${T('Kirada oturuyorsun', 'You rent')}: ${esc(dn(state.home.district))} · ${money(state.home.rent)}/${T('ay', 'mo')}</p>`}
      ${state.props.length ? `<ul class="life-hist">${state.props.map(p => `<li>${DIST[p.district].e} ${esc(dn(p.district))} · ${money(p.value)} ${p.rented ? '· ' + T('kirada', 'let out') + ' (+' + money(p.value * .0045) + ')' : ''} ${p.rented ? '' : btn(T('Kiraya ver', 'Let it out'), 'let:' + p.id)} ${btn(T('Sat', 'Sell'), 'sellprop:' + p.id)}</li>`).join('')}</ul>` : ''}`;
  }
  function people() {
    const rel = state.people.filter(p => !['eski', 'yetiskin', 'tanidik'].includes(p.role)), p0 = partner(state);
    const card = p => { const c = compat(p), kid = p.role === 'cocuk';
      return `<article class="life-pcard ${p.role}"><div class="life-ph"><span>${kid ? (p.months < 36 ? '👶' : p.months < 144 ? '🧒' : '🧑') : p.emoji}</span><div><h3>${esc(p.name)}${p.member ? ' <small class="life-real">🌍 ' + T('gerçek oyuncu', 'real player') + '</small>' : ''}</h3><p>${kid ? `${Math.floor(p.months / 12)} ${T('yaş', 'yrs')} · ${kidStage(p.months)}` : { arkadas: T('Arkadaş', 'Friend'), partner: T('Sevgili', 'Partner'), es: T('Eşin', 'Spouse') }[p.role]} · ${esc(traitText(p.traits))}</p></div></div>
        <div class="life-bond"><span>${T('Bağ', 'Bond')}</span><i><b style="width:${p.bond}%"></b></i><em>${p.bond}</em></div>
        ${kid ? `<p class="life-small">${T('Mutluluk', 'Happiness')} ${p.mood || 70} · ${p.months >= 72 ? T('Notlar', 'Grades') + ' ' + (p.grade || 70) : ''}${p.talent ? ' · 🌟 ' + T('yetenekli', 'gifted') : ''}</p>` : `<p class="life-small">${T('Sevdikleri', 'Likes')}: ${esc(p.likes.join(', '))} · ${T('Uyum', 'Compatibility')} ${c}%</p>`}
        ${p.history.length ? `<p class="life-mem">“${esc(p.history[0])}”</p>` : ''}
        <div class="life-buttons">${kid ? btn('🧸 ' + T('Vakit geçir', 'Spend time'), 'kid:' + p.id) + (p.months >= 72 ? btn('📖 ' + T('Ders çalış', 'Study together'), 'kidstudy:' + p.id) : '') : btn('💬 ' + T('Vakit geçir', 'Spend time'), 'hang:' + p.id) + (p.role === 'arkadas' && !p0 && c >= 55 && p.bond >= 50 ? btn('💘 ' + T('Çıkma teklif et', 'Ask them out'), 'ask:' + p.id) : '') + (p.role === 'partner' ? btn('💍 ' + T('Evlenme teklif et', 'Propose'), 'propose:' + p.id) + btn(T('Ayrıl', 'Break up'), 'breakup:' + p.id) : '') + (p.role === 'es' ? btn('👶 ' + T('Çocuk sahibi ol', 'Have a baby'), 'baby') + btn(T('Boşan', 'Divorce'), 'breakup:' + p.id) : '')}</div></article>`; };
    return `<h2>❤️ ${T('İlişkiler ve aile', 'Relationships and family')}</h2><p class="life-small">${T('Senin kişiliğin', 'Your personality')}: <b>${esc(traitText(state.traits))}</b> · ${T('Sevdiklerin', 'You like')}: ${esc(state.likes.join(', ') || '—')}. ${T('Yeni insanlarla kafede, konserde ya da spor salonunda tanışabilirsin.', 'Meet new people at the café, a gig or the gym.')}</p>
      <div class="life-people">${rel.length ? rel.map(card).join('') : `<p>${T('Henüz kimse yok. Şehre çık ve insanlarla tanış!', 'Nobody yet. Get out into the city and meet people!')}</p>`}</div>
      ${state.people.some(p => p.role === 'eski' || p.role === 'yetiskin') ? `<h3>${T('Geçmişten', 'From the past')}</h3><ul class="life-hist">${state.people.filter(p => p.role === 'eski' || p.role === 'yetiskin').map(p => `<li>${esc(p.name)} · ${p.role === 'eski' ? T('eski sevgili', 'ex-partner') : T('büyüdü, kendi hayatında', 'grown up, living their own life')}</li>`).join('')}</ul>` : ''}`;
  }
  function worldTab() {
    const w = state.world, me = hasAcc() ? CBN.sync.user.id : '';
    if (!w.joined) return `<h2>🌍 ${T('Çok oyunculu dünya', 'Multiplayer world')}</h2><div class="life-consent"><p>${T('Messenger’daki arkadaşların da HAYAT. oynuyorsa, karakterleriniz aynı Liman Şehri’nde karşılaşabilir, arkadaş olabilir ve birlikte etkinliklere katılabilir.', 'If your Messenger friends play LIFE. too, your characters can meet in the same Harbour City, become friends and do things together.')}</p>
      <h3>${T('Katılırsan paylaşılan bilgiler', 'What’s shared if you join')}</h3><ul><li>✅ ${T('Karakterinin adı, simgesi ve yaşı', 'Your character’s name, icon and age')}</li><li>✅ ${T('Oyundaki mesleği ve ruh hâli', 'Their in-game job and mood')}</li><li>✅ ${T('Bulunduğu semt (istersen gizleyebilirsin)', 'Their current district (you can hide it)')}</li></ul>
      <h3>${T('Asla paylaşılmayanlar', 'Never shared')}</h3><ul><li>🔒 ${T('Messenger mesajların — oyun bunları okumaz ve Messenger’a mesaj göndermez', 'Your Messenger messages — the game never reads them and never sends any')}</li><li>🔒 ${T('E-postan, gerçek konumun, CBN verilerin', 'Your email, real location or CBN data')}</li><li>🔒 ${T('Oyundaki paran, ilişkilerin ve kayıtların', 'Your in-game money, relationships and save')}</li></ul>
      <p class="life-small">${T('Bilgilerini sadece Messenger’da arkadaş olduğun kişiler görür. İstediğin an dünyadan ayrılabilirsin; ayrıldığında karakter kartın sunucudan silinir.', 'Only your Messenger friends can see it. You can leave at any time; your character card is then deleted from the server.')}</p>
      ${hasAcc() ? `<label class="life-check"><input type="checkbox" id="lifeConsent"> ${T('Okudum, yukarıdaki bilgilerin arkadaşlarımla paylaşılmasına açıkça izin veriyorum.', 'I’ve read this and explicitly agree to share the details above with my friends.')}</label><div class="life-buttons">${btn('🌍 ' + T('Dünyaya katıl', 'Join the world'), 'wjoin', 'primary')}</div>`
        : `<p class="life-warn">${T('Katılmak için önce Messenger’da (CBN hesabınla) giriş yap. Hesabın oyunla bu şekilde eşleşir.', 'To join, first sign in on Messenger (with your CBN account). That’s how your account is linked to the game.')} <a href="#msn">Messenger →</a></p>`}</div>`;
    if (world.err === 'setup') return `<h2>🌍 ${T('Dünya', 'World')}</h2><p class="life-warn">${T('Çok oyunculu dünya için uygulama sahibinin Supabase’de supabase/life.sql dosyasını bir kez çalıştırması gerekiyor.', 'For the multiplayer world, the app owner needs to run supabase/life.sql once in Supabase.')}</p>${btn(T('Dünyadan ayrıl', 'Leave the world'), 'wleave')}`;
    const pend = world.meets.filter(m => m.b === me && m.status === 'pending'), mine = world.meets.filter(m => m.a === me && m.status === 'pending');
    const nameOf = id => { const c = world.friends.find(f => f.member === id); return (c && c.data && c.data.name) || world.names.get(id) || '?'; };
    return `<h2>🌍 ${T('Liman Şehri dünyası', 'Harbour City world')}</h2><p class="life-small">${T('Arkadaşlarının karakterleri şehir haritasında da görünür.', 'Your friends’ characters also appear on the city map.')} ${world.loading ? '…' : ''}</p>
      ${pend.length ? `<h3>📨 ${T('Davetler', 'Invitations')}</h3><div class="life-people">${pend.map(m => `<article class="life-pcard"><p>${esc(nameOf(m.a))} ${m.kind === 'meet' ? T('seninle tanışmak istiyor', 'wants to meet you') : T(`seni davet ediyor: ${esc(m.activity)}`, `invites you: ${esc(m.activity)}`)}</p><div class="life-buttons">${btn('✅ ' + T('Kabul et', 'Accept'), 'wacc:' + m.id, 'primary')}${btn(T('Reddet', 'Decline'), 'wrej:' + m.id)}</div></article>`).join('')}</div>` : ''}
      <div class="life-people">${world.friends.length ? world.friends.map(f => { const d = f.data || {}, isFriend = state.people.some(p => p.member === f.member), sent = mine.some(m => m.b === f.member);
        return `<article class="life-pcard"><div class="life-ph"><span>${esc(d.avatar || '🧑')}</span><div><h3>${esc(d.name)} <small>${esc(d.mood || '')}</small></h3><p>${esc(world.names.get(f.member) || '')} · ${d.age} ${T('yaş', 'yrs')} · ${esc(d.job || '')}</p><p>📍 ${d.district && DIST[d.district] ? esc(dn(d.district)) : T('gizli', 'hidden')}</p></div></div>
          <div class="life-buttons">${sent ? `<span class="life-tag">⏳ ${T('Yanıt bekleniyor', 'Awaiting reply')}</span>` : isFriend ? `<select data-w-act="${f.member}">${ACTIVITIES().map(a => `<option>${esc(a)}</option>`).join('')}</select>${btn('🎟️ ' + T('Etkinliğe davet et', 'Invite'), 'winv:' + f.member, 'primary')}` : btn('🤝 ' + T('Tanış', 'Say hello'), 'wmeet:' + f.member, 'primary')}</div></article>`; }).join('') : `<p>${T('Henüz dünyada arkadaşın yok. Messenger arkadaşların HAYAT.’ı açıp dünyaya katılınca burada görünürler.', 'No friends in the world yet. They’ll appear here once your Messenger friends open LIFE. and join.')}</p>`}</div>
      <h3>🔐 ${T('Gizlilik', 'Privacy')}</h3><div class="life-buttons">${btn(w.hide ? '🙈 ' + T('Semtim gizli', 'My district is hidden') : '📍 ' + T('Semtim görünür', 'My district is visible'), 'whide')}${btn('↻ ' + T('Yenile', 'Refresh'), 'wrefresh')}${btn('🚪 ' + T('Dünyadan ayrıl (kartım silinsin)', 'Leave the world (delete my card)'), 'wleave')}</div>`;
  }
  function story() {
    return `<h2>📖 ${T('Hayat hikâyen', 'Your life story')}</h2><p>${T(`${state.choices} karar verdin. ${state.age} yaşındasın. ${state.monthsPlayed} ay yaşadın.`, `You’ve made ${state.choices} decisions. You’re ${state.age}. You’ve lived ${state.monthsPlayed} months.`)}</p>
      <h3>${T('Kimliğin', 'Who you are')}</h3><div class="life-prefs"><label>${T('Simgen', 'Your icon')}<select data-pref="avatar">${['🧑', '👩', '👨', '🧔', '👱', '👩‍🦱', '🧑‍🦰', '👨‍🦳', '🧕', '🧑‍🎤'].map(a => `<option ${state.avatar === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        ${[['food', T('Sevdiğin yemek', 'Favourite food'), ['Mantı', 'Pizza', 'Sushi', 'Köfte', 'Lahmacun', 'Makarna', 'Salata']], ['music', T('Sevdiğin müzik', 'Favourite music'), ['Rock', 'Pop', 'Rap', 'Caz', 'Klasik', 'Elektronik', 'Türkçe pop']], ['team', T('Tuttuğun takım', 'Your team'), ['Trabzonspor', 'Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Bursaspor', T('Takım tutmuyorum', 'No team')]]].map(([k, l, arr]) => `<label>${l}<select data-pref="${k}">${arr.map(x => `<option ${state.prefs[k] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`).join('')}</div>
      <div class="life-log">${state.log.map(x => `<p>${esc(x)}</p>`).join('')}</div>${btn(T('Yeni bir hayat başlat', 'Start a new life'), 'reset')}`;
  }
  function render() {
    if (!host || !state) return;
    if (state.ended) { host.innerHTML = `<section class="life-game life-end">${COVER()}<h1>${T('Bir hayat sona erdi', 'A life has ended')}<span>.</span></h1><p>${T(`${state.name}, ${state.age} yaşında hayata veda etti. Net varlığı ${money(netWorth(state))}, ${state.people.filter(p => p.role === 'cocuk' || p.role === 'yetiskin').length} çocuğu ve ${state.choices} kararı vardı.`, `${state.name} passed away at ${state.age}, leaving a net worth of ${money(netWorth(state))}, ${state.people.filter(p => p.role === 'cocuk' || p.role === 'yetiskin').length} children and ${state.choices} decisions.`)}</p>${btn(T('Yeni bir hayat başlat', 'Start a new life'), 'reset', 'primary')}<div class="life-log">${state.log.slice(0, 20).map(x => `<p>${esc(x)}</p>`).join('')}</div></section>`; bind(); return; }
    const body = tab === 'city' ? city() : tab === 'career' ? career() : tab === 'money' ? finance() : tab === 'people' ? people() : tab === 'world' ? worldTab() : tab === 'story' ? story() : home();
    host.innerHTML = `<section class="life-game">${top()}<div class="life-body">${body}</div></section>`;
    bind();
    const tb = host.querySelector('.life-tabs'), on = tb && tb.querySelector('.on'); if (on) tb.scrollLeft = on.offsetLeft - tb.offsetLeft - 16;
  }
  function bind() {
    host.querySelectorAll('[data-action]').forEach(b => b.onclick = () => act(b.dataset.action));
    host.querySelectorAll('.life-dist').forEach(g => { const f = () => { place = g.dataset.d; tab = 'city'; render(); }; g.onclick = f; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; });
    host.querySelectorAll('[data-pref]').forEach(s => s.onchange = () => { const k = s.dataset.pref; if (k === 'avatar') state.avatar = s.value; else state.prefs[k] = s.value; save(); render(); });
  }
  async function act(a) {
    const s = state, [cmd, arg] = [a.split(':')[0], a.split(':').slice(1).join(':')];
    if (cmd === 'tab') { tab = arg; place = null; if (arg === 'world' && s.world.joined && Date.now() - world.at > 20000) { render(); await worldLoad(); } render(); return; }
    if (cmd === 'reset') { if (confirm(T('Bu hayatın kayıtlarını silip yeni bir oyun başlatmak istiyor musun?', 'Delete this life and start a new game?'))) { if (s.world.joined) await worldLeave(true); state = null; localStorage.removeItem(KEY); start(); } return; }
    if (cmd === 'month') return month();
    if (cmd === 'do') return doAct(arg);
    if (cmd === 'go') { const c = Math.round(distance(s.location, arg) * TRANS[s.transport][2] * 2); if (!spend(0, c)) return; s.location = arg; note(T(`${dn(arg)} semtine geçtin.`, `You went to ${dn(arg)}.`)); place = null; tab = 'home'; worldSync(); }
    if (cmd === 'rent') { if (!confirm(T(`${dn(arg)} semtinde ${money(DIST[arg].rent)} kiralı bir eve taşınılsın mı? (Taşınma masrafı 8.000 ₺)`, `Move to a flat in ${dn(arg)} for ${money(DIST[arg].rent)} a month? (Moving costs ₺8,000)`))) return; if (!spend(8000, 20)) return; if (s.home.own) s.props.push(Object.assign({}, s.home.own, { rented: false })); s.home = { district: arg, own: null, rent: DIST[arg].rent }; s.location = arg; note(T(`📦 ${dn(arg)} semtine taşındın.`, `📦 You moved to ${dn(arg)}.`)); }
    if (cmd === 'buy') { if (!confirm(T(`${dn(arg)} semtinde ev satın alınsın mı? %25 peşinat, kalanı 15 yıllık konut kredisi.`, `Buy a home in ${dn(arg)}? 25% deposit, the rest on a 15-year mortgage.`))) return; const r = buyHome(arg); toast(r); }
    if (cmd === 'tr') { if (arg === 'araba' && !s.car) { if (!confirm(T('650.000 ₺’ye araba alınsın mı? Nakit yetmezse kalanı taşıt kredisiyle.', 'Buy a car for ₺650,000? Any shortfall goes on a car loan.'))) return; if (s.cash < 650000) addLoan('tuketici', 650000 - s.cash, 48); s.cash -= 650000; s.car = 650000; note(T('🚗 Araba aldın.', '🚗 You bought a car.')); } s.transport = arg; }
    if (cmd === 'apply') { const j = s.market.find(x => x.id === arg); if (j) return interview(j); }
    if (cmd === 'quit') { if (!confirm(T('İstifa etmek istediğine emin misin?', 'Are you sure you want to resign?'))) return; note(T('İşinden istifa ettin.', 'You resigned.')); s.job = null; }
    if (cmd === 'hire' && s.company) { s.company.staff++; note(T('Ekibine yeni biri katıldı.', 'Someone new joined your team.')); }
    if (cmd === 'fire' && s.company && s.company.staff > 1) { s.company.staff--; chg({ stress: 4 }); }
    if (cmd === 'dividend' && s.company) { if (s.company.cash < 50000) return toast(T('Şirket kasası yetersiz', 'Not enough company cash')); s.company.cash -= 50000; s.cash += 42500; note(T('Şirketinden 50.000 ₺ kâr payı aldın (%15 stopaj).', 'You took a ₺50,000 dividend (15% withholding tax).')); }
    if (cmd === 'sellco' && s.company) { if (!confirm(T('Şirketini satmak istiyor musun?', 'Sell your company?'))) return; const v = Math.round(s.company.value * (s.company.share || 1) * .9 + Math.max(0, s.company.cash)); s.cash += v; note(T(`${s.company.name} şirketini ${money(v)} karşılığında sattın.`, `You sold ${s.company.name} for ${money(v)}.`)); s.company = null; }
    if (cmd === 'save') { if (s.cash >= 5000) { s.cash -= 5000; s.savings += 5000; } else return toast(T('Yeterli nakit yok', 'Not enough cash')); }
    if (cmd === 'withdraw') { if (s.savings >= 5000) { s.savings -= 5000; s.cash += 5000; } else return toast(T('Yeterli birikim yok', 'Not enough savings')); }
    if (cmd === 'ins') s.insurance = !s.insurance;
    if (cmd === 'buyinv') { if (s.cash < 10000) return toast(T('Yeterli nakit yok', 'Not enough cash')); s.cash -= 10000; s.invest[arg] += 10000 / s.prices[arg] * 100; }
    if (cmd === 'sellinv') { const v = s.invest[arg] * s.prices[arg] / 100; if (v < 1) return; const gain = Math.max(0, v - 0); s.cash += Math.round(v * (arg === 'crypto' ? .99 : 1)); s.invest[arg] = 0; note(T(`Yatırım satıldı: ${money(v)}.`, `Investment sold: ${money(v)}.`)); }
    if (cmd === 'repay') { const l = s.loans.find(x => x.id === arg); if (l) { const v = Math.min(10000, s.cash, l.left); s.cash -= v; l.left -= v; s.loans = s.loans.filter(x => x.left > 0); } }
    if (cmd === 'loan') { if (s.credit < 450) return toast(T('Kredi notun yetersiz', 'Your credit score is too low')); addLoan('tuketici', 50000, 24); }
    if (cmd === 'let') { const p = s.props.find(x => x.id === arg); if (p) { p.rented = true; note(T('Evi kiraya verdin.', 'You let out the property.')); } }
    if (cmd === 'sellprop') { const p = s.props.find(x => x.id === arg); if (p && confirm(T(`Bu evi ${money(p.value)} karşılığında satmak istiyor musun?`, `Sell this property for ${money(p.value)}?`))) { const mort = s.loans.find(l => l.kind === 'konut'); let v = p.value; if (mort) { const pay = Math.min(mort.left, v); mort.left -= pay; v -= pay; } s.cash += v; s.props = s.props.filter(x => x !== p); s.loans = s.loans.filter(l => l.left > 0); note(T(`Ev satıldı, eline ${money(v)} geçti.`, `Property sold; you received ${money(v)}.`)); } }
    if (cmd === 'hang') { const p = s.people.find(x => x.id === arg); if (p && spend(800, 8)) { p.bond = clamp(p.bond + 6 + Math.round(compat(p) / 20)); p.seen = true; const memo = pick([T('Uzun bir sohbet', 'A long chat'), T('Birlikte film gecesi', 'A film night together'), T('Sahilde yürüyüş', 'A walk by the sea'), T('Kahkahalarla dolu bir akşam', 'An evening full of laughter')]); p.history.unshift(memo); chg({ happiness: 6, social: 3, stress: -4 }); note(T(`${p.name} ile vakit geçirdin: ${memo}.`, `You spent time with ${p.name}: ${memo}.`)); } }
    if (cmd === 'ask') { const p = s.people.find(x => x.id === arg); if (p && spend(1600, 8)) { const ok = compat(p) + p.bond / 2 + rand(30) > 95; if (ok) { p.role = 'partner'; p.bond = clamp(p.bond + 10); p.history.unshift(T('İlk buluşmanız', 'Your first date')); note(T(`💘 ${p.name} ile birlikte olmaya başladınız!`, `💘 You and ${p.name} are now together!`)); chg({ happiness: 15 }); } else { p.bond = clamp(p.bond - 5); note(T(`${p.name} sadece arkadaş kalmak istiyor.`, `${p.name} would rather stay friends.`)); chg({ happiness: -6 }); } } }
    if (cmd === 'propose') { const p = s.people.find(x => x.id === arg); if (!p) return; if (p.bond < 70) return toast(T('Bağınız henüz yeterince güçlü değil (70+)', 'Your bond isn’t strong enough yet (70+)')); showModal(`<h3>💍 ${T('Düğün planı', 'Wedding plans')}</h3><p>${T(`${p.name} “evet” dedi! Nasıl bir düğün istersiniz?`, `${p.name} said yes! What kind of wedding would you like?`)}</p><div class="life-choices"><button data-w="30000">${T('Sade nikâh (30.000 ₺)', 'Simple ceremony (₺30,000)')}</button><button data-w="250000">${T('Büyük düğün (250.000 ₺)', 'Big wedding (₺250,000)')}</button><button data-close>${T('Biraz bekleyelim', 'Let’s wait a bit')}</button></div>`, m => m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const c = +b.dataset.w; if (s.cash < c) { if (c === 250000) addLoan('tuketici', c - s.cash, 36); else return toast(T('Yeterli nakit yok', 'Not enough cash')); } s.cash -= c; p.role = 'es'; p.bond = clamp(p.bond + (c > 100000 ? 15 : 10)); p.history.unshift(T('Evlendiniz!', 'You got married!')); note(T(`💍 ${p.name} ile evlendin!`, `💍 You married ${p.name}!`)); chg({ happiness: 20 }); closeModal(); save(); render(); })); return; }
    if (cmd === 'baby') { const p = partner(s); if (!p || p.role !== 'es') return; if (s.people.filter(x => x.role === 'cocuk').length >= 5) return toast(T('En fazla 5 çocuk', 'Five children at most')); if (s.cash < 15000) return toast(T('Hazırlık için 15.000 ₺ gerekli', 'You need ₺15,000 to prepare')); const n = prompt(T('Bebeğin adı?', 'Baby’s name?'), pick(NAMES)); if (!n) return; s.cash -= 15000; const tr = {}; for (const k in s.traits) tr[k] = clamp(Math.round((s.traits[k] + p.traits[k]) / 2 + gauss() * 15)); s.people.push(npc('cocuk', { name: n.slice(0, 24), months: 0, traits: tr, bond: 80, mood: 80, grade: 70, history: [T('Dünyaya geldi', 'Was born')] })); note(T(`👶 ${n.slice(0, 24)} dünyaya geldi!`, `👶 ${n.slice(0, 24)} was born!`)); chg({ happiness: 20, stress: 8 }); }
    if (cmd === 'kid') { const k = s.people.find(x => x.id === arg); if (k && spend(300, 10)) { k.bond = clamp(k.bond + 8); k.mood = clamp((k.mood || 70) + 8); k.seen = true; k.history.unshift(pick([T('Parkta oynadınız', 'You played in the park'), T('Masal okudun', 'You read a story'), T('Birlikte resim yaptınız', 'You painted together')])); chg({ happiness: 6 }); } }
    if (cmd === 'kidstudy') { const k = s.people.find(x => x.id === arg); if (k && spend(0, 12)) { k.grade = clamp((k.grade || 70) + 7); k.bond = clamp(k.bond + 3); k.seen = true; } }
    if (cmd === 'breakup') { const p = s.people.find(x => x.id === arg); if (p && confirm(p.role === 'es' ? T('Boşanmak istiyor musun? Birikimler ikiye bölünür.', 'Do you want a divorce? Savings are split in half.') : T('Ayrılmak istiyor musun?', 'Do you want to break up?'))) { if (p.role === 'es') { s.cash = Math.round(s.cash / 2); s.savings = Math.round(s.savings / 2); } p.role = 'eski'; chg({ happiness: -15, stress: 12 }); note(T(`${p.name} ile yollarınız ayrıldı.`, `You and ${p.name} went separate ways.`)); } }
    // dünya
    if (cmd === 'wjoin') { const c = host.querySelector('#lifeConsent'); if (!c || !c.checked) return toast(T('Önce izin kutusunu işaretle', 'Tick the consent box first')); s.world.joined = true; s.world.consentAt = new Date().toISOString(); save(); await worldSync(); await worldLoad(); note(T('🌍 Çok oyunculu dünyaya katıldın.', '🌍 You joined the multiplayer world.')); }
    if (cmd === 'wleave') { if (!confirm(T('Dünyadan ayrılınca karakter kartın sunucudan silinir. Devam edilsin mi?', 'Leaving deletes your character card from the server. Continue?'))) return; await worldLeave(); }
    if (cmd === 'whide') { s.world.hide = !s.world.hide; await worldSync(); }
    if (cmd === 'wrefresh') await worldLoad();
    if (cmd === 'wmeet' || cmd === 'winv') { const sel = host.querySelector(`[data-w-act="${arg}"]`); try { await api('/rest/v1/life_meets', { method: 'POST', body: { b: arg, kind: cmd === 'wmeet' ? 'meet' : 'activity', activity: cmd === 'winv' && sel ? sel.value : null }, prefer: 'return=minimal' }); toast(T('Davet gönderildi', 'Invitation sent')); await worldLoad(); } catch (e) { toast(e.message); } }
    if (cmd === 'wacc' || cmd === 'wrej') { try { await api(`/rest/v1/life_meets?id=eq.${arg}`, { method: 'PATCH', body: { status: cmd === 'wacc' ? 'accepted' : 'declined' }, prefer: 'return=minimal' }); await worldLoad(); } catch (e) { toast(e.message); } }
    for (const k in s.stats) s.stats[k] = clamp(s.stats[k]);
    save(); render();
  }
  async function worldLeave(silent) {
    state.world.joined = false; save();
    if (hasAcc()) { try { await api('/rest/v1/life_chars?member=eq.' + CBN.sync.user.id, { method: 'DELETE', prefer: 'return=minimal' }); } catch (e) {} }
    world.friends = []; world.meets = []; if (!silent) { note(T('Dünyadan ayrıldın; karakter kartın silindi.', 'You left the world; your character card was deleted.')); render(); }
  }
  function start() {
    if (!host) return;
    if (!state) {
      host.innerHTML = `<section class="life-game life-intro">${COVER()}<p class="eyebrow">BABA. / ${T('YENİ OYUN', 'NEW GAME')}</p><h1>${T('HAYAT', 'LIFE')}<span>.</span></h1><p>${T('Liman Şehri’nde bir hayat: ev, iş, aşk, aile, para ve beklenmedik olaylar. Her karar hikâyeni değiştirir.', 'A life in Harbour City: home, work, love, family, money and the unexpected. Every decision changes your story.')}</p>
        <div class="life-feat">${[['🗺️', T('Yaşayan şehir', 'A living city')], ['💼', T('Kariyer ve ekonomi', 'Career and economy')], ['❤️', T('İlişkiler ve aile', 'Relationships and family')], ['⚡', T('Dinamik olaylar', 'Dynamic events')], ['🌍', T('Arkadaşlarla dünya', 'A world with friends')]].map(([e, t]) => `<span>${e} ${t}</span>`).join('')}</div>
        <label>${T('Karakterinin adı', 'Your character’s name')} <input id="lifeName" maxlength="32" placeholder="${T('İsmin', 'Your name')}"></label><button id="lifeStart" class="primary">${T('Hayatımı başlat', 'Start my life')} →</button><small>${T('Oyun kurgusaldır. Kayıtlar yalnızca bu cihazın tarayıcısında tutulur.', 'This game is fictional. Your save stays in this device’s browser.')}</small></section>`;
      host.querySelector('#lifeStart').onclick = () => { state = create(host.querySelector('#lifeName').value.trim()); makeMarket(); save(); render(); };
    } else { render(); if (state.pending) renderEvent(); if (state.world.joined) worldLoad().then(() => { if (tab === 'world' || tab === 'city') render(); }); }
  }
  function open(el) { host = el; state = load(); if (state && state.version === 2) save(); tab = 'home'; place = null; start(); }
  return { open, cover: COVER };
})();

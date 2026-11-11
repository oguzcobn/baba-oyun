/* =====================================================================
   SÜPER LİG EFSANELER DRAFT — veriler
   Puanlar oyun içi tahmini değerlerdir; resmî bir derecelendirme değildir.
   Mevki: KL kaleci · ST stoper · BK bek · OS orta saha · KN kanat · FV forvet
   ===================================================================== */
const DRAFT_CLUBS = [
  { id: 'gs', name: 'Galatasaray', short: 'GS', c1: '#a90432', c2: '#fdb912', players: [
    ['Taffarel', 'KL', 86], ['Fernando Muslera', 'KL', 85], ['Bülent Korkmaz', 'ST', 84], ['Gheorghe Popescu', 'ST', 85], ['Davinson Sánchez', 'ST', 81],
    ['Sabri Sarıoğlu', 'BK', 79], ['Hakan Ünsal', 'BK', 80], ['Gheorghe Hagi', 'OS', 92], ['Tugay Kerimoğlu', 'OS', 84], ['Wesley Sneijder', 'OS', 87],
    ['Lucas Torreira', 'OS', 82], ['Okan Buruk', 'OS', 81], ['Arif Erdem', 'KN', 82], ['Hasan Şaş', 'KN', 83], ['Hakan Şükür', 'FV', 89], ['Mauro Icardi', 'FV', 88], ['Victor Osimhen', 'FV', 89]] },
  { id: 'fb', name: 'Fenerbahçe', short: 'FB', c1: '#002d72', c2: '#ffed00', players: [
    ['Rüştü Reçber', 'KL', 87], ['Volkan Demirel', 'KL', 83], ['Diego Lugano', 'ST', 86], ['Uche Okechukwu', 'ST', 82], ['Ümit Özat', 'BK', 80], ['Gökhan Gönül', 'BK', 81],
    ['Alex de Souza', 'OS', 91], ['Emre Belözoğlu', 'OS', 86], ['Mehmet Aurélio', 'OS', 82], ['Selçuk Şahin', 'OS', 78], ['Tuncay Şanlı', 'KN', 83], ['Dirk Kuyt', 'KN', 84],
    ['Aykut Kocaman', 'FV', 85], ['Edin Džeko', 'FV', 86], ['Moussa Sow', 'FV', 82]] },
  { id: 'bjk', name: 'Beşiktaş', short: 'BJK', c1: '#111111', c2: '#ffffff', players: [
    ['Óscar Córdoba', 'KL', 82], ['Mert Günok', 'KL', 80], ['Pepe', 'ST', 85], ['Gökhan Zan', 'ST', 78], ['İbrahim Toraman', 'BK', 78], ['Caner Erkin', 'BK', 79],
    ['Sergen Yalçın', 'OS', 88], ['Atiba Hutchinson', 'OS', 84], ['Oğuzhan Özyakup', 'OS', 80], ['Tayfur Havutçu', 'OS', 80], ['Ricardo Quaresma', 'KN', 87],
    ['Feyyaz Uçar', 'FV', 83], ['Mario Gómez', 'FV', 85], ['Vincent Aboubakar', 'FV', 84], ['Cenk Tosun', 'FV', 82], ['Pascal Nouma', 'FV', 80]] },
  { id: 'ts', name: 'Trabzonspor', short: 'TS', c1: '#8a1538', c2: '#5cb8f0', players: [
    ['Şenol Güneş', 'KL', 84], ['Uğurcan Çakır', 'KL', 83], ['Onur Kıvrak', 'KL', 79], ['Ogün Temizkanoğlu', 'ST', 82], ['Abdullah Ercan', 'BK', 81],
    ['Ünal Karaman', 'OS', 82], ['José Sosa', 'OS', 82], ['Marek Hamšík', 'OS', 83], ['Hüseyin Çimşir', 'OS', 78], ['Abdülkadir Ömür', 'OS', 79],
    ['Gökdeniz Karadeniz', 'KN', 84], ['Anthony Nwakaeme', 'KN', 82], ['Hami Mandıralı', 'FV', 85], ['Burak Yılmaz', 'FV', 87], ['Shota Arveladze', 'FV', 83], ['Fatih Tekke', 'FV', 80]] },
  { id: 'bursa', name: 'Bursaspor', short: 'BUR', c1: '#00843d', c2: '#ffffff', players: [
    ['Dimitar Ivankov', 'KL', 80], ['Ömer Erdoğan', 'ST', 78], ['Pablo Batalla', 'OS', 80], ['Volkan Şen', 'KN', 80], ['Ozan İpek', 'KN', 79], ['Sercan Yıldırım', 'KN', 78], ['Turgay Bahadır', 'FV', 77]] },
  { id: 'ibfk', name: 'Başakşehir', short: 'İBFK', c1: '#e8562a', c2: '#1b2e5a', players: [
    ['Volkan Babacan', 'KL', 79], ['Mahmut Tekdemir', 'OS', 77], ['Gökhan İnler', 'OS', 81], ['Arda Turan', 'KN', 83], ['Edin Višća', 'KN', 82], ['Emmanuel Adebayor', 'FV', 81], ['Demba Ba', 'FV', 82]] }
];

const DRAFT_COACHES = [
  { name: 'Fatih Terim', att: 3, def: 0, note: 'Hücum ve moral' },
  { name: 'Şenol Güneş', att: 1, def: 3, note: 'Sağlam savunma' },
  { name: 'Mustafa Denizli', att: 2, def: 2, note: 'Dengeli oyun' },
  { name: 'Okan Buruk', att: 3, def: 1, note: 'Pres ve tempo' },
  { name: 'Aykut Kocaman', att: 0, def: 3, note: 'Disiplin' },
  { name: 'Sergen Yalçın', att: 3, def: -1, note: 'Yaratıcılık' }
];

/* lig rakipleri: isim ve güç (oyun içi tahmini) */
const DRAFT_LEAGUE = [
  ['Galatasaray', 84], ['Fenerbahçe', 83], ['Beşiktaş', 81], ['Trabzonspor', 80], ['Başakşehir', 77], ['Samsunspor', 75], ['Göztepe', 74],
  ['Kasımpaşa', 73], ['Antalyaspor', 72], ['Alanyaspor', 72], ['Konyaspor', 72], ['Kayserispor', 71], ['Gaziantep FK', 71], ['Rizespor', 70],
  ['Sivasspor', 70], ['Eyüpspor', 71], ['Kocaelispor', 69]
];

/* 4-3-3: 11 as + 2 yedek */
const DRAFT_SLOTS = [
  { id: 'FV', pos: 'FV', x: 50, y: 12 }, { id: 'KN1', pos: 'KN', x: 16, y: 20 }, { id: 'KN2', pos: 'KN', x: 84, y: 20 },
  { id: 'OS1', pos: 'OS', x: 26, y: 44 }, { id: 'OS2', pos: 'OS', x: 50, y: 50 }, { id: 'OS3', pos: 'OS', x: 74, y: 44 },
  { id: 'BK1', pos: 'BK', x: 12, y: 70 }, { id: 'ST1', pos: 'ST', x: 36, y: 74 }, { id: 'ST2', pos: 'ST', x: 64, y: 74 }, { id: 'BK2', pos: 'BK', x: 88, y: 70 },
  { id: 'KL', pos: 'KL', x: 50, y: 91 }
];
const DRAFT_POS_NAMES = { KL: 'Kaleci', ST: 'Stoper', BK: 'Bek', OS: 'Orta Saha', KN: 'Kanat', FV: 'Forvet' };

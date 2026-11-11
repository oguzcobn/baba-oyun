/* =====================================================================
   SÜPER LİG DRAFT — 18 kulüp · son 10 yılın kadroları
   Oyuncu: [isim, mevki, puan, dönem]
   · dönem "FC27"  → EA SPORTS FC 27 resmî puanı (ea.com/ratings, Kasım 2026)
   · dönem "~yy/yy" → o sezondaki kadrodan, tahmini FIFA/FC puanı
   Mevki: KL kaleci · ST stoper · BK bek · OS orta saha · KN kanat · FV forvet
   ===================================================================== */
const DRAFT_CLUBS = [
  { id: 'gs', name: 'Galatasaray', short: 'GS', c1: '#a90432', c2: '#fdb912', players: [
    ['Victor Osimhen', 'FV', 85, 'FC27'], ['Lucas Torreira', 'OS', 81, 'FC27'], ['Barış Alper Yılmaz', 'KN', 80, 'FC27'], ['Gabriel Sara', 'OS', 80, 'FC27'],
    ['Uğurcan Çakır', 'KL', 80, 'FC27'], ['Davinson Sánchez', 'ST', 80, 'FC27'], ['Leroy Sané', 'KN', 80, 'FC27'], ['Yunus Akgün', 'OS', 79, 'FC27'],
    ['Abdülkerim Bardakcı', 'ST', 79, 'FC27'], ['Roland Sallai', 'BK', 78, 'FC27'], ['Wilfried Singo', 'ST', 78, 'FC27'], ['İlkay Gündoğan', 'OS', 78, 'FC27'],
    ['Ismail Jakobs', 'BK', 75, 'FC27'], ['Mauro Icardi', 'FV', 84, '~23/24'], ['Fernando Muslera', 'KL', 84, '~18/19'], ['Dries Mertens', 'OS', 82, '~22/23'],
    ['Radamel Falcao', 'FV', 82, '~20/21'], ['Wesley Sneijder', 'OS', 82, '~16/17'], ['Sofiane Feghouli', 'KN', 80, '~18/19'], ['Sacha Boey', 'BK', 76, '~22/23']] },
  { id: 'fb', name: 'Fenerbahçe', short: 'FB', c1: '#002d72', c2: '#ffed00', players: [
    ["N'Golo Kanté", 'OS', 83, 'FC27'], ['Mason Greenwood', 'KN', 83, 'FC27'], ['Ederson', 'KL', 82, 'FC27'], ['Romelu Lukaku', 'FV', 82, 'FC27'],
    ['Marco Asensio', 'OS', 82, 'FC27'], ['Mattéo Guendouzi', 'OS', 81, 'FC27'], ['Anderson Talisca', 'OS', 81, 'FC27'], ['Milan Škriniar', 'ST', 81, 'FC27'],
    ['Nathan Aké', 'ST', 80, 'FC27'], ['Kerem Aktürkoğlu', 'KN', 79, 'FC27'], ['Nélson Semedo', 'BK', 77, 'FC27'], ['Archie Brown', 'BK', 73, 'FC27'],
    ['Edin Džeko', 'FV', 83, '~23/24'], ['Dušan Tadić', 'OS', 82, '~23/24'], ['Youssef En-Nesyri', 'FV', 82, '~24/25'], ['Mesut Özil', 'OS', 81, '~20/21'],
    ['Robin van Persie', 'FV', 81, '~16/17'], ['Simon Kjær', 'ST', 80, '~16/17'], ['Volkan Demirel', 'KL', 79, '~16/17'], ['Ferdi Kadıoğlu', 'BK', 77, '~23/24']] },
  { id: 'bjk', name: 'Beşiktaş', short: 'BJK', c1: '#111111', c2: '#ffffff', players: [
    ['Orkun Kökçü', 'OS', 82, 'FC27'], ['Leandro Trossard', 'KN', 82, 'FC27'], ['Dušan Vlahović', 'FV', 81, 'FC27'], ['Alexander Nübel', 'KL', 80, 'FC27'],
    ['Emmanuel Agbadou', 'ST', 77, 'FC27'], ['Václav Černý', 'KN', 77, 'FC27'], ['Wilfred Ndidi', 'OS', 75, 'FC27'], ['Amir Murillo', 'BK', 74, 'FC27'],
    ['Tiago Djaló', 'ST', 74, 'FC27'], ['Rıdvan Yılmaz', 'BK', 72, 'FC27'], ['Semih Kılıçsoy', 'FV', 73, 'FC27'], ['Pepe', 'ST', 83, '~17/18'],
    ['Ricardo Quaresma', 'KN', 82, '~17/18'], ['Ciro Immobile', 'FV', 82, '~24/25'], ['Domagoj Vida', 'ST', 81, '~19/20'], ['Gary Medel', 'OS', 80, '~18/19'],
    ['Vincent Aboubakar', 'FV', 79, '~18/19'], ['Cenk Tosun', 'FV', 79, '~17/18'], ['Rachid Ghezzal', 'KN', 79, '~21/22'], ['Fabri', 'KL', 79, '~16/17']] },
  { id: 'ts', name: 'Trabzonspor', short: 'TS', c1: '#8a1538', c2: '#5cb8f0', players: [
    ['Mohamed Salah', 'KN', 87, 'FC27'], ['Fabinho', 'OS', 82, 'FC27'], ['André Onana', 'KL', 78, 'FC27'], ['Paul Onuachu', 'FV', 77, 'FC27'],
    ['Aral Şimşir', 'KN', 76, 'FC27'], ['Arseniy Batagov', 'ST', 76, 'FC27'], ['Stefan Savić', 'ST', 76, 'FC27'], ['Ruslan Malinovskyi', 'OS', 75, 'FC27'],
    ['Ernest Muçi', 'OS', 75, 'FC27'], ['Mustafa Eskihellaç', 'BK', 72, 'FC27'], ['Wagner Pina', 'BK', 72, 'FC27'], ['Okay Yokuşlu', 'OS', 72, 'FC27'],
    ['Marek Hamšík', 'OS', 80, '~21/22'], ['Burak Yılmaz', 'FV', 80, '~16/17'], ['Edin Višća', 'KN', 79, '~22/23'], ['Marc Bartra', 'ST', 79, '~22/23'],
    ['José Sosa', 'OS', 79, '~17/18'], ['Anthony Nwakaeme', 'KN', 78, '~21/22'], ['Alexander Sørloth', 'FV', 78, '~19/20'], ['Onur Kıvrak', 'KL', 78, '~16/17']] },
  { id: 'ibfk', name: 'Başakşehir', short: 'İBFK', c1: '#e8562a', c2: '#1b2e5a', players: [
    ['Eldor Shomurodov', 'FV', 76, 'FC27'], ['Christopher Opéri', 'BK', 73, 'FC27'], ['Andreas Skov Olsen', 'KN', 73, 'FC27'], ['Yusuf Sarı', 'KN', 73, 'FC27'],
    ['Emin Bayram', 'ST', 73, 'FC27'], ['Muhammed Şengezer', 'KL', 72, 'FC27'], ['Davie Selke', 'FV', 72, 'FC27'], ['Jerome Opoku', 'ST', 72, 'FC27'],
    ['Olivier Kemen', 'OS', 71, 'FC27'], ['Umut Güneş', 'OS', 69, 'FC27'], ['Arda Turan', 'KN', 80, '~18/19'], ['Edin Višća', 'KN', 80, '~19/20'],
    ['Robinho', 'KN', 79, '~18/19'], ['Emmanuel Adebayor', 'FV', 79, '~16/17'], ['Demba Ba', 'FV', 79, '~19/20'], ['Gökhan İnler', 'OS', 79, '~17/18'],
    ['Gaël Clichy', 'BK', 79, '~18/19'], ['Mert Günok', 'KL', 78, '~20/21'], ['Mahmut Tekdemir', 'OS', 74, '~19/20']] },
  { id: 'sam', name: 'Samsunspor', short: 'SAM', c1: '#e30613', c2: '#ffffff', players: [
    ['Antoine Makoumbou', 'OS', 72, 'FC27'], ['Elliot Watt', 'OS', 72, 'FC27'], ['Okan Kocuk', 'KL', 72, 'FC27'], ['Afonso Sousa', 'OS', 71, 'FC27'],
    ['Marius Mouandilmadji', 'FV', 71, 'FC27'], ['Logi Tómasson', 'BK', 70, 'FC27'], ['Emre Kılınç', 'KN', 70, 'FC27'], ['Toni Borevković', 'ST', 70, 'FC27'],
    ['Joe Mendes', 'BK', 69, 'FC27'], ['Tanguy Coulibaly', 'KN', 69, 'FC27'], ['Igor Drapiński', 'ST', 68, 'FC27'], ['Rick van Drongelen', 'ST', 74, '~25/26'],
    ['Olivier Ntcham', 'OS', 73, '~25/26'], ['Flavien Tait', 'OS', 74, '~24/25'], ['Carlo Holse', 'KN', 72, '~24/25'], ['Arbnor Muja', 'KN', 71, '~24/25']] },
  { id: 'goz', name: 'Göztepe', short: 'GÖZ', c1: '#f5c400', c2: '#c8102e', players: [
    ['Juan', 'FV', 72, '~FC27'], ['Efkan Bekiroğlu', 'OS', 70, '~FC27'], ['Rhaldney', 'OS', 70, '~FC27'], ['Allan Godói', 'ST', 71, '~25/26'],
    ['Heliton', 'ST', 70, '~25/26'], ['Amin Cherni', 'BK', 68, '~25/26'], ['Arda Kurtulan', 'BK', 68, '~25/26'], ['Janderson', 'KN', 69, '~25/26'],
    ['Alexis Antunes', 'OS', 70, '~25/26'], ['Mateusz Lis', 'KL', 73, '~24/25'], ['Koray Günter', 'ST', 72, '~24/25'], ['Romulo', 'FV', 72, '~24/25'],
    ['Beto', 'KL', 74, '~18/19'], ['André Castro', 'OS', 73, '~18/19'], ['Adis Jahović', 'FV', 74, '~17/18'], ['Halil Akbunar', 'KN', 72, '~19/20'], ['Soner Aydoğdu', 'OS', 72, '~19/20']] },
  { id: 'kas', name: 'Kasımpaşa', short: 'KAS', c1: '#002f6c', c2: '#ffffff', players: [
    ['Kerem Demirbay', 'OS', 73, '~25/26'], ['Andreas Gianniotis', 'KL', 71, '~25/26'], ['Claudio Winck', 'BK', 70, '~25/26'], ['Adrian Benedyczak', 'FV', 71, '~25/26'],
    ['Fousseni Diabaté', 'KN', 70, '~25/26'], ['Nicholas Opoku', 'ST', 69, '~25/26'], ['Godfried Frimpong', 'BK', 68, '~25/26'], ['Jim Allevinah', 'KN', 69, '~25/26'],
    ['Cenk Tosun', 'FV', 71, '~25/26'], ['Mortadha Ben Ouanes', 'BK', 71, '~23/24'], ['Haris Hajradinović', 'OS', 73, '~22/23'], ['Mame Baba Thiam', 'FV', 74, '~19/20'],
    ['Trézéguet', 'KN', 76, '~16/17'], ['Bengali-Fodé Koita', 'FV', 72, '~18/19'], ['Ramazan Köse', 'KL', 70, '~17/18']] },
  { id: 'kon', name: 'Konyaspor', short: 'KON', c1: '#00843d', c2: '#ffffff', players: [
    ['Riechedly Bazoer', 'OS', 72, '~25/26'], ['Adil Demirbağ', 'ST', 69, '~25/26'], ['Deniz Türüç', 'OS', 71, '~25/26'], ['Bahadır Güngördü', 'KL', 69, '~25/26'],
    ['Adamo Nagalo', 'ST', 69, '~25/26'], ['Rayyan Baniya', 'ST', 69, '~25/26'], ['Kazeem Olaigbe', 'KN', 69, '~25/26'], ['Uğurcan Yazğılı', 'BK', 69, '~25/26'],
    ['Pedrinho', 'KN', 71, '~25/26'], ['Yhoan Andzouana', 'BK', 70, '~25/26'], ['Melih İbrahimoğlu', 'OS', 68, '~25/26'], ['Sokol Cikalleshi', 'FV', 72, '~21/22'],
    ['Amir Hadžiahmetović', 'OS', 72, '~19/20'], ['Ömer Ali Şahiner', 'KN', 72, '~16/17'], ['Serkan Kırıntılı', 'KL', 74, '~16/17'], ['Riad Bajić', 'FV', 72, '~17/18']] },
  { id: 'ant', name: 'Antalyaspor', short: 'ANT', c1: '#d50032', c2: '#ffffff', players: [
    ['Nikola Storm', 'KN', 74, '~25/26'], ['Georgiy Dzhikiya', 'ST', 74, '~25/26'], ['Abdülkadir Ömür', 'OS', 73, '~25/26'], ['Sam Larsson', 'KN', 72, '~25/26'],
    ['Abdullah Yiğiter', 'KL', 69, '~25/26'], ['Bünyamin Balcı', 'BK', 68, '~25/26'], ['Samuel Eto\'o', 'FV', 81, '~16/17'], ['Jérémy Ménez', 'KN', 78, '~16/17'],
    ['Lukas Podolski', 'KN', 78, '~20/21'], ['Samir Nasri', 'OS', 76, '~17/18'], ['Fredy', 'OS', 74, '~20/21'], ['Haji Wright', 'FV', 72, '~22/23'],
    ['Ferhat Kaplan', 'KL', 72, '~20/21'], ['Veysel Sarı', 'ST', 72, '~21/22'], ['Fernando', 'OS', 73, '~22/23']] },
  { id: 'ala', name: 'Alanyaspor', short: 'ALA', c1: '#f37021', c2: '#00843d', players: [
    ['Iván Cédric', 'FV', 72, 'FC27'], ['Ianis Hagi', 'OS', 72, 'FC27'], ['Gaius Makouta', 'OS', 71, 'FC27'], ['Florent Hadergjonaj', 'KN', 71, 'FC27'],
    ['Hwang Ui-jo', 'OS', 70, 'FC27'], ['Paulo Victor', 'KL', 69, 'FC27'], ['Ümit Akdağ', 'ST', 69, 'FC27'], ['Fidan Aliti', 'ST', 68, 'FC27'],
    ['Nuno Lima', 'ST', 68, 'FC27'], ['Yusuf Özdemir', 'KN', 66, 'FC27'], ['Efecan Karaca', 'OS', 74, '~24/25'], ['Rony Lopes', 'KN', 74, '~24/25'],
    ['Vágner Love', 'FV', 76, '~17/18'], ['Papiss Cissé', 'FV', 76, '~19/20'], ['Steven Caulker', 'ST', 74, '~19/20'], ['Marafona', 'KL', 73, '~19/20'], ['Welinton', 'ST', 72, '~19/20']] },
  { id: 'kay', name: 'Kayserispor', short: 'KAY', c1: '#e30613', c2: '#fdd000', players: [
    ['João Mendes', 'OS', 73, '~25/26'], ['Carlos Mané', 'KN', 72, '~25/26'], ['Stefano Denswil', 'ST', 72, '~25/26'], ['Miguel Cardoso', 'KN', 71, '~24/25'],
    ['Aylton Boa Morte', 'KN', 71, '~24/25'], ['Onurcan Piri', 'KL', 66, '~24/25'], ['Majid Hosseini', 'ST', 69, '~24/25'], ['Lionel Carole', 'BK', 68, '~23/24'],
    ['Mario Gavranović', 'FV', 74, '~21/22'], ['Bilal Bayazıt', 'KL', 70, '~22/23'], ['Silvestre Varela', 'KN', 72, '~16/17'], ['Deniz Türüç', 'OS', 72, '~16/17'],
    ['Artem Kravets', 'FV', 72, '~18/19'], ['Pedro Henrique', 'KN', 72, '~18/19'], ['Ramazan Civelek', 'BK', 67, '~21/22']] },
  { id: 'riz', name: 'Çaykur Rizespor', short: 'RİZ', c1: '#006a4e', c2: '#7fd3ff', players: [
    ['Yahia Fofana', 'KL', 72, 'FC27'], ['Qazim Laçi', 'OS', 71, 'FC27'], ['Ibrahim Olawoyin', 'OS', 70, 'FC27'], ['Zakaria Ariss', 'BK', 70, 'FC27'],
    ['Ali Sowe', 'FV', 70, 'FC27'], ['Modibo Sagnan', 'ST', 70, 'FC27'], ['Taha Şahin', 'BK', 69, 'FC27'], ['Valentin Mihăilă', 'KN', 68, 'FC27'],
    ['Attila Mocsi', 'ST', 67, 'FC27'], ['Ahmed Kutucu', 'KN', 67, 'FC27'], ['Milan Škoda', 'FV', 72, '~20/21'], ['Fernando Boldrin', 'OS', 71, '~20/21'],
    ['Aminu Umar', 'KN', 71, '~19/20'], ['Gökhan Akkan', 'KL', 72, '~19/20'], ['Dario Melnjak', 'BK', 70, '~19/20']] },
  { id: 'gfk', name: 'Gaziantep FK', short: 'GFK', c1: '#d71920', c2: '#111111', players: [
    ['Alexandru Maxim', 'OS', 74, 'FC27'], ['Kacper Kozłowski', 'OS', 72, 'FC27'], ['Luis Pérez', 'BK', 70, 'FC27'], ['Juninho Bacuna', 'OS', 69, 'FC27'],
    ['Deian Sorescu', 'KN', 69, 'FC27'], ['Trivante Stewart', 'FV', 69, 'FC27'], ['Sontje Hansen', 'KN', 69, 'FC27'], ['Myenty Abena', 'ST', 68, 'FC27'],
    ['Arda Kızıldağ', 'ST', 68, 'FC27'], ['Serdar Dursun', 'FV', 68, 'FC27'], ['Kacper Tobiasz', 'KL', 66, 'FC27'], ['Kevin Mirallas', 'KN', 73, '~21/22'],
    ['Papy Djilobodji', 'ST', 73, '~20/21'], ['Marko Jevtović', 'OS', 72, '~21/22'], ['João Figueiredo', 'FV', 72, '~21/22'], ['Günay Güvenç', 'KL', 72, '~20/21']] },
  { id: 'eyu', name: 'Eyüpspor', short: 'EYÜ', c1: '#6a1b9a', c2: '#ffd600', players: [
    ['Horațiu Moldovan', 'KL', 72, '~FC27'], ['Abdelhamid Sabiri', 'OS', 72, '~FC27'], ['Jawad El Yamiq', 'ST', 71, '~FC27'], ['Calegari', 'BK', 70, '~FC27'],
    ['Simone Giordano', 'BK', 68, '~FC27'], ['Lenny Pintor', 'KN', 70, '~FC27'], ['Konrad Michalak', 'KN', 69, '~FC27'], ['Bilal Boutobba', 'KN', 69, '~FC27'],
    ['Chandrel Matondo', 'OS', 67, '~FC27'], ['Zak Jules', 'ST', 67, '~FC27'], ['Yusuf Barası', 'FV', 68, '~FC27'], ['Mame Thiam', 'FV', 75, '~25/26'],
    ['Samu Sáiz', 'OS', 74, '~25/26'], ['Emre Akbaba', 'OS', 72, '~24/25'], ['Berke Özer', 'KL', 72, '~24/25']] },
  { id: 'koc', name: 'Kocaelispor', short: 'KOC', c1: '#00843d', c2: '#111111', players: [
    ['Bruno Petković', 'FV', 75, 'FC27'], ['Massadio Haïdara', 'BK', 72, 'FC27'], ['Berkan Kutlu', 'OS', 70, 'FC27'], ['Anfernee Dijksteel', 'ST', 70, 'FC27'],
    ['Matej Maglica', 'ST', 70, 'FC27'], ['Habib Keïta', 'OS', 69, 'FC27'], ['Show', 'OS', 67, 'FC27'], ['Aleksandar Jovanović', 'KL', 67, 'FC27'],
    ['Dan Agyei', 'KN', 66, 'FC27'], ['Makana Baku', 'KN', 66, 'FC27'], ['Gonçalo Sousa', 'KN', 66, 'FC27'], ['Tanguy Zoukrou', 'ST', 65, 'FC27'],
    ['Muharrem Cinan', 'BK', 61, 'FC27'], ['Karol Linetty', 'OS', 73, '~25/26'], ['Tayfur Bingöl', 'OS', 66, 'FC27']] },
  { id: 'gen', name: 'Gençlerbirliği', short: 'GEN', c1: '#c8102e', c2: '#111111', players: [
    ['Tiago Gouveia', 'KN', 73, 'FC27'], ['Kévin Rodrigues', 'BK', 72, 'FC27'], ['Sékou Koïta', 'FV', 71, 'FC27'], ['Dimitrios Goutas', 'ST', 71, 'FC27'],
    ['Pedro Pereira', 'BK', 69, 'FC27'], ['Oğulcan Ülgün', 'OS', 69, 'FC27'], ['Adama Traoré', 'KN', 68, 'FC27'], ['Žan Žužek', 'ST', 67, 'FC27'],
    ['Tom Dele-Bashiru', 'OS', 66, 'FC27'], ['Peter Etebo', 'OS', 66, '~25/26'], ['Erhan Erentürk', 'KL', 69, '~25/26'], ["M'Baye Niang", 'FV', 70, '~25/26'],
    ['Stéphane Sessègnon', 'KN', 74, '~17/18'], ['Johannes Hopf', 'KL', 70, '~17/18'], ['Giovanni Sio', 'FV', 71, '~18/19']] },
  { id: 'kar', name: 'Fatih Karagümrük', short: 'FKG', c1: '#c8102e', c2: '#ffffff', players: [
    ['Emiliano Viviano', 'KL', 76, '~20/21'], ['Lucas Biglia', 'OS', 75, '~21/22'], ['Fabio Borini', 'FV', 75, '~21/22'], ['Emre Mor', 'KN', 74, '~21/22'],
    ['Andrea Bertolacci', 'OS', 73, '~21/22'], ['Jimmy Durmaz', 'KN', 72, '~20/21'], ['Davide Biraschi', 'ST', 72, '~22/23'], ['Kerem Atakan Kesgin', 'OS', 70, '~20/21'],
    ['Caner Erkin', 'BK', 72, '~20/21'], ['Levent Mercan', 'BK', 70, '~21/22'], ['Mustafa Eskihellaç', 'BK', 69, '~22/23'], ['Ervin Zukanović', 'ST', 71, '~20/21'],
    ['Ricardo Quaresma', 'KN', 74, '~20/21']] }
];

const DRAFT_COACHES = [
  { name: 'Okan Buruk', att: 3, def: 1, note: 'Pres ve tempo' },
  { name: 'Şenol Güneş', att: 1, def: 3, note: 'Sağlam savunma' },
  { name: 'Fatih Terim', att: 3, def: 0, note: 'Hücum ve moral' },
  { name: 'Abdullah Avcı', att: 2, def: 2, note: 'Dengeli oyun' },
  { name: 'Fatih Tekke', att: 2, def: 1, note: 'Bordo-mavi ruh' },
  { name: 'Sergen Yalçın', att: 3, def: -1, note: 'Yaratıcılık' }
];

/* rakip gücü: kulübün en iyi 11'inin ortalaması (son 10 yılın karması) */
const DRAFT_OFF = -3;
const DRAFT_LEAGUE = DRAFT_CLUBS.map(c => { const OFF = DRAFT_OFF;
  const top = c.players.map(p => p[2]).sort((a, b) => b - a).slice(0, 11);
  return [c.name, Math.round((top.reduce((s, v) => s + v, 0) / top.length + OFF) * 10) / 10, c.id];
});

/* 4-3-3: 11 as + 2 yedek */
const DRAFT_SLOTS = [
  { id: 'FV', pos: 'FV', x: 50, y: 12 }, { id: 'KN1', pos: 'KN', x: 16, y: 20 }, { id: 'KN2', pos: 'KN', x: 84, y: 20 },
  { id: 'OS1', pos: 'OS', x: 26, y: 44 }, { id: 'OS2', pos: 'OS', x: 50, y: 50 }, { id: 'OS3', pos: 'OS', x: 74, y: 44 },
  { id: 'BK1', pos: 'BK', x: 12, y: 70 }, { id: 'ST1', pos: 'ST', x: 36, y: 74 }, { id: 'ST2', pos: 'ST', x: 64, y: 74 }, { id: 'BK2', pos: 'BK', x: 88, y: 70 },
  { id: 'KL', pos: 'KL', x: 50, y: 91 }
];
const DRAFT_POS_NAMES = { KL: 'Kaleci', ST: 'Stoper', BK: 'Bek', OS: 'Orta Saha', KN: 'Kanat', FV: 'Forvet' };

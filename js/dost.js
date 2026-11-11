"use strict";
/* =====================================================================
   DOST — dinleyen sohbet arkadaşı
   Danışmanlık mikro-becerileri (aktif dinleme, duygu yansıtma, açık uçlu
   soru, onaylama, özetleme — OARS), BDT araçları (düşünce kaydı, bilişsel
   çarpıtmalar, Sokratik soru, nefes ve topraklanma) ve kriz güvenliği.
   Dost bir psikolog DEĞİLDİR; tanı koymaz, ilaç önermez.
   Sohbet yalnızca bu cihazda saklanır. İsteğe bağlı "gelişmiş mod" için
   kullanıcının kendi Claude API anahtarı yalnızca localStorage'da tutulur.
   ===================================================================== */
const Dost = (() => {
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const low = s => s.toLocaleLowerCase('tr-TR');
  const has = (t, list) => list.some(w => t.includes(w));

  /* ---------------- bilgi tabanı ---------------- */
  const CRISIS = ['intihar', 'kendimi öldür', 'kendimi öldürmek', 'canıma kıy', 'ölmek istiyorum', 'ölsem', 'ölmeyi düşün', 'yaşamak istemiyorum', 'yaşamanın anlamı yok', 'hayatıma son', 'kendime zarar', 'kendimi kes', 'bileklerimi', 'kendimi asmak', 'kendimi atmak', 'uyanmasam', 'herkes bensiz daha iyi', 'artık dayanamıyorum yaşamak', 'son vermek istiyorum'];
  const VIOLENCE = ['beni dövüyor', 'bana vuruyor', 'şiddet görüyorum', 'şiddet uyguluyor', 'tehdit ediyor', 'beni öldürecek', 'darp', 'istismar'];
  const HARM_OTHERS = ['onu öldüreceğim', 'öldüreceğim onu', 'birine zarar vereceğim', 'zarar vermek istiyorum ona'];

  // duygu sözlüğü: anahtar kelimeler → etiket ve yansıtma cümleleri
  const EMO = {
    uzgun: { k: ['üzgün', 'üzülüyorum', 'üzüldüm', 'mutsuz', 'ağlıyorum', 'ağladım', 'ağlamak', 'kederli', 'moralim bozuk', 'canım sıkkın', 'depresif', 'çökkün', 'hüzün'], ad: 'üzüntü',
      r: ['Sesinde ciddi bir üzüntü duyuyorum.', 'İçinin ağır olduğunu hissediyorum.', 'Bu seni gerçekten üzmüş gibi görünüyor.'] },
    kaygi: { k: ['kaygı', 'kaygılı', 'endişe', 'endişeli', 'gergin', 'tedirgin', 'huzursuz', 'korkuyorum', 'korku', 'panik', 'kalbim çarp', 'nefes alamı', 'ya olursa', 'ya kötü'], ad: 'kaygı',
      r: ['Zihnin seni tetikte tutuyor gibi; bu çok yorucu olabilir.', 'Kaygının bedeninde ve zihninde yer kapladığını duyuyorum.', 'Bir şeylerin kötü gideceği hissi seni rahat bırakmıyor gibi.'] },
    ofke: { k: ['sinir', 'sinirli', 'öfke', 'öfkeli', 'kızgın', 'kızıyorum', 'deliriyorum', 'çıldır', 'nefret', 'tahammül edemiyorum', 'bıktım'], ad: 'öfke',
      r: ['Öfkelenmen çok anlaşılır; bir şey sana haksızlık gibi gelmiş.', 'Bu durum seni epey kızdırmış gibi.', 'İçinde biriken bir öfke var gibi duyuluyor.'] },
    yalniz: { k: ['yalnız', 'kimsem yok', 'kimse anlamıyor', 'anlaşılmıyorum', 'dışlanmış', 'tek başıma', 'yapayalnız'], ad: 'yalnızlık',
      r: ['Yalnız hissetmek insanı derinden yorar.', 'Anlaşılmadığını hissetmek çok zor bir duygu.', 'Kendini bir başına hissettiğini duyuyorum.'] },
    sucluluk: { k: ['suçlu', 'pişman', 'benim yüzümden', 'hata yaptım', 'utanıyorum', 'utanç', 'rezil', 'mahcup'], ad: 'suçluluk ve utanç',
      r: ['Kendine karşı oldukça sert davranıyor olabilirsin.', 'Suçluluk ve pişmanlık ağır bir yük gibi duyuluyor.', 'Bu konuda kendini çok sorumlu tutuyorsun gibi.'] },
    yorgun: { k: ['yorgun', 'tükendim', 'tükenmiş', 'bitkin', 'enerjim yok', 'halim yok', 'hiçbir şey yapmak istemiyorum', 'motivasyon', 'isteksiz'], ad: 'tükenmişlik',
      r: ['Uzun süredir çok şey taşıyormuşsun gibi geliyor.', 'Bu yorgunluk sadece bedensel değil gibi; içten bir tükenmişlik var.', 'Enerjinin çekildiğini duyuyorum.'] },
    stres: { k: ['stres', 'stresli', 'baskı', 'yetişemiyorum', 'bunaldım', 'boğuluyorum', 'kafam karışık', 'karmaşa'], ad: 'stres',
      r: ['Üzerinde çok fazla baskı var gibi.', 'Bunalmış hissettiğini duyuyorum; her şey aynı anda üstüne geliyor gibi.', 'Kafanın çok dolu olduğu belli.'] },
    umutsuz: { k: ['umutsuz', 'çaresiz', 'hiçbir şey düzelmeyecek', 'anlamı yok', 'boşuna', 'işe yaramaz', 'değersiz', 'bir işe yaramıyorum'], ad: 'umutsuzluk',
      r: ['Şu an önünü göremiyormuşsun gibi hissettiğini duyuyorum.', 'Çaresizlik duygusu çok ağır bir duygu.', 'Her şeyin anlamsız göründüğü bir yerdesin gibi.'] },
    kiskanc: { k: ['kıskan', 'güvenemiyorum', 'şüphe', 'aldatıyor', 'aldattı', 'aldatıldım'], ad: 'güvensizlik',
      r: ['Güvenin sarsıldığı yerde insan kendini çok savunmasız hisseder.', 'Bu belirsizlik seni içten içe kemiriyor gibi.'] },
    iyi: { k: ['iyiyim', 'mutluyum', 'harika', 'güzel geçti', 'rahatladım', 'sevindim', 'keyifliyim', 'daha iyi'], ad: 'iyi hissetme',
      r: ['Bunu duymak güzel.', 'Sesinde bir hafiflik var, sevindim.'] }
  };

  // konu sözlüğü: normalleştirme + konuya özgü açık uçlu sorular
  const TOPIC = {
    iliski: { k: ['eşim', 'karım', 'kocam', 'evlilik', 'ilişki', 'sevgilim', 'partnerim', 'ayrılık', 'ayrıldık', 'boşan', 'kavga ediyoruz', 'tartışıyoruz', 'nicole'], ad: 'ilişkin',
      n: ['İlişkilerde tartışmalar çoğu zaman tek bir konudan değil, birikmiş ve konuşulamamış ihtiyaçlardan çıkar.', 'Çiftlerin yaşadığı sorunlar genellikle "kim haklı" sorusundan çok, iki tarafın da duyulmamış hissetmesiyle ilgilidir.'],
      q: ['Bu tartışmalarda sen en çok neyin duyulmasını istiyorsun?', 'Aranızdaki durum en son ne zaman daha iyiydi, o zaman farklı olan neydi?', 'O böyle davrandığında içinden ne geçiyor, sonra ne yapıyorsun?', 'Eşinin bu durumu nasıl gördüğünü tahmin ediyorsun?'] },
    aile: { k: ['annem', 'babam', 'ailem', 'kardeşim', 'ablam', 'abim', 'kayınvalide', 'kayınpeder', 'akraba'], ad: 'ailenle ilgili yaşadıkların',
      n: ['Aile ilişkileri en yakın oldukları için en çok yaralayabilen ilişkilerdir de.', 'Ailemizden beklediklerimizle gördüklerimiz arasındaki fark çoğu zaman en derin kırgınlıkları doğurur.'],
      q: ['Bu ilişkide senin için en çok acıtan kısım ne?', 'Onlardan aslında neye ihtiyaç duyuyorsun?', 'Bu durum seni ne zamandır etkiliyor?'] },
    cocuk: { k: ['kızım', 'oğlum', 'çocuğum', 'çocuklarım', 'lale', 'ela', 'ebeveyn', 'babalık', 'annelik'], ad: 'çocuklarınla ilgili düşüncelerin',
      n: ['Ebeveynlik, insanın hem en çok sevdiği hem de en çok kendini sorguladığı rollerden biri.', 'Çocuklar konusunda endişelenmek, onları ne kadar önemsediğinin bir göstergesi.'],
      q: ['Bir baba olarak seni en çok zorlayan şey ne oluyor?', 'Çocuklarınla geçirdiğin anlarda kendini en iyi ne zaman hissediyorsun?', 'Bu konuda kendinden ne bekliyorsun; bu beklenti gerçekçi mi?'] },
    is: { k: ['işim', 'iş yerinde', 'patron', 'müdür', 'çalışma', 'mesai', 'işsiz', 'kovul', 'terfi', 'iş arkadaş', 'proje', 'toplantı'], ad: 'işindeki durum',
      n: ['İş stresi, uzun süre devam ettiğinde uykudan ilişkilere kadar her şeye sızabilir.', 'Kontrolümüzün az olduğu iş durumları özellikle yıpratıcıdır.'],
      q: ['İşte seni en çok yoran tam olarak ne?', 'Bu durumda kontrol edebildiğin ve edemediğin şeyler neler?', 'İş bittiğinde zihnin işten kopabiliyor mu, yoksa eve de geliyor mu?'] },
    para: { k: ['para', 'borç', 'kredi', 'maaş', 'geçim', 'kira', 'fatura', 'masraf'], ad: 'maddi kaygıların',
      n: ['Maddi belirsizlik, insanın güvenlik duygusunu doğrudan sarsar; kaygılanman çok doğal.'],
      q: ['Bu konuda seni en çok korkutan senaryo ne?', 'Şu an atabileceğin en küçük somut adım ne olabilir?'] },
    yas: { r: ['Başın sağ olsun. Bir kaybın ardından insanın içinde kocaman bir boşluk kalır.', 'Çok değerli birini kaybetmişsin; bunu yaşamak gerçekten çok ağır.'], k: ['vefat', 'kaybettim', 'öldü', 'cenaze', 'yas', 'özlüyorum', 'rahmetli', 'aramızdan ayrıldı'], ad: 'yaşadığın kayıp',
      n: ['Yasın doğru bir yolu ya da süresi yoktur; dalgalar halinde gelip gidebilir.', 'Kaybın ardından öfke, suçluluk, hatta zaman zaman rahatlama hissetmek bile yasın doğal parçaları olabilir.'],
      q: ['Onunla ilgili aklına en çok gelen anı ne?', 'Kaybından sonra seni en çok zorlayan anlar hangileri?', 'Bu süreçte yanında kimler var?'] },
    uyku: { k: ['uyuyamıyorum', 'uykusuz', 'uyku', 'uykum', 'gece uyan', 'kabus'], ad: 'uyku düzenin',
      n: ['Uykusuzluk ile kaygı birbirini besleyen bir döngü oluşturabilir: uyuyamadıkça kaygı artar, kaygı arttıkça uyumak zorlaşır.'],
      q: ['Yatağa girdiğinde zihninden en çok neler geçiyor?', 'Uyku sorunun ne zamandır var, öncesinde değişen bir şey oldu mu?'],
      tip: 'Uyku için küçük ama etkili adımlar: her gün aynı saatte kalkmak, yatmadan 1 saat önce ekranı bırakmak, 20 dakikada uyuyamazsan kalkıp loş ışıkta sakin bir şey yapıp uykun gelince dönmek, öğleden sonra kafeini azaltmak.' },
    saglik: { k: ['hastalık', 'hastayım', 'ağrı', 'doktor', 'teşhis', 'ameliyat', 'sağlığım'], ad: 'sağlığınla ilgili endişelerin',
      n: ['Sağlıkla ilgili belirsizlik insanı çok çaresiz hissettirebilir.'],
      q: ['Bu süreçte seni en çok ne endişelendiriyor?', 'Doktorunla bu endişelerini konuşabildin mi?'] },
    futbol: { k: ['trabzonspor', 'maç', 'futbol', 'kaybettik', 'yenildik', 'şampiyon'], ad: 'takımın',
      n: ['Bir takıma bağlılık sadece oyun değil, aidiyet ve kimlik de demek; bu yüzden sonuçlar duygularımızı bu kadar etkiler.'],
      q: ['Takımın senin için ne ifade ediyor?', 'Maç sonuçları ruh halini ne kadar etkiliyor sence?'] },
    sosyal: { k: ['arkadaş', 'çevrem', 'insanlar', 'toplum', 'utangaç', 'sosyal'], ad: 'insan ilişkilerin',
      n: ['Başkalarının bizi nasıl gördüğü kaygısı çok yaygındır; çoğu zaman insanlar bizi sandığımızdan çok daha az yargılar.'],
      q: ['Bu ortamlarda zihninden geçen en olumsuz düşünce ne oluyor?', 'Kendini en rahat hissettiğin insanlar kimler?'] },
    gurbet: { k: ['iskoçya', 'yurt dışı', 'gurbet', 'memleket', 'türkiye\'yi özlü', 'taşındık', 'yabancı'], ad: 'gurbetteki hayatın',
      n: ['Başka bir ülkede yaşamak, alışılmış destek ağından uzak kalmak demek; bu da yalnızlığı ve özlemi büyütebilir.'],
      q: ['En çok neyi ya da kimi özlüyorsun?', 'Burada seni iyi hissettiren şeyler neler?'] }
  };

  // bilişsel çarpıtma ipuçları → nazik Sokratik sorular
  const DIST = [
    { k: ['hep ', 'her zaman', 'asla', 'hiçbir zaman', 'hiç kimse', 'herkes'], ad: 'aşırı genelleme', q: ['"Hep" ya da "asla" dediğinde bunun istisnası olan bir an hatırlıyor musun?', 'Bu her seferinde mi oluyor, yoksa zor anlarda öyle mi görünüyor?'] },
    { k: ['berbat', 'felaket', 'mahvoldum', 'mahvoldu', 'bitti her şey', 'dünyanın sonu'], ad: 'felaketleştirme', q: ['En kötü senaryo gerçekleşse bile onunla nasıl başa çıkardın?', 'En kötü, en iyi ve en olası senaryoları ayrı ayrı düşünsek, en olası olan hangisi?'] },
    { k: ['zorundayım', 'yapmalıyım', 'olmalıyım', 'etmeliyim', 'gerekirdi', 'meliydim', 'malıydım'], ad: '"-meli/-malı" düşünceleri', q: ['Bu "-malıyım" kuralı nereden geliyor; kim koydu bu kuralı?', 'Aynı durumda bir arkadaşına da "yapmalıydın" der miydin?'] },
    { k: ['aptalım', 'beceriksizim', 'başarısızım', 'ezik', 'işe yaramazım', 'kötü bir baba', 'kötü bir insan'], ad: 'etiketleme', q: ['Tek bir olay ya da hata seni tümüyle tanımlar mı?', 'Seni iyi tanıyan biri bu cümleye ne derdi?'] },
    { k: ['benden nefret', 'beni sevmiyor', 'kesin kızgın', 'eminim düşünüyor', 'beni aptal sanıyor'], ad: 'zihin okuma', q: ['Onun böyle düşündüğüne dair elindeki kanıt ne, karşı kanıt ne?', 'Bunu ona sorma şansın olsaydı ne derdi sence?'] }
  ];

  const OPEN_Q = ['Biraz daha anlatır mısın?', 'Bu sende en çok neyi tetikliyor?', 'Bunu yaşarken bedeninde neler hissediyorsun?', 'Böyle hissetmeye ne zaman başladın?', 'Bu durumda senin için en önemli olan ne?', 'Şu an bu konuşmadan ne almak istersin?', 'Daha önce benzer bir şeyle karşılaştığında sana ne iyi gelmişti?', 'Her şey biraz daha iyi olsaydı, bunu nereden anlardın?'];
  const ENCOURAGE = ['Anlıyorum.', 'Seni dinliyorum.', 'Buradayım.', 'Evet…'];
  const AFFIRM = ['Bunları paylaşman cesaret ister.', 'Bu kadar şeyin ortasında hâlâ çözüm araman çok değerli.', 'Durumu fark edip üzerine düşünmen önemli bir adım.', 'Duygularını bu kadar açık ifade edebilmen bir güç.'];

  const TOOLS = {
    nefes: `Birlikte <b>kutu nefesi</b> yapalım (yaklaşık 1 dakika):<br>1. 4 saniye burnundan nefes al<br>2. 4 saniye tut<br>3. 4 saniye ağzından yavaşça ver<br>4. 4 saniye bekle<br>Bunu 4–5 tur tekrarla. Nefesi verirken omuzlarını bırakmayı dene. Aşağıdaki <b>Nefes</b> düğmesiyle ekranda birlikte de yapabiliriz.<br><br>Bitince nasıl hissettiğini 0–10 arası bir sayıyla söyler misin?`,
    topraklanma: `<b>5-4-3-2-1 topraklanma</b> zihni şu ana getirir:<br>• Etrafında <b>gördüğün 5</b> şey<br>• <b>Dokunabildiğin 4</b> şey<br>• <b>Duyduğun 3</b> ses<br>• <b>Kokusunu aldığın 2</b> şey<br>• <b>Tadını aldığın 1</b> şey<br>Acele etmeden, her birini aklından ya da yazarak say. İstersen buraya da yazabilirsin.`,
    kayit: null // düşünce kaydı akışı aşağıda
  };
  const THOUGHT_FLOW = [
    ['olay', 'Düşünce kaydı yapalım; 5 kısa adım. <b>1/5 — Durum:</b> Ne oldu? Nerede, kiminle, ne zaman? Kısaca yaz.'],
    ['duygu', '<b>2/5 — Duygu:</b> O an ne hissettin? Duyguya bir isim ver ve şiddetini 0–100 arası puanla (ör. "kaygı 80").'],
    ['dusunce', '<b>3/5 — Otomatik düşünce:</b> O anda aklından geçen cümle neydi? Kafandaki sesi olduğu gibi yaz.'],
    ['kanit', '<b>4/5 — Kanıtlar:</b> Bu düşünceyi destekleyen ve <i>desteklemeyen</i> kanıtlar neler? Bir arkadaşın aynı şeyi yaşasa ona ne derdin?'],
    ['alternatif', '<b>5/5 — Alternatif düşünce:</b> Tüm kanıtları düşününce, daha dengeli bir cümle nasıl olurdu?']
  ];

  /* ---------------- durum ---------------- */
  let S = null, el = null, busy = false;
  const fresh = () => ({ msgs: [], turn: 0, emos: {}, topics: {}, used: {}, flow: null, crisis: false, name: null, mood0: null });
  const save = () => ls.set('dost_chat', Object.assign({}, S, { msgs: S.msgs.slice(-80) }));

  function useOnce(key, arr) { // tekrar etmeyen seçim
    const u = S.used[key] || []; let opts = arr.filter((_, i) => !u.includes(i)); if (!opts.length) { S.used[key] = []; opts = arr; }
    const v = pick(opts); S.used[key] = [...(S.used[key] || []), arr.indexOf(v)]; return v;
  }

  /* ---------------- yanıt motoru ---------------- */
  function crisisReply() {
    S.crisis = true;
    return `Bunu benimle paylaştığın için teşekkür ederim. Şu an çok büyük bir acı yaşıyorsun ve bu yükü tek başına taşımak zorunda değilsin.<br><br>
      <b>Kendine zarar verme tehlikesi şu an varsa lütfen hemen 112'yi ara</b> ya da en yakın acil servise git. Güvendiğin birini (eşini, bir arkadaşını) şimdi arayıp yanına çağırmak da çok önemli.<br><br>
      Ben bir yapay sohbet arkadaşıyım; böyle anlarda gerçek bir insanın, bir uzmanın desteği gerekir. Bir psikiyatrist ya da psikologla görüşmen için de sana destek olmak isterim.<br><br>
      Şu an güvende misin? Yanında biri var mı?`;
  }
  function violenceReply() {
    return `Anlattıkların ciddi ve güvenliğin her şeyden önce gelir. <b>Acil bir tehlike varsa 112'yi ara.</b> Şiddet ve tehdit durumlarında <b>ALO 183</b> (Aile ve Sosyal Hizmetler danışma hattı) da destek verir.<br><br>Şu an güvende misin? Güvenli bir yere gidebileceğin ya da arayabileceğin biri var mı?`;
  }
  function harmOthersReply() {
    return `Şu an çok yoğun bir öfke yaşadığını duyuyorum. Bu öfkeyi anlamaya çalışabiliriz ama kimsenin zarar görmemesi en önemlisi. Ortamdan bir süreliğine uzaklaşmak, birkaç dakika yürümek ya da yavaş nefes almak yoğunluğu düşürebilir. Kontrolünü kaybedeceğini hissediyorsan lütfen <b>112</b>'yi ara ya da güvendiğin birinden hemen destek iste.<br><br>Seni bu kadar öfkelendiren ne oldu?`;
  }

  function detect(t) {
    const emos = ['umutsuz', ...Object.keys(EMO).filter(k => k !== 'umutsuz')].filter(k => has(t, EMO[k].k));
    const order = ['yas', 'cocuk', 'iliski', 'saglik', 'is', 'para', 'uyku', 'aile', 'gurbet', 'sosyal', 'futbol'];
    const topics = order.filter(k => has(t, TOPIC[k].k));
    const dist = DIST.find(d => has(t + ' ', d.k));
    return { emos, topics, dist };
  }

  function summary() {
    const e = Object.entries(S.emos).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => EMO[k].ad);
    const tp = Object.entries(S.topics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => TOPIC[k].ad);
    if (!e.length && !tp.length) return null;
    let s = 'Bir durup toparlayayım, eksik ya da yanlış anladığım varsa düzelt: ';
    if (tp.length) s += `Bugün en çok ${tp.join(' ve ')} üzerine konuştuk. `;
    if (e.length) s += `Bunların içinde en çok ${e.join(' ve ')} öne çıkıyor gibi. `;
    return s + 'Doğru anlamış mıyım? Bunlardan hangisine biraz daha odaklanmak istersin?';
  }

  function local(text) {
    const t = low(text.trim()), words = t.split(/\s+/).filter(Boolean);
    S.turn++;

    // 1) güvenlik her şeyden önce
    if (has(t, CRISIS)) return crisisReply();
    if (has(t, HARM_OTHERS)) return harmOthersReply();
    if (has(t, VIOLENCE)) return violenceReply();
    if (S.crisis && has(t, ['evet', 'güvendeyim', 'iyiyim', 'yanımda'])) { S.crisis = false; return 'Güvende olduğunu duymak beni rahatlattı. Yine de bu duygular geri gelirse 112 her zaman bir telefon uzağında, lütfen bunu unutma. Bu düşünceler ne zamandır aklında? İstersen bunları birlikte konuşalım, bir uzmana ulaşmak için de adım atabiliriz.'; }
    if (S.crisis && has(t, ['hayır', 'değilim', 'yalnızım', 'kimse yok'])) return 'Şu an yalnız ve güvende değilsen lütfen <b>112</b>\'yi ara; seni dinleyecek ve yardım edecek insanlar var. Telefonu açıp aramak zor geliyorsa sadece "yardıma ihtiyacım var" demen yeterli. Arayabileceğin bir yakının var mı?';

    // 2) devam eden düşünce kaydı akışı
    if (S.flow) {
      S.flow.data[THOUGHT_FLOW[S.flow.step][0]] = text.trim(); S.flow.step++;
      if (S.flow.step < THOUGHT_FLOW.length) return THOUGHT_FLOW[S.flow.step][1];
      const d = S.flow.data; S.flow = null;
      return `Harika iş çıkardın. Kaydın:<br><div class="dost-rec"><b>Durum:</b> ${esc(d.olay)}<br><b>Duygu:</b> ${esc(d.duygu)}<br><b>Otomatik düşünce:</b> ${esc(d.dusunce)}<br><b>Kanıtlar:</b> ${esc(d.kanit)}<br><b>Dengeli düşünce:</b> ${esc(d.alternatif)}</div><br>Şimdi dengeli düşünceyi okuyunca ilk yazdığın duygunun şiddeti 0–100 arası kaç olur? Küçük bir düşüş bile önemli bir değişimdir.`;
    }

    // 3) niyetler
    const adim = t.match(/(?:adım|ismim)\s+([a-zçğıöşü]+)/i); if (adim) { S.name = adim[1][0].toLocaleUpperCase('tr-TR') + adim[1].slice(1); return `Memnun oldum ${S.name}. Bugün seni buraya getiren ne?`; }
    if (has(t, ['psikolog musun', 'insan mısın', 'sen kimsin', 'robot musun', 'yapay zeka mısın', 'gerçek misin'])) return 'Ben <b>Dost</b>; bir yapay sohbet arkadaşıyım, psikolog değilim. Psikologların kullandığı dinleme ve düşünce çalışma tekniklerinden ilham alarak seni dinlemeye, düşüncelerini toparlamana yardım etmeye çalışırım. Tanı koymam, ilaç önermem; ihtiyaç olduğunda bir uzmana yönlendiririm. Şu an aklında ne var?';
    if (has(t, ['nefes', 'sakinleş', 'rahatla', 'panik atak'])) return TOOLS.nefes;
    if (has(t, ['topraklan', '5-4-3', 'şimdiye dön', 'kopuk hissed'])) return TOOLS.topraklanma;
    if (has(t, ['düşünce kaydı', 'düşüncelerimi incele', 'düşünce çalış'])) { S.flow = { step: 0, data: {} }; return THOUGHT_FLOW[0][1]; }
    if (/^(merhaba|selam|sa|selamün aleyküm|günaydın|iyi akşamlar|hey|naber)\b/.test(t) && words.length <= 4) return pick(['Merhaba, hoş geldin. Bugün nasılsın, aklında neler var?', `Merhaba${S.name ? ' ' + S.name : ''}. Seni dinliyorum; bugün neyi konuşmak istersin?`]);
    if (has(t, ['teşekkür', 'sağ ol', 'eyvallah', 'iyi geldi'])) return pick(['Ben teşekkür ederim, paylaştığın için. Bugün konuştuklarımızdan yanında götürmek istediğin bir şey var mı?', 'Rica ederim. Kendine bu zamanı ayırman çok değerli. Başka konuşmak istediğin bir şey var mı?']);
    if (/^(görüşürüz|hoşça kal|bay|iyi geceler|kapatıyorum)/.test(t)) return 'Görüşmek üzere. Kendine iyi bak; ne zaman istersen buradayım. Zorlandığın bir an olursa yakınlarından ve gerekirse bir uzmandan destek istemekten çekinme.';
    if (has(t, ['ne yapmalıyım', 'ne yapayım', 'ne yapsam', 'bana tavsiye', 'öneri ver', 'ne önerirsin'])) return `Bu konuda sana hazır bir reçete vermek yerine birlikte düşünmek isterim, çünkü seni ve hayatını en iyi sen biliyorsun. ${pick(['Şimdiye kadar neler denedin, hangisi az da olsa işe yaradı?', 'Elinde olan seçenekleri sıralasak, her birinin artısı ve eksisi ne olurdu?', 'Bir arkadaşın aynı durumda olsa ona ne önerirdin?'])}`;

    // 4) kısa ya da belirsiz yanıtlar
    const det = detect(t);
    det.emos.forEach(k => S.emos[k] = (S.emos[k] || 0) + 1);
    det.topics.forEach(k => S.topics[k] = (S.topics[k] || 0) + 1);
    if (words.length <= 2 && !det.emos.length && !det.topics.length) {
      if (has(t, ['bilmiyorum', 'emin değilim', 'bilemiyorum'])) return 'Bilmemek de olabilir; bazen duygular bir isim koyamayacağımız kadar karışıktır. Sadece aklına ilk gelen kelime ne?';
      if (has(t, ['evet', 'aynen', 'doğru', 'kesinlikle'])) return `${pick(ENCOURAGE)} ${useOnce('oq', OPEN_Q)}`;
      if (has(t, ['hayır', 'yok', 'değil'])) return 'Peki, o zaman nasıl? Senin kelimelerinle duymak isterim.';
      return `${pick(ENCOURAGE)} ${useOnce('oq', OPEN_Q)}`;
    }

    // 5) belirli aralıklarla özet
    if (S.turn - (S.lastSum || 0) >= 6 && !det.emos.length && !det.topics.length && !det.dist) { const s = summary(); if (s) { S.lastSum = S.turn; return s; } }

    // 6) yansıtma + onaylama/normalleştirme + tek açık soru
    const parts = [];
    const e = det.emos[0], tp = det.topics[0];
    if (tp && TOPIC[tp].r) parts.push(useOnce('r_' + tp, TOPIC[tp].r));
    else if (e) parts.push(useOnce('e_' + e, EMO[e].r));
    else if (tp) parts.push(pick([`Anladığım kadarıyla ${TOPIC[tp].ad} şu an zihnini epey meşgul ediyor.`, `${TOPIC[tp].ad[0].toLocaleUpperCase('tr-TR') + TOPIC[tp].ad.slice(1)} seni zorluyor gibi.`]));
    else { const m = text.match(/çünkü\s+(.{6,80}?)([.!?]|$)/i); parts.push(m ? `Yani bunun altında "${esc(m[1].trim())}" duygusu yatıyor.` : pick(['Anlattıklarını dikkatle dinliyorum.', 'Bunu benimle paylaştığın için teşekkür ederim.', 'Seni anlamaya çalışıyorum.'])); }

    const mid = [];
    if (e === 'umutsuz') parts.push('Bazen bu duygular "hiç bitmeyecek" gibi gelir, ama duygular kalıcı değildir. Bu düşünceler zaman zaman kendine zarar verme fikrine dönüşüyor mu? Bunu sormam önemli, çünkü öyleyse yalnız kalmaman gerekir.');
    else if (tp === 'uyku' && !S.used.uykuTip) { S.used.uykuTip = [1]; mid.push(TOPIC.uyku.tip); }
    else if (e === 'kaygi' && !S.used.kaygiTool) { S.used.kaygiTool = [1]; mid.push('İstersen kaygı yükseldiğinde işe yarayan kısa bir nefes ya da topraklanma egzersizi yapabiliriz; "nefes" ya da "topraklanma" yazman yeterli.'); }
    else if (S.turn % 4 === 2 && e && e !== 'iyi') mid.push(useOnce('aff', AFFIRM));
    else if (tp && Math.random() < .75) mid.push(useOnce('n_' + tp, TOPIC[tp].n));
    else if (e && e !== 'iyi') mid.push(pick(['Böyle hissetmen çok anlaşılır.', 'Bu duyguyu yaşamakta yalnız değilsin; pek çok insan benzer anlardan geçiyor.', 'Bu tepkiler, zorlayıcı bir duruma verilen insani tepkiler.']));
    parts.push(...mid.slice(0, 1));

    if (e !== 'umutsuz') {
      if (det.dist && Math.random() < .8) parts.push(useOnce('d_' + det.dist.ad, det.dist.q));
      else if (tp) parts.push(useOnce('q_' + tp, TOPIC[tp].q));
      else parts.push(useOnce('oq', OPEN_Q));
    }
    return parts.join(' ');
  }

  /* ---------------- gelişmiş mod (isteğe bağlı, kullanıcının kendi anahtarı) ---------------- */
  const SYS = `Sen "Dost" adlı Türkçe konuşan, sıcak ve profesyonel bir dinleme arkadaşısın. Psikolog DEĞİLSİN; bunu sorulursa dürüstçe söyle. Bir psikoloğun danışma becerileriyle konuş:
- Önce duyguyu ve içeriği yansıt (aktif dinleme), onaylayıcı ve yargısız ol; sonra tek bir açık uçlu soru sor.
- Kısa yaz (2-5 cümle). Ders verme, nutuk atma, hemen çözüm sıralama; birlikte keşfet (Sokratik sorular, OARS: açık soru, onaylama, yansıtma, özetleme).
- Uygun olduğunda BDT araçlarını öner: düşünce kaydı, bilişsel çarpıtmaları nazikçe fark ettirme, kutu nefesi, 5-4-3-2-1 topraklanma, uyku hijyeni.
- Tanı koyma, ilaç önerme. Belirtiler ağır ya da uzun süreliyse bir psikolog/psikiyatriste yönlendir.
- İntihar, kendine ya da başkasına zarar, şiddet belirtisinde: sakin ve şefkatli ol, güvenliğini sor, Türkiye'de 112 acil hattını ve güvendiği birine ulaşmayı öner; şiddette ALO 183. Asla yöntem bilgisi verme.
- Kullanıcı Oğuzhan, iki kız babası (Lale ve Ela), eşi Nicole; bunu yalnızca kendisi açarsa kullan.`;
  async function remote() {
    const key = ls.get('dost_key', ''); if (!key) return null;
    const msgs = S.msgs.slice(-20).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.raw || m.t.replace(/<[^>]+>/g, '') }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: ls.get('dost_model', 'claude-sonnet-5-5'), max_tokens: 500, system: SYS, messages: msgs }) });
    if (!r.ok) throw new Error('API ' + r.status);
    const j = await r.json(); return esc((j.content || []).map(c => c.text || '').join('').trim()).replace(/\n/g, '<br>');
  }

  /* ---------------- arayüz ---------------- */
  function open(root) {
    el = root; S = ls.get('dost_chat', null) || fresh(); busy = false;
    el.innerHTML = `<section class="dost">
      <div class="dost-head"><div><p class="eyebrow">Sohbet · yalnızca bu cihazda</p><h1 class="display sm">Dost<em>.</em></h1><p class="muted">Seni yargılamadan dinleyen bir sohbet arkadaşı.</p></div>
        <div class="dost-tools"><button class="chip" data-a="breath">🫁 Nefes</button><button class="chip" data-a="rec">📝 Düşünce kaydı</button><button class="chip" data-a="set">⚙︎</button><button class="chip" data-a="clear">Sohbeti sil</button></div></div>
      <div class="dost-note">Dost bir psikolog değildir, tanı koymaz ve tedavinin yerini tutmaz. <b>Acil bir durumda 112'yi ara.</b></div>
      <div class="dost-log" aria-live="polite"></div>
      <div class="dost-quick"></div>
      <form class="dost-form"><textarea rows="1" placeholder="Aklından geçenleri yaz…" maxlength="1500"></textarea><button class="pill">Gönder</button></form>
    </section>`;
    const f = el.querySelector('.dost-form'), ta = f.querySelector('textarea');
    f.onsubmit = e => { e.preventDefault(); send(ta.value); ta.value = ''; ta.style.height = ''; };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } };
    ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    el.querySelector('[data-a=clear]').onclick = () => { if (confirm('Bu sohbet bu cihazdan silinsin mi?')) { S = fresh(); save(); draw(); greet(); } };
    el.querySelector('[data-a=breath]').onclick = breath;
    el.querySelector('[data-a=rec]').onclick = () => send('düşünce kaydı');
    el.querySelector('[data-a=set]').onclick = settings;
    draw(); if (!S.msgs.length) greet();
  }
  function greet() {
    bot(`Merhaba, ben <b>Dost</b>. Burada acele yok; ne hissediyorsan, nasıl anlatmak istiyorsan öyle yazabilirsin. Konuştuklarımız sadece bu cihazda kalır.<br><br>Başlamadan önce: Bugün kendini <b>0 ile 10</b> arasında nasıl hissediyorsun?`, true);
    quick(['0–3 · zor bir gün', '4–6 · idare eder', '7–10 · iyiyim'].map(x => [x, x]));
  }
  function quick(list) {
    const q = el.querySelector('.dost-quick');
    q.innerHTML = list.map(([t, v]) => `<button class="chip" data-v="${esc(v)}">${esc(t)}</button>`).join('');
    q.querySelectorAll('button').forEach(b => b.onclick = () => send(b.dataset.v));
  }
  const DEFAULT_QUICK = [['Kaygılıyım', 'Son zamanlarda çok kaygılıyım'], ['Uyuyamıyorum', 'Uyuyamıyorum, kafam çok dolu'], ['İlişkim', 'Eşimle aramızda sorunlar var'], ['İş stresi', 'İşim beni çok yoruyor, stresliyim'], ['Sadece konuşmak istiyorum', 'Sadece biraz konuşmak istiyorum']];
  function draw() {
    const log = el.querySelector('.dost-log');
    log.innerHTML = S.msgs.map(m => `<div class="msg ${m.me ? 'me' : 'bot'}"><div class="bub">${m.t}</div></div>`).join('');
    log.scrollTop = log.scrollHeight;
  }
  function bot(t, nosave) { S.msgs.push({ me: false, t }); save(); draw(); }
  async function send(raw) {
    const text = String(raw || '').trim(); if (!text || busy) return;
    S.msgs.push({ me: true, t: esc(text).replace(/\n/g, '<br>'), raw: text }); save(); draw();
    el.querySelector('.dost-quick').innerHTML = '';
    // ilk ruh hali
    if (S.mood0 === null) { const m = text.match(/\b(10|[0-9])\b/); if (m) { S.mood0 = +m[1]; } }
    busy = true; const log = el.querySelector('.dost-log');
    log.insertAdjacentHTML('beforeend', '<div class="msg bot typing"><div class="bub"><i></i><i></i><i></i></div></div>'); log.scrollTop = log.scrollHeight;
    let reply = null;
    const lt = low(text), safety = has(lt, CRISIS) || has(lt, VIOLENCE) || has(lt, HARM_OTHERS);
    if (S.msgs.filter(m => m.me).length === 1 && S.mood0 !== null && text.length < 30) reply = S.mood0 <= 3 ? 'Zor bir gün geçiriyorsun gibi; burada olman iyi. Bugün seni en çok ne zorladı?' : S.mood0 <= 6 ? 'İdare eder bir gün. Aklını en çok meşgul eden şey ne?' : 'Bunu duymak güzel. Yine de konuşmak istediğin bir şey varsa buradayım; bugün aklında ne var?';
    if (!reply && !safety && !S.flow) { try { reply = await remote(); } catch (e) { console.warn('Dost gelişmiş mod:', e.message); } }
    if (!reply) { await new Promise(r => setTimeout(r, 500 + Math.random() * 700)); reply = local(text); } else S.turn++;
    busy = false; const ty = log.querySelector('.typing'); if (ty) ty.remove();
    bot(reply);
    if (S.msgs.length <= 4 && !S.flow) quick(DEFAULT_QUICK);
  }
  function breath() {
    const ov = document.createElement('div'); ov.className = 'dost-breath';
    ov.innerHTML = `<div class="db-c"><div class="db-ring"></div><b class="db-t">Hazır ol</b><small class="db-n"></small><button class="pill ghost" data-x>Bitir</button></div>`;
    document.body.appendChild(ov);
    const st = [['Nefes al', 'in'], ['Tut', 'hold'], ['Ver', 'out'], ['Bekle', 'rest']]; let i = 0, cyc = 0, stopped = false;
    const ring = ov.querySelector('.db-ring'), tt = ov.querySelector('.db-t'), nn = ov.querySelector('.db-n');
    const step = () => { if (stopped) return; if (cyc >= 5) { tt.textContent = 'Güzel 🌿'; nn.textContent = '5 tur tamam'; return; } const [t, c] = st[i]; tt.textContent = t; ring.className = 'db-ring ' + c; let s = 4; nn.textContent = s; const iv = setInterval(() => { s--; if (s > 0) nn.textContent = s; else clearInterval(iv); }, 1000); i = (i + 1) % 4; if (!i) cyc++; setTimeout(step, 4000); };
    setTimeout(step, 600);
    ov.querySelector('[data-x]').onclick = () => { stopped = true; ov.remove(); bot('Nefes egzersizinden sonra kendini 0–10 arası nasıl hissediyorsun?'); };
  }
  function settings() {
    const cur = ls.get('dost_key', '');
    const v = prompt('İsteğe bağlı gelişmiş mod: kendi Claude API anahtarını yapıştırırsan Dost daha doğal yanıt verir.\nAnahtar YALNIZCA bu cihazda saklanır; mesajların Anthropic API\'sine gider.\nKapatmak için boş bırak.', cur ? '•••• kayıtlı (değiştirmek için yenisini yaz, silmek için boş bırak)' : '');
    if (v === null) return;
    if (!v.trim()) { ls.del('dost_key'); bot('Gelişmiş mod kapalı. Cihaz içi Dost ile devam ediyoruz.'); }
    else if (!v.startsWith('••••')) { ls.set('dost_key', v.trim()); bot('Gelişmiş mod açık. Güvenlik kontrolleri yine cihaz içinde yapılır.'); }
  }
  return { open, _reply: t => local(t), _reset: () => { S = fresh(); }, get state() { return S; } };
})();

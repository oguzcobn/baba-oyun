"use strict";
/* =====================================================================
   DOST — psikoloji okuma alanı (eski sohbet botunun yerine).
   Yazılar genel bilgi içindir; tanı koymaz, tedavinin yerini tutmaz.
   İçerik tamamen bu dosyada; dış servis, anahtar ya da ücret yok.
   Rotalar: #dost (ana sayfa) · #dost/<yazı> (yazı sayfası)
   ===================================================================== */
const Dost = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const CATS = { kaygi: 'Stres ve kaygı', zihin: 'Zihin alışkanlıkları', duygular: 'Duygular', beden: 'Uyku ve beden', ben: 'Kendinle ilişki', aile: 'İlişkiler ve aile', destek: 'Destek almak' };

  /* Yazı biçimi: boş satır = paragraf · "## " ara başlık · "- " madde · "! " bilgi kutusu · **kalın** */
  const A = [
    { s: 'kaygi', c: 'kaygi', m: 5, t: 'Kaygı neden gelir, ne işe yarar?', l: 'Kaygı bir arıza değil, aşırı çalışan bir alarm sistemi. Onu susturmaya çalışmak yerine ayarını yapmayı öğrenebiliriz.', q: 'Kaygı, geleceği şimdi yaşamaya çalışan bir zihnin yorgunluğudur.', b: `
Kaygı, beynin olası bir tehlikeye hazırlanma biçimidir. Kalp hızlanır, nefes sıklaşır, kaslar gerilir; beden kaçmaya ya da savaşmaya hazırlanır. Ormanda bir yırtıcıyla karşılaşan atalarımız için bu tepki hayat kurtarıcıydı. Bugün ise aynı alarm bir e-postada, bir faturada ya da “ya olursa” diye başlayan bir düşüncede çalabiliyor.

## Alarmın dili
Kaygı genellikle üç yerde birden konuşur:
- **Bedende:** çarpıntı, mide düğümü, omuzlarda gerginlik, uykuya dalamama.
- **Düşüncede:** “Ya kötü bir şey olursa?”, “Kesin yanlış yapacağım.”
- **Davranışta:** ertelemek, kaçınmak, sürekli kontrol etmek ya da onay aramak.

Bu üç katman birbirini besler. Kaçındıkça kısa vadede rahatlarız, ama beyin “demek ki gerçekten tehlikeliymiş” sonucunu çıkarır ve alarm bir dahaki sefere daha erken çalar.

## Ayar yapmanın yolları
- **Adını koy:** “Şu an kaygılanıyorum” demek, duyguyla aranıza küçük bir mesafe koyar.
- **Nefesi uzat:** Nefes verişi alıştan uzun tutmak (örneğin 4 saniye al, 6 saniye ver) bedenin sakinleşme sistemini devreye sokar. Bu sayfadaki nefes molasını deneyebilirsin.
- **Kaygı saati:** Endişeleri gün içinde bir kâğıda yaz, onlarla günde bir kez, belirli bir 15 dakikada ilgilen. Zihin “unutmayacağım” güvencesini alınca daha kolay bırakır.
- **Küçük adımlarla yaklaş:** Kaçındığın şeye tümden değil, katlanabilir parçalarla yaklaş. Her adım alarmın yeniden ayarlanmasına yardım eder.

! Kaygı haftalar boyunca günlük hayatını, işini, uykunu ya da ilişkilerini belirgin biçimde zorluyorsa ya da ani ve yoğun panik atakları yaşıyorsan bir uzmanla konuşmak iyi bir adımdır. Kaygı bozuklukları yaygındır ve tedaviye iyi yanıt verir.` },

    { s: 'zihin-tuzaklari', c: 'zihin', m: 6, t: 'Zihnin tuzakları: düşünce çarpıtmaları', l: 'Her düşünce bir gerçek değildir. Zihnin en sık kurduğu tuzakları tanımak, onlara takılmamanın ilk adımı.', q: 'Bir düşünceye sahip olmak, ona inanmak zorunda olmak demek değildir.', b: `
Bilişsel davranışçı terapinin (BDT) temel fikirlerinden biri şudur: Bizi üzen çoğu zaman olayın kendisi değil, olayı nasıl yorumladığımızdır. Zihin hızlı çalışmak için kısayollar kullanır; bu kısayollar bazen bizi yanlış sonuçlara götürür.

## Sık görülen tuzaklar
- **Ya hep ya hiç:** “Mükemmel olmadıysa başarısızdır.” Gri alanlar yok sayılır.
- **Felaketleştirme:** Küçük bir aksilikten en kötü senaryoya atlamak. “Toplantıda takıldım, kesin kovulacağım.”
- **Zihin okuma:** Başkalarının ne düşündüğünü bildiğini sanmak. “Kesin beni sıkıcı buldu.”
- **Aşırı genelleme:** Tek bir olaydan genel kural çıkarmak; “hep”, “hiç”, “asla” kelimeleri ipucudur.
- **Olumluyu yok saymak:** İyi giden şeyleri “şans eseri” diye geçiştirmek.
- **-meli, -malı cümleleri:** Kendine ve başkalarına katı kurallar koymak. “Asla yorulmamalıyım.”
- **Etiketleme:** Bir hatadan kimlik çıkarmak. “Bir hata yaptım” yerine “Ben bir aptalım.”

## Tuzağı fark edince
Düşünceyi bastırmaya çalışmak genellikle işe yaramaz. Onun yerine onu bir hipotez gibi incele:
- Bu düşüncenin lehine ve aleyhine kanıtlar neler?
- Aynı durumu yaşayan bir arkadaşıma ne derdim?
- Bir yıl sonra bu bana ne kadar önemli gelecek?
- Daha dengeli, daha gerçekçi bir cümle nasıl olurdu?

Amaç “olumlu düşünmek” değil, **doğru düşünmek**. “Her şey harika olacak” yerine “Zor bir gündü ama bir hatam her şeyi tanımlamaz” gibi dengeli bir cümle çok daha inandırıcıdır.

! Küçük bir alıştırma: Bu hafta seni üzen bir anı seç; ne oldu, aklından ne geçti, ne hissettin ve hangi tuzağa benziyor, dört satırda yaz. Birkaç kez tekrarlayınca tuzaklar kendini daha erken ele verir.` },

    { s: 'duygulara-isim', c: 'duygular', m: 4, t: 'Duygulara isim vermek', l: 'Hissettiğini kelimelere dökmek onu küçültmez, ama yönetilebilir kılar.', q: 'Adını koyduğun duygu seni yönetmeyi bırakır; sen onunla birlikte yürümeye başlarsın.', b: `
“Kötüyüm” çok geniş bir kelime. Kırgınlık, hayal kırıklığı, utanç, yalnızlık, yorgunluk ya da kaygı… Hepsi “kötü” hissettirir ama her biri farklı bir şeye ihtiyaç duyar. Araştırmalar, duyguyu sözcüklerle tarif etmenin (psikolojide “duygu etiketleme” denir) beynin alarm tepkisini hafifletebildiğini gösteriyor.

## Duygu kelime hazineni genişlet
Temel duyguların her birinin tonları vardır:
- **Öfke:** sinirli, kırgın, kıskanç, hayal kırıklığına uğramış, haksızlığa uğramış.
- **Üzüntü:** hüzünlü, yalnız, özlem dolu, çaresiz, boş.
- **Korku:** endişeli, gergin, güvensiz, tedirgin, panik içinde.
- **Sevinç:** rahatlamış, minnettar, gururlu, heyecanlı, huzurlu.
- **Utanç:** mahcup, yetersiz, açıkta kalmış.

## Üç adımlı mini yoklama
- **Bedende nerede?** Göğüste sıkışma, boğazda düğüm, yüzde sıcaklık…
- **Adı ne?** En yakın kelimeyi seç; emin olmasan da olur.
- **Neye ihtiyacı var?** Dinlenmek, konuşmak, sınır koymak, hareket etmek, yalnız kalmak…

Duygular iyi ya da kötü değildir; hepsi bir bilgi taşır. Öfke çoğu zaman bir sınırın aşıldığını, üzüntü değer verdiğimiz bir şeyi kaybettiğimizi, kaygı önemsediğimiz bir şeyin belirsiz olduğunu söyler.

! Çocuklarla da işe yarar: “Kızgın görünüyorsun, oyun bitti diye mi?” gibi bir cümle, çocuğun duygusunu tanımasına ve sakinleşmesine yardım eder.` },

    { s: 'tukenmislik', c: 'kaygi', m: 5, t: 'Tükenmişlik: sıradan yorgunluktan farkı', l: 'Bir hafta sonu dinlenince geçmeyen yorgunluk bir uyarı işareti olabilir.', q: 'Tükenmişlik bir karakter zayıflığı değil, uzun süre dengesiz kalmış bir yükün sonucudur.', b: `
Dünya Sağlık Örgütü tükenmişliği (burnout) bir hastalık olarak değil, iyi yönetilemeyen kronik iş stresinden kaynaklanan bir “mesleki olgu” olarak tanımlar. Üç belirgin yüzü vardır:
- **Bitkinlik:** Enerjinin sürekli düşük olması, sabah kalkmanın ağırlaşması.
- **Uzaklaşma:** İşe ve insanlara karşı soğukluk, alaycılık, “umurumda değil” hissi.
- **Etkisizlik hissi:** Ne yaparsan yap yetmiyormuş, işe yaramıyormuş duygusu.

Benzer bir tablo ev işleri, bakım verme ya da ebeveynlik gibi bitmeyen sorumluluklarda da görülebilir.

## Yorgunluk mu, tükenmişlik mi?
Sıradan yorgunluk dinlenince geçer. Tükenmişlikte ise tatil bile kısa süre iyi gelir; dönünce aynı ağırlık hızla geri gelir. Sevdiğin şeylerden keyif almakta da zorlanabilirsin.

## Ne yapılabilir?
- **Yükü görünür kıl:** Bir hafta boyunca seni yoran ve dolduran şeyleri iki sütunda yaz.
- **Sınır koy:** Mesai dışında bildirimleri kapatmak, “şu an yapamam” demek, öncelikleri birlikte konuşmak.
- **Küçük toparlanmalar:** Gün içinde kısa molalar, öğle arası kısa bir yürüyüş, işten sonra ekrandan uzak bir saat.
- **Temelleri koru:** Uyku, hareket ve düzenli yemek en dirençli insanın bile yakıtıdır.
- **Anlam bağlantısı:** İşin sana ne kattığını, kime dokunduğunu hatırlamak motivasyonu yeniler.

! Tükenmişlik ile depresyon birbirine karışabilir. Keyif kaybı işin dışına da taşıyorsa, uyku ve iştahın belirgin biçimde değiştiyse ya da umutsuzluk hissi baskınsa bir uzmana danış.` },

    { s: 'uyku', c: 'beden', m: 5, t: 'İyi uykunun basit kuralları', l: 'Uyku bir lüks değil, duyguları dengeleyen gece vardiyası. Birkaç küçük alışkanlık büyük fark yaratır.', q: 'Beden saatine ne kadar düzenli davranırsan, o da sana o kadar düzenli uyku verir.', b: `
Yetişkinlerin çoğunun her gece en az 7 saat uykuya ihtiyacı vardır. Uykusuzluk yalnızca yorgunluk yapmaz; sabrı kısaltır, kaygıyı büyütür, odaklanmayı zorlaştırır. İyi haber şu: Uyku büyük ölçüde alışkanlıklara yanıt verir.

## Gündüz yapılacaklar
- **Sabah ışığı:** Uyandıktan sonra birkaç dakika gün ışığı almak beden saatini ayarlar.
- **Hareket:** Düzenli fiziksel aktivite uykuyu derinleştirir; yatmadan hemen önceki yoğun egzersiz ise bazı kişilerde uykuyu zorlaştırabilir.
- **Kafein:** Etkisi saatlerce sürer. Öğleden sonra kahve ve çayı azaltmayı dene.
- **Kısa şekerleme:** Gerekirse 20–30 dakikayı ve öğleden sonranın ilk saatlerini geçmesin.

## Akşam yapılacaklar
- **Sabit saatler:** Hafta sonu dahil yaklaşık aynı saatte yatıp kalkmak en güçlü kuraldır.
- **Ekran molası:** Yatmadan 30–60 dakika önce telefonu bırak, ışığı kıs.
- **Zihni boşalt:** Yarın yapılacakları bir kâğıda yaz; zihin “unutmamalıyım” diye uyanık kalmaz.
- **Serin, karanlık, sessiz oda:** Yatak uyku içindir; işi, tartışmayı ve uzun ekran süresini dışarıda bırak.

## Uyuyamazsan
Yatakta 20 dakika kadar uyuyamadıysan kalk, loş ışıkta sakin bir şey yap (kitap, hafif esneme), uykun gelince geri dön. Saate bakmamak da kaygıyı azaltır.

! Haftalardır uykuya dalamıyor ya da sık uyanıyorsan, horlama ve nefes durmaları fark ediliyorsa ya da gündüz aşırı uykululuk işini etkiliyorsa bir hekime başvur; tedavi edilebilir nedenler olabilir.` },

    { s: 'oz-sefkat', c: 'ben', m: 4, t: 'Öz-şefkat: kendine bir arkadaş gibi davranmak', l: 'Kendimize, sevdiğimiz birine asla kurmayacağımız cümleleri kurarız. Bunu değiştirmek mümkün.', q: 'Kendine nazik olmak kendini bırakmak değil; yeniden denemek için güç toplamaktır.', b: `
Bir arkadaşın hata yaptığında ona “Ne kadar beceriksizsin” demezsin. Muhtemelen “Olur böyle şeyler, hadi bir bakalım” dersin. Öz-şefkat, aynı tavrı kendine göstermektir. Psikolog Kristin Neff öz-şefkati üç parçada tarif eder:
- **Kendine nezaket:** Zor anda kendini yargılamak yerine destekleyici bir ses kullanmak.
- **Ortak insanlık:** Hata yapmanın ve acı çekmenin herkesin hayatının parçası olduğunu hatırlamak; “bir tek ben değilim”.
- **Farkındalık:** Acıyı ne büyütmek ne de bastırmak; “şu an zorlanıyorum” diyebilmek.

## Ama bu tembellik olmaz mı?
Yaygın bir korku bu. Oysa araştırmalar, öz-şefkati yüksek kişilerin hatalarından ders çıkarmaya ve yeniden denemeye daha istekli olduğunu gösteriyor. Sert eleştiri çoğu zaman motive etmez, korkutur; korku da kaçınmayı artırır.

## Küçük pratikler
- **İç sesini fark et:** Kendine ne dediğini yakala. Bu cümleyi bir arkadaşına söyler miydin?
- **Şefkat molası:** Zor bir anda elini göğsüne koy ve sessizce söyle: “Bu zor bir an. Zorlanmak insanca. Kendime nazik olabilirim.”
- **Mektup:** Kendine, seni koşulsuz seven bir arkadaşın ağzından kısa bir mektup yaz.` },

    { s: 'ebeveynlik', c: 'aile', m: 5, t: 'Ebeveynlikte sakin kalmak', l: 'Mükemmel ebeveyn yok; yeterince iyi ve onarmayı bilen ebeveyn var.', q: 'Çocuklar sakinliği nasihatle değil, bizim sakinliğimizi izleyerek öğrenir.', b: `
Yorgun bir akşam, dökülen bir bardak, bitmeyen bir “hayır”… Ebeveynler için öfke ve sabırsızlık çok tanıdık duygulardır. Bunları hissetmek kötü bir ebeveyn olduğun anlamına gelmez; önemli olan o anlarda ne yaptığın ve sonrasında nasıl onardığındır.

## Anı yavaşlatmak
- **Önce kendini sakinleştir:** Birkaç derin nefes, bir bardak su ya da iki dakikalık bir mola. Sakin bir yetişkin, çocuğun sakinleşmesi için en güçlü araçtır.
- **Duyguyu adlandır, davranışa sınır koy:** “Çok kızgınsın, anlıyorum. Ama kardeşine vurmak yok.” Duygu kabul edilir, davranış yönlendirilir.
- **Az kelime, net mesaj:** Öfke anında uzun açıklamalar duyulmaz. Kısa, sakin ve tekrarlanabilir cümleler kullan.
- **Seçenek sun:** “Pijamanı mı önce giyersin, dişini mi önce fırçalarsın?” Kontrol hissi direnci azaltır.

## Onarmak
Herkes zaman zaman sesini yükseltir. Sonrasında “Az önce bağırdım, bu doğru değildi. Özür dilerim. Kızgındım ama seni çok seviyorum” demek, çocuğa hem duygularla nasıl baş edileceğini hem de ilişkinin güvende olduğunu öğretir.

## Kendi deponu doldur
Uyku, kısa bir yürüyüş, görevleri eşinle paylaşmak, bir arkadaşla konuşmak… Ebeveynin dinlenmesi bencillik değil, ailenin sabır stoğudur.

! Kendini sürekli tükenmiş, öfkeli ya da çaresiz hissediyorsan bir aile danışmanından ya da çocuk psikoloğundan destek almak hem aile hem çocuk için iyi bir yatırımdır.` },

    { s: 'ben-dili', c: 'aile', m: 4, t: 'Çatışmada konuşmak: “ben dili”', l: 'Kavga çoğu zaman konudan değil, konuşma biçiminden büyür.', q: 'Haklı çıkmak mı istiyorsun, anlaşılmak mı? İkisi her zaman aynı cümleyi gerektirmez.', b: `
“Sen hep geç kalıyorsun!” cümlesini duyan biri büyük olasılıkla savunmaya geçer. “Geç kaldığında merak edip endişeleniyorum, haber verirsen rahatlarım” cümlesi ise aynı konuyu konuşmaya kapı aralar. Fark, suçlayan “sen dili” ile kendi deneyimini anlatan “ben dili” arasındadır.

## Dört parçalı cümle
- **Olay:** Yargısız, gözlemlenebilir bir anlatım. “Dün akşam yemekte telefona baktığında…”
- **Duygu:** “…kendimi önemsenmemiş hissettim…”
- **İhtiyaç:** “…çünkü seninle vakit geçirmek benim için değerli.”
- **İstek:** “Yemekte telefonları kenara koyabilir miyiz?”

## Dinlemenin de bir dili var
- **Sözünü kesmeden dinle**, sonra duyduğunu kendi kelimelerinle özetle: “Yani yorgun geldiğin için sessiz kaldın, doğru mu anladım?”
- **“Ama” yerine “ve” kullan:** “Seni anlıyorum ve benim de ihtiyacım…”
- **Mola hakkı:** Sesler yükseldiyse “20 dakika ara verip sonra devam edelim” demek kaçmak değil, ilişkiyi korumaktır.
- **Tek konu:** Geçmişin bütün dosyalarını aynı akşam açma.

! İlişkide korku, tehdit ya da şiddet varsa bu bir iletişim sorunu değildir; önce güvenliğin gelir. Acil durumda 112’yi ara.` },

    { s: 'yalnizlik', c: 'aile', m: 4, t: 'Yalnızlık ve bağ kurmak', l: 'Kalabalık içinde de yalnız hissedilebilir; yalnızlık insan sayısıyla değil, bağın derinliğiyle ilgilidir.', q: 'Bağ büyük jestlerle değil, tekrarlanan küçük temaslarla kurulur.', b: `
Yalnızlık, istediğimiz ilişkilerle sahip olduğumuz ilişkiler arasındaki farkın acısıdır. Taşınmak, yeni bir iş, çocuk sahibi olmak, gurbette yaşamak ya da yoğun bir dönem bu boşluğu büyütebilir. Utanılacak bir şey değil; açlık gibi bir ihtiyacın sinyalidir.

## Yalnızlığın kurduğu tuzak
Yalnız hisseden zihin sosyal ipuçlarına karşı daha temkinli olur: Geç dönen bir mesajı reddedilme gibi okur, daveti geri çevirmeye meyleder. Bu da yalnızlığı besleyen bir döngü yaratır. Döngüyü kırmanın yolu büyük adımlar değil, küçük ve düzenli temaslardır.

## Küçük adımlar
- **Bir mesaj:** Uzun zamandır konuşmadığın birine “Aklıma geldin, nasılsın?” yaz.
- **Düzenli buluşma:** Haftada bir, aynı saatte bir arkadaşla yürüyüş ya da telefon görüşmesi.
- **Ortak ilgi:** Bir kurs, spor grubu, gönüllülük ya da kulüp; aynı insanları tekrar tekrar görmek yakınlığı kolaylaştırır.
- **Uzaktaki aile:** Görüntülü görüşmeleri bir rutine bağla; birlikte yemek yemek ya da kitap okumak gibi ortak bir şey yapın.
- **Kendinle vakit:** Yalnız kalmayı keyifli hâle getirmek (bir hobi, doğa, müzik) yalnızlığın acısını hafifletir.

! Yalnızlık uzun süredir sürüyor ve umutsuzlukla birlikte geliyorsa bunu bir uzmanla konuşmak iyi gelir. Kendine zarar verme düşüncelerin varsa hemen 112’yi ara.` },

    { s: 'erteleme', c: 'zihin', m: 4, t: 'Erteleme bir zaman değil, duygu meselesidir', l: 'Ertelediğimiz şey çoğu zaman işin kendisi değil, onun bize hissettirdiği şeydir.', q: 'Başlamak için motivasyonu bekleme; motivasyon çoğu zaman başladıktan sonra gelir.', b: `
Erteleme genellikle tembellik ya da kötü zaman yönetimi sanılır. Oysa araştırmacılar onu çoğu zaman bir duygu düzenleme çabası olarak görür: sıkıntı, belirsizlik, başarısızlık korkusu ya da mükemmeliyetçilik gibi rahatsız edici duygulardan kısa süreliğine kaçmak. Ne var ki kaçış geçicidir; iş beklerken suçluluk büyür.

## Neden erteliyorum?
- İş **belirsiz** mi? (“Raporu yaz” çok büyük; “ilk paragrafı yaz” net.)
- **Mükemmel** olması mı gerekiyor?
- **Sıkıcı** ya da **anlamsız** mı geliyor?
- **Yorgun** muyum? Bazen gereken şey disiplin değil, dinlenmedir.

## İşe yarayan küçük taktikler
- **İlk 5 dakika:** “Sadece 5 dakika çalışacağım” de. Başlamak çoğu zaman en zor kısımdır.
- **Bir sonraki somut adım:** Görevi hemen yapılabilecek fiziksel bir eyleme indir: dosyayı aç, başlığı yaz.
- **Önce taslak:** “Kötü bir ilk sürüm yazacağım” izni mükemmeliyetçiliği yumuşatır.
- **Ortamı kolaylaştır:** Telefonu başka odaya koy, gereken her şeyi önceden hazırla.
- **Kendini affet:** Araştırmalar, geçmişteki ertelemesi için kendini affeden kişilerin bir sonrakinde daha az ertelediğini gösteriyor.

! CBN’deki “Bugüne ekle” ile günün tek bir küçük adımını yazmak iyi bir başlangıç olabilir.` },

    { s: 'ofke', c: 'duygular', m: 4, t: 'Öfkeyle baş etmek', l: 'Öfke yanlış bir duygu değil; ama yönetilmezse yanlış yerlere çarpar.', q: 'Öfke bir sınırın aşıldığını haber verir; o sınırı nasıl koruyacağına sen karar verirsin.', b: `
Öfke, haksızlığa uğradığımızda, engellendiğimizde ya da değer verdiğimiz bir şey tehdit edildiğinde ortaya çıkan güçlü bir enerjidir. Kendi başına sorun değildir; çoğu zaman bir sınırın ya da karşılanmamış bir ihtiyacın habercisidir. Zorluk, o enerjinin bizi pişman olacağımız sözlere ve davranışlara sürüklemesidir.

## Erken uyarı işaretleri
Öfke genellikle birden patlamaz, tırmanır. Çene ve omuzlarda gerilme, yüzde ısınma, sesin yükselmesi, hızlı konuşma… Bu işaretleri ne kadar erken fark edersen frene basmak o kadar kolaylaşır.

## O anda
- **Dur ve uzaklaş:** “Bir dakika ara vermem gerek” deyip ortamdan kısa süre ayrıl.
- **Bedeni sakinleştir:** Yavaş ve uzun nefes ver, soğuk su iç, kısa bir yürüyüş yap.
- **Zirveyi bekle:** Öfkenin en yüksek noktası çoğu zaman kısa sürer; o anda karar verme, mesaj gönderme.

## Sonrasında
- **Altını kaz:** Öfkenin altında çoğu zaman başka bir duygu vardır: kırgınlık, korku, yorgunluk, utanç.
- **Sorunu konuş:** Sakinleşince “ben dili”yle ne olduğunu ve neye ihtiyacın olduğunu anlat.
- **Birikmeyi önle:** Küçük rahatsızlıkları zamanında dile getirmek büyük patlamaları azaltır.

! Öfke sık sık kontrolden çıkıyor, birine ya da eşyalara zarar vermene yol açıyorsa veya yakınların senden korkuyorsa bir uzmandan destek al. Birinin güvenliği tehlikedeyse 112’yi ara.` },

    { s: 'destek', c: 'destek', m: 4, t: 'Ne zaman profesyonel destek almalı?', l: 'Destek almak için her şeyin çok kötü olmasını beklemek gerekmiyor.', q: 'Yardım istemek bir zayıflık değil; kendine gösterdiğin en somut özenlerden biridir.', b: `
Bu sayfadaki yazılar genel bilgi verir; bir uzmanın değerlendirmesinin yerini tutmaz. Bazı durumlarda tek başına uğraşmak yerine bir psikolog, psikiyatrist ya da aile hekimiyle konuşmak çok daha hızlı iyi gelir.

## Şu işaretlere dikkat
- Üzüntü, kaygı ya da öfke **iki haftadan uzun** sürüyor ve günlük hayatını zorluyor.
- Uyku, iştah ya da enerji belirgin biçimde değişti.
- Eskiden keyif aldığın şeylerden artık keyif alamıyorsun.
- İşte, okulda ya da evde sorumluluklarını yerine getirmekte zorlanıyorsun.
- Alkolü, maddeleri ya da başka davranışları baş etmek için giderek daha çok kullanıyorsun.
- Yaşadığın bir olay (kayıp, kaza, şiddet) aklından çıkmıyor; kâbuslar ya da ani irkilmeler yaşıyorsun.

## Kime başvurabilirim?
- **Aile hekimi:** İlk adım için iyi bir kapı; gerekirse yönlendirme yapar.
- **Psikiyatrist:** Tıp doktorudur; tanı koyar, gerekirse ilaç tedavisi planlar.
- **Klinik psikolog / psikolojik danışman:** Terapi ve danışmanlık sunar.
- **Hastanelerin psikiyatri poliklinikleri** ve üniversite hastaneleri de başvurulabilecek yerlerdir.

## Acil durumda
Kendine ya da bir başkasına zarar verme düşüncen varsa ya da kendini güvende hissetmiyorsan beklemeden **112**’yi ara veya en yakın acil servise git. Yanında güvendiğin birinin olması da iyi gelir.

! Birleşik Krallık’taysan Samaritans’a günün her saati ücretsiz olarak 116 123’ten ulaşabilirsin.` }
  ];
  const MOODS = [['Kaygılı', ['kaygi', 'zihin-tuzaklari']], ['Yorgun', ['tukenmislik', 'uyku']], ['Uykusuz', ['uyku']], ['Öfkeli', ['ofke', 'ben-dili']], ['Yalnız', ['yalnizlik']], ['Kendime kızgın', ['oz-sefkat', 'erteleme']], ['Ebeveynlik zor', ['ebeveynlik', 'duygulara-isim']], ['Karışık', ['duygulara-isim', 'destek']]];
  const find = s => A.find(a => a.s === s);
  let el = null, filter = '', mood = -1, showAll = false, breath = null;

  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  function body(a) {
    const out = [], lines = a.b.trim().split('\n'), pull = `<blockquote class="ds-pull">${esc(a.q)}</blockquote>`; let list = null, hi = 0, done = false;
    const flush = () => { if (list) { out.push('<ul>' + list.map(x => `<li>${inl(x)}</li>`).join('') + '</ul>'); list = null; } };
    lines.forEach(raw => {
      const ln = raw.trim();
      if (!ln) return flush();
      if (ln.startsWith('- ')) { (list = list || []).push(ln.slice(2)); return; }
      flush();
      if (ln.startsWith('## ')) { if (++hi === 2 && !done) { out.push(pull); done = true; } out.push(`<h2>${inl(ln.slice(3))}</h2>`); }
      else if (ln.startsWith('! ')) { if (!done) { out.push(pull); done = true; } out.push(`<aside class="ds-tip"><b>Bilmekte fayda var</b><p>${inl(ln.slice(2))}</p></aside>`); }
      else out.push(`<p>${inl(ln)}</p>`);
    });
    flush(); if (!done) out.push(pull);
    return out.join('');
  }
  const read = () => store.get('dost_read', []);
  const markRead = s => { const r = read(); if (!r.includes(s)) { r.push(s); store.set('dost_read', r); } };
  const crisis = `<p class="ds-crisis"><b>Acil bir durumdaysan</b> ya da kendine zarar verme düşüncen varsa hemen <a href="tel:112">112</a>’yi ara. Buradaki yazılar genel bilgi içindir; tanı koymaz, bir uzmanın yerini tutmaz.</p>`;

  /* ---------------- ana sayfa ---------------- */
  function home() {
    const r = read(), picks = mood >= 0 ? MOODS[mood][1] : null;
    let list = A.filter(a => (!filter || a.c === filter) && (!picks || picks.includes(a.s)));
    const more = !picks && !filter && !showAll && list.length > 6; if (more) list = list.slice(0, 6);
    const words = ['Oku.', 'Dinlen.', 'Nefes', 'al.', 'Kendine', 'iyi', 'bak.'];
    el.innerHTML = `<div class="ds">
      <header class="ds-hero"><p class="ds-eye">Dost · okuma alanı</p>
        <h1 class="ds-title">Dost<i>.</i></h1>
        <p class="ds-stack" aria-label="${esc(words.join(' '))}">${words.map((w, i) => `<span style="--d:${i * 90}ms" aria-hidden="true">${esc(w)}</span>`).join('')}</p>
        <p class="ds-lede">Kaygı, uyku, duygular, ilişkiler ve kendinle kurduğun bağ üzerine kısa, sade yazılar. Bir de sakinleşmek istediğinde nefes molası.</p></header>

      <section class="ds-sec"><h2 class="ds-h"><span>Tanış</span><span>alım</span></h2>
        <div class="ds-trio">
          <a class="ds-card c1" href="#dost-list"><em>01</em><b>Yazılar</b><p>${A.length} kısa yazı, ${Object.keys(CATS).length} başlık. Her biri 4–6 dakikada okunur.</p><span>Okumaya başla +</span></a>
          <a class="ds-card c2" href="#dost-nefes"><em>02</em><b>Nefes molası</b><p>Bir, üç ya da beş dakikalık rehberli nefes. Kaygı yükseldiğinde ya da uyumadan önce.</p><span>Nefes al +</span></a>
          <a class="ds-card c3" href="#dost/destek"><em>03</em><b>Destek almak</b><p>Ne zaman bir uzmana başvurmalı, kime gidilir, acil durumda ne yapılır.</p><span>Oku +</span></a>
        </div></section>

      <section class="ds-sec ds-mood"><h2 class="ds-h sm"><span>Bugün</span><span>nasılsın?</span></h2>
        <div class="ds-chips" role="group" aria-label="Bugün nasılsın">${MOODS.map((m, i) => `<button type="button" class="ds-chip${mood === i ? ' on' : ''}" data-m="${i}" aria-pressed="${mood === i}">${esc(m[0])}</button>`).join('')}</div>
        ${picks ? `<p class="ds-hint">“${esc(MOODS[mood][0])}” için seçilen yazılar aşağıda. <button type="button" class="ds-link" data-m="-1">Tümünü göster</button></p>` : ''}</section>

      <section class="ds-sec" id="dost-list"><h2 class="ds-h"><span>Okumaya</span><span>değer</span></h2>
        <div class="ds-filter" role="group" aria-label="Başlıklar"><button type="button" class="ds-f${filter ? '' : ' on'}" data-f="" aria-pressed="${!filter}">Tümü</button>${Object.keys(CATS).map(k => `<button type="button" class="ds-f${filter === k ? ' on' : ''}" data-f="${k}" aria-pressed="${filter === k}">${esc(CATS[k])}</button>`).join('')}</div>
        <div class="ds-list">${list.map(a => `<a class="ds-item" href="#dost/${a.s}"><div class="ds-meta"><em>${String(A.indexOf(a) + 1).padStart(2, '0')}</em><span>${esc(CATS[a.c])}</span><span>${a.m} dk okuma</span>${r.includes(a.s) ? '<span class="ds-done">Okundu ✓</span>' : ''}</div><div class="ds-main"><b>${esc(a.t)}</b><q>${esc(a.q)}</q><p>${esc(a.l)}</p></div><span class="ds-go">Oku +</span></a>`).join('')}</div>
        ${more ? `<button type="button" class="ds-more" data-a="more">Daha fazla göster (${A.length - 6}) +</button>` : ''}</section>

      <section class="ds-sec ds-breath" id="dost-nefes"><h2 class="ds-h light"><span>Nefes</span><span>molası</span></h2><div class="ds-bw"></div></section>
      <footer class="ds-foot">${crisis}</footer></div>`;
    breathUI(el.querySelector('.ds-bw'));
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mood = +b.dataset.m === mood ? -1 : +b.dataset.m; filter = ''; home(); if (mood >= 0) el.querySelector('#dost-list').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; mood = -1; home(); const f = el.querySelector(`[data-f="${filter}"]`); if (f) f.focus(); });
    const mb = el.querySelector('[data-a=more]'); if (mb) mb.onclick = () => { showAll = true; home(); };
    el.querySelectorAll('a[href^="#dost-"]').forEach(a => a.onclick = e => { e.preventDefault(); const t = el.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  /* ---------------- nefes ---------------- */
  const PAT = { calm: { n: '4 · 6 sakinleşme', p: [['Nefes al', 4, 1], ['Nefes ver', 6, 0]] }, box: { n: 'Kutu nefesi 4 · 4 · 4 · 4', p: [['Nefes al', 4, 1], ['Tut', 4, 1], ['Nefes ver', 4, 0], ['Tut', 4, 0]] } };
  function stopBreath() { if (breath) { clearTimeout(breath.t); clearInterval(breath.c); breath = null; } }
  function breathUI(box) {
    let pat = store.get('dost_bp', 'calm'), min = store.get('dost_bm', 3); if (!PAT[pat]) pat = 'calm'; if (![1, 3, 5].includes(min)) min = 3;
    box.innerHTML = `<div class="ds-orb-w"><div class="ds-orb" aria-hidden="true"><i></i></div><p class="ds-phase" role="status" aria-live="polite">Hazır olduğunda başla</p><p class="ds-left"></p></div>
      <div class="ds-bctl"><p>Rahat bir pozisyonda otur, omuzlarını bırak. Daireyle birlikte nefes al ve ver.</p>
        <div class="ds-opts" role="group" aria-label="Nefes türü">${Object.keys(PAT).map(k => `<button type="button" class="ds-o${pat === k ? ' on' : ''}" data-p="${k}" aria-pressed="${pat === k}">${PAT[k].n}</button>`).join('')}</div>
        <div class="ds-opts" role="group" aria-label="Süre">${[1, 3, 5].map(m => `<button type="button" class="ds-o${min === m ? ' on' : ''}" data-t="${m}" aria-pressed="${min === m}">${m} dk</button>`).join('')}</div>
        <button type="button" class="ds-start">Başla</button><p class="ds-small">Başın dönerse normal nefese dön. Bu bir tedavi değil, kısa bir sakinleşme alıştırmasıdır.</p></div>`;
    const orb = box.querySelector('.ds-orb'), ph = box.querySelector('.ds-phase'), left = box.querySelector('.ds-left'), btn = box.querySelector('.ds-start');
    const reset = msg => { stopBreath(); orb.style.transitionDuration = '1.2s'; orb.classList.remove('big'); ph.textContent = msg || 'Hazır olduğunda başla'; left.textContent = ''; btn.textContent = 'Başla'; };
    box.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pat = b.dataset.p; store.set('dost_bp', pat); box.querySelectorAll('[data-p]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); reset(); });
    box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { min = +b.dataset.t; store.set('dost_bm', min); box.querySelectorAll('[data-t]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); reset(); });
    btn.onclick = () => {
      if (breath) return reset();
      const end = Date.now() + min * 60000, steps = PAT[pat].p; let i = 0;
      btn.textContent = 'Durdur';
      const tick = () => { if (!box.isConnected) return stopBreath(); const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); left.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      const step = () => {
        if (!box.isConnected) return stopBreath();
        if (Date.now() >= end && i % steps.length === 0) return reset('Tamamlandı. Kendine bu molayı verdiğin için teşekkürler.');
        const [txt, sec, big] = steps[i % steps.length]; i++;
        ph.textContent = txt; orb.style.transitionDuration = sec + 's'; orb.classList.toggle('big', !!big);
        breath.t = setTimeout(step, sec * 1000);
      };
      breath = { t: 0, c: setInterval(tick, 500) }; tick(); step();
    };
  }

  /* ---------------- yazı ---------------- */
  function article(a) {
    const i = A.indexOf(a), next = [A[(i + 1) % A.length], A[(i + 2) % A.length]], fs = Math.min(23, Math.max(16, +store.get('dost_fs', 19) || 19));
    el.innerHTML = `<div class="ds ds-art"><div class="ds-prog" aria-hidden="true"><i></i></div>
      <nav class="ds-top"><a class="ds-back" href="#dost">← Dost</a><div class="ds-fs" role="group" aria-label="Yazı boyutu"><button type="button" data-z="-1" aria-label="Yazıyı küçült">A−</button><button type="button" data-z="1" aria-label="Yazıyı büyüt">A+</button></div></nav>
      <header class="ds-ahead"><p class="ds-eye">${esc(CATS[a.c])} · ${a.m} dk okuma</p><h1>${esc(a.t)}</h1><p class="ds-alede">${esc(a.l)}</p></header>
      <article class="ds-body" style="--fs:${fs}px">${body(a)}</article>
      ${a.s !== 'destek' ? `<div class="ds-body ds-endnote">${crisis}</div>` : ''}
      <section class="ds-next"><h2 class="ds-h sm"><span>Sıradaki</span><span>yazılar</span></h2><div class="ds-trio two">${next.map((n, k) => `<a class="ds-card c${k + 1}" href="#dost/${n.s}"><em>${esc(CATS[n.c])}</em><b>${esc(n.t)}</b><p>${esc(n.l)}</p><span>Oku +</span></a>`).join('')}</div></section></div>`;
    const bodyEl = el.querySelector('.ds-body'), bar = el.querySelector('.ds-prog i');
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { const v = Math.min(23, Math.max(16, (parseInt(getComputedStyle(bodyEl).getPropertyValue('--fs'), 10) || 19) + (+b.dataset.z))); bodyEl.style.setProperty('--fs', v + 'px'); store.set('dost_fs', v); });
    const onScroll = () => {
      if (!bar.isConnected) return removeEventListener('scroll', onScroll);
      const r = bodyEl.getBoundingClientRect(), total = r.height - innerHeight * .6, p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      bar.style.width = (p * 100) + '%'; if (p > .9) markRead(a.s);
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  function open(root, route) {
    stopBreath(); el = root;
    const slug = String(route || '').split('/')[1], a = slug && find(slug);
    if (slug && !a) { location.replace('#dost'); return; }
    if (a) article(a); else home();
  }
  return { open, articles: A, _body: body };
})();

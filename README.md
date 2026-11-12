# BABA.

Oğuzhan'ın şifreli oyun odası (Lale & Ela oyunundan ayrı uygulama).

- **Süper Lig Draft** — 2026-27 Trendyol Süper Lig'in 18 kulübü, tamamı EA SPORTS FC 27 resmî kadroları ve puanlarıyla (ea.com); ayrıca son 10 yılın yıldızları ("tahmini" etiketli). Kulüpler karıştırılmış bir torbadan eşit şansla çekilir. Maç gücü = ortalama reyting + kimya (aynı kulüp ya da aynı ülkeden takım arkadaşları bağ kurar, en çok +6). 11+2 kur, teknik direktör ve taktik seç, 34 maç oyna. Rakipler kendi kadrolarıyla oynar; sezon sonunda puan durumu, gol krallığı, asist krallığı, altın eldiven ve yılın oyuncusu.
- **Dost** — seni yargılamadan dinleyen sohbet arkadaşı: duygu yansıtma, açık uçlu sorular, özetleme, düşünce kaydı, kutu nefesi, 5-4-3-2-1 topraklanma. Psikolog değildir; kriz ifadelerinde 112'ye yönlendirir. Sohbet yalnızca cihazda saklanır. İsteğe bağlı gelişmiş mod: kendi Claude API anahtarın (yalnızca bu cihazda tutulur).
- **2048**, **Sudoku**, **Mayın Tarlası**, **Blok Yığ**

Başlangıç şifresi `1967`; uygulamanın altındaki "Şifreyi değiştir" ile cihaz bazında değiştirilebilir.
Oyuncu puanları oyun içi tahmini değerlerdir. Şifre yalnızca çocukların yanlışlıkla girmesini önler, gerçek bir güvenlik değildir.

- **İş Masası** (`#is`) — ayrı, koyu "kontrol paneli" tasarımı: DSAn Travel App ve Şoför Takvimi kısayolları, bildirimli hatırlatmalar (tek sefer / her gün / hafta içi / haftalık / aylık; telefon takvimine .ics veya Google Takvim ile eklenebilir) ve aranabilir, sabitlenebilir notlar. Veriler yalnızca cihazda.

## BABA. v2
- **Kategoriler:** İş · Dost · Oyunlar · Seyahat · Fotoğraf
- **Erişim:** sahibi PIN ile girer; diğerleri yalnızca sahibinin oluşturduğu davet koduyla (Davetler & erişim sayfası) ya da giriş ekranından katılma isteği göndererek. Davetliler İş sayfasını görmez.
- **İş:** Brandlos (Awwwards nominee, Kas 2026) tasarım diliyle; DSAn Travel App, Şoför Takvimi, LinkedIn, hatırlatmalar ve notlar.
- **Seyahat:** Booking.com · Airbnb · Skyscanner; **Gezilerim**: three.js ile 3D dünya, şehir pinleri (Natural Earth / world-atlas sınırları; şehir arama: yerleşik liste + OpenStreetMap Nominatim).
- **Fotoğraf:** Pexels sayfası, günün fotoğrafçısı, sözler, Wikimedia Commons'taki kamu malı sokak fotoğraflarıyla 3D galeri.

## CBN — Personal OS (sürüm 13, İlk Sürüm)
`#cbn` — yalnızca sahibine açık kişisel çalışma alanı. Derleme adımı yok; BABA. ile aynı saf HTML/CSS/JS yapısı.
- **Ana Sayfa:** karşılama, bugünün özeti (gerçek kayıtlardan), Quick Capture (not · görev · etkinlik · fikir · hatırlatma), günün odağı, yaklaşan 7 gün, son notlar; kartlar taşınabilir / boyutlanabilir / gizlenebilir.
- **Notlar:** zengin metin editörü, klasör, etiket, sabitleme, favori, arşiv, çöp kutusu, sürüm geçmişi, ekler, ilişkili notlar, Markdown / PDF (yazdır) dışa aktarma, tam metin arama.
- **Görevler:** durumlar, öncelik, tekrarlama, alt görevler, kontrol listesi, hatırlatma; Bugün · Yaklaşan · Tümü · Kanban · Tamamlanan.
- **Takvim:** gün / hafta / ay, kategoriler, .ics dışa aktarma. Google Calendar bağlı değil (yalnızca sağlayıcı katmanı var).
- **Ayarlar:** tema, TR/EN, tarih biçimi, modül sırası/adı/gizleme, JSON yedekleme ve geri yükleme.
- **Veri:** IndexedDB (`cbn` veritabanı, şema v1), yalnızca cihazda; eşitleme yok. Hatırlatmalar yalnızca uygulama açıkken çalışır.
- **Dosyalar:** `css/cbn.css`, `js/cbn/{core,tasks,notes,calendar,home,settings}.js`; `index.html`, `js/games.js` (yönlendirme + ana sayfa kartı), `sw.js` (önbellek v13).
- Henüz yok: CBN AI, Projects, Family, Global Search, Voice Inbox (Sürüm 2); Finance, Goals, Work Space, Knowledge Graph, bulut senkronizasyonu (Sürüm 3).

### CBN sürüm 2–3 (BABA. sürüm 14)
- **Yeni modüller:** Projeler & Idea Lab (kart/liste/Kanban/zaman çizelgesi, proje detay sayfası), Aile (profiller, özel günler, geziler, alışveriş, pano), Finans (gelir/gider/fatura/birikim, bütçe, raporlar; TRY·GBP·EUR·USD, kur dönüşümü yok), Hedefler & Alışkanlıklar, İş Alanı (şablonlar, kayıtlar, kısayollar), Sesli Kutu (konuşmadan metne, tarayıcı destekliyorsa), Bilgi Haritası, Ctrl/⌘+K genel arama.
- **CBN AI kaldırıldı** (sürüm 16): ücretli API gerektirdiği için. CBN'de ücretli hiçbir servis kullanılmaz.
- **Veri:** IndexedDB şema v2 (`items` deposu eklendi; mevcut kayıtlar korunur). Yedekler v1 ve v2 biçimini içe alır.
- **Henüz yok (altyapı gerekir):** bulut senkronizasyonu, Vault, arka plan bildirimleri, Google Calendar, kur dönüşümü.
- **Dosyalar:** `js/cbn/{kit,life,money,work}.js` eklendi.

### Trabzonspor sayfası (sürüm 17)
`#ts` — en yakın maç (tarih, Türkiye saati, geri sayım), son 5 maç, kadro, TS Club ve resmî site bağlantıları. Veri tarayıcıda ücretsiz, anahtarsız kaynaklardan çekilir (maçlar: TheSportsDB herkese açık API; kadro: Wikipedia, olmazsa TheSportsDB) ve 30 dk önbelleklenir. Dosyalar: `js/ts.js`, `css/ts.css`.

### CBN herkese özel (sürüm 20)
CBN artık sahibine ve davetli herkese açık. Her kullanıcı kendi adıyla karşılanır ve kendi veritabanını kullanır (sahibi `cbn`, davetli `cbn-g-<davet kodu>`); veriler kişinin kendi cihazında durur, sahibi dahil kimse başkasının kayıtlarını göremez. Örnek projeler ve aile profilleri yalnızca sahibine eklenir.

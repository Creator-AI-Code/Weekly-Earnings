## Momentum v1.5.0

### Yeni: Aracım
- **Para → Vergi → Aracım:** marka, model, yıl, motor hacmi, plaka ve yakıt türü. Bu bilgiler logbook dosyasına da yazılır (ATO şartı).
- **Yenilemeler:** rego (CTP dahil), kasko, BHSL, DA, muayene, servis, lastik. Her birinin bitiş tarihi, maliyeti ve kaç ayda bir tekrarlandığı.
- **Önümüzdeki 12 ay** toplamı ve **haftada ne kadar ayırman** gerektiği.
- Bitişe 30 gün kala **Bugün** ekranında uyarı satırı. Telefonda 30, 7 ve 1 gün önce bildirim.
- **Yeniledim:** ödeme Uber giderlerine eklenir (doğru GST ve logbook payıyla), bitiş tarihi bir sonraki döneme kayar.
- **Yakıt tüketimi:** yakıt fişinde gösterge km'si ve litreyi girersen gerçek L/100km ve km başı maliyet hesaplanır.
- **Mali yıl sonu:** 24 Haziran – 7 Temmuz arası "gösterge km'sini gir" hatırlatması. 1 Temmuz okuması logbook dosyasına yazılır.

## Momentum v1.4.0

### Yeni: Fiş tara
- **+ → Fiş tara** ya da **Vergi → Uber giderleri → Fiş tara**. Telefonun belge tarayıcısı fişi kırpar ve düzleştirir. Toplam, GST, tarih ve mağaza adı **telefonun içinde** okunur.
- **Kimin için:** Uber, Ana iş ya da Kişisel. Uber yakıtı günlük listeye "Yakıt (Uber)" olarak, servis gibi giderler Vergi → Uber giderlerine, ana iş harcamaları ayrı bir "Ana iş giderleri" listesine gider.
- Fiş fotoğrafı sıkıştırılıp (~200 KB) sadece senin erişebildiğin özel bulut klasörüne yüklenir. İnternet yoksa telefonda bekler, sonra yüklenir. Kayıtlarda 📎 ile açılır.
- Web sürümünde fotoğraf yüklenir, tutarı elle girersin.
- Android uygulaması Capacitor 8'e geçti.

## Momentum v1.3.0

### Yeni: Para → Rapor
- **Kazanç performansı:** bu hafta ve geçen hafta yan yana. Uber brüt, saat, brüt ve net saatlik, gerçek kâr, harcamalar ve elinde kalan için ▲▼ değişim, en üstte tek cümlelik özet.
- **Harcama dağılımı:** kategorilere göre halka grafik ve her kategorinin geçen haftaya göre farkı.
- **Harcama alışkanlıkların:** en çok harcadığın kategori, kahve sayısı, en pahalı gün, hafta sonu ve hafta içi karşılaştırması (son 4 hafta).
- **Son 8 hafta:** Uber net saatlik kazanç ve haftalık harcama grafikleri.
- Sağa/sola kaydırarak haftalar arasında gezin.

## Momentum v1.2.0

- **Saatlik kazancın:** Para → Hafta'da "Elinde kalan"ın altında maaş, Uber ve nakit iş için net saatlik kazanç (vergi ve masraflar sonrası) ve toplamı. Yanında geçen haftaya göre ▲▼ değişim.
- Uber saati girilmediyse vardiyalardan (Uber'e başla / Bitir) otomatik alınır.
- Ayarlar → Para: **Maaşlı işte haftalık saat** (varsayılan 38).

## Momentum v1.1.0

### Yeni: Uber vardiyası ve araç logbook
- **Bugün** ekranında **Uber'e başla** butonu. Online olunca gösterge km'sini gir, offline olunca **Bitir**'e bas. Vardiyanın km'si ve süresi otomatik hesaplanır.
- Vardiyayı bitirmeyi unutursan ertesi gün kart sarı yanar ve bitiş saati başlangıç + 4 saat olarak önerilir.
- **Para → Vergi → Araç logbook:** ATO'nun istediği 12 haftalık logbook. Uber km'si, toplam km ve Uber payın canlı görünür. **Vergiye uygula** ile araç giderlerinin iş payı güncellenir.
- 12 hafta dolunca **Logbook'u bitir**. Sonuç vergi ayarına otomatik işlenir. **Logbook dosyası** ile ATO formatında CSV alırsın.
- Araç giderleri (servis, lastik, sigorta…) artık logbook yüzdesini otomatik izler.
- BAS son günleri online verdiğin duruma göre: Q1 11 Kasım, Q2 28 Şubat, Q3 12 Mayıs, Q4 25 Ağustos.

### v1.0.2

**Düzeltme:** Android uygulamasında **Yedek al** artık çalışıyor. Paylaşım menüsü açılıyor, dosyayı Drive, Dosyalar veya e-postaya kaydedebilirsin.

### v1.0.1

**Düzeltme:** APK artık her seferinde aynı anahtarla imzalanıyor. Bu sürümü bir kez eski uygulamayı silip kurman gerekiyor (önce Ayarlar → Yedek al). Bundan sonraki güncellemeler eskisinin üstüne kurulur, verilerin kalır.

---

### v1.0.0

İlk sürüm. Telefonda **Momentum.apk** dosyasını indirip aç (bilinmeyen kaynaklardan yüklemeye izin ver). Önceki sürümün üstüne kurulur, verilerin kalır.

### Yeni
- **Adım adım haftalık döküm:** Uber brüt → GST → yakıt → *bu hafta cebine giren* → tahmini sabit masraf → vergi + Medicare → MLS → *Uber'den gerçek kâr* → maaş, nakit iş, harcamalar → elinde kalan.
- **Haftalık vergi payı:** "Bu hafta vergi kumbarasına $X aktar" ve **Aktardım** butonu. Haftalık tutarların toplamı çeyrekteki BAS tutarına birebir eşit.
- **Tek harcama listesi:** her harcama kendi gününe. Yakıtı "Yakıt (Uber)" olarak gir; GST kredisi ve vergi otomatik. Büyük alışverişler için "Tek seferlik".
- **Sade Bugün ekranı:** "Bu hafta harcayabileceğin $X (günde $Y)", vergi satırı, şu anki alışkanlıklar, ilk 3 görev, sayaçlar.
- **Kaydırarak gezinme:** sekmeler, haftalar, çeyrekler ve alt sekmeler arasında sağa/sola kaydır. Harcama satırında sola kaydırma silme.
- **Yeni renkler:** bordo, mor ve açık bej; koyu temada patlıcan moru.
- **Bildirim:** Pazar 19:00 haftalık vergi payı hatırlatması.

### Düzeltmeler
- Kaydedilen harcamanın kategorisi bir sonrakine geçmiyor.
- Yakıt artık iki yerden girilemiyor; eski kayıtlar tek seferlik taşındı.
- Geçmiş haftalarda "bu hafta" etiketi yerine haftanın tarihi.
- Vergi ekranı sadeleşti: döküm ve mali yıl kartı kapalı başlıyor.

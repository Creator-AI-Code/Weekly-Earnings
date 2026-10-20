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

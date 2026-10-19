# Ilgaz'ın Lego Yardımcısı

Lego parçalarının fotoğrafını çekip yapay zekaya (Gemini) saydıran, çocuk dostu bir PWA.
Tablet ve telefonda tarayıcıdan açılır, ana ekrana eklenebilir.

## Durum

- [x] **Aşama 1 – MVP:** fotoğraftan parça listesi (tür, renk, adet), elle düzeltme, kayıtlar, birden çok fotoğrafı birleştirme
- [x] **Aşama 2:** "Ne yapabilirim?" – yapay zeka model fikirleri, uyan resmi LEGO setleri, setlerin hayran tasarımları (MOC)
- [ ] Aşama 3: adım adım montaj kılavuzu
- [ ] Aşama 4: video desteği, iyileştirmeler

## Yapı

```
src/            Arayüz (React + Vite PWA)
  ekranlar/     AnaSayfa, Onizleme, Bekleme, ParcaListesi, ParcaEkle, Kayitlar, KodEkrani
  bilesenler/   ParcaResmi (SVG çizim), FotoButonlari
  api/          sunucu çağrısı + fotoğraf küçültme
  depo/         tablette kayıt (IndexedDB)
worker/         Sunucu (Cloudflare Worker + Hono): /api/analiz → Gemini
shared/         Parça/renk kataloğu ve ortak tipler
```

API anahtarı yalnızca sunucuda durur; tarayıcıya hiç gönderilmez.

## Set verisi (`public/setler.json`)

Uyan resmi setler, Rebrickable'ın ücretsiz veri dökümünden üretilen özet dosyadan bulunur
(anahtar gerekmez). Güncellemek için https://rebrickable.com/downloads/ adresinden
`sets, themes, inventories, inventory_parts, parts, part_categories, colors` CSV'lerini bir
klasöre açıp `node scripts/set-verisi-uret.mjs <klasör>` çalıştır.
Veri: [Rebrickable](https://rebrickable.com). LEGO® LEGO Group'un ticari markasıdır; bu uygulama LEGO Group ile bağlantılı değildir.

## Yerelde çalıştırma

1. `.dev.vars.example` dosyasını `.dev.vars` olarak kopyala.
2. https://aistudio.google.com/apikey adresinden ücretsiz anahtar al, `GEMINI_API_KEY=` satırına yaz.
   (Anahtarsız denemek için `SAHTE_MOD=1` yaz.)
3. `npm install` → `npm run dev` → http://localhost:5173

## Yayınlama (Cloudflare, ücretsiz)

İlk kurulum (bir kez):
1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository** → `TrioMS/legoland`.
2. Build command: `npm run build` · Deploy command: `npx wrangler deploy`.
3. Ayarlar → **Variables and Secrets** → `GEMINI_API_KEY` ekle (tür: *Secret*).
   İsteğe bağlı: `ERISIM_KODU` (yabancıların kotanı harcamasını engelleyen aile kodu).
4. Adres: `https://legoland.<hesap-adın>.workers.dev`

İsteğe bağlı: `REBRICKABLE_API_KEY` (Secret) – setlerin hayran tasarımlarını gösterir.
Anahtar: rebrickable.com → ücretsiz hesap → Settings → API → *Generate new API Key*.

Sonrasında `main` dalına her push otomatik yayınlanır. Tablet uygulamayı açtığında
(ve açıkken saatte bir) yeni sürümü kendisi alır; ana sayfanın altındaki **Sürüm** tarihinden görülebilir.

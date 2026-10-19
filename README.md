# Lego Yardımcı

Lego parçalarının fotoğrafını çekip yapay zekaya (Gemini) saydıran, çocuk dostu bir PWA.
Tablet ve telefonda tarayıcıdan açılır, ana ekrana eklenebilir.

## Durum

- [x] **Aşama 1 – MVP:** fotoğraftan parça listesi (tür, renk, adet), elle düzeltme, kayıtlar
- [ ] Aşama 2: eldeki parçalarla model önerisi (Rebrickable setleri + yapay zeka modelleri)
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

Sonrasında `main` dalına her push otomatik yayınlanır. Tablet uygulamayı açtığında
(ve açıkken saatte bir) yeni sürümü kendisi alır; ana sayfanın altındaki **Sürüm** tarihinden görülebilir.

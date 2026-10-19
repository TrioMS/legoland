# Lego Yardımcı – proje notları

- Kullanıcı 7 yaşında bir çocuk: tüm arayüz metinleri **Türkçe**, butonlar büyük, dil sade.
- Kod içi isimler de Türkçe (ekran, parca, renk…); bu düzeni koru.
- Node.js bu makinede kurulu değil, taşınabilir sürüm var: `C:\Users\cagri.dincturk\tools\node-v22.23.3-win-x64`
  (Bash'te önce `export PATH="/c/Users/cagri.dincturk/tools/node-v22.23.3-win-x64:$PATH"`).
- Sırlar: yerelde `.dev.vars`, canlıda Cloudflare secret. Asla repoya girmez.
- Yapay zeka yalnızca `shared/katalog.ts` içindeki parça/renk kimliklerini döndürür; yeni parça türü eklerken oraya ekle.

## "Güncelleme yayınla" denildiğinde

1. `npm run build` hatasız geçmeli.
2. Değişiklikleri commit et ve `origin main`'e push et (`https://github.com/TrioMS/legoland`).
3. Cloudflare push'u görüp otomatik yayınlar; tablet sonraki açılışta yeni sürümü alır.

import type { AnalizYaniti, HataYaniti } from '../../shared/tipler';

const KOD_ANAHTARI = 'lego-erisim-kodu';

export const erisimKodu = {
  oku: () => localStorage.getItem(KOD_ANAHTARI) ?? '',
  yaz: (kod: string) => localStorage.setItem(KOD_ANAHTARI, kod.trim()),
};

export class AnalizHatasi extends Error {
  constructor(message: string, public kod?: HataYaniti['kod']) {
    super(message);
  }
}

/** Fotoğrafı döndürme bilgisini koruyarak küçültür, JPEG data URL döner. */
export async function kucult(dosya: Blob, enUzunKenar: number, kalite = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(dosya, { imageOrientation: 'from-image' });
  const oran = Math.min(1, enUzunKenar / Math.max(bitmap.width, bitmap.height));
  const tuval = document.createElement('canvas');
  tuval.width = Math.round(bitmap.width * oran);
  tuval.height = Math.round(bitmap.height * oran);
  tuval.getContext('2d')!.drawImage(bitmap, 0, 0, tuval.width, tuval.height);
  bitmap.close();
  return tuval.toDataURL('image/jpeg', kalite);
}

export async function analizEt(resimDataUrl: string): Promise<AnalizYaniti> {
  const zamanAsimi = new AbortController();
  const sayac = setTimeout(() => zamanAsimi.abort(), 120_000);
  let yanit: Response;
  try {
    yanit = await fetch('/api/analiz', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-erisim-kodu': erisimKodu.oku() },
      body: JSON.stringify({ resim: resimDataUrl.split(',')[1] }),
      signal: zamanAsimi.signal,
    });
  } catch {
    throw new AnalizHatasi(navigator.onLine ? 'Bağlantı çok uzun sürdü. Tekrar dene.' : 'İnternet yok gibi görünüyor.');
  } finally {
    clearTimeout(sayac);
  }

  const veri = await yanit.json().catch(() => null);
  if (!yanit.ok) {
    const h = veri as HataYaniti | null;
    throw new AnalizHatasi(h?.hata ?? 'Bir şeyler ters gitti. Tekrar dene.', h?.kod);
  }
  return veri as AnalizYaniti;
}

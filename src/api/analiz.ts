import type { AnalizYaniti, HataYaniti, Kutu, MocOnerisi } from '../../shared/tipler';

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

async function apiIstegi<T>(yol: string, govde?: unknown): Promise<T> {
  const zamanAsimi = new AbortController();
  const sayac = setTimeout(() => zamanAsimi.abort(), 120_000);
  let yanit: Response;
  try {
    yanit = await fetch(yol, {
      method: govde === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-erisim-kodu': erisimKodu.oku() },
      body: govde === undefined ? undefined : JSON.stringify(govde),
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
  return veri as T;
}

/** Fotoğrafın birbirine biraz binen 4 çeyreği [üst, sol, alt, sağ] (0-1000) */
export const YAKIN_BOLGELER: Kutu[] = [
  [0, 0, 550, 550],
  [0, 450, 550, 1000],
  [450, 0, 1000, 550],
  [450, 450, 1000, 1000],
];

/**
 * Büyük parçaların yanında küçükler gözden kaçmasın diye fotoğrafın 4 çeyreğini ayrı ayrı,
 * orijinal çözünürlükten keserek yakın çekim gibi hazırlar.
 */
export async function yakinCekimler(dosya: Blob, enUzunKenar = 1280): Promise<{ resim: string; bolge: Kutu }[]> {
  const bitmap = await createImageBitmap(dosya, { imageOrientation: 'from-image' });
  const sonuc = YAKIN_BOLGELER.map((bolge) => {
    const [y1, x1, y2, x2] = bolge;
    const sx = (x1 / 1000) * bitmap.width;
    const sy = (y1 / 1000) * bitmap.height;
    const sw = ((x2 - x1) / 1000) * bitmap.width;
    const sh = ((y2 - y1) / 1000) * bitmap.height;
    const oran = Math.min(1, enUzunKenar / Math.max(sw, sh));
    const tuval = document.createElement('canvas');
    tuval.width = Math.round(sw * oran);
    tuval.height = Math.round(sh * oran);
    tuval.getContext('2d')!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, tuval.width, tuval.height);
    return { resim: tuval.toDataURL('image/jpeg', 0.85).split(',')[1], bolge };
  });
  bitmap.close();
  return sonuc;
}

export const analizEt = (resimDataUrl: string, yakinlar: { resim: string; bolge: Kutu }[] = []) =>
  apiIstegi<AnalizYaniti>('/api/analiz', { resim: resimDataUrl.split(',')[1], yakinlar });


export const mocleriAl = (setNo: string) =>
  apiIstegi<{ mocler: MocOnerisi[]; anahtarYok?: boolean }>(`/api/moc/${encodeURIComponent(setNo)}`);

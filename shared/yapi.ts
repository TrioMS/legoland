// 3D model yapısı: parçalar çivi ızgarasına yerleştirilir.
//   x: sağa (çivi), y: geriye (çivi), z: yukarı (plaka yüksekliği; tuğla = 3 plaka)
//   yon: 0 → parçanın uzun kenarı x yönünde, 90 → y yönünde
// Yapay zekanın ürettiği yapılar burada kontrol edilir: çakışan, havada kalan ya da
// çizilemeyen parçalar atılır.

import { parcaBul } from './katalog';
import type { ModelParcasi } from './tipler';

export interface YapiParcasi {
  parcaId: string;
  renkId: string;
  x: number;
  y: number;
  z: number;
  /** 0/90: uzun kenar x/y boyunca. 180/270: aynı yerleşim, eğim ters yöne iner */
  yon: 0 | 90 | 180 | 270;
}

export interface Adim {
  parcalar: YapiParcasi[];
}

export const EN_BUYUK_TABAN = 16;
export const EN_BUYUK_YUKSEKLIK = 45;

/** 3D çizilebilen parça türleri */
export function cizilebilir(parcaId: string): boolean {
  const s = parcaBul(parcaId).sekil;
  return (
    s === 'tugla' || s === 'plaka' || s === 'karo' || s === 'egim' || s === 'yuvarlak' ||
    parcaId === 'tekerlek' || parcaId === 'tekerlek-tutucu'
  );
}

/** Parçanın plaka cinsinden yüksekliği */
export function yukseklik(parcaId: string): number {
  const p = parcaBul(parcaId);
  if (parcaId === 'tekerlek') return 4;
  if (parcaId === 'tekerlek-tutucu') return 1;
  if (p.sekil === 'tugla' || p.sekil === 'egim') return 3;
  if (p.sekil === 'yuvarlak') return parcaId.includes('tugla') ? 3 : 1;
  return 1;
}

/** Parçanın x/y yönündeki boyu (çivi), yöne göre */
export function taban(p: Pick<YapiParcasi, 'parcaId' | 'yon'>): { gx: number; gy: number } {
  const t = parcaBul(p.parcaId);
  // Tekerlek yandan takılır: 2 çivi çapında, 1 çivi kalınlığında bir disk
  const uzun = p.parcaId === 'tekerlek' ? 2 : Math.max(t.en, t.boy);
  const kisa = p.parcaId === 'tekerlek' ? 1 : Math.min(t.en, t.boy);
  return p.yon % 180 === 90 ? { gx: kisa, gy: uzun } : { gx: uzun, gy: kisa };
}

/**
 * Eğimli parçanın hangi hücrelerinin eğimli olduğu ve eğimin hangi yöne indiği.
 * - 1 çivi enindeki eğimler (1x2, kavisli 1x4) uzun kenar boyunca iner; ilk hücre düz kalır.
 * - 2 çivi enindekiler (2x2, 2x4) kısa kenar boyunca iner; ilk sıra düz kalır.
 * Ters eğim düz kutu gibi çizilir (null).
 */
export function egimBilgisi(p: YapiParcasi): {
  egimli: (dx: number, dy: number) => boolean;
  /** Eğimli hücrenin eğim boyunca sırası (1 = düz kısma en yakın) */
  sira: (dx: number, dy: number) => number;
  /** Eğimli hücre sayısı (eğim boyunca) */
  boy: number;
  yon: [number, number];
  civisiz: boolean;
} | null {
  const t = parcaBul(p.parcaId);
  if (t.sekil !== 'egim' || p.parcaId.includes('ters')) return null;
  const { gx, gy } = taban(p);
  const kavisli = p.parcaId.includes('kavisli');
  const ince = Math.min(t.en, t.boy) === 1;
  const geri = p.yon >= 180;
  const uzunBoyuncaX = p.yon % 180 === 0;
  const xBoyunca = ince ? uzunBoyuncaX : !uzunBoyuncaX;
  const uzunluk = xBoyunca ? gx : gy;
  // İleri: ilk hücre düz, sonrakiler iner. Geri: son hücre düz, öncekiler geriye iner.
  const sira = (dx: number, dy: number) => {
    const i = xBoyunca ? dx : dy;
    return geri ? uzunluk - 1 - i : i;
  };
  const s = geri ? -1 : 1;
  return {
    egimli: (dx, dy) => sira(dx, dy) > 0,
    sira,
    boy: uzunluk - 1,
    yon: xBoyunca ? [s, 0] : [0, s],
    civisiz: kavisli,
  };
}

const hucre = (x: number, y: number, z: number) => `${x},${y},${z}`;

function hucreler(p: YapiParcasi): string[] {
  const { gx, gy } = taban(p);
  const h = yukseklik(p.parcaId);
  const sonuc: string[] = [];
  for (let dx = 0; dx < gx; dx++) for (let dy = 0; dy < gy; dy++) for (let dz = 0; dz < h; dz++) sonuc.push(hucre(p.x + dx, p.y + dy, p.z + dz));
  return sonuc;
}

/**
 * Adımları temizler:
 * - çizilemeyen / ızgara dışı parçaları atar
 * - önceki parçalarla çakışanları atar
 * - zemin üstünde ya da başka parçaya (altına veya üstüne) değmeyenleri atar
 * - boş adımları kaldırır
 * Yapıyı en küçük x/y/z = 0 olacak şekilde kaydırır.
 */
export function yapiyiDuzelt(adimlar: Adim[]): Adim[] {
  const dolu = new Set<string>();
  const temiz: Adim[] = [];

  for (const adim of adimlar) {
    const kalan: YapiParcasi[] = [];
    // Bir adımdaki parçalar birbirine dayanabilir; birkaç turda yerleştir
    let bekleyen = adim.parcalar.filter((p) => cizilebilir(p.parcaId));
    for (let tur = 0; tur < 4 && bekleyen.length; tur++) {
      const sonraki: YapiParcasi[] = [];
      for (const p of bekleyen) {
        const { gx, gy } = taban(p);
        const h = yukseklik(p.parcaId);
        if (p.x < 0 || p.y < 0 || p.z < 0 || p.x + gx > EN_BUYUK_TABAN || p.y + gy > EN_BUYUK_TABAN || p.z + h > EN_BUYUK_YUKSEKLIK) continue;
        const hs = hucreler(p);
        if (hs.some((k) => dolu.has(k))) continue;
        let destek = p.z === 0;
        for (let dx = 0; dx < gx && !destek; dx++) {
          for (let dy = 0; dy < gy && !destek; dy++) {
            if (dolu.has(hucre(p.x + dx, p.y + dy, p.z - 1)) || dolu.has(hucre(p.x + dx, p.y + dy, p.z + h))) destek = true;
          }
        }
        if (!destek) {
          sonraki.push(p);
          continue;
        }
        hs.forEach((k) => dolu.add(k));
        kalan.push(p);
      }
      if (sonraki.length === bekleyen.length) break;
      bekleyen = sonraki;
    }
    if (kalan.length) temiz.push({ parcalar: kalan });
  }

  // Kaydır: en alttaki/soldaki parça 0'a gelsin
  const hepsi = temiz.flatMap((a) => a.parcalar);
  if (!hepsi.length) return [];
  const mx = Math.min(...hepsi.map((p) => p.x));
  const my = Math.min(...hepsi.map((p) => p.y));
  const mz = Math.min(...hepsi.map((p) => p.z));
  return temiz.map((a) => ({ parcalar: a.parcalar.map((p) => ({ ...p, x: p.x - mx, y: p.y - my, z: p.z - mz })) }));
}

/** Yapının toplam parça listesi (tür + renk + adet) */
export function yapiParcalari(adimlar: Adim[]): ModelParcasi[] {
  const harita = new Map<string, ModelParcasi>();
  for (const p of adimlar.flatMap((a) => a.parcalar)) {
    const k = `${p.parcaId}|${p.renkId}`;
    const var_ = harita.get(k);
    if (var_) var_.adet++;
    else harita.set(k, { parcaId: p.parcaId, renkId: p.renkId, adet: 1 });
  }
  return [...harita.values()];
}

// Elle tasarlanmış model kütüphanesi.
// Koordinatlar: x sağa/öne (araçların burnu +x), y geriye, z yukarı (plaka; tuğla = 3).
// yon: 0 → uzun kenar x boyunca, 90 → y boyunca; 180/270 aynı yerleşim ama eğim ters yöne iner.
// Renkler "rol" olarak yazılır; uygulama her rolü Ilgaz'ın elindeki bir renge boyar.

import type { Adim } from './yapi';

export type Rol = 'a' | 'b' | 'c' | 'k' | 'w' | 'cam' | 'z' | 't' | 'g';

/** Rollerin varsayılan rengi ve tercih sırası (ilk renk varsayılan) */
export const ROL_RENKLERI: Record<Rol, string[]> = {
  a: ['kirmizi'], // ana renk: her renk olabilir
  b: ['mavi'], // ikinci renk
  c: ['sari'], // vurgu rengi
  k: ['siyah', 'koyu-gri', 'lacivert', 'kahverengi'], // lastik, göz, koyu ayrıntı
  w: ['beyaz', 'acik-gri', 'bej'], // açık renk
  cam: ['seffaf', 'acik-mavi', 'beyaz', 'acik-gri'], // pencere, cam
  z: ['yesil', 'koyu-yesil', 'acik-yesil'], // çimen, yaprak
  t: ['kahverengi', 'bej', 'koyu-gri', 'turuncu'], // ağaç gövdesi, ahşap
  g: ['acik-gri', 'koyu-gri', 'beyaz', 'siyah'], // metal, tekerlek tutucu
};

export interface RolluParca {
  parcaId: string;
  rol: Rol;
  x: number;
  y: number;
  z: number;
  yon: 0 | 90 | 180 | 270;
}

export interface KutuphaneModeli {
  id: string;
  ad: string;
  emoji: string;
  aciklama: string;
  zorluk: 1 | 2 | 3;
  /** Varsayılan renkleri değiştirmek için (ör. ördekte a = sarı) */
  renkler?: Partial<Record<Rol, string>>;
  adimlar: { parcalar: RolluParca[] }[];
}

type Y = 0 | 90 | 180 | 270;
const p = (parcaId: string, rol: Rol, x: number, y: number, z: number, yon: Y = 0): RolluParca => ({ parcaId, rol, x, y, z, yon });
const adim = (...parcalar: RolluParca[]) => ({ parcalar });

/** İki aks tekerlek: x1 ve x2 akslarında, gövde y = yIc..yIc+1, tekerlekler dışta */
function tekerlekler(x1: number, x2: number, yIc = 1) {
  return adim(
    p('tekerlek-tutucu', 'g', x1, yIc, 2),
    p('tekerlek-tutucu', 'g', x2, yIc, 2),
    p('tekerlek', 'k', x1, yIc - 1, 0),
    p('tekerlek', 'k', x1, yIc + 2, 0),
    p('tekerlek', 'k', x2, yIc - 1, 0),
    p('tekerlek', 'k', x2, yIc + 2, 0),
  );
}

export const KUTUPHANE: KutuphaneModeli[] = [
  // ---------------------------------------------------------------- Araçlar
  {
    id: 'araba',
    ad: 'Şehir Arabası',
    emoji: '🚗',
    aciklama: 'Camları ve kaputu olan dört tekerlekli bir araba. Vın vın!',
    zorluk: 1,
    adimlar: [
      tekerlekler(0, 4),
      adim(p('plaka-2x6', 'a', 0, 1, 3)),
      adim(p('tugla-2x2', 'a', 0, 1, 4), p('tugla-1x2', 'a', 2, 1, 4, 90), p('tugla-1x2', 'cam', 3, 1, 4, 90)),
      adim(p('egim-45-2x2', 'a', 4, 1, 4, 90)),
      adim(p('plaka-2x4', 'a', 0, 1, 7)),
    ],
  },
  {
    id: 'yaris-arabasi',
    ad: 'Yarış Arabası',
    emoji: '🏎️',
    aciklama: 'Alçak, uzun ve arkasında rüzgârlığı olan süper hızlı bir yarış arabası!',
    zorluk: 2,
    adimlar: [
      tekerlekler(0, 6),
      adim(p('plaka-2x8', 'a', 0, 1, 3)),
      adim(p('tugla-2x2', 'a', 0, 1, 4), p('plaka-2x2', 'a', 2, 1, 4), p('plaka-2x2', 'a', 4, 1, 4)),
      adim(p('egim-45-2x2', 'a', 6, 1, 4, 90), p('tugla-1x2', 'cam', 3, 1, 5, 90)),
      adim(p('plaka-2x4', 'c', 0, 0, 7, 90)),
    ],
  },
  {
    id: 'kamyon',
    ad: 'Kargo Kamyonu',
    emoji: '🚚',
    aciklama: 'Önde kabini, arkada yükü olan güçlü bir kamyon. Yükü nereye taşıyacaksın?',
    zorluk: 2,
    adimlar: [
      tekerlekler(1, 6),
      adim(p('plaka-2x8', 'g', 0, 1, 3)),
      adim(p('tugla-2x4', 'c', 0, 1, 4), p('tugla-2x2', 'a', 5, 1, 4), p('tugla-1x2', 'a', 7, 1, 4, 90)),
      adim(p('tugla-2x2', 'a', 5, 1, 7), p('tugla-1x2', 'cam', 7, 1, 7, 90), p('tugla-2x4', 'c', 0, 1, 7)),
      adim(p('plaka-2x3', 'a', 5, 1, 10)),
    ],
  },
  {
    id: 'traktor',
    ad: 'Traktör',
    emoji: '🚜',
    aciklama: 'Tarlada çalışan, yüksek kabinli bir traktör.',
    zorluk: 2,
    renkler: { a: 'yesil', c: 'sari' },
    adimlar: [
      tekerlekler(0, 4),
      adim(p('plaka-2x6', 'c', 0, 1, 3)),
      adim(p('tugla-2x2', 'a', 0, 1, 4), p('tugla-2x4', 'a', 2, 1, 4)),
      adim(p('tugla-1x2', 'cam', 0, 1, 7, 90), p('tugla-1x2', 'cam', 1, 1, 7, 90), p('egim-45-2x2', 'a', 4, 1, 7, 90)),
      adim(p('plaka-2x2', 'c', 0, 1, 10), p('yuvarlak-tugla-1x1', 'k', 3, 1, 7)),
    ],
  },
  {
    id: 'ucak',
    ad: 'Yolcu Uçağı',
    emoji: '✈️',
    aciklama: 'Uzun kanatları ve kuyruğu olan bir uçak. Nereye uçalım Ilgaz?',
    zorluk: 2,
    renkler: { a: 'beyaz', b: 'mavi', c: 'kirmizi' },
    adimlar: [
      adim(p('tugla-1x2', 'a', 0, 3, 0, 90), p('tugla-2x4', 'a', 1, 3, 0), p('egim-45-2x2', 'a', 5, 3, 0, 90)),
      adim(p('plaka-2x8', 'b', 2, 0, 3, 90)),
      adim(p('plaka-1x4', 'b', 0, 2, 3, 90), p('tugla-1x2', 'cam', 4, 3, 3, 90)),
      adim(p('tugla-1x2', 'c', 0, 3, 4), p('egim-45-1x2', 'c', 0, 3, 7)),
    ],
  },
  {
    id: 'jet',
    ad: 'Jet Uçağı',
    emoji: '🛩️',
    aciklama: 'Sivri burunlu, camlı kokpitli, çok hızlı bir jet!',
    zorluk: 2,
    renkler: { a: 'acik-gri', b: 'koyu-gri', c: 'kirmizi' },
    adimlar: [
      adim(p('tugla-2x6', 'a', 0, 3, 0), p('egim-45-2x2', 'a', 6, 3, 0, 90)),
      adim(p('plaka-2x4', 'b', 1, 0, 3, 90), p('plaka-2x4', 'b', 1, 5, 3, 90)),
      adim(p('egim-45-2x2', 'cam', 4, 3, 3, 90), p('plaka-2x2', 'a', 1, 3, 3)),
      adim(p('egim-45-1x2', 'c', 0, 3, 3), p('egim-45-1x2', 'c', 0, 4, 3)),
    ],
  },
  {
    id: 'helikopter',
    ad: 'Helikopter',
    emoji: '🚁',
    aciklama: 'Pervaneleri dönen, uzun kuyruklu bir kurtarma helikopteri.',
    zorluk: 3,
    renkler: { a: 'kirmizi', k: 'siyah' },
    adimlar: [
      adim(p('plaka-2x6', 'k', 3, 1, 0)),
      adim(p('tugla-2x4', 'a', 3, 1, 1), p('egim-45-2x2', 'cam', 7, 1, 1, 90)),
      adim(p('tugla-2x2', 'a', 3, 1, 4), p('tugla-1x2', 'cam', 5, 1, 4, 90), p('tugla-1x4', 'a', 0, 1, 4)),
      adim(p('plaka-2x4', 'a', 3, 1, 7), p('egim-45-1x2', 'a', 0, 1, 7, 180)),
      adim(p('yuvarlak-tugla-1x1', 'k', 4, 1, 8), p('plaka-1x8', 'k', 1, 1, 11), p('plaka-1x6', 'k', 4, -2, 12, 90)),
    ],
  },
  {
    id: 'roket',
    ad: 'Uzay Roketi',
    emoji: '🚀',
    aciklama: 'Kanatçıklı, uzun bir roket. 3, 2, 1... Ateşle!',
    zorluk: 2,
    renkler: { a: 'beyaz', b: 'koyu-gri', c: 'kirmizi' },
    adimlar: [
      adim(
        p('tugla-2x2', 'b', 2, 2, 0),
        p('egim-45-1x2', 'c', 4, 2, 0),
        p('egim-45-1x2', 'c', 0, 3, 0, 180),
        p('egim-45-1x2', 'c', 3, 4, 0, 90),
        p('egim-45-1x2', 'c', 2, 0, 0, 270),
      ),
      adim(p('tugla-2x2', 'a', 2, 2, 3), p('tugla-2x2', 'a', 2, 2, 6)),
      adim(p('tugla-2x2', 'cam', 2, 2, 9), p('tugla-2x2', 'a', 2, 2, 12)),
      adim(p('egim-45-2x2', 'c', 2, 2, 15, 90), p('yuvarlak-plaka-1x1', 'c', 2, 3, 18)),
    ],
  },
  {
    id: 'gemi',
    ad: 'Küçük Gemi',
    emoji: '🚢',
    aciklama: 'Sivri burunlu, bacalı bir gemi. Denizlere açılalım!',
    zorluk: 2,
    renkler: { a: 'kirmizi', w: 'beyaz', c: 'sari' },
    adimlar: [
      adim(p('tugla-2x4', 'a', 0, 0, 0), p('tugla-2x4', 'a', 0, 2, 0), p('egim-45-2x4', 'a', 4, 0, 0, 90)),
      adim(p('plaka-4x4', 'w', 0, 0, 3)),
      adim(p('tugla-2x2', 'c', 0, 1, 4), p('tugla-1x2', 'cam', 2, 1, 4, 90)),
      adim(p('plaka-2x4', 'c', 0, 1, 7), p('yuvarlak-tugla-1x1', 'k', 1, 1, 8), p('yuvarlak-tugla-1x1', 'k', 1, 1, 11)),
    ],
  },
  {
    id: 'tren',
    ad: 'Buharlı Tren',
    emoji: '🚂',
    aciklama: 'Bacasından duman çıkan eski usul bir lokomotif. Çuf çuf!',
    zorluk: 3,
    renkler: { a: 'koyu-yesil', c: 'kirmizi' },
    adimlar: [
      tekerlekler(1, 5),
      adim(p('plaka-2x8', 'k', 0, 1, 3)),
      adim(p('tugla-2x2', 'a', 0, 1, 4), p('yuvarlak-tugla-2x2', 'a', 2, 1, 4), p('yuvarlak-tugla-2x2', 'a', 4, 1, 4), p('tugla-1x2', 'c', 6, 1, 4, 90)),
      adim(p('tugla-2x2', 'a', 0, 1, 7), p('yuvarlak-tugla-2x2', 'a', 2, 1, 7), p('yuvarlak-tugla-1x1', 'k', 5, 1, 7)),
      adim(p('plaka-2x3', 'c', 0, 1, 10, 90), p('yuvarlak-tugla-1x1', 'k', 5, 1, 10)),
    ],
  },
  // ---------------------------------------------------------------- Hayvanlar
  {
    id: 'kopek',
    ad: 'Sevimli Köpek',
    emoji: '🐶',
    aciklama: 'Dört ayaklı, kuyruğunu sallayan bir köpek. Ona bir isim koy!',
    zorluk: 2,
    renkler: { a: 'kahverengi', b: 'bej' },
    adimlar: [
      adim(p('tugla-1x1', 'a', 0, 0, 0), p('tugla-1x1', 'a', 0, 1, 0), p('tugla-1x1', 'a', 3, 0, 0), p('tugla-1x1', 'a', 3, 1, 0)),
      adim(p('tugla-2x4', 'a', 0, 0, 3)),
      adim(p('tugla-2x3', 'a', 3, 0, 6), p('tugla-1x1', 'a', 0, 0, 6), p('yuvarlak-plaka-1x1', 'a', 0, 0, 9)),
      adim(p('plaka-1x2', 'b', 5, 0, 9, 90), p('tugla-1x1', 'k', 3, 0, 9), p('tugla-1x1', 'k', 3, 1, 9)),
      adim(p('yuvarlak-plaka-1x1', 'k', 5, 0, 10), p('yuvarlak-plaka-1x1', 'k', 4, 0, 9), p('yuvarlak-plaka-1x1', 'k', 4, 1, 9)),
    ],
  },
  {
    id: 'kedi',
    ad: 'Oturan Kedi',
    emoji: '🐱',
    aciklama: 'Kulakları dik, kuyruğu havada oturan bir kedi. Miyav!',
    zorluk: 1,
    renkler: { a: 'turuncu', b: 'beyaz' },
    adimlar: [
      adim(p('tugla-2x4', 'a', 0, 0, 0)),
      adim(p('tugla-2x2', 'b', 2, 0, 3), p('tugla-1x1', 'a', 0, 0, 3)),
      adim(p('tugla-2x2', 'a', 2, 0, 6), p('tugla-1x1', 'a', 0, 0, 6)),
      adim(p('tugla-1x1', 'a', 2, 0, 9), p('tugla-1x1', 'a', 2, 1, 9), p('yuvarlak-plaka-1x1', 'k', 3, 0, 9), p('yuvarlak-plaka-1x1', 'k', 3, 1, 9)),
    ],
  },
  {
    id: 'ordek',
    ad: 'Sarı Ördek',
    emoji: '🦆',
    aciklama: 'Turuncu gagalı, sarı bir ördek. Vak vak!',
    zorluk: 1,
    renkler: { a: 'sari', c: 'turuncu' },
    adimlar: [
      adim(p('plaka-2x4', 'c', 0, 0, 0)),
      adim(p('tugla-2x4', 'a', 0, 0, 1)),
      adim(p('egim-45-2x2', 'a', 0, 0, 4, 270), p('tugla-2x2', 'a', 2, 0, 4)),
      adim(p('tugla-2x2', 'a', 2, 0, 7), p('egim-45-1x2', 'c', 4, 0, 7), p('egim-45-1x2', 'c', 4, 1, 7)),
      adim(p('yuvarlak-plaka-1x1', 'k', 3, 0, 10), p('yuvarlak-plaka-1x1', 'k', 3, 1, 10)),
    ],
  },
  {
    id: 'dinozor',
    ad: 'Dinozor',
    emoji: '🦖',
    aciklama: 'Uzun kuyruklu, sırtı dikenli kocaman bir dinozor. Grrr!',
    zorluk: 3,
    renkler: { a: 'yesil', b: 'sari' },
    adimlar: [
      adim(p('tugla-1x2', 'a', 3, 0, 0, 90), p('tugla-1x2', 'a', 6, 0, 0, 90)),
      adim(p('tugla-2x4', 'a', 3, 0, 3)),
      adim(p('plaka-2x4', 'a', 0, 0, 6), p('tugla-2x2', 'a', 5, 0, 6)),
      adim(p('tugla-2x4', 'a', 5, 0, 9), p('egim-45-1x2', 'a', 0, 0, 7, 180), p('egim-45-1x2', 'a', 0, 1, 7, 180)),
      adim(
        p('yuvarlak-plaka-1x1', 'b', 2, 0, 7),
        p('yuvarlak-plaka-1x1', 'b', 3, 1, 7),
        p('yuvarlak-plaka-1x1', 'b', 4, 0, 6),
        p('yuvarlak-plaka-1x1', 'k', 7, 0, 12),
        p('yuvarlak-plaka-1x1', 'k', 7, 1, 12),
      ),
    ],
  },
  {
    id: 'penguen',
    ad: 'Penguen',
    emoji: '🐧',
    aciklama: 'Beyaz karınlı, turuncu gagalı küçük bir penguen.',
    zorluk: 1,
    renkler: { k: 'siyah', w: 'beyaz', c: 'turuncu' },
    adimlar: [
      adim(p('plaka-2x4', 'c', 0, 0, 0)),
      adim(p('tugla-2x2', 'k', 0, 0, 1), p('tugla-1x2', 'w', 2, 0, 1, 90)),
      adim(p('tugla-2x2', 'k', 0, 0, 4), p('tugla-1x2', 'w', 2, 0, 4, 90)),
      adim(p('tugla-2x3', 'k', 0, 0, 7, 90), p('yuvarlak-plaka-1x1', 'c', 2, 0, 7)),
      adim(p('yuvarlak-plaka-1x1', 'w', 1, 0, 10), p('yuvarlak-plaka-1x1', 'w', 1, 1, 10)),
    ],
  },
  {
    id: 'tavsan',
    ad: 'Tavşan',
    emoji: '🐰',
    aciklama: 'Uzun kulaklı, pamuk kuyruklu bir tavşan. Havuç sever!',
    zorluk: 1,
    renkler: { a: 'beyaz', b: 'pembe' },
    adimlar: [
      adim(p('tugla-2x4', 'a', 0, 0, 0)),
      adim(p('tugla-2x2', 'a', 2, 0, 3), p('yuvarlak-plaka-1x1', 'a', 0, 0, 3)),
      adim(p('tugla-1x1', 'a', 2, 0, 6), p('tugla-1x1', 'a', 2, 1, 6), p('yuvarlak-plaka-1x1', 'b', 3, 0, 6), p('yuvarlak-plaka-1x1', 'k', 3, 1, 6)),
      adim(p('tugla-1x1', 'a', 2, 0, 9), p('tugla-1x1', 'a', 2, 1, 9)),
      adim(p('yuvarlak-plaka-1x1', 'b', 2, 0, 12), p('yuvarlak-plaka-1x1', 'b', 2, 1, 12)),
    ],
  },
  {
    id: 'fil',
    ad: 'Fil',
    emoji: '🐘',
    aciklama: 'Kalın bacaklı, uzun hortumlu, kocaman kulaklı bir fil.',
    zorluk: 2,
    renkler: { a: 'acik-gri', b: 'koyu-gri' },
    adimlar: [
      adim(p('tugla-2x2', 'a', 0, 0, 0), p('tugla-2x2', 'a', 3, 0, 0)),
      adim(p('tugla-2x6', 'a', 0, 0, 3)),
      adim(p('tugla-2x2', 'a', 4, 0, 6), p('tugla-1x2', 'b', 6, 0, 6, 90)),
      adim(p('plaka-2x4', 'b', 3, -1, 9, 90), p('tugla-1x1', 'a', 6, 0, 3), p('tugla-1x1', 'a', 6, 0, 0)),
      adim(p('yuvarlak-plaka-1x1', 'k', 5, 0, 9)),
    ],
  },
  // ---------------------------------------------------------------- Binalar ve eşyalar
  {
    id: 'ev',
    ad: 'Kırmızı Çatılı Ev',
    emoji: '🏠',
    aciklama: 'Kapısı ve çatısı olan şirin bir ev. İçinde kim yaşıyor?',
    zorluk: 3,
    renkler: { a: 'beyaz', b: 'kirmizi', z: 'yesil' },
    adimlar: [
      adim(p('plaka-4x6', 'z', 0, 0, 0)),
      adim(
        p('tugla-1x4', 'a', 0, 0, 1), p('tugla-1x2', 'a', 4, 0, 1),
        p('tugla-1x2', 'a', 0, 1, 1, 90), p('tugla-1x2', 'a', 5, 1, 1, 90),
        p('tugla-1x2', 'a', 0, 3, 1), p('tugla-1x2', 'a', 4, 3, 1),
      ),
      adim(
        p('tugla-1x2', 'a', 0, 0, 4), p('tugla-1x4', 'a', 2, 0, 4),
        p('tugla-1x2', 'a', 0, 1, 4, 90), p('tugla-1x2', 'a', 5, 1, 4, 90),
        p('tugla-1x2', 'cam', 0, 3, 4), p('tugla-1x2', 'cam', 4, 3, 4),
      ),
      adim(p('tugla-1x6', 'a', 0, 3, 7), p('tugla-1x6', 'a', 0, 0, 7), p('tugla-1x2', 'a', 0, 1, 7, 90), p('tugla-1x2', 'a', 5, 1, 7, 90)),
      adim(p('plaka-4x6', 'b', 0, 0, 10)),
      adim(p('egim-45-2x4', 'b', 1, 0, 11, 180), p('egim-45-2x4', 'b', 1, 2, 11)),
    ],
  },
  {
    id: 'kale-kulesi',
    ad: 'Kale Kulesi',
    emoji: '🏰',
    aciklama: 'Mazgallı, yüksek bir kale kulesi. Şövalyeler nöbette!',
    zorluk: 2,
    renkler: { a: 'acik-gri', z: 'yesil' },
    adimlar: [
      adim(p('plaka-4x4', 'z', 0, 0, 0)),
      adim(p('tugla-1x4', 'a', 0, 0, 1), p('tugla-1x4', 'a', 0, 3, 1), p('tugla-1x2', 'a', 0, 1, 1, 90), p('tugla-1x2', 'a', 3, 1, 1, 90)),
      adim(p('tugla-1x4', 'a', 0, 0, 4, 90), p('tugla-1x4', 'a', 3, 0, 4, 90), p('tugla-1x2', 'a', 1, 0, 4), p('tugla-1x2', 'a', 1, 3, 4)),
      adim(p('tugla-1x4', 'a', 0, 0, 7), p('tugla-1x4', 'a', 0, 3, 7), p('tugla-1x2', 'a', 0, 1, 7, 90), p('tugla-1x2', 'a', 3, 1, 7, 90)),
      adim(p('tugla-1x1', 'a', 0, 0, 10), p('tugla-1x1', 'a', 3, 0, 10), p('tugla-1x1', 'a', 0, 3, 10), p('tugla-1x1', 'a', 3, 3, 10)),
    ],
  },
  {
    id: 'isikli-kule',
    ad: 'Işıklı Kule',
    emoji: '🗼',
    aciklama: 'Yükseklere uzanan bir kule. En üste renkli ışıklar koy!',
    zorluk: 1,
    renkler: { a: 'sari', c: 'turuncu' },
    adimlar: [
      adim(p('tugla-2x2', 'a', 0, 0, 0), p('tugla-2x2', 'b', 0, 0, 3)),
      adim(p('tugla-2x2', 'a', 0, 0, 6), p('tugla-2x2', 'b', 0, 0, 9)),
      adim(p('tugla-2x2', 'a', 0, 0, 12)),
      adim(p('yuvarlak-plaka-1x1', 'c', 0, 0, 15), p('yuvarlak-plaka-1x1', 'c', 1, 0, 15), p('yuvarlak-plaka-1x1', 'c', 0, 1, 15), p('yuvarlak-plaka-1x1', 'c', 1, 1, 15)),
    ],
  },
  {
    id: 'kopru',
    ad: 'Köprü',
    emoji: '🌉',
    aciklama: 'İki ayağı ve rampaları olan bir köprü. Arabalar üstünden geçsin!',
    zorluk: 2,
    renkler: { a: 'koyu-gri', b: 'kirmizi' },
    adimlar: [
      adim(p('tugla-2x2', 'a', 2, 0, 0), p('tugla-2x2', 'a', 8, 0, 0)),
      adim(p('tugla-2x2', 'a', 2, 0, 3), p('tugla-2x2', 'a', 8, 0, 3)),
      adim(p('tugla-2x2', 'a', 0, 0, 0), p('tugla-2x2', 'a', 10, 0, 0)),
      adim(p('egim-45-2x2', 'a', 0, 0, 3, 270), p('egim-45-2x2', 'a', 10, 0, 3, 90)),
      adim(p('plaka-2x8', 'b', 2, 0, 6)),
      adim(p('tugla-1x1', 'b', 2, 0, 7), p('tugla-1x1', 'b', 9, 0, 7), p('tugla-1x1', 'b', 2, 1, 7), p('tugla-1x1', 'b', 9, 1, 7)),
    ],
  },
  {
    id: 'agac',
    ad: 'Elma Ağacı',
    emoji: '🌳',
    aciklama: 'Kahverengi gövdeli, yeşil yapraklı, kırmızı elmalı bir ağaç.',
    zorluk: 1,
    renkler: { c: 'kirmizi' },
    adimlar: [
      adim(p('tugla-2x2', 't', 1, 1, 0), p('tugla-2x2', 't', 1, 1, 3)),
      adim(p('plaka-4x4', 'z', 0, 0, 6)),
      adim(p('tugla-2x2', 'z', 0, 0, 7), p('tugla-2x2', 'z', 2, 0, 7), p('tugla-2x2', 'z', 0, 2, 7), p('tugla-2x2', 'z', 2, 2, 7)),
      adim(p('tugla-2x2', 'z', 1, 1, 10), p('yuvarlak-plaka-1x1', 'c', 0, 3, 10), p('yuvarlak-plaka-1x1', 'c', 3, 0, 10), p('yuvarlak-plaka-1x1', 'c', 3, 3, 10)),
    ],
  },
  {
    id: 'masa-sandalye',
    ad: 'Masa ve Sandalye',
    emoji: '🪑',
    aciklama: 'Dört ayaklı bir masa ve yanında arkalıklı bir sandalye.',
    zorluk: 1,
    renkler: { t: 'kahverengi', b: 'kirmizi' },
    adimlar: [
      adim(p('tugla-1x1', 't', 0, 0, 0), p('tugla-1x1', 't', 3, 0, 0), p('tugla-1x1', 't', 0, 3, 0), p('tugla-1x1', 't', 3, 3, 0)),
      adim(p('plaka-4x4', 't', 0, 0, 3)),
      adim(p('tugla-1x1', 'b', 5, 1, 0), p('tugla-1x1', 'b', 6, 1, 0), p('tugla-1x1', 'b', 5, 2, 0), p('tugla-1x1', 'b', 6, 2, 0)),
      adim(p('plaka-2x2', 'b', 5, 1, 3), p('tugla-1x2', 'b', 6, 1, 4, 90)),
    ],
  },
  {
    id: 'kardan-adam',
    ad: 'Kardan Adam',
    emoji: '⛄',
    aciklama: 'Siyah şapkalı, havuç burunlu bir kardan adam. Brrr, soğuk!',
    zorluk: 1,
    renkler: { w: 'beyaz', k: 'siyah', c: 'turuncu' },
    adimlar: [
      adim(p('tugla-2x4', 'w', 0, 1, 0), p('tugla-2x4', 'w', 1, 0, 3, 90)),
      adim(p('tugla-2x2', 'w', 1, 1, 6)),
      adim(p('plaka-2x2', 'c', 1, 1, 9), p('tugla-2x2', 'w', 1, 1, 10)),
      adim(p('plaka-2x4', 'k', 0, 1, 13), p('tugla-2x2', 'k', 1, 1, 14)),
    ],
  },
  {
    id: 'robot',
    ad: 'Robot',
    emoji: '🤖',
    aciklama: 'Kolları ve anteni olan güçlü bir robot. Bip bop!',
    zorluk: 2,
    renkler: { a: 'acik-gri', b: 'mavi', c: 'kirmizi' },
    adimlar: [
      adim(p('tugla-1x2', 'b', 1, 0, 0, 90), p('tugla-1x2', 'b', 4, 0, 0, 90)),
      adim(p('tugla-1x2', 'b', 1, 0, 3, 90), p('tugla-1x2', 'b', 4, 0, 3, 90)),
      adim(p('tugla-2x4', 'a', 1, 0, 6), p('tugla-2x4', 'c', 1, 0, 9)),
      adim(p('plaka-2x6', 'a', 0, 0, 12), p('tugla-1x2', 'b', 0, 0, 9, 90), p('tugla-1x2', 'b', 5, 0, 9, 90)),
      adim(p('tugla-2x2', 'a', 2, 0, 13), p('yuvarlak-plaka-1x1', 'k', 3, 0, 16), p('yuvarlak-plaka-1x1', 'k', 3, 1, 16), p('yuvarlak-tugla-1x1', 'c', 2, 0, 16)),
    ],
  },
  {
    id: 'kalp',
    ad: 'Kalp',
    emoji: '❤️',
    aciklama: 'Sevdiklerine hediye edebileceğin kocaman bir kalp.',
    zorluk: 1,
    renkler: { a: 'kirmizi', b: 'pembe' },
    adimlar: [
      // Yere yatırılmış kalp: üstten bakınca kalp şekli
      adim(p('tugla-1x1', 'a', 3, 5, 0), p('tugla-1x3', 'a', 2, 4, 0), p('tugla-1x4', 'a', 1, 3, 0), p('tugla-1x1', 'a', 5, 3, 0)),
      adim(p('tugla-1x3', 'a', 0, 2, 0), p('tugla-1x4', 'a', 3, 2, 0), p('tugla-1x4', 'a', 0, 1, 0), p('tugla-1x3', 'a', 4, 1, 0)),
      adim(p('tugla-1x2', 'a', 1, 0, 0), p('tugla-1x2', 'a', 4, 0, 0), p('yuvarlak-plaka-1x1', 'b', 1, 1, 3), p('yuvarlak-plaka-1x1', 'b', 4, 1, 3)),
    ],
  },
  {
    id: 'merdiven',
    ad: 'Merdiven',
    emoji: '🪜',
    aciklama: 'Basamak basamak yükselen bir merdiven. Figürlerin tırmansın!',
    zorluk: 1,
    adimlar: [
      adim(p('tugla-2x4', 'a', 0, 0, 0), p('tugla-2x2', 'b', 4, 0, 0)),
      adim(p('tugla-2x4', 'a', 0, 0, 3)),
      adim(p('tugla-2x2', 'a', 0, 0, 6)),
    ],
  },
];

/** Bir modelin rollerini verilen renklerle boyayıp adımlara çevirir */
export function boya(model: KutuphaneModeli, renk: (r: Rol) => string): Adim[] {
  return model.adimlar.map((a) => ({
    parcalar: a.parcalar.map(({ rol, ...geri }) => ({ ...geri, renkId: renk(rol) })),
  }));
}

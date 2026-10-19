import type { AnalizYaniti, Isaret, ModelOnerisi, ParcaSatiri } from '../shared/tipler';
import { yapiParcalari, yapiyiDuzelt, type Adim } from '../shared/yapi';

type P = [parcaId: string, renkId: string, x: number, y: number, z: number, yon?: 0 | 90];
const adim = (...parcalar: P[]): Adim => ({
  parcalar: parcalar.map(([parcaId, renkId, x, y, z, yon = 0]) => ({ parcaId, renkId, x, y, z, yon })),
});

const model = (ad: string, emoji: string, aciklama: string, zorluk: number, adimlar: Adim[]): ModelOnerisi => {
  const temiz = yapiyiDuzelt(adimlar);
  return { ad, emoji, aciklama, zorluk, adimlar: temiz, parcalar: yapiParcalari(temiz) };
};

export const sahteOneriler = (): ModelOnerisi[] => [
  model('Kırmızı Spor Araba', '🏎️', 'Yeşil şasili, beyaz tavanlı hızlı bir araba, Ilgaz!', 2, [
    adim(['plaka-2x6', 'yesil', 0, 0, 0], ['plaka-2x6', 'yesil', 0, 2, 0]),
    adim(['tugla-2x4', 'kirmizi', 0, 0, 1], ['tugla-2x4', 'kirmizi', 0, 2, 1]),
    adim(['egim-45-2x2', 'kirmizi', 4, 0, 1], ['egim-45-2x2', 'kirmizi', 4, 2, 1]),
    adim(['tugla-1x2', 'mavi', 1, 0, 4, 90], ['tugla-1x2', 'mavi', 1, 2, 4, 90], ['tugla-2x2', 'sari', 2, 1, 4]),
    adim(['plaka-1x4', 'beyaz', 1, 0, 7, 90], ['plaka-1x4', 'beyaz', 2, 0, 7, 90], ['plaka-1x4', 'beyaz', 3, 0, 7, 90]),
  ]),
  model('Işıklı Kule', '🗼', 'Yükseklere uzanan sarı bir kule. En üste turuncu ışıklar koy!', 1, [
    adim(['tugla-2x2', 'sari', 0, 0, 0], ['tugla-2x2', 'sari', 0, 0, 3]),
    adim(['tugla-2x2', 'sari', 0, 0, 6], ['tugla-2x2', 'sari', 0, 0, 9]),
    adim(['tugla-2x2', 'sari', 0, 0, 12], ['tugla-2x2', 'sari', 0, 0, 15]),
    adim(['yuvarlak-plaka-1x1', 'turuncu', 0, 0, 18], ['yuvarlak-plaka-1x1', 'turuncu', 1, 0, 18], ['yuvarlak-plaka-1x1', 'turuncu', 0, 1, 18], ['yuvarlak-plaka-1x1', 'turuncu', 1, 1, 18]),
  ]),
  model('Mavi Bacaklı Robot', '🤖', 'Kırmızı gövdeli, sarı kafalı sevimli bir robot. Ona bir isim ver!', 2, [
    adim(['tugla-1x2', 'mavi', 0, 0, 0, 90], ['tugla-1x2', 'mavi', 3, 0, 0, 90]),
    adim(['tugla-1x2', 'mavi', 0, 0, 3, 90], ['tugla-1x2', 'mavi', 3, 0, 3, 90]),
    adim(['tugla-2x4', 'kirmizi', 0, 0, 6]),
    adim(['tugla-2x4', 'kirmizi', 0, 0, 9]),
    adim(['tugla-2x2', 'sari', 1, 0, 12]),
    adim(['karo-1x2', 'acik-gri', 1, 0, 15, 90], ['karo-1x2', 'acik-gri', 2, 0, 15, 90]),
  ]),
];

/** SAHTE_MOD=1 iken anahtar olmadan arayüzü denemek için örnek sonuç */
export const sahteYanit = (): AnalizYaniti => ({
  sahte: true,
  not: 'Bu örnek bir sonuç. Gerçek tanıma için yapay zeka anahtarını ekle.',
  parcalar: [
    { parcaId: 'tugla-2x4', renkId: 'kirmizi', adet: 4, guven: 'yuksek' },
    { parcaId: 'tugla-2x2', renkId: 'sari', adet: 6, guven: 'yuksek' },
    { parcaId: 'tugla-1x2', renkId: 'mavi', adet: 5, guven: 'orta' },
    { parcaId: 'plaka-2x6', renkId: 'yesil', adet: 2, guven: 'yuksek' },
    { parcaId: 'plaka-1x4', renkId: 'beyaz', adet: 3, guven: 'orta' },
    { parcaId: 'egim-45-2x2', renkId: 'kirmizi', adet: 2, guven: 'dusuk' },
    { parcaId: 'yuvarlak-plaka-1x1', renkId: 'turuncu', adet: 4, guven: 'orta' },
    { parcaId: 'tekerlek', renkId: 'siyah', adet: 4, guven: 'yuksek' },
    { parcaId: 'karo-1x2', renkId: 'acik-gri', adet: 2, guven: 'dusuk' },
  ],
});

/** Deneme modu için parçaları fotoğrafa ızgara gibi yerleştiren sahte kutular */
export function sahteIsaretler(parcalar: ParcaSatiri[]): Isaret[] {
  const isaretler: Isaret[] = [];
  const toplam = parcalar.reduce((t, p) => t + p.adet, 0);
  const sutun = Math.ceil(Math.sqrt(toplam * 1.4));
  let i = 0;
  for (const p of parcalar) {
    for (let n = 0; n < p.adet; n++, i++) {
      const x = (i % sutun) * (1000 / sutun);
      const y = Math.floor(i / sutun) * (1000 / Math.ceil(toplam / sutun));
      const g = 1000 / sutun;
      const h = 1000 / Math.ceil(toplam / sutun);
      isaretler.push({ parcaId: p.parcaId, renkId: p.renkId, kutu: [Math.round(y + h * 0.15), Math.round(x + g * 0.1), Math.round(y + h * 0.85), Math.round(x + g * 0.9)] });
    }
  }
  return isaretler;
}

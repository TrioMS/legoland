import type { AnalizYaniti } from '../shared/tipler';

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

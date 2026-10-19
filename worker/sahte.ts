import type { AnalizYaniti, ModelOnerisi } from '../shared/tipler';

export const sahteOneriler = (): ModelOnerisi[] => [
  {
    ad: 'Kırmızı Yarış Arabası',
    emoji: '🏎️',
    aciklama: 'Dört tekerlekli hızlı bir araba! Yeşil plaka gövdesi olsun.',
    zorluk: 1,
    parcalar: [
      { parcaId: 'plaka-2x6', renkId: 'yesil', adet: 1 },
      { parcaId: 'tugla-2x4', renkId: 'kirmizi', adet: 2 },
      { parcaId: 'egim-45-2x2', renkId: 'kirmizi', adet: 1 },
      { parcaId: 'tekerlek', renkId: 'siyah', adet: 4 },
    ],
  },
  {
    ad: 'Sarı Kule',
    emoji: '🗼',
    aciklama: 'Yükseklere uzanan renkli bir kule yap. En üste turuncu ışıklar koy!',
    zorluk: 1,
    parcalar: [
      { parcaId: 'tugla-2x2', renkId: 'sari', adet: 6 },
      { parcaId: 'yuvarlak-plaka-1x1', renkId: 'turuncu', adet: 4 },
    ],
  },
  {
    ad: 'Mavi Robot',
    emoji: '🤖',
    aciklama: 'Kolları ve kafası olan sevimli bir robot. Ona bir isim ver!',
    zorluk: 2,
    parcalar: [
      { parcaId: 'tugla-1x2', renkId: 'mavi', adet: 5 },
      { parcaId: 'tugla-2x2', renkId: 'sari', adet: 2 },
      { parcaId: 'plaka-1x4', renkId: 'beyaz', adet: 2 },
      { parcaId: 'karo-1x2', renkId: 'acik-gri', adet: 1 },
    ],
  },
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

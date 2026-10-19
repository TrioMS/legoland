// Uygulamanın tanıdığı parça türleri ve renkler.
// Yapay zeka yalnızca bu listeden seçim yapar; düzeltme ekranı da aynı listeyi kullanır.

export type Sekil = 'tugla' | 'plaka' | 'karo' | 'egim' | 'yuvarlak' | 'ozel' | 'technic';

export interface ParcaTuru {
  id: string;
  ad: string;
  sekil: Sekil;
  /** Üstten bakınca çivi sayısı (en x boy). Özel parçalarda yaklaşık değer. */
  en: number;
  boy: number;
  /** Özel parçalar için ekranda gösterilecek emoji */
  emoji?: string;
  /** Yapay zekaya parçayı tarif eden İngilizce ipucu */
  ipucu: string;
}

export interface Renk {
  id: string;
  ad: string;
  hex: string;
  /** Yapay zekaya rengi tarif eden resmi LEGO renk adı */
  legoAdi: string;
}

const olcu = (en: number, boy: number) => `${en}x${boy}`;

function tuglalar(): ParcaTuru[] {
  const olculer: [number, number][] = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 2], [2, 3], [2, 4], [2, 6], [2, 8]];
  return olculer.map(([en, boy]) => ({
    id: `tugla-${olcu(en, boy)}`,
    ad: `Tuğla ${olcu(en, boy)}`,
    sekil: 'tugla',
    en,
    boy,
    ipucu: `Brick ${en} x ${boy} (full height, ${en * boy} studs)`,
  }));
}

function plakalar(): ParcaTuru[] {
  const olculer: [number, number][] = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 2], [2, 3], [2, 4], [2, 6], [2, 8], [4, 4], [4, 6], [4, 8], [6, 6], [6, 8], [8, 8]];
  return olculer.map(([en, boy]) => ({
    id: `plaka-${olcu(en, boy)}`,
    ad: `Plaka ${olcu(en, boy)}`,
    sekil: 'plaka',
    en,
    boy,
    ipucu: `Plate ${en} x ${boy} (thin, one third of a brick height, ${en * boy} studs)`,
  }));
}

function karolar(): ParcaTuru[] {
  const olculer: [number, number][] = [[1, 1], [1, 2], [1, 4], [2, 2]];
  return olculer.map(([en, boy]) => ({
    id: `karo-${olcu(en, boy)}`,
    ad: `Düz karo ${olcu(en, boy)}`,
    sekil: 'karo',
    en,
    boy,
    ipucu: `Tile ${en} x ${boy} (thin and smooth top, no studs)`,
  }));
}

const egimler: ParcaTuru[] = [
  { id: 'egim-45-1x2', ad: 'Eğimli 1x2', sekil: 'egim', en: 1, boy: 2, ipucu: 'Slope 45 degrees 2 x 1' },
  { id: 'egim-45-2x2', ad: 'Eğimli 2x2', sekil: 'egim', en: 2, boy: 2, ipucu: 'Slope 45 degrees 2 x 2' },
  { id: 'egim-45-2x4', ad: 'Eğimli 2x4', sekil: 'egim', en: 2, boy: 4, ipucu: 'Slope 45 degrees 2 x 4' },
  { id: 'egim-ters-2x2', ad: 'Ters eğimli 2x2', sekil: 'egim', en: 2, boy: 2, ipucu: 'Inverted slope 45 degrees 2 x 2' },
  { id: 'egim-kavisli-1x2', ad: 'Kavisli 1x2', sekil: 'egim', en: 1, boy: 2, ipucu: 'Curved slope 2 x 1' },
  { id: 'egim-kavisli-1x4', ad: 'Kavisli 1x4', sekil: 'egim', en: 1, boy: 4, ipucu: 'Curved slope 4 x 1' },
];

const yuvarlaklar: ParcaTuru[] = [
  { id: 'yuvarlak-tugla-1x1', ad: 'Yuvarlak tuğla 1x1', sekil: 'yuvarlak', en: 1, boy: 1, ipucu: 'Round brick 1 x 1' },
  { id: 'yuvarlak-tugla-2x2', ad: 'Yuvarlak tuğla 2x2', sekil: 'yuvarlak', en: 2, boy: 2, ipucu: 'Round brick 2 x 2' },
  { id: 'yuvarlak-plaka-1x1', ad: 'Yuvarlak plaka 1x1', sekil: 'yuvarlak', en: 1, boy: 1, ipucu: 'Round plate 1 x 1 (small dot)' },
  { id: 'yuvarlak-plaka-2x2', ad: 'Yuvarlak plaka 2x2', sekil: 'yuvarlak', en: 2, boy: 2, ipucu: 'Round plate 2 x 2' },
];

const ozeller: ParcaTuru[] = [
  { id: 'tekerlek', ad: 'Tekerlek', sekil: 'ozel', en: 2, boy: 2, emoji: '🛞', ipucu: 'Wheel with tire (count wheel+tire as one)' },
  { id: 'tekerlek-tutucu', ad: 'Tekerlek tutucu', sekil: 'ozel', en: 2, boy: 2, emoji: '🔩', ipucu: 'Wheel holder / axle plate 2 x 2' },
  { id: 'pencere', ad: 'Pencere', sekil: 'ozel', en: 1, boy: 4, emoji: '🪟', ipucu: 'Window frame (any size)' },
  { id: 'kapi', ad: 'Kapı', sekil: 'ozel', en: 1, boy: 4, emoji: '🚪', ipucu: 'Door or door frame (any size)' },
  { id: 'cam', ad: 'Ön cam', sekil: 'ozel', en: 2, boy: 4, emoji: '🔷', ipucu: 'Windscreen / transparent canopy' },
  { id: 'mentese', ad: 'Menteşe', sekil: 'ozel', en: 1, boy: 2, emoji: '🔗', ipucu: 'Hinge brick or hinge plate' },
  { id: 'cicek-bitki', ad: 'Çiçek / bitki', sekil: 'ozel', en: 1, boy: 1, emoji: '🌼', ipucu: 'Flower, plant, leaves or tree piece' },
  { id: 'minifigur', ad: 'Minifigür', sekil: 'ozel', en: 1, boy: 2, emoji: '🧍', ipucu: 'Minifigure (whole figure or body part counts as one)' },
  { id: 'aksesuar', ad: 'Aksesuar', sekil: 'ozel', en: 1, boy: 1, emoji: '🎒', ipucu: 'Minifigure accessory, tool, hat, hair or small decorative piece' },
  { id: 'kemer', ad: 'Kemer', sekil: 'ozel', en: 1, boy: 4, emoji: '🌉', ipucu: 'Arch brick (any size)' },
  { id: 'kucuk-bag', ad: 'Ara parça (bracket/SNOT)', sekil: 'ozel', en: 1, boy: 2, emoji: '📐', ipucu: 'Bracket, brick with side studs, or other connector' },
];

const technicler: ParcaTuru[] = [
  { id: 'technic-kiris', ad: 'Technic kiriş', sekil: 'technic', en: 1, boy: 5, emoji: '➖', ipucu: 'Technic beam / liftarm with holes (any length)' },
  { id: 'technic-delikli-tugla', ad: 'Technic delikli tuğla', sekil: 'technic', en: 1, boy: 4, emoji: '🧱', ipucu: 'Technic brick with holes on the side' },
  { id: 'technic-pim', ad: 'Technic pim', sekil: 'technic', en: 1, boy: 1, emoji: '📌', ipucu: 'Technic pin or connector peg' },
  { id: 'technic-aks', ad: 'Technic aks', sekil: 'technic', en: 1, boy: 4, emoji: '✚', ipucu: 'Technic axle (cross-shaped rod)' },
  { id: 'technic-disli', ad: 'Technic dişli', sekil: 'technic', en: 2, boy: 2, emoji: '⚙️', ipucu: 'Technic gear' },
];

const diger: ParcaTuru = { id: 'diger', ad: 'Diğer parça', sekil: 'ozel', en: 1, boy: 1, emoji: '❓', ipucu: 'Any other LEGO piece that does not match the list' };

export const PARCA_TURLERI: ParcaTuru[] = [
  ...tuglalar(),
  ...plakalar(),
  ...karolar(),
  ...egimler,
  ...yuvarlaklar,
  ...ozeller,
  ...technicler,
  diger,
];

export const KATEGORILER: { sekil: Sekil[]; ad: string; emoji: string }[] = [
  { sekil: ['tugla'], ad: 'Tuğlalar', emoji: '🧱' },
  { sekil: ['plaka', 'karo'], ad: 'Plakalar', emoji: '▬' },
  { sekil: ['egim', 'yuvarlak'], ad: 'Eğimli & Yuvarlak', emoji: '🔺' },
  { sekil: ['ozel'], ad: 'Özel parçalar', emoji: '⭐' },
  { sekil: ['technic'], ad: 'Technic', emoji: '⚙️' },
];

export const RENKLER: Renk[] = [
  { id: 'kirmizi', ad: 'Kırmızı', hex: '#C91A09', legoAdi: 'Red (Bright Red)' },
  { id: 'koyu-kirmizi', ad: 'Bordo', hex: '#720E0F', legoAdi: 'Dark Red' },
  { id: 'turuncu', ad: 'Turuncu', hex: '#FE8A18', legoAdi: 'Orange (Bright Orange)' },
  { id: 'sari', ad: 'Sarı', hex: '#F2CD37', legoAdi: 'Yellow (Bright Yellow)' },
  { id: 'acik-yesil', ad: 'Fıstık yeşili', hex: '#BBE90B', legoAdi: 'Lime (Bright Yellowish Green)' },
  { id: 'yesil', ad: 'Yeşil', hex: '#4B9F4A', legoAdi: 'Bright Green' },
  { id: 'koyu-yesil', ad: 'Koyu yeşil', hex: '#237841', legoAdi: 'Green (Dark Green)' },
  { id: 'acik-mavi', ad: 'Açık mavi', hex: '#36AEBF', legoAdi: 'Medium Azure / Light Blue' },
  { id: 'mavi', ad: 'Mavi', hex: '#0055BF', legoAdi: 'Blue (Bright Blue)' },
  { id: 'lacivert', ad: 'Lacivert', hex: '#0A3463', legoAdi: 'Dark Blue' },
  { id: 'mor', ad: 'Mor', hex: '#81007B', legoAdi: 'Purple / Medium Lavender / Dark Purple' },
  { id: 'pembe', ad: 'Pembe', hex: '#E4ADC8', legoAdi: 'Bright Pink / Dark Pink' },
  { id: 'kahverengi', ad: 'Kahverengi', hex: '#582A12', legoAdi: 'Reddish Brown' },
  { id: 'bej', ad: 'Bej', hex: '#E4CD9E', legoAdi: 'Tan' },
  { id: 'beyaz', ad: 'Beyaz', hex: '#F4F4F4', legoAdi: 'White' },
  { id: 'acik-gri', ad: 'Açık gri', hex: '#A0A5A9', legoAdi: 'Light Bluish Gray' },
  { id: 'koyu-gri', ad: 'Koyu gri', hex: '#6C6E68', legoAdi: 'Dark Bluish Gray' },
  { id: 'siyah', ad: 'Siyah', hex: '#1B2A34', legoAdi: 'Black' },
  { id: 'seffaf', ad: 'Şeffaf', hex: '#DDEEF5', legoAdi: 'Any transparent / clear color' },
];

export const parcaBul = (id: string) => PARCA_TURLERI.find((p) => p.id === id) ?? diger;
export const renkBul = (id: string) => RENKLER.find((r) => r.id === id) ?? RENKLER.find((r) => r.id === 'acik-gri')!;

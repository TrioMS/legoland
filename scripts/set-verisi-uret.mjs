// Rebrickable CSV dökümlerinden, uygulamanın parça kataloğuyla eşleşen küçük setlerin
// özet dosyasını (public/setler.json) üretir.
//
// Kullanım:
//   1. https://rebrickable.com/downloads/ adresinden şu dosyaları indirip bir klasöre aç:
//      sets, themes, inventories, inventory_parts, parts, part_categories, colors (.csv)
//   2. node scripts/set-verisi-uret.mjs <klasör>
//
// Katalog TypeScript olduğu için id listeleri burada tekrarlanmaz; shared/katalog.ts
// derlenmeden okunamadığından eşleme kuralları isimler üzerinden yapılır ve sonuçta
// sadece katalogda bulunan id'ler kullanılır (aşağıdaki KATALOG_IDLERI kontrolü).

import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const klasor = process.argv[2];
if (!klasor) {
  console.error('Kullanım: node scripts/set-verisi-uret.mjs <rebrickable-csv-klasörü>');
  process.exit(1);
}

// ---- Ayarlar -------------------------------------------------------------
const EN_AZ_YIL = 2000;
const EN_AZ_PARCA = 15;
const EN_COK_PARCA = 300;
const EN_AZ_ESLESME = Number(process.argv[3] ?? 0.6); // setin parçalarının en az bu kadarı katalogdaki bilinen türlere uymalı
const HARIC_ANA_TEMALAR = [
  'Duplo', 'Gear', 'Books', 'Key Chains', 'Magnets', 'Collectible Minifigures', 'Service Packs',
  'Bulk Bricks', 'Supplemental', 'Educational and Dacta', 'Mindstorms', 'Power Functions', 'Powered Up',
  'Dimensions', 'Primo', 'Quatro', 'Fabuland', 'Belville', 'Clikits', 'Znap', 'Galidor', 'Scala',
  'Promotional', 'Minifigure Packs', 'Storage', 'Watches', 'Video Games', 'Clocks', 'Pens',
];

// ---- Katalog (shared/katalog.ts ile aynı olmalı) ------------------------------
const katalogKaynagi = readFileSync(new URL('../shared/katalog.ts', import.meta.url), 'utf8');
const RENK_SATIRLARI = [...katalogKaynagi.matchAll(/\{ id: '([a-z-]+)', ad: '[^']+', hex: '#([0-9A-Fa-f]{6})'/g)];
const RENKLER = RENK_SATIRLARI.map(([, id, hex]) => ({ id, rgb: hexRgb(hex) }));

const KATALOG_IDLERI = new Set([
  ...[...katalogKaynagi.matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]),
  // tuglalar() / plakalar() / karolar() fonksiyonlarıyla üretilenler
  ...olculer('tugla', [[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 2], [2, 3], [2, 4], [2, 6], [2, 8]]),
  ...olculer('plaka', [[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 2], [2, 3], [2, 4], [2, 6], [2, 8], [4, 4], [4, 6], [4, 8], [6, 6], [6, 8], [8, 8]]),
  ...olculer('karo', [[1, 1], [1, 2], [1, 4], [2, 2]]),
]);

function olculer(onek, liste) {
  return liste.map(([a, b]) => `${onek}-${a}x${b}`);
}
function hexRgb(hex) {
  const n = parseInt(hex, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// ---- CSV okuma ---------------------------------------------------------------
function satirAyir(satir) {
  const alanlar = [];
  let alan = '';
  let tirnak = false;
  for (let i = 0; i < satir.length; i++) {
    const c = satir[i];
    if (tirnak) {
      if (c === '"' && satir[i + 1] === '"') { alan += '"'; i++; }
      else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { alanlar.push(alan); alan = ''; }
    else alan += c;
  }
  alanlar.push(alan);
  return alanlar;
}

async function csvOku(ad, satirIsle) {
  const okuyucu = createInterface({ input: createReadStream(join(klasor, `${ad}.csv`)), crlfDelay: Infinity });
  let baslik = null;
  for await (const satir of okuyucu) {
    if (!satir) continue;
    const alanlar = satirAyir(satir);
    if (!baslik) { baslik = alanlar; continue; }
    const kayit = {};
    baslik.forEach((b, i) => (kayit[b] = alanlar[i]));
    satirIsle(kayit);
  }
}

// ---- Parça eşleme ----------------------------------------------------------------
const kategoriAdi = new Map();
await csvOku('part_categories', (k) => kategoriAdi.set(k.id, k.name));

function parcaEsle(ad, kategori) {
  let m;
  const k = (a, b) => `${Math.min(+a, +b)}x${Math.max(+a, +b)}`;
  if ((m = ad.match(/^Brick (\d+) x (\d+)$/))) return `tugla-${k(m[1], m[2])}`;
  if ((m = ad.match(/^Plate (\d+) x (\d+)$/))) return `plaka-${k(m[1], m[2])}`;
  if ((m = ad.match(/^Tile (\d+) x (\d+)( with Groove)?$/))) return `karo-${k(m[1], m[2])}`;
  if (/^Slope 45° 2 x 1( Double)?$/.test(ad)) return 'egim-45-1x2';
  if (/^Slope 45° 2 x 2$/.test(ad)) return 'egim-45-2x2';
  if (/^Slope 45° 2 x 4$/.test(ad)) return 'egim-45-2x4';
  if (/^Slope Inverted 45° 2 x 2/.test(ad)) return 'egim-ters-2x2';
  if (/^Slope Curved 2 x 1/.test(ad)) return 'egim-kavisli-1x2';
  if (/^Slope Curved 4 x 1/.test(ad)) return 'egim-kavisli-1x4';
  if (/^Brick Round 1 x 1/.test(ad)) return 'yuvarlak-tugla-1x1';
  if (/^Brick Round 2 x 2/.test(ad)) return 'yuvarlak-tugla-2x2';
  if (/^Plate Round 1 x 1/.test(ad)) return 'yuvarlak-plaka-1x1';
  if (/^Plate Round 2 x 2/.test(ad)) return 'yuvarlak-plaka-2x2';
  if (/^(Tyre|Tire)/.test(ad)) return null; // jant + lastik tek tekerlek sayılır
  if (/^Wheel/.test(ad)) return 'tekerlek';
  if (/^Plate Special 2 x 2 with Wheel Holder|Wheel Holder/.test(ad)) return 'tekerlek-tutucu';
  if (/^Arch/.test(ad)) return 'kemer';
  if (/Hinge/.test(ad)) return 'mentese';
  if (/^Door/.test(ad)) return 'kapi';
  if (/^Window/.test(ad)) return 'pencere';
  if (/^Windscreen/.test(ad)) return 'cam';
  if (/^Bracket|^Brick Special .*Studs? on (1|2|4) Sides?/.test(ad)) return 'kucuk-bag';
  if (/^Technic (Beam|Liftarm)/.test(ad)) return 'technic-kiris';
  if (/^Technic Brick/.test(ad)) return 'technic-delikli-tugla';
  if (/^Technic (Pin|Axle Pin|Connector Pin)/.test(ad)) return 'technic-pim';
  if (/^Technic Axle \d/.test(ad)) return 'technic-aks';
  if (/^Technic Gear/.test(ad)) return 'technic-disli';
  const kat = kategoriAdi.get(kategori) ?? '';
  if (/Plants and Animals/.test(kat)) return 'cicek-bitki';
  if (/Minifig Accessories|Minifig Headwear/.test(kat)) return 'aksesuar';
  if (/Minifig/.test(kat)) return null; // figür parçaları ayrı ayrı sayılmaz
  if (/Stickers|Non-LEGO|Bricks Printed|Large Buildable|Baseplates|Duplo/.test(kat)) return 'diger';
  return 'diger';
}

const parcaHaritasi = new Map(); // part_num -> katalog id | null
await csvOku('parts', (p) => {
  const id = parcaEsle(p.name, p.part_cat_id);
  parcaHaritasi.set(p.part_num, id && (KATALOG_IDLERI.has(id) ? id : 'diger'));
});

// ---- Renk eşleme (en yakın RGB, şeffaflar ayrı) -----------------------------------
const renkHaritasi = new Map();
await csvOku('colors', (c) => {
  if (c.is_trans === 'True') return renkHaritasi.set(c.id, 'seffaf');
  const rgb = hexRgb(c.rgb);
  let enIyi = RENKLER[0];
  let enAz = Infinity;
  for (const r of RENKLER) {
    if (r.id === 'seffaf') continue;
    const fark = (r.rgb[0] - rgb[0]) ** 2 * 0.3 + (r.rgb[1] - rgb[1]) ** 2 * 0.59 + (r.rgb[2] - rgb[2]) ** 2 * 0.11;
    if (fark < enAz) { enAz = fark; enIyi = r; }
  }
  renkHaritasi.set(c.id, enIyi.id);
});

// ---- Setler ----------------------------------------------------------------------
const temalar = new Map();
await csvOku('themes', (t) => temalar.set(t.id, { ad: t.name, ust: t.parent_id }));
const anaTema = (id) => {
  let t = temalar.get(id);
  while (t?.ust) t = temalar.get(t.ust);
  return t?.ad ?? '';
};

const adaySetler = new Map(); // set_num -> bilgi
await csvOku('sets', (s) => {
  const yil = +s.year;
  const adet = +s.num_parts;
  if (yil < EN_AZ_YIL || adet < EN_AZ_PARCA || adet > EN_COK_PARCA) return;
  const ana = anaTema(s.theme_id);
  if (HARIC_ANA_TEMALAR.includes(ana)) return;
  adaySetler.set(s.set_num, { no: s.set_num, ad: s.name, yil, tema: temalar.get(s.theme_id)?.ad ?? ana, satirlar: new Map(), toplam: 0, bilinen: 0 });
});

const envanterSet = new Map(); // inventory_id -> set (sadece ilk sürüm)
await csvOku('inventories', (i) => {
  if (i.version === '1' && adaySetler.has(i.set_num)) envanterSet.set(i.id, adaySetler.get(i.set_num));
});

await csvOku('inventory_parts', (ip) => {
  if (ip.is_spare === 'True') return;
  const set = envanterSet.get(ip.inventory_id);
  if (!set) return;
  const parca = parcaHaritasi.get(ip.part_num) ?? 'diger';
  if (parca === null) return;
  const adet = +ip.quantity;
  set.toplam += adet;
  if (parca === 'diger') return;
  set.bilinen += adet;
  const anahtar = `${parca}|${renkHaritasi.get(ip.color_id) ?? 'acik-gri'}`;
  set.satirlar.set(anahtar, (set.satirlar.get(anahtar) ?? 0) + adet);
});

// ---- Çıktı -----------------------------------------------------------------------
const parcaIdleri = [...KATALOG_IDLERI].sort();
const renkIdleri = RENKLER.map((r) => r.id);
const secilenler = [...adaySetler.values()]
  .filter((s) => s.toplam >= EN_AZ_PARCA && s.bilinen / s.toplam >= EN_AZ_ESLESME)
  .sort((a, b) => b.yil - a.yil);

const cikti = {
  kaynak: 'Rebrickable (rebrickable.com) veri dökümü',
  uretildi: new Date().toISOString().slice(0, 10),
  parcalar: parcaIdleri,
  renkler: renkIdleri,
  // [setNo, ad, yıl, tema, toplamParça, [parçaIndeksi, renkIndeksi, adet, ...]]
  setler: secilenler.map((s) => [
    s.no,
    s.ad,
    s.yil,
    s.tema,
    s.toplam,
    [...s.satirlar].flatMap(([k, adet]) => {
      const [p, r] = k.split('|');
      return [parcaIdleri.indexOf(p), renkIdleri.indexOf(r), adet];
    }),
  ]),
};

const hedef = new URL('../public/setler.json', import.meta.url);
writeFileSync(hedef, JSON.stringify(cikti));
console.log(`${adaySetler.size} aday setten ${secilenler.length} tanesi seçildi → public/setler.json (${(JSON.stringify(cikti).length / 1024).toFixed(0)} KB)`);

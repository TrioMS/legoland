import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../shared/katalog';
import type { Guven, HataYaniti, Isaret, Kutu, ParcaSatiri } from '../shared/tipler';

// Güncel model listesi: https://ai.google.dev/gemini-api/docs/models (ikisi de ücretsiz katmanda)
const VARSAYILAN_MODEL = 'gemini-3.8-flash';
// Ana model ücretsiz katmanda sık sık "high demand" (503) veriyor ya da 95 sn'yi aşıyordu.
// Bu durumda bir önceki nesil Flash'a geçilir. Flash-Lite kullanılmaz: çok az parça buluyor.
const YEDEK_MODEL = 'gemini-3.6-flash';
// Telefon 120 sn'de vazgeçiyor: tüm denemeler 100 sn'ye sığmalı.
const TOPLAM_SURE_SINIRI_MS = 100_000;
// İlk model en fazla 55 sn bekler; cevap gelmezse kalan süre sıradaki modele kalır
const ANA_MODEL_SURE_MS = 55_000;
// Yakın çekimlerle sayımda 3.6 Flash önce: Kasım 2026'da 3.8 Flash sık sık 503 "high demand" verdi ya da
// zaman aşımına düştü; 3.6 Flash her seferinde 6-44 sn'de cevap verdi.
const SAYIM_MODELLERI = ['gemini-3.6-flash', 'gemini-3.8-flash'];

export class GeminiHatasi extends Error {
  constructor(message: string, public kod: HataYaniti['kod'], public durum: number) {
    super(message);
  }
}

const PARCA_IDLERI = PARCA_TURLERI.map((p) => p.id);
const RENK_IDLERI = RENKLER.map((r) => r.id);
const GUVENLER: Guven[] = ['yuksek', 'orta', 'dusuk'];

const KATALOGLAR = `Part catalog (id: description):
${PARCA_TURLERI.map((p) => `${p.id}: ${p.ipucu}`).join('\n')}

Color catalog (id: LEGO color name):
${RENKLER.map((r) => `${r.id}: ${r.legoAdi}`).join('\n')}`;

const SATIR_SEMASI = {
  type: 'OBJECT',
  properties: {
    parcaId: { type: 'STRING', enum: PARCA_IDLERI },
    renkId: { type: 'STRING', enum: RENK_IDLERI },
    adet: { type: 'INTEGER' },
  },
  required: ['parcaId', 'renkId', 'adet'],
  propertyOrdering: ['parcaId', 'renkId', 'adet'],
};

interface GeminiYaniti {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: Record<string, unknown>;
  error?: { message?: string; status?: string };
}

/** Gemini'den şemaya uygun JSON ister. Model kapalıysa/kota dolmuşsa yedek modeli dener. */
async function geminiJson(
  parts: unknown[],
  sema: unknown,
  anahtar: string,
  /** Tek model adı (GEMINI_MODEL) ya da denenecek modellerin sırası */
  model?: string | string[],
  /** İsteğe bağlı ayarlar (ör. yüksek görüntü çözünürlüğü); model kabul etmezse bunlarsız tekrar denenir */
  ekAyarlar: Record<string, unknown> = {},
): Promise<any> {
  const modeller = Array.isArray(model) ? model : [...new Set([model || VARSAYILAN_MODEL, YEDEK_MODEL])];
  const baslangic = Date.now();
  const kalanSure = () => TOPLAM_SURE_SINIRI_MS - (Date.now() - baslangic);
  let yanit: Response | null = null;
  let veri: GeminiYaniti = {};
  let zamanAsimi = false;

  /** İsteği gönderir ve gövdeyi okur; süre dolarsa null döner */
  const iste = async (m: string, ek: Record<string, unknown>, sure: number) => {
    const t0 = Date.now();
    try {
      const y = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': anahtar },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: sema, ...ek },
        }),
        signal: AbortSignal.timeout(Math.max(1000, sure)),
      });
      const v = (await y.json().catch(() => ({}))) as GeminiYaniti;
      console.log('Gemini yanıtı', m, y.status, `${Date.now() - t0} ms`, v.candidates?.[0]?.finishReason ?? '', v.usageMetadata ?? '');
      return { y, v };
    } catch (e) {
      console.error('Gemini isteği zaman aşımı / ağ hatası', m, `${Date.now() - t0} ms`, e);
      return null;
    }
  };

  for (const [i, m] of modeller.entries()) {
    if (kalanSure() < 5000) break;
    // Ana model en fazla ANA_MODEL_SURE_MS bekler; kalan süre yedek modele kalır
    const sure = i === 0 && modeller.length > 1 ? Math.min(ANA_MODEL_SURE_MS, kalanSure()) : kalanSure();
    let sonuc = await iste(m, ekAyarlar, sure);
    if (sonuc && sonuc.y.status === 400 && Object.keys(ekAyarlar).length && !/API key/i.test(sonuc.v.error?.message ?? '')) {
      console.error('Gemini ek ayarları reddetti, ayarsız deneniyor', m, sonuc.v.error?.message);
      sonuc = await iste(m, {}, Math.min(sure, kalanSure()));
    }
    if (!sonuc) {
      zamanAsimi = true;
      console.log('Model takıldı, sıradakine geçiliyor', m, `${kalanSure()} ms kaldı`);
      continue; // süre doldu: yedek modeli kalan süreyle dene
    }
    yanit = sonuc.y;
    veri = sonuc.v;
    if (yanit.ok) {
      if (m !== modeller[0]) console.log('Yedek model kullanıldı', m);
      break;
    }
    console.error('Gemini hatası', m, yanit.status, veri.error);
    if (![404, 429, 500, 503].includes(yanit.status)) break;
  }

  if (!yanit?.ok && zamanAsimi && (!yanit || yanit.status !== 429)) {
    throw new GeminiHatasi('Yapay zeka şu an çok yoğun. Birkaç dakika sonra tekrar dene.', 'yavas', 504);
  }
  if (!yanit) throw new GeminiHatasi('Yapay zeka şu an cevap vermedi. Tekrar dene.', 'sunucu', 502);
  if (!yanit.ok) {
    if (yanit.status === 429) {
      throw new GeminiHatasi('Yapay zeka biraz yoruldu. Bir dakika sonra tekrar dene. (Günlük ücretsiz kota dolmuş olabilir.)', 'kota', 429);
    }
    if (yanit.status === 400 && /API key/i.test(veri.error?.message ?? '')) {
      throw new GeminiHatasi('Yapay zeka anahtarı geçersiz.', 'anahtar', 500);
    }
    if (yanit.status === 403) {
      throw new GeminiHatasi('Yapay zeka anahtarının izni yok.', 'anahtar', 500);
    }
    throw new GeminiHatasi('Yapay zeka şu an cevap vermedi. Tekrar dene.', 'sunucu', 502);
  }

  const metin = veri.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(metin);
  } catch {
    throw new GeminiHatasi('Yapay zekanın cevabı anlaşılamadı. Tekrar dene.', 'sunucu', 502);
  }
}

/** [ymin, xmin, ymax, xmax] 0-1000 aralığına sıkıştırılır; bozuk kutular atılır */
function kutuTemizle(k: unknown): Kutu | null {
  if (!Array.isArray(k) || k.length !== 4) return null;
  const [y1, x1, y2, x2] = k.map((v) => Math.max(0, Math.min(1000, Math.round(Number(v)))));
  if (![y1, x1, y2, x2].every(Number.isFinite) || y2 <= y1 || x2 <= x1) return null;
  return [y1, x1, y2, x2];
}

const satirTemizle = (s: any) => ({
  parcaId: PARCA_IDLERI.includes(s?.parcaId) ? s.parcaId : 'diger',
  renkId: RENK_IDLERI.includes(s?.renkId) ? s.renkId : 'acik-gri',
  adet: Math.max(0, Math.min(500, Math.round(Number(s?.adet) || 0))),
});

// ---- Fotoğraftan parça sayma ---------------------------------------------------

const SAYMA_TALIMATI = `You are an expert LEGO piece counter. Look at the photo of loose LEGO pieces and list every piece you can see.

Rules:
- Use ONLY the part ids and color ids from the catalogs below. If a piece does not fit any part id, use "diger".
- Count carefully. Group identical pieces (same part id and same color) into one row with the total count.
- Determine size by counting studs. A brick is tall (about 3 plates high); a plate is thin; a tile is thin and smooth.
- Pieces that are partly hidden still count if you can identify them.
- SMALL pieces (1x1 and 1x2 bricks and plates, tiles, round 1x1 pieces) are easy to miss next to big ones.
  Scan the whole photo systematically, region by region, and look for small pieces just as carefully as big ones.
- Do NOT count the table, floor, box, baseplates used as background, or non-LEGO objects.
- "guven" is your confidence for that row: "yuksek" (sure), "orta" (probably), "dusuk" (guess).
- "kutular": for EVERY single piece in that row, give its bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000.
  Try to give one box for every piece. "adet" is your careful total count for the row; do not lower it if you could not box every piece.
- "not": one short, friendly sentence in Turkish for a 7-year-old boy named Ilgaz; you may address him by name (e.g. advice like spreading pieces apart if they overlap). Leave empty if nothing to say.

${KATALOGLAR}`;

const SAYMA_SEMASI = {
  type: 'OBJECT',
  properties: {
    parcalar: {
      type: 'ARRAY',
      items: {
        ...SATIR_SEMASI,
        properties: {
          ...SATIR_SEMASI.properties,
          guven: { type: 'STRING', enum: GUVENLER },
          kutular: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'INTEGER' } } },
        },
        required: [...SATIR_SEMASI.required, 'guven', 'kutular'],
        propertyOrdering: ['parcaId', 'renkId', 'adet', 'guven', 'kutular'],
      },
    },
    not: { type: 'STRING' },
  },
  required: ['parcalar'],
  propertyOrdering: ['parcalar', 'not'],
};

interface Sayim {
  /** tür|renk → satır (aynı satır birden çok kez geldiyse toplanmış) */
  satirlar: Map<string, ParcaSatiri>;
  isaretler: Isaret[];
  not?: string;
  toplam: number;
}

// ---- Yakın çekimlerle sayım: her çeyrekte parça parça kutu, birleştirme kodda --------
//
// Tüm fotoğrafta yapay zeka büyük parçalara odaklanıp küçükleri kaçırıyor, bitişik parçaları
// tek kutuya koyuyor ve boş zemine kutu çiziyordu. Burada her yakın çekimde HER PARÇA için ayrı
// bir kayıt istenir (adet yok: sayı = kutu sayısı). Çeyrekler birbirine bindiği için aynı parça
// iki çeyrekte görünebilir; bunlar kodda kutular üst üste getirilerek tekilleştirilir.

const BOLGE_TALIMATI = (n: number) => `You are an expert LEGO piece counter. The ${n} images are zoomed-in, overlapping parts
(quarters) of ONE photo of loose LEGO pieces. For EACH image separately, list EVERY individual LEGO piece visible in it.

Output format (short keys to keep the answer small): "g" = list of images; each has "i" = image number (1-${n})
and "p" = list of pieces; each piece has "t" = part id, "r" = color id, "c" = confidence, "k" = box.

Rules:
- One entry = one physical piece, with ONE tight bounding box "k" = [ymin, xmin, ymax, xmax] in THAT image's own
  coordinates, normalized to 0-1000. Never put two pieces in one box.
- Pieces that touch each other are still separate pieces. Look at seams, gaps, outlines and stud counts:
  two 2x2 bricks side by side are TWO entries (not one 2x4); a stack of 3 plates is THREE entries.
- Never create an entry for empty background, floor or table texture, shadows or reflections. Every box must contain a LEGO piece.
- Include a piece if at least half of it is inside the image. Pieces cut by the image edge are fine.
- SMALL pieces (1x1, 1x2, plates, tiles, round pieces) matter exactly as much as big ones. Go through each image
  systematically, region by region, and do not stop early. There may be many pieces.
- Determine size by counting studs. A brick is tall (about 3 plates high); a plate is thin; a tile is thin and smooth.
- Use ONLY the part ids and color ids from the catalogs below. If a piece does not fit any part id, use "diger".
- "c": "yuksek" (sure), "orta" (probably), "dusuk" (guess).
- "not": one short, friendly sentence in Turkish for a 7-year-old boy named Ilgaz (e.g. advice like spreading pieces apart
  if they overlap). Leave empty if nothing to say.

${KATALOGLAR}`;

// Kısa anahtarlar: her parça için tekrar eden alan adları cevabı (ve süreyi) ciddi uzatıyordu
const BOLGE_SEMASI = {
  type: 'OBJECT',
  properties: {
    g: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          i: { type: 'INTEGER' },
          p: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                t: { type: 'STRING', enum: PARCA_IDLERI },
                r: { type: 'STRING', enum: RENK_IDLERI },
                c: { type: 'STRING', enum: GUVENLER },
                k: { type: 'ARRAY', items: { type: 'INTEGER' } },
              },
              required: ['t', 'r', 'c', 'k'],
              propertyOrdering: ['t', 'r', 'c', 'k'],
            },
          },
        },
        required: ['i', 'p'],
        propertyOrdering: ['i', 'p'],
      },
    },
    not: { type: 'STRING' },
  },
  required: ['g'],
  propertyOrdering: ['g', 'not'],
};

interface BolgeKutusu {
  parcaId: string;
  renkId: string;
  guven: Guven;
  /** Ana fotoğraftaki kutu (0-1000) */
  kutu: Kutu;
  bolge: number;
}

const alan = (k: Kutu) => Math.max(0, k[2] - k[0]) * Math.max(0, k[3] - k[1]);
function kesisimOrani(a: Kutu, b: Kutu): number {
  const ust = Math.max(a[0], b[0]);
  const sol = Math.max(a[1], b[1]);
  const alt = Math.min(a[2], b[2]);
  const sag = Math.min(a[3], b[3]);
  const kesisim = alan([ust, sol, alt, sag]);
  // Küçük kutuya göre oran: kenarda kesilmiş yarım parça da aynı parça sayılsın
  return kesisim / Math.max(1, Math.min(alan(a), alan(b)));
}

/**
 * Farklı yakın çekimlerden gelen ve ana fotoğrafta üst üste binen aynı tür kutuları tek parça sayar.
 * Aynı yakın çekim içindeki kutular hiçbir zaman birleştirilmez (onlar ayrı parçalar).
 */
export function bolgeKutulariniBirlestir(kutular: BolgeKutusu[]): BolgeKutusu[] {
  const sira: Guven[] = ['dusuk', 'orta', 'yuksek'];
  const kalan: BolgeKutusu[] = [];
  // Büyük kutular önce: kenarda kesilmiş küçük parçası sonra gelip ona eşlensin
  for (const k of [...kutular].sort((a, b) => alan(b.kutu) - alan(a.kutu))) {
    // Aynı tür ve yarısından fazlası çakışıyorsa ya da tür farklı ama neredeyse tamamen aynı yerdeyse aynı parça
    const ayni = kalan.find((v) => {
      if (v.bolge === k.bolge) return false;
      const oran = kesisimOrani(v.kutu, k.kutu);
      return oran >= 0.75 || (v.parcaId === k.parcaId && oran >= 0.5);
    });
    if (ayni) {
      // Aynı parça: renk farklı geldiyse daha emin olanı tut
      if (sira.indexOf(k.guven) > sira.indexOf(ayni.guven)) Object.assign(ayni, { renkId: k.renkId, guven: k.guven });
      continue;
    }
    kalan.push({ ...k });
  }
  return kalan;
}

async function bolgeSayimi(yakinlar: { resim: string; bolge: Kutu }[], anahtar: string, model: string | undefined): Promise<Sayim> {
  const parts: unknown[] = yakinlar.map((y) => ({ inline_data: { mime_type: 'image/jpeg', data: y.resim } }));
  parts.push({ text: BOLGE_TALIMATI(yakinlar.length) });
  // Yakın çekimler zaten yakınlaştırılmış: orta ayrıntı yeter. Parça listelemek derin düşünme istemiyor.
  // (Model bu ayarları kabul etmezse geminiJson ayarsız tekrar dener.)
  const ham = await geminiJson(parts, BOLGE_SEMASI, anahtar, model ?? SAYIM_MODELLERI, {
    mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
    thinkingConfig: { thinkingLevel: 'low' },
  });

  const tumu: BolgeKutusu[] = [];
  for (const g of Array.isArray(ham?.g) ? ham.g : []) {
    const i = Math.round(Number(g?.i)) - 1;
    const bolge = yakinlar[i]?.bolge;
    if (!bolge) continue;
    const [by1, bx1, by2, bx2] = bolge;
    const h = by2 - by1;
    const w = bx2 - bx1;
    for (const p of Array.isArray(g?.p) ? g.p : []) {
      const yerel = kutuTemizle(p?.k);
      if (!yerel) continue;
      const satir = satirTemizle({ parcaId: p?.t, renkId: p?.r, adet: 1 });
      tumu.push({
        parcaId: satir.parcaId,
        renkId: satir.renkId,
        guven: GUVENLER.includes(p?.c) ? p.c : 'orta',
        bolge: i,
        kutu: [
          Math.round(by1 + (yerel[0] * h) / 1000),
          Math.round(bx1 + (yerel[1] * w) / 1000),
          Math.round(by1 + (yerel[2] * h) / 1000),
          Math.round(bx1 + (yerel[3] * w) / 1000),
        ],
      });
    }
  }
  const tekil = bolgeKutulariniBirlestir(tumu);
  console.log('Bölge sayımı', `${tumu.length} kutu → ${tekil.length} parça`, yakinlar.map((_, i) => tumu.filter((k) => k.bolge === i).length).join('/'));

  const sira: Guven[] = ['dusuk', 'orta', 'yuksek'];
  const satirlar = new Map<string, ParcaSatiri>();
  for (const k of tekil) {
    const anahtarK = `${k.parcaId}|${k.renkId}`;
    const var_ = satirlar.get(anahtarK);
    if (var_) {
      var_.adet++;
      if (sira.indexOf(k.guven) < sira.indexOf(var_.guven)) var_.guven = k.guven;
    } else satirlar.set(anahtarK, { parcaId: k.parcaId, renkId: k.renkId, adet: 1, guven: k.guven });
  }
  return {
    satirlar,
    isaretler: tekil.map((k) => ({ parcaId: k.parcaId, renkId: k.renkId, kutu: k.kutu })),
    toplam: tekil.length,
    not: typeof ham?.not === 'string' && ham.not.trim() ? ham.not.trim() : undefined,
  };
}

async function tekSayim(
  resimBase64: string,
  yakinlar: { resim: string; bolge: Kutu }[],
  anahtar: string,
  model: string | undefined,
): Promise<Sayim> {
  if (yakinlar.length) return bolgeSayimi(yakinlar, anahtar, model);
  const resimParcasi = (data: string) => ({ inline_data: { mime_type: 'image/jpeg', data } });
  const parts: unknown[] = [resimParcasi(resimBase64), { text: SAYMA_TALIMATI }];
  const ham = await geminiJson(
    parts,
    SAYMA_SEMASI,
    anahtar,
    model,
    // Küçük parçaları daha iyi görmesi için yüksek ayrıntı. (Sabit tohum ve düşük düşünme denendi:
    // yanıtlar 15 sn'den 55 sn'nin üstüne çıktı, kaldırıldı.)
    { mediaResolution: 'MEDIA_RESOLUTION_HIGH' },
  );
  const isaretler: Isaret[] = [];
  const satirlar = new Map<string, ParcaSatiri>();
  for (const s of Array.isArray(ham?.parcalar) ? ham.parcalar : []) {
    const satir = { ...satirTemizle(s), guven: GUVENLER.includes(s?.guven) ? s.guven : 'orta' } as ParcaSatiri;
    const kutular = (Array.isArray(s?.kutular) ? s.kutular : []).map(kutuTemizle).filter(Boolean) as Kutu[];
    for (const kutu of kutular) isaretler.push({ parcaId: satir.parcaId, renkId: satir.renkId, kutu });
    // Kutular bazen eksik kalabilir; sayımı asla düşürme
    satir.adet = Math.max(satir.adet, kutular.length);
    if (satir.adet <= 0) continue;
    const k = `${satir.parcaId}|${satir.renkId}`;
    const var_ = satirlar.get(k);
    if (var_) var_.adet += satir.adet;
    else satirlar.set(k, satir);
  }
  const toplam = [...satirlar.values()].reduce((t, s) => t + s.adet, 0);
  return { satirlar, isaretler, toplam, not: typeof ham?.not === 'string' && ham.not.trim() ? ham.not.trim() : undefined };
}

const ortanca = (dizi: number[]) => {
  const s = [...dizi].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : Math.round((s[o - 1] + s[o]) / 2);
};

/** Aynı fotoğrafı kaç kez bağımsız saydıracağımız; sonuçların ortancası alınır */
// Ücretsiz katmanda aynı anda birden çok istek çok yavaşlıyor (3 paralel istek 2 dakikayı aştı),
// bu yüzden tek sayım yapılır. Tutarlılık için aynı fotoğraf önbelleği kullanılır.
const SAYIM_TEKRARI = 1;

/**
 * Yapay zeka aynı fotoğrafta her seferinde biraz farklı sayabiliyor. Bu yüzden fotoğraf
 * SAYIM_TEKRARI kez saydırılır ve her parça için ortanca adet alınır. Kutular, toplamı
 * ortancaya en yakın sayımdan gelir. Sayımlardan bazıları başarısız olursa kalanlarla devam edilir.
 */
export async function parcalariTani(
  resimBase64: string,
  yakinlar: { resim: string; bolge: Kutu }[],
  anahtar: string,
  model?: string,
): Promise<{ parcalar: ParcaSatiri[]; isaretler: Isaret[]; not?: string }> {
  const sonuclar = await Promise.allSettled(
    Array.from({ length: SAYIM_TEKRARI }, () => tekSayim(resimBase64, yakinlar, anahtar, model)),
  );
  const sayimlar = sonuclar.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []));
  if (sayimlar.length === 0) throw (sonuclar[0] as PromiseRejectedResult).reason;
  if (sayimlar.length < SAYIM_TEKRARI) console.log('Sayımların bir kısmı başarısız oldu', sayimlar.length, '/', SAYIM_TEKRARI);

  const sira: Guven[] = ['dusuk', 'orta', 'yuksek'];
  const anahtarlar = new Set(sayimlar.flatMap((s) => [...s.satirlar.keys()]));
  const parcalar: ParcaSatiri[] = [];
  for (const k of anahtarlar) {
    const adet = ortanca(sayimlar.map((s) => s.satirlar.get(k)?.adet ?? 0));
    if (adet <= 0) continue;
    const gorulen = sayimlar.flatMap((s) => (s.satirlar.has(k) ? [s.satirlar.get(k)!] : []));
    // Bazı sayımlarda hiç görülmediyse ya da adetler farklıysa güven düşer
    const adetlerAyni = gorulen.length === sayimlar.length && gorulen.every((g) => g.adet === adet);
    let guven = gorulen.reduce<Guven>((g, s) => (sira.indexOf(s.guven) < sira.indexOf(g) ? s.guven : g), 'yuksek');
    if (!adetlerAyni && guven === 'yuksek') guven = 'orta';
    if (gorulen.length < sayimlar.length) guven = 'dusuk';
    parcalar.push({ ...gorulen[0], adet, guven });
  }

  if (parcalar.length === 0 && !sayimlar.some((s) => s.not)) {
    throw new GeminiHatasi('Fotoğrafta parça bulunamadı. Daha yakından ve aydınlık bir yerde çekmeyi dene.', 'gecersiz', 422);
  }
  const toplam = parcalar.reduce((t, s) => t + s.adet, 0);
  const enYakin = sayimlar.reduce((a, b) => (Math.abs(b.toplam - toplam) < Math.abs(a.toplam - toplam) ? b : a));
  return { parcalar, isaretler: enYakin.isaretler, not: enYakin.not ?? sayimlar.find((s) => s.not)?.not };
}


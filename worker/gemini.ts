import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../shared/katalog';
import type { Guven, HataYaniti, Isaret, Kutu, ParcaSatiri } from '../shared/tipler';

// Güncel model listesi: https://ai.google.dev/gemini-api/docs/models
const VARSAYILAN_MODEL = 'gemini-3.8-flash';
// Telefon 120 sn'de vazgeçiyor: tüm denemeler 100 sn'ye sığmalı. Ana model süre dolarsa zayıf
// yedek modele geçilmez (yedek çok az parça buluyor); sadece hata/kota durumunda yedeğe geçilir.
const TOPLAM_SURE_SINIRI_MS = 100_000;
const ANA_MODEL_SURE_MS = 95_000;
const YEDEK_MODEL = 'gemini-3.5-flash-lite';

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
  error?: { message?: string; status?: string };
}

/** Gemini'den şemaya uygun JSON ister. Model kapalıysa/kota dolmuşsa yedek modeli dener. */
async function geminiJson(
  parts: unknown[],
  sema: unknown,
  anahtar: string,
  model?: string,
  /** İsteğe bağlı ayarlar (ör. yüksek görüntü çözünürlüğü); model kabul etmezse bunlarsız tekrar denenir */
  ekAyarlar: Record<string, unknown> = {},
): Promise<any> {
  const modeller = [...new Set([model || VARSAYILAN_MODEL, YEDEK_MODEL])];
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
      console.log('Gemini yanıtı', m, y.status, `${Date.now() - t0} ms`);
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
      break; // süre doldu: zayıf yedek modelle yanlış sayım vermektense hata göster
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
    throw new GeminiHatasi('Yapay zeka şu an çok yavaş. Biraz bekleyip tekrar dene.', 'sunucu', 504);
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

async function tekSayim(resimBase64: string, anahtar: string, model: string | undefined): Promise<Sayim> {
  const ham = await geminiJson(
    [{ inline_data: { mime_type: 'image/jpeg', data: resimBase64 } }, { text: SAYMA_TALIMATI }],
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
  anahtar: string,
  model?: string,
): Promise<{ parcalar: ParcaSatiri[]; isaretler: Isaret[]; not?: string }> {
  const sonuclar = await Promise.allSettled(
    Array.from({ length: SAYIM_TEKRARI }, (_, i) => tekSayim(resimBase64, anahtar, model)),
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


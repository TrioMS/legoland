import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../shared/katalog';
import { cizilebilir, yapiParcalari, yapiyiDuzelt, type Adim, type YapiParcasi } from '../shared/yapi';
import type { Guven, HataYaniti, Isaret, Kutu, ModelOnerisi, ParcaSatiri } from '../shared/tipler';

// Güncel model listesi: https://ai.google.dev/gemini-api/docs/models
const VARSAYILAN_MODEL = 'gemini-3.8-flash';
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
async function geminiJson(parts: unknown[], sema: unknown, anahtar: string, model?: string): Promise<any> {
  const modeller = [...new Set([model || VARSAYILAN_MODEL, YEDEK_MODEL])];
  let yanit!: Response;
  let veri: GeminiYaniti = {};
  for (const m of modeller) {
    yanit = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': anahtar },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: sema },
      }),
    });
    veri = (await yanit.json().catch(() => ({}))) as GeminiYaniti;
    if (yanit.ok) break;
    console.error('Gemini hatası', m, yanit.status, veri.error);
    if (![404, 429, 500, 503].includes(yanit.status)) break;
  }

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
  Exactly one box per piece, so "adet" must equal the number of boxes. Boxes should tightly fit each piece.
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
        propertyOrdering: ['parcaId', 'renkId', 'kutular', 'adet', 'guven'],
      },
    },
    not: { type: 'STRING' },
  },
  required: ['parcalar'],
  propertyOrdering: ['parcalar', 'not'],
};

export async function parcalariTani(
  resimBase64: string,
  anahtar: string,
  model?: string,
): Promise<{ parcalar: ParcaSatiri[]; isaretler: Isaret[]; not?: string }> {
  const ham = await geminiJson(
    [{ inline_data: { mime_type: 'image/jpeg', data: resimBase64 } }, { text: SAYMA_TALIMATI }],
    SAYMA_SEMASI,
    anahtar,
    model,
  );
  const isaretler: Isaret[] = [];
  const parcalar: ParcaSatiri[] = (Array.isArray(ham?.parcalar) ? ham.parcalar : [])
    .map((s: any) => {
      const satir = { ...satirTemizle(s), guven: GUVENLER.includes(s?.guven) ? s.guven : 'orta' } as ParcaSatiri;
      const kutular = (Array.isArray(s?.kutular) ? s.kutular : []).map(kutuTemizle).filter(Boolean) as Kutu[];
      for (const kutu of kutular) isaretler.push({ parcaId: satir.parcaId, renkId: satir.renkId, kutu });
      // Her parça için bir kutu istendi; kutu sayısı daha güvenilir bir sayımdır
      if (kutular.length > 0) satir.adet = kutular.length;
      return satir;
    })
    .filter((s: ParcaSatiri) => s.adet > 0);
  if (parcalar.length === 0 && !ham?.not) {
    throw new GeminiHatasi('Fotoğrafta parça bulunamadı. Daha yakından ve aydınlık bir yerde çekmeyi dene.', 'gecersiz', 422);
  }
  return { parcalar, isaretler, not: typeof ham?.not === 'string' && ham.not.trim() ? ham.not.trim() : undefined };
}

// ---- Eldeki parçalarla 3D model önerisi --------------------------------------------

const CIZILEBILIR_IDLER = PARCA_IDLERI.filter(cizilebilir);

const ONERI_SEMASI = {
  type: 'OBJECT',
  properties: {
    modeller: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ad: { type: 'STRING' },
          emoji: { type: 'STRING' },
          aciklama: { type: 'STRING' },
          zorluk: { type: 'INTEGER' },
          adimlar: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                parcalar: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      parcaId: { type: 'STRING', enum: CIZILEBILIR_IDLER },
                      renkId: { type: 'STRING', enum: RENK_IDLERI },
                      x: { type: 'INTEGER' },
                      y: { type: 'INTEGER' },
                      z: { type: 'INTEGER' },
                      yon: { type: 'INTEGER', enum: [0, 90] },
                    },
                    required: ['parcaId', 'renkId', 'x', 'y', 'z', 'yon'],
                    propertyOrdering: ['parcaId', 'renkId', 'x', 'y', 'z', 'yon'],
                  },
                },
              },
              required: ['parcalar'],
            },
          },
        },
        required: ['ad', 'emoji', 'aciklama', 'zorluk', 'adimlar'],
        propertyOrdering: ['ad', 'emoji', 'aciklama', 'zorluk', 'adimlar'],
      },
    },
  },
  required: ['modeller'],
};

const KOORDINAT_ANLATIMI = `Coordinate system (a stud grid, like a LEGO baseplate):
- x = studs to the right, y = studs to the back, z = height in PLATE units (a plate/tile is 1 high, a brick or slope is 3 high).
- (x, y, z) is the corner of the piece with the smallest x, y and z.
- "yon" 0: the piece's LONG side runs along x. "yon" 90: the long side runs along y.
  Example: "tugla-2x4" with yon 0 covers x..x+3 and y..y+1; with yon 90 it covers x..x+1 and y..y+3.
- The model stands on z = 0. Every other piece MUST sit directly on top of (or hang under) another piece,
  overlapping it by at least one stud. Pieces must NOT overlap each other in space.
- To connect two pieces side by side, put a piece on top that spans both (like real LEGO).
- Keep the model inside a 14 x 14 stud area and at most 40 plates tall.
- Example (a small step): a 2x4 brick at x=0,y=0,z=0,yon=0 and a 2x2 brick on top of its right half at x=2,y=0,z=3,yon=0.`;

export async function modelOner(eldekiler: ParcaSatiri[], anahtar: string, model?: string): Promise<ModelOnerisi[]> {
  const kullanilabilir = eldekiler.filter((s) => cizilebilir(s.parcaId));
  const liste = kullanilabilir
    .map((s) => `${s.adet} x ${s.parcaId} (${parcaBul(s.parcaId).ipucu}) color ${s.renkId} (${renkBul(s.renkId).legoAdi})`)
    .join('\n');

  const talimat = `You are a friendly LEGO master builder designing simple builds for Ilgaz, a 7-year-old boy in Turkey.
Ilgaz has ONLY these loose LEGO pieces:
${liste}

Design 3 different, fun, recognizable models he can build with ONLY these pieces, with step-by-step building instructions.
Rules:
- Never use a part id + color combination Ilgaz does not have, and never use more pieces than available.
- Mix kinds: e.g. a vehicle, an animal, a building or furniture, a robot or something surprising.
- Each model uses 6 to 30 pieces (fewer if he has few pieces). Sturdy and easy: build from the bottom up.
- Split the build into 3 to 10 steps ("adimlar"); each step adds 1 to 5 pieces, lower pieces first.
- Use colors to make the model recognizable (e.g. black tyres-look, white windows, green leaves).
- "ad": short Turkish name (2-4 words). "emoji": one emoji. "aciklama": one or two short, cheerful Turkish sentences Ilgaz understands; you may address him by name.
- "zorluk": 1 (very easy), 2 (medium) or 3 (challenging).

${KOORDINAT_ANLATIMI}

${KATALOGLAR}`;

  const ham = await geminiJson([{ text: talimat }], ONERI_SEMASI, anahtar, model);

  return (Array.isArray(ham?.modeller) ? ham.modeller : [])
    .filter((m: any) => m && typeof m.ad === 'string')
    .slice(0, 5)
    .map((m: any) => {
      // Eldeki adetleri aşan parçaları at (adım sırasına göre)
      const kalan = new Map(kullanilabilir.map((s) => [`${s.parcaId}|${s.renkId}`, s.adet]));
      const adimlar: Adim[] = (Array.isArray(m.adimlar) ? m.adimlar : []).map((a: any) => ({
        parcalar: (Array.isArray(a?.parcalar) ? a.parcalar : [])
          .map((p: any) => ({
            parcaId: String(p?.parcaId),
            renkId: String(p?.renkId),
            x: Math.round(Number(p?.x)),
            y: Math.round(Number(p?.y)),
            z: Math.round(Number(p?.z)),
            yon: Number(p?.yon) === 90 ? 90 : 0,
          }))
          .filter((p: YapiParcasi) => {
            if (![p.x, p.y, p.z].every(Number.isFinite)) return false;
            const k = `${p.parcaId}|${p.renkId}`;
            const n = kalan.get(k) ?? 0;
            if (n <= 0) return false;
            kalan.set(k, n - 1);
            return true;
          }),
      }));
      const temiz = yapiyiDuzelt(adimlar);
      return {
        ad: String(m.ad).slice(0, 60),
        emoji: typeof m.emoji === 'string' && m.emoji ? [...m.emoji].slice(0, 2).join('') : '🧱',
        aciklama: String(m.aciklama ?? '').slice(0, 300),
        zorluk: Math.min(3, Math.max(1, Math.round(Number(m.zorluk) || 1))),
        adimlar: temiz,
        parcalar: yapiParcalari(temiz),
      };
    })
    .filter((m: ModelOnerisi) => m.parcalar.length > 0 && m.parcalar.reduce((t, p) => t + p.adet, 0) >= 3);
}

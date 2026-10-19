import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../shared/katalog';
import type { Guven, HataYaniti, ModelOnerisi, ParcaSatiri } from '../shared/tipler';

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
- "not": one short, friendly sentence in Turkish for a 7-year-old (e.g. advice like spreading pieces apart if they overlap). Leave empty if nothing to say.

${KATALOGLAR}`;

const SAYMA_SEMASI = {
  type: 'OBJECT',
  properties: {
    parcalar: {
      type: 'ARRAY',
      items: {
        ...SATIR_SEMASI,
        properties: { ...SATIR_SEMASI.properties, guven: { type: 'STRING', enum: GUVENLER } },
        required: [...SATIR_SEMASI.required, 'guven'],
        propertyOrdering: [...SATIR_SEMASI.propertyOrdering, 'guven'],
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
): Promise<{ parcalar: ParcaSatiri[]; not?: string }> {
  const ham = await geminiJson(
    [{ inline_data: { mime_type: 'image/jpeg', data: resimBase64 } }, { text: SAYMA_TALIMATI }],
    SAYMA_SEMASI,
    anahtar,
    model,
  );
  const parcalar: ParcaSatiri[] = (Array.isArray(ham?.parcalar) ? ham.parcalar : [])
    .map((s: any) => ({ ...satirTemizle(s), guven: GUVENLER.includes(s?.guven) ? s.guven : 'orta' }))
    .filter((s: ParcaSatiri) => s.adet > 0);
  if (parcalar.length === 0 && !ham?.not) {
    throw new GeminiHatasi('Fotoğrafta parça bulunamadı. Daha yakından ve aydınlık bir yerde çekmeyi dene.', 'gecersiz', 422);
  }
  return { parcalar, not: typeof ham?.not === 'string' && ham.not.trim() ? ham.not.trim() : undefined };
}

// ---- Eldeki parçalarla model önerisi ----------------------------------------------

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
          parcalar: { type: 'ARRAY', items: SATIR_SEMASI },
        },
        required: ['ad', 'emoji', 'aciklama', 'zorluk', 'parcalar'],
        propertyOrdering: ['ad', 'emoji', 'aciklama', 'zorluk', 'parcalar'],
      },
    },
  },
  required: ['modeller'],
};

export async function modelOner(eldekiler: ParcaSatiri[], anahtar: string, model?: string): Promise<ModelOnerisi[]> {
  const liste = eldekiler
    .map((s) => `${s.adet} x ${s.parcaId} (${parcaBul(s.parcaId).ipucu}) color ${s.renkId} (${renkBul(s.renkId).legoAdi})`)
    .join('\n');

  const talimat = `You are a friendly LEGO master builder helping a 7-year-old child in Turkey.
The child has ONLY these loose LEGO pieces:
${liste}

Suggest 4 different, fun, simple models the child can build using ONLY these pieces.
Rules:
- Never use a part id + color combination the child does not have, and never use more than the available count.
- Mix kinds: e.g. a vehicle, an animal, a building or furniture, and something surprising.
- Each model should use between 6 and 40 pieces (fewer if the child has few pieces). Simple, sturdy, recognizable.
- "ad": short Turkish name (2-4 words). "emoji": one emoji. "aciklama": one or two short, cheerful Turkish sentences a 7-year-old understands.
- "zorluk": 1 (very easy), 2 (medium) or 3 (challenging).
- "parcalar": the exact pieces the model uses, with the same ids as above.

${KATALOGLAR}`;

  const ham = await geminiJson([{ text: talimat }], ONERI_SEMASI, anahtar, model);
  return (Array.isArray(ham?.modeller) ? ham.modeller : [])
    .filter((m: any) => m && typeof m.ad === 'string')
    .slice(0, 6)
    .map((m: any) => ({
      ad: String(m.ad).slice(0, 60),
      emoji: typeof m.emoji === 'string' && m.emoji ? [...m.emoji].slice(0, 2).join('') : '🧱',
      aciklama: String(m.aciklama ?? '').slice(0, 300),
      zorluk: Math.min(3, Math.max(1, Math.round(Number(m.zorluk) || 1))),
      parcalar: (Array.isArray(m.parcalar) ? m.parcalar : []).map(satirTemizle).filter((s: { adet: number }) => s.adet > 0),
    }));
}

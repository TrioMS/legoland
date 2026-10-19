import { PARCA_TURLERI, RENKLER } from '../shared/katalog';
import type { Guven, HataYaniti, ParcaSatiri } from '../shared/tipler';

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

const TALIMAT = `You are an expert LEGO piece counter. Look at the photo of loose LEGO pieces and list every piece you can see.

Rules:
- Use ONLY the part ids and color ids from the catalogs below. If a piece does not fit any part id, use "diger".
- Count carefully. Group identical pieces (same part id and same color) into one row with the total count.
- Determine size by counting studs. A brick is tall (about 3 plates high); a plate is thin; a tile is thin and smooth.
- Pieces that are partly hidden still count if you can identify them.
- Do NOT count the table, floor, box, baseplates used as background, or non-LEGO objects.
- "guven" is your confidence for that row: "yuksek" (sure), "orta" (probably), "dusuk" (guess).
- "not": one short, friendly sentence in Turkish for a 7-year-old (e.g. advice like spreading pieces apart if they overlap). Leave empty if nothing to say.

Part catalog (id: description):
${PARCA_TURLERI.map((p) => `${p.id}: ${p.ipucu}`).join('\n')}

Color catalog (id: LEGO color name):
${RENKLER.map((r) => `${r.id}: ${r.legoAdi}`).join('\n')}`;

const SEMA = {
  type: 'OBJECT',
  properties: {
    parcalar: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          parcaId: { type: 'STRING', enum: PARCA_IDLERI },
          renkId: { type: 'STRING', enum: RENK_IDLERI },
          adet: { type: 'INTEGER' },
          guven: { type: 'STRING', enum: GUVENLER },
        },
        required: ['parcaId', 'renkId', 'adet', 'guven'],
        propertyOrdering: ['parcaId', 'renkId', 'adet', 'guven'],
      },
    },
    not: { type: 'STRING' },
  },
  required: ['parcalar'],
  propertyOrdering: ['parcalar', 'not'],
};

interface GeminiYaniti {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

function istekGonder(model: string, resimBase64: string, anahtar: string) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': anahtar },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ inline_data: { mime_type: 'image/jpeg', data: resimBase64 } }, { text: TALIMAT }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SEMA,
      },
    }),
  });
}

export async function parcalariTani(
  resimBase64: string,
  anahtar: string,
  model?: string,
): Promise<{ parcalar: ParcaSatiri[]; not?: string }> {
  // Model kapatılmışsa (404), kota dolmuşsa (429) ya da geçici hata varsa sıradaki modeli dene
  const modeller = [...new Set([model || VARSAYILAN_MODEL, YEDEK_MODEL])];
  let yanit!: Response;
  let veri: GeminiYaniti = {};
  for (const m of modeller) {
    yanit = await istekGonder(m, resimBase64, anahtar);
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
  if (!metin) {
    throw new GeminiHatasi('Fotoğrafta parça bulunamadı. Daha yakından ve aydınlık bir yerde çekmeyi dene.', 'gecersiz', 422);
  }

  let ham: { parcalar?: unknown; not?: unknown };
  try {
    ham = JSON.parse(metin);
  } catch {
    throw new GeminiHatasi('Yapay zekanın cevabı anlaşılamadı. Tekrar dene.', 'sunucu', 502);
  }

  // Şemaya rağmen savunmacı doğrulama
  const parcalar: ParcaSatiri[] = (Array.isArray(ham.parcalar) ? ham.parcalar : [])
    .filter((s: any) => s && typeof s === 'object')
    .map((s: any) => ({
      parcaId: PARCA_IDLERI.includes(s.parcaId) ? s.parcaId : 'diger',
      renkId: RENK_IDLERI.includes(s.renkId) ? s.renkId : 'acik-gri',
      adet: Math.max(0, Math.min(500, Math.round(Number(s.adet) || 0))),
      guven: GUVENLER.includes(s.guven) ? s.guven : 'orta',
    }))
    .filter((s) => s.adet > 0);

  return { parcalar, not: typeof ham.not === 'string' && ham.not.trim() ? ham.not.trim() : undefined };
}

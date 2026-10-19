import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../shared/katalog';
import type { Guven, HataYaniti, Isaret, Kutu, ParcaSatiri } from '../shared/tipler';

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
async function geminiJson(
  parts: unknown[],
  sema: unknown,
  anahtar: string,
  model?: string,
  /** İsteğe bağlı ayarlar (ör. yüksek görüntü çözünürlüğü); model kabul etmezse bunlarsız tekrar denenir */
  ekAyarlar: Record<string, unknown> = {},
): Promise<any> {
  const modeller = [...new Set([model || VARSAYILAN_MODEL, YEDEK_MODEL])];
  let yanit!: Response;
  let veri: GeminiYaniti = {};
  const iste = (m: string, ek: Record<string, unknown>) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': anahtar },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: sema, ...ek },
      }),
    });
  for (const m of modeller) {
    yanit = await iste(m, ekAyarlar);
    veri = (await yanit.json().catch(() => ({}))) as GeminiYaniti;
    if (yanit.status === 400 && Object.keys(ekAyarlar).length && !/API key/i.test(veri.error?.message ?? '')) {
      console.error('Gemini ek ayarları reddetti, ayarsız deneniyor', m, veri.error?.message);
      yanit = await iste(m, {});
      veri = (await yanit.json().catch(() => ({}))) as GeminiYaniti;
    }
    if (yanit.ok) {
      if (m !== modeller[0]) console.log('Yedek model kullanıldı', m);
      break;
    }
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
    // Küçük parçaları daha iyi görmesi için fotoğrafı yüksek ayrıntıda işle
    { mediaResolution: 'MEDIA_RESOLUTION_HIGH' },
  );
  const isaretler: Isaret[] = [];
  const parcalar: ParcaSatiri[] = (Array.isArray(ham?.parcalar) ? ham.parcalar : [])
    .map((s: any) => {
      const satir = { ...satirTemizle(s), guven: GUVENLER.includes(s?.guven) ? s.guven : 'orta' } as ParcaSatiri;
      const kutular = (Array.isArray(s?.kutular) ? s.kutular : []).map(kutuTemizle).filter(Boolean) as Kutu[];
      for (const kutu of kutular) isaretler.push({ parcaId: satir.parcaId, renkId: satir.renkId, kutu });
      // Kutular bazen eksik kalabilir; sayımı asla düşürme
      satir.adet = Math.max(satir.adet, kutular.length);
      return satir;
    })
    .filter((s: ParcaSatiri) => s.adet > 0);
  if (parcalar.length === 0 && !ham?.not) {
    throw new GeminiHatasi('Fotoğrafta parça bulunamadı. Daha yakından ve aydınlık bir yerde çekmeyi dene.', 'gecersiz', 422);
  }
  return { parcalar, isaretler, not: typeof ham?.not === 'string' && ham.not.trim() ? ham.not.trim() : undefined };
}


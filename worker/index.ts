import { Hono } from 'hono';
import type { AnalizIstegi, AnalizYaniti, HataYaniti, MocOnerisi, ModelOnerisi, ParcaSatiri } from '../shared/tipler';
import { birlestir } from '../shared/tipler';
import { parcalariTani, modelOner, GeminiHatasi } from './gemini';
import { setAlternatifleri } from './rebrickable';
import { sahteIsaretler, sahteOneriler, sahteYanit } from './sahte';

export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  REBRICKABLE_API_KEY?: string;
  ERISIM_KODU?: string;
  SAHTE_MOD?: string;
}

const app = new Hono<{ Bindings: Env }>();

const hata = (mesaj: string, kod: HataYaniti['kod']): HataYaniti => ({ hata: mesaj, kod });

// Erişim kodu tanımlıysa tüm /api isteklerinde iste
app.use('/api/*', async (c, next) => {
  const beklenen = c.env.ERISIM_KODU;
  if (beklenen && c.req.header('x-erisim-kodu') !== beklenen) {
    return c.json(hata('Aile kodu yanlış.', 'erisim'), 401);
  }
  await next();
});

app.get('/api/durum', (c) =>
  c.json({
    hazir: Boolean(c.env.GEMINI_API_KEY) || c.env.SAHTE_MOD === '1',
    rebrickable: Boolean(c.env.REBRICKABLE_API_KEY),
    kodGerekli: Boolean(c.env.ERISIM_KODU),
  }),
);

const geminiHatasiniYanitla = (c: any, e: unknown) => {
  if (e instanceof GeminiHatasi) return c.json(hata(e.message, e.kod), e.durum);
  console.error(e);
  return c.json(hata('Beklenmeyen bir hata oldu. Tekrar dene.', 'sunucu'), 500);
};

app.post('/api/analiz', async (c) => {
  let govde: AnalizIstegi;
  try {
    govde = await c.req.json<AnalizIstegi>();
  } catch {
    return c.json(hata('Fotoğraf okunamadı.', 'gecersiz'), 400);
  }
  if (typeof govde?.resim !== 'string' || govde.resim.length < 100) {
    return c.json(hata('Fotoğraf bulunamadı.', 'gecersiz'), 400);
  }
  if (govde.resim.length > 8_000_000) {
    return c.json(hata('Fotoğraf çok büyük.', 'gecersiz'), 413);
  }

  if (c.env.SAHTE_MOD === '1') {
    await new Promise((r) => setTimeout(r, 1500));
    const sahte = sahteYanit();
    return c.json<AnalizYaniti>({ ...sahte, isaretler: sahteIsaretler(sahte.parcalar) });
  }
  if (!c.env.GEMINI_API_KEY) {
    return c.json(hata('Yapay zeka anahtarı ayarlanmamış (GEMINI_API_KEY).', 'anahtar'), 500);
  }

  try {
    const sonuc = await parcalariTani(govde.resim, c.env.GEMINI_API_KEY, c.env.GEMINI_MODEL);
    return c.json<AnalizYaniti>({ parcalar: birlestir(sonuc.parcalar), isaretler: sonuc.isaretler, not: sonuc.not });
  } catch (e) {
    return geminiHatasiniYanitla(c, e);
  }
});

app.post('/api/oneri', async (c) => {
  const govde = await c.req.json<{ parcalar?: ParcaSatiri[] }>().catch(() => null);
  const parcalar = Array.isArray(govde?.parcalar) ? govde.parcalar.slice(0, 200) : [];
  if (parcalar.length === 0) return c.json(hata('Önce parça listesi gerekli.', 'gecersiz'), 400);

  if (c.env.SAHTE_MOD === '1') {
    await new Promise((r) => setTimeout(r, 1500));
    return c.json<{ modeller: ModelOnerisi[] }>({ modeller: sahteOneriler() });
  }
  if (!c.env.GEMINI_API_KEY) {
    return c.json(hata('Yapay zeka anahtarı ayarlanmamış (GEMINI_API_KEY).', 'anahtar'), 500);
  }
  try {
    const modeller = await modelOner(parcalar, c.env.GEMINI_API_KEY, c.env.GEMINI_MODEL);
    return c.json<{ modeller: ModelOnerisi[] }>({ modeller });
  } catch (e) {
    return geminiHatasiniYanitla(c, e);
  }
});

app.get('/api/moc/:setNo', async (c) => {
  const setNo = c.req.param('setNo');
  if (!/^[\w.-]{1,30}$/.test(setNo)) return c.json(hata('Geçersiz set numarası.', 'gecersiz'), 400);
  if (!c.env.REBRICKABLE_API_KEY) return c.json<{ mocler: MocOnerisi[]; anahtarYok: true }>({ mocler: [], anahtarYok: true });
  try {
    return c.json<{ mocler: MocOnerisi[] }>({ mocler: await setAlternatifleri(setNo, c.env.REBRICKABLE_API_KEY) });
  } catch {
    return c.json(hata('Hayran tasarımları şu an alınamadı.', 'sunucu'), 502);
  }
});

export default app;

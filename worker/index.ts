import { Hono } from 'hono';
import type { AnalizIstegi, AnalizYaniti, HataYaniti } from '../shared/tipler';
import { birlestir } from '../shared/tipler';
import { parcalariTani, GeminiHatasi } from './gemini';
import { sahteYanit } from './sahte';

export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
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
  c.json({ hazir: Boolean(c.env.GEMINI_API_KEY) || c.env.SAHTE_MOD === '1', kodGerekli: Boolean(c.env.ERISIM_KODU) }),
);

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
    return c.json<AnalizYaniti>(sahteYanit());
  }
  if (!c.env.GEMINI_API_KEY) {
    return c.json(hata('Yapay zeka anahtarı ayarlanmamış (GEMINI_API_KEY).', 'anahtar'), 500);
  }

  try {
    const sonuc = await parcalariTani(govde.resim, c.env.GEMINI_API_KEY, c.env.GEMINI_MODEL);
    return c.json<AnalizYaniti>({ parcalar: birlestir(sonuc.parcalar), not: sonuc.not });
  } catch (e) {
    if (e instanceof GeminiHatasi) {
      return c.json(hata(e.message, e.kod), e.durum as 400);
    }
    console.error(e);
    return c.json(hata('Beklenmeyen bir hata oldu. Tekrar dene.', 'sunucu'), 500);
  }
});

export default app;

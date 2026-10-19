import { useMemo, type ReactElement } from 'react';
import { parcaBul, renkBul } from '../../shared/katalog';
import { taban, yukseklik, type YapiParcasi } from '../../shared/yapi';

// İzometrik çizim: her parça 1 çivi x 1 çivi x 1 plaka boyutunda küçük kutulara (voksel) bölünür,
// arkadan öne doğru boyanır. Parça sınırlarına çizgi, üst yüzlere çivi çizilir.

const S = 20; // bir çivinin ekrandaki boyu
const C = S * 0.866;
const SN = S * 0.5;
const PH = S * 0.4; // bir plaka yüksekliği

interface Voksel {
  x: number;
  y: number;
  z: number;
  parca: number;
  civi: boolean;
}

interface Props {
  parcalar: YapiParcasi[];
  /** Bu indeksteki parçalar "yeni" sayılır: tam renk + turuncu kenar; diğerleri soluk */
  yeniler?: Set<number>;
  /** 0-3: modeli 90° adımlarla döndürür */
  donus?: number;
  className?: string;
}

/** Rengi önce beyaza doğru açar (acik), sonra koyulaştırır (koyu) */
function golgeli(hex: string, acik: number, koyu: number) {
  const n = parseInt(hex.slice(1), 16);
  const k = (v: number) => Math.round((v + (255 - v) * acik) * (1 - koyu));
  return `rgb(${k(n >> 16)}, ${k((n >> 8) & 255)}, ${k(n & 255)})`;
}

const nokta = (x: number, y: number, z: number) => [(x - y) * C, (x + y) * SN - z * PH] as const;
const yol = (pts: (readonly [number, number])[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';

export function IzometrikModel({ parcalar, yeniler, donus = 0, className }: Props) {
  const cizim = useMemo(() => {
    // 1. Vokseller (dönüş öncesi koordinatlarla), çivi bilgisiyle
    const ham: Voksel[] = [];
    parcalar.forEach((p, i) => {
      const { gx, gy } = taban(p);
      const h = yukseklik(p.parcaId);
      const sekil = parcaBul(p.parcaId).sekil;
      for (let dx = 0; dx < gx; dx++) {
        for (let dy = 0; dy < gy; dy++) {
          for (let dz = 0; dz < h; dz++) {
            // Karoda çivi yok; eğimli parçada sadece arka sırada çivi var
            const civi = sekil !== 'karo' && (sekil !== 'egim' || (p.yon === 0 ? dy === 0 : dx === 0));
            ham.push({ x: p.x + dx, y: p.y + dy, z: p.z + dz, parca: i, civi });
          }
        }
      }
    });
    if (!ham.length) return null;

    // 2. Döndür
    const W = Math.max(...ham.map((v) => v.x)) + 1;
    const D = Math.max(...ham.map((v) => v.y)) + 1;
    const dondur = (v: Voksel): Voksel => {
      switch (((donus % 4) + 4) % 4) {
        case 1: return { ...v, x: D - 1 - v.y, y: v.x };
        case 2: return { ...v, x: W - 1 - v.x, y: D - 1 - v.y };
        case 3: return { ...v, x: v.y, y: W - 1 - v.x };
        default: return v;
      }
    };
    const vokseller = ham.map(dondur);
    const harita = new Map<string, number>();
    for (const v of vokseller) harita.set(`${v.x},${v.y},${v.z}`, v.parca);
    const kim = (x: number, y: number, z: number) => harita.get(`${x},${y},${z}`);

    // 3. Arkadan öne sırala
    vokseller.sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z || a.x - b.x);

    const sekiller: ReactElement[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const genislet = (pts: (readonly [number, number])[]) => {
      for (const [px, py] of pts) {
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    };

    vokseller.forEach((v, n) => {
      const { x, y, z, parca } = v;
      const yeni = !yeniler || yeniler.has(parca);
      const taban_ = renkBul(parcalar[parca].renkId).hex;
      const acik = yeni ? 0 : 0.55;
      const ana = golgeli(taban_, acik, 0);
      const sag = golgeli(taban_, acik, 0.18);
      const sol = golgeli(taban_, acik, 0.32);
      const kenar = yeni && yeniler ? '#ff5a1f' : 'rgba(0,0,0,0.35)';
      const kenarKalin = yeni && yeniler ? 2 : 1;
      const farkli = (px: number, py: number, pz: number) => kim(px, py, pz) !== parca;
      const cizgiler: string[] = [];
      const cizgi = (a: readonly [number, number], b: readonly [number, number]) => cizgiler.push(`M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`);

      // Sol yüz (+y)
      if (kim(x, y + 1, z) === undefined) {
        const p = [nokta(x, y + 1, z), nokta(x + 1, y + 1, z), nokta(x + 1, y + 1, z + 1), nokta(x, y + 1, z + 1)];
        genislet(p);
        sekiller.push(<path key={`l${n}`} d={yol(p)} fill={sol} stroke={sol} strokeWidth="0.6" />);
        if (farkli(x, y, z - 1)) cizgi(p[0], p[1]);
        if (farkli(x, y, z + 1)) cizgi(p[3], p[2]);
        if (farkli(x - 1, y, z)) cizgi(p[0], p[3]);
        if (farkli(x + 1, y, z)) cizgi(p[1], p[2]);
      }
      // Sağ yüz (+x)
      if (kim(x + 1, y, z) === undefined) {
        const p = [nokta(x + 1, y, z), nokta(x + 1, y + 1, z), nokta(x + 1, y + 1, z + 1), nokta(x + 1, y, z + 1)];
        genislet(p);
        sekiller.push(<path key={`r${n}`} d={yol(p)} fill={sag} stroke={sag} strokeWidth="0.6" />);
        if (farkli(x, y, z - 1)) cizgi(p[0], p[1]);
        if (farkli(x, y, z + 1)) cizgi(p[3], p[2]);
        if (farkli(x, y - 1, z)) cizgi(p[0], p[3]);
        if (farkli(x, y + 1, z)) cizgi(p[1], p[2]);
      }
      // Üst yüz
      if (kim(x, y, z + 1) === undefined) {
        const p = [nokta(x, y, z + 1), nokta(x + 1, y, z + 1), nokta(x + 1, y + 1, z + 1), nokta(x, y + 1, z + 1)];
        genislet(p);
        sekiller.push(<path key={`t${n}`} d={yol(p)} fill={ana} stroke={ana} strokeWidth="0.6" />);
        if (farkli(x, y - 1, z)) cizgi(p[0], p[1]);
        if (farkli(x + 1, y, z)) cizgi(p[1], p[2]);
        if (farkli(x, y + 1, z)) cizgi(p[2], p[3]);
        if (farkli(x - 1, y, z)) cizgi(p[3], p[0]);
      }
      if (cizgiler.length) {
        sekiller.push(<path key={`k${n}`} d={cizgiler.join('')} stroke={kenar} strokeWidth={kenarKalin} fill="none" strokeLinecap="round" />);
      }
      // Çivi
      if (v.civi && kim(x, y, z + 1) === undefined) {
        const [cx, cy] = nokta(x + 0.5, y + 0.5, z + 1);
        const rx = S * 0.36;
        const ry = rx * 0.58;
        const hs = PH * 0.45;
        sekiller.push(
          <g key={`c${n}`}>
            <path d={`M${cx - rx},${cy} L${cx - rx},${cy - hs} A${rx},${ry} 0 0 1 ${cx + rx},${cy - hs} L${cx + rx},${cy} A${rx},${ry} 0 0 1 ${cx - rx},${cy}Z`} fill={sag} />
            <ellipse cx={cx} cy={cy - hs} rx={rx} ry={ry} fill={ana} stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
          </g>,
        );
        genislet([[cx, cy - hs - ry]]);
      }
    });

    const pay = 8;
    return { sekiller, viewBox: `${minX - pay} ${minY - pay} ${maxX - minX + pay * 2} ${maxY - minY + pay * 2}` };
  }, [parcalar, yeniler, donus]);

  if (!cizim) return null;
  return (
    <svg className={className} viewBox={cizim.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Model çizimi">
      {cizim.sekiller}
    </svg>
  );
}

import { useMemo, type ReactElement } from 'react';
import { parcaBul, renkBul } from '../../shared/katalog';
import { egimBilgisi, taban, yukseklik, type YapiParcasi } from '../../shared/yapi';

// İzometrik çizim: her parça 1 çivi x 1 çivi x 1 plaka boyutunda küçük kutulara (voksel) bölünür,
// arkadan öne doğru boyanır. Parça sınırlarına çizgi, üst yüzlere çivi çizilir.
// Eğimli parçaların eğimli hücreleri tek plaka yüksekliğinde voksel + eğik yüzey olarak çizilir.
// Tekerlekler siyah blok + yan yüzünde jant olarak çizilir.

const S = 20; // bir çivinin ekrandaki boyu
const C = S * 0.866;
const SN = S * 0.5;
const PH = S * 0.4; // bir plaka yüksekliği

type Yon2 = [number, number];

interface Egim {
  /** Eğimin indiği yön (döndürülmüş) */
  d: Yon2;
  /** Hücrenin yüksek ve alçak kenarlarının z değeri */
  ust: number;
  alt: number;
}

interface Voksel {
  x: number;
  y: number;
  z: number;
  parca: number;
  civi: boolean;
  egim?: Egim;
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
type Nokta = readonly [number, number];
const yol = (pts: Nokta[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';

export function IzometrikModel({ parcalar, yeniler, donus = 0, className }: Props) {
  const cizim = useMemo(() => {
    // 1. Vokseller (dönüş öncesi koordinatlarla)
    const ham: Voksel[] = [];
    parcalar.forEach((p, i) => {
      const { gx, gy } = taban(p);
      const h = yukseklik(p.parcaId);
      const sekil = parcaBul(p.parcaId).sekil;
      const egim = egimBilgisi(p);
      const egimBoyu = egim?.boy ?? 0;
      for (let dx = 0; dx < gx; dx++) {
        for (let dy = 0; dy < gy; dy++) {
          if (egim?.egimli(dx, dy)) {
            // Eğimli hücre: tabanda bir plaka + üstünde eğik yüzey
            const sira = egim.sira(dx, dy); // 1..egimBoyu
            const tepe = p.z + h;
            const dusus = (h - 1) / egimBoyu;
            ham.push({
              x: p.x + dx,
              y: p.y + dy,
              z: p.z,
              parca: i,
              civi: false,
              egim: { d: egim.yon, ust: tepe - (sira - 1) * dusus, alt: tepe - sira * dusus },
            });
            continue;
          }
          for (let dz = 0; dz < h; dz++) {
            const civi = sekil !== 'karo' && p.parcaId !== 'tekerlek' && !(egim?.civisiz ?? false);
            ham.push({ x: p.x + dx, y: p.y + dy, z: p.z + dz, parca: i, civi });
          }
        }
      }
    });
    if (!ham.length) return null;

    // 2. Döndür (konum ve eğim yönü)
    const W = Math.max(...ham.map((v) => v.x)) + 1;
    const D = Math.max(...ham.map((v) => v.y)) + 1;
    const r = ((donus % 4) + 4) % 4;
    const yonDondur = ([dx, dy]: Yon2): Yon2 => (r === 1 ? [-dy, dx] : r === 2 ? [-dx, -dy] : r === 3 ? [dy, -dx] : [dx, dy]);
    const dondur = (v: Voksel): Voksel => {
      const e = v.egim ? { ...v.egim, d: yonDondur(v.egim.d) } : undefined;
      switch (r) {
        case 1: return { ...v, x: D - 1 - v.y, y: v.x, egim: e };
        case 2: return { ...v, x: W - 1 - v.x, y: D - 1 - v.y, egim: e };
        case 3: return { ...v, x: v.y, y: W - 1 - v.x, egim: e };
        default: return v;
      }
    };
    const vokseller = ham.map(dondur);
    const harita = new Map<string, number>();
    for (const v of vokseller) harita.set(`${v.x},${v.y},${v.z}`, v.parca);
    const kim = (x: number, y: number, z: number) => harita.get(`${x},${y},${z}`);

    // Tekerleklerin döndürülmüş sınırları (jant çizimi için)
    const tekerlekKutusu = new Map<number, { x1: number; x2: number; y1: number; y2: number; z1: number; z2: number }>();
    for (const v of vokseller) {
      if (parcalar[v.parca].parcaId !== 'tekerlek') continue;
      const k = tekerlekKutusu.get(v.parca) ?? { x1: v.x, x2: v.x, y1: v.y, y2: v.y, z1: v.z, z2: v.z };
      tekerlekKutusu.set(v.parca, {
        x1: Math.min(k.x1, v.x), x2: Math.max(k.x2, v.x), y1: Math.min(k.y1, v.y),
        y2: Math.max(k.y2, v.y), z1: Math.min(k.z1, v.z), z2: Math.max(k.z2, v.z),
      });
    }

    // 3. Arkadan öne sırala
    vokseller.sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z || a.x - b.x);

    const sekiller: ReactElement[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const genislet = (pts: Nokta[]) => {
      for (const [px, py] of pts) {
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    };

    vokseller.forEach((v, n) => {
      const { x, y, z, parca } = v;
      const parcaId = parcalar[parca].parcaId;
      const yeni = !yeniler || yeniler.has(parca);
      const taban_ = renkBul(parcalar[parca].renkId).hex;
      const acik = yeni ? 0 : 0.55;
      const ana = golgeli(taban_, acik, 0);
      const sag = golgeli(taban_, acik, 0.18);
      const sol = golgeli(taban_, acik, 0.32);
      const egimRenk = golgeli(taban_, acik, 0.06);
      const kenar = yeni && yeniler ? '#ff5a1f' : 'rgba(0,0,0,0.35)';
      const kenarKalin = yeni && yeniler ? 2 : 1;
      const farkli = (px: number, py: number, pz: number) => kim(px, py, pz) !== parca;
      const cizgiler: string[] = [];
      const cizgi = (a: Nokta, b: Nokta) => cizgiler.push(`M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`);
      const yuz = (k: string, p: Nokta[], renk: string) => {
        genislet(p);
        sekiller.push(<path key={`${k}${n}`} d={yol(p)} fill={renk} stroke={renk} strokeWidth="0.6" strokeLinejoin="round" />);
      };

      const tekerlek = parcaId === 'tekerlek';
      // Sol yüz (+y)
      if (!tekerlek && kim(x, y + 1, z) === undefined) {
        const p = [nokta(x, y + 1, z), nokta(x + 1, y + 1, z), nokta(x + 1, y + 1, z + 1), nokta(x, y + 1, z + 1)];
        yuz('l', p, sol);
        if (farkli(x, y, z - 1)) cizgi(p[0], p[1]);
        if (farkli(x, y, z + 1) && !v.egim) cizgi(p[3], p[2]);
        if (farkli(x - 1, y, z)) cizgi(p[0], p[3]);
        if (farkli(x + 1, y, z)) cizgi(p[1], p[2]);
      }
      // Sağ yüz (+x)
      if (!tekerlek && kim(x + 1, y, z) === undefined) {
        const p = [nokta(x + 1, y, z), nokta(x + 1, y + 1, z), nokta(x + 1, y + 1, z + 1), nokta(x + 1, y, z + 1)];
        yuz('r', p, sag);
        if (farkli(x, y, z - 1)) cizgi(p[0], p[1]);
        if (farkli(x, y, z + 1) && !v.egim) cizgi(p[3], p[2]);
        if (farkli(x, y - 1, z)) cizgi(p[0], p[3]);
        if (farkli(x, y + 1, z)) cizgi(p[1], p[2]);
      }

      if (v.egim) {
        // Eğik yüzey: yüksek kenar -d tarafında, alçak kenar +d tarafında
        const { d, ust, alt } = v.egim;
        const z0 = z + 1;
        const yuk = (px: number, py: number) => {
          // (px, py) köşesinin yüksekliği
          const t = d[0] ? (d[0] > 0 ? px - x : x + 1 - px) : d[1] > 0 ? py - y : y + 1 - py;
          return ust + (alt - ust) * t;
        };
        const k = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]] as const;
        const ust4 = k.map(([px, py]) => nokta(px, py, yuk(px, py)));
        // Yan yüzler (görünen +x ve +y kenarları), alt plakanın üstünden eğime kadar
        if (kim(x, y + 1, z) === undefined) yuz('el', [nokta(x, y + 1, z0), nokta(x + 1, y + 1, z0), ust4[2], ust4[3]], sol);
        if (kim(x + 1, y, z) === undefined) yuz('er', [nokta(x + 1, y, z0), nokta(x + 1, y + 1, z0), ust4[2], ust4[1]], sag);
        yuz('e', ust4, egimRenk);
        cizgiler.push(`M${ust4.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`);
      } else if (!tekerlek && kim(x, y, z + 1) === undefined) {
        // Üst yüz
        const p = [nokta(x, y, z + 1), nokta(x + 1, y, z + 1), nokta(x + 1, y + 1, z + 1), nokta(x, y + 1, z + 1)];
        yuz('t', p, ana);
        if (farkli(x, y - 1, z)) cizgi(p[0], p[1]);
        if (farkli(x + 1, y, z)) cizgi(p[1], p[2]);
        if (farkli(x, y + 1, z)) cizgi(p[2], p[3]);
        if (farkli(x - 1, y, z)) cizgi(p[3], p[0]);
      }
      if (cizgiler.length) {
        sekiller.push(<path key={`k${n}`} d={cizgiler.join('')} stroke={kenar} strokeWidth={kenarKalin} fill="none" strokeLinecap="round" strokeLinejoin="round" />);
      }

      // Jant: tekerleğin en son çizilen vokselinde, dışa bakan yüzüne
      const tk = tekerlekKutusu.get(parca);
      if (parcaId === 'tekerlek' && tk && x === tk.x2 && y === tk.y2 && z === tk.z2) {
        const disk = tk.y2 === tk.y1 ? 'y' : 'x'; // disk hangi düzlemde ince
        const zm = (tk.z1 + tk.z2 + 1) / 2;
        const r_ = 0.42; // çivi cinsinden jant yarıçapı
        const [cx, cy] = disk === 'y' ? nokta((tk.x1 + tk.x2 + 1) / 2, tk.y2 + 1, zm) : nokta(tk.x2 + 1, (tk.y1 + tk.y2 + 1) / 2, zm);
        // Birim daireyi o düzleme taşıyan dönüşüm (1 çivi = 2.5 plaka)
        const m = disk === 'y' ? `matrix(${C},${SN},0,${-PH * 2.5},${cx},${cy})` : `matrix(${-C},${SN},0,${-PH * 2.5},${cx},${cy})`;
        // Lastik: arka yüz (kalınlık), aradaki bant, ön yüz ve jant
        const [bx, by] = disk === 'y' ? nokta((tk.x1 + tk.x2 + 1) / 2, tk.y1, zm) : nokta(tk.x1, (tk.y1 + tk.y2 + 1) / 2, zm);
        const mArka = disk === 'y' ? `matrix(${C},${SN},0,${-PH * 2.5},${bx},${by})` : `matrix(${-C},${SN},0,${-PH * 2.5},${bx},${by})`;
        const lastik = (tk.z2 - tk.z1 + 1) / 2.5 / 2; // yarıçap (çivi)
        const dikey = PH * 2.5 * lastik;
        genislet([[cx - C * lastik, cy - dikey - SN], [cx + C * lastik, cy + dikey + SN], [bx - C * lastik, by - dikey - SN]]);
        sekiller.push(
          <g key={`ja${n}`} transform={mArka}>
            <circle r={lastik} fill={sol} />
          </g>,
          <path key={`jb${n}`} d={`M${bx},${by - dikey}L${cx},${cy - dikey}L${cx},${cy + dikey}L${bx},${by + dikey}Z`} fill={sol} />,
          <g key={`j${n}`} transform={m}>
            <circle r={lastik} fill={sag} stroke="rgba(0,0,0,0.5)" strokeWidth={0.04} />
            <circle r={r_} fill={golgeli('#C9CCCF', acik, 0)} stroke="rgba(0,0,0,0.4)" strokeWidth={0.05} />
            <circle r={r_ * 0.35} fill={golgeli('#8A8F94', acik, 0)} />
          </g>,
        );
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

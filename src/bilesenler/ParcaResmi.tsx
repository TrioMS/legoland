import { parcaBul, renkBul } from '../../shared/katalog';

function koyulastir(hex: string, oran: number) {
  const n = parseInt(hex.slice(1), 16);
  const k = (v: number) => Math.round(v * (1 - oran));
  return `rgb(${k(n >> 16)}, ${k((n >> 8) & 255)}, ${k(n & 255)})`;
}

/** Parçanın önden-üstten basit çizimi: tuğla yüksek, plaka ince, karo çivisiz. */
export function ParcaResmi({ parcaId, renkId, boyut = 72 }: { parcaId: string; renkId: string; boyut?: number }) {
  const parca = parcaBul(parcaId);
  const renk = renkBul(renkId);
  const seffaf = renk.id === 'seffaf';
  const kenar = koyulastir(renk.hex, 0.35);
  const on = koyulastir(renk.hex, 0.18);

  if (parca.emoji) {
    return (
      <svg width={boyut} height={boyut} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="46" fill={renk.hex} stroke={kenar} strokeWidth="4" opacity={seffaf ? 0.6 : 1} />
        <text x="50" y="52" fontSize="48" textAnchor="middle" dominantBaseline="middle">
          {parca.emoji}
        </text>
      </svg>
    );
  }

  // Uzun kenar yatay
  const sutun = Math.max(parca.en, parca.boy);
  const satir = Math.min(parca.en, parca.boy);
  const b = 10; // bir çivi aralığı
  const derinlik = satir * b * 0.55; // üst yüzün perspektif yüksekliği
  const tuglaBoyu = parca.sekil === 'tugla' || parca.sekil === 'egim' || parcaId.startsWith('yuvarlak-tugla');
  const yukseklik = tuglaBoyu ? 12 : 4;
  const genislik = sutun * b;
  const vbG = genislik + 4;
  const vbY = derinlik + yukseklik + 8;

  if (parca.sekil === 'yuvarlak') {
    const r = genislik / 2;
    return (
      <svg width={boyut} height={boyut} viewBox={`-2 -6 ${vbG} ${vbG + 4}`} aria-hidden>
        <ellipse cx={r} cy={r * 0.6 + yukseklik} rx={r} ry={r * 0.6} fill={on} stroke={kenar} strokeWidth="0.8" />
        <rect x="0" y={r * 0.6} width={genislik} height={yukseklik} fill={on} />
        <ellipse cx={r} cy={r * 0.6} rx={r} ry={r * 0.6} fill={renk.hex} stroke={kenar} strokeWidth="0.8" />
        <ellipse cx={r} cy={r * 0.6 - 1.5} rx={b * 0.3} ry={b * 0.18} fill={renk.hex} stroke={kenar} strokeWidth="0.6" />
      </svg>
    );
  }

  const civiler = [];
  if (parca.sekil !== 'karo') {
    for (let s = 0; s < satir; s++) {
      for (let c = 0; c < sutun; c++) {
        // Eğimli parçada sadece arka sıra çivili
        if (parca.sekil === 'egim' && !parcaId.includes('ters') && s > 0) continue;
        const cx = c * b + b / 2;
        const cy = (s + 0.5) * (derinlik / satir);
        civiler.push(
          <g key={`${s}-${c}`}>
            <rect x={cx - b * 0.3} y={cy - 2} width={b * 0.6} height={2} fill={on} />
            <ellipse cx={cx} cy={cy} rx={b * 0.3} ry={b * 0.17} fill={on} stroke={kenar} strokeWidth="0.5" />
            <ellipse cx={cx} cy={cy - 2} rx={b * 0.3} ry={b * 0.17} fill={renk.hex} stroke={kenar} strokeWidth="0.5" />
          </g>,
        );
      }
    }
  }

  const egimli = parca.sekil === 'egim' && !parcaId.includes('ters');
  const ustYuz = egimli
    ? `M0,0 H${genislik} V${derinlik / satir} L${genislik},${derinlik + yukseklik} H0 L0,${derinlik / satir} Z`
    : `M0,0 H${genislik} V${derinlik} H0 Z`;

  return (
    <svg width={boyut} height={boyut} viewBox={`-2 -6 ${vbG} ${vbY}`} aria-hidden style={{ opacity: seffaf ? 0.75 : 1 }}>
      {!egimli && <rect x="0" y={derinlik} width={genislik} height={yukseklik} fill={on} stroke={kenar} strokeWidth="0.8" />}
      <path d={ustYuz} fill={renk.hex} stroke={kenar} strokeWidth="0.8" />
      {civiler}
    </svg>
  );
}

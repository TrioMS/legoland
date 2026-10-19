import { FotoButonlari } from '../bilesenler/FotoButonlari';

/** Yere dağılmış renkli parçalar çizimi */
function DagilmisParcalar() {
  const parcalar: [number, number, number, number, number, string][] = [
    // x, y, genişlik, yükseklik, açı, renk
    [40, 60, 70, 34, -12, '#ffc629'],
    [140, 30, 46, 46, 8, '#2f6fed'],
    [215, 70, 92, 34, 18, '#1f9d55'],
    [330, 40, 46, 30, -20, '#ffffff'],
    [80, 120, 46, 30, 25, '#1d1b19'],
    [170, 115, 70, 34, -6, '#e5383b'],
    [270, 125, 46, 46, -14, '#ff6ec7'],
    [350, 105, 34, 34, 10, '#ffc629'],
  ];
  return (
    <svg className="dagilmis" viewBox="0 0 420 180" aria-hidden>
      {parcalar.map(([x, y, g, h, a, r], i) => {
        const civi = Math.max(1, Math.round(g / 24));
        return (
          <g key={i} transform={`rotate(${a} ${x + g / 2} ${y + h / 2})`}>
            <rect x={x} y={y + 4} width={g} height={h} rx="5" fill="rgba(0,0,0,.18)" />
            <rect x={x} y={y} width={g} height={h} rx="5" fill={r} />
            {Array.from({ length: civi }, (_, c) =>
              Array.from({ length: Math.max(1, Math.round(h / 24)) }, (_, s) => (
                <circle
                  key={`${c}-${s}`}
                  cx={x + ((c + 0.5) * g) / civi}
                  cy={y + ((s + 0.5) * h) / Math.max(1, Math.round(h / 24))}
                  r="6.5"
                  fill={r}
                  stroke="rgba(0,0,0,.18)"
                  strokeWidth="1.5"
                />
              )),
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function AnaSayfa({ hata, fotoSecildi }: { hata: string | null; fotoSecildi: (f: File) => void }) {
  return (
    <main className="ekran ana">
      <header className="karsilama">
        <img src="/favicon.svg" alt="" className="logo" />
        <div>
          <p className="selam">Merhaba Ilgaz 👋</p>
          <h1>Bugün ne yapalım?</h1>
        </div>
      </header>

      <section className="tara-karti">
        <DagilmisParcalar />
        <h2>Parçalarını tara</h2>
        <p>Parçalarını yere yay, fotoğrafını çek. Ben sayayım, sana neler yapabileceğini göstereyim!</p>
        <FotoButonlari fotoSecildi={fotoSecildi} gorunum="deklansor" />
      </section>

      {hata && <p className="hata-kutusu">{hata}</p>}

      <section className="ipucu">
        <h2>İyi fotoğraf için</h2>
        <ul className="ipucu-listesi">
          <li><span>🟫</span> Düz ve tek renk bir zemine yay</li>
          <li><span>↔️</span> Parçalar üst üste binmesin</li>
          <li><span>☀️</span> Aydınlık yerde, tam yukarıdan çek</li>
          <li><span>📚</span> Çok parça varsa birkaç parti çek</li>
        </ul>
      </section>

      <footer className="surum">Sürüm {__SURUM__}</footer>
    </main>
  );
}

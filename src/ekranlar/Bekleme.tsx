import { useEffect, useState } from 'react';

const MESAJLAR = [
  'Parçalara bakıyorum…',
  'Çivileri sayıyorum…',
  'Renkleri ayırıyorum…',
  'Kırmızılar burada, maviler şurada…',
  'Neredeyse bitti…',
];

export function Bekleme({ foto }: { foto: string | null }) {
  const [sira, setSira] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSira((s) => Math.min(s + 1, MESAJLAR.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="ekran bekleme">
      {foto && <img src={foto} alt="" className="bekleme-resmi" />}
      <div className="ziplayan-tuglalar" aria-hidden>
        <span style={{ background: '#C91A09' }} />
        <span style={{ background: '#F2CD37' }} />
        <span style={{ background: '#0055BF' }} />
        <span style={{ background: '#4B9F4A' }} />
      </div>
      <p className="bekleme-yazisi" aria-live="polite">{MESAJLAR[sira]}</p>
    </main>
  );
}

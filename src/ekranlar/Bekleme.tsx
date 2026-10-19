import { useEffect, useState } from 'react';

const MESAJLAR = [
  'Parçalara bakıyorum…',
  'Çivileri sayıyorum…',
  'Renkleri ayırıyorum…',
  'Kırmızılar burada, maviler şurada…',
  'Neredeyse bitti, Ilgaz…',
];

export function Bekleme({ foto }: { foto: string | null }) {
  const [sira, setSira] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSira((s) => Math.min(s + 1, MESAJLAR.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="koyu">
      <main className="ekran menusuz bekleme" style={{ minHeight: '100dvh' }}>
        {foto && (
          <div className="tarama-cercevesi">
            <img src={foto} alt="" />
            <div className="tarama-cizgisi" />
          </div>
        )}
        <p className="bekleme-yazisi" aria-live="polite">{MESAJLAR[sira]}</p>
      </main>
    </div>
  );
}

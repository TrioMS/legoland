import { useEffect, useState } from 'react';

// Geçen süreye göre mesaj: uzun taramalarda "neredeyse bitti" deyip çocuğu kandırmayalım
const MESAJLAR: [saniye: number, mesaj: string][] = [
  [0, 'Parçalara bakıyorum…'],
  [5, 'Çivileri sayıyorum…'],
  [10, 'Renkleri ayırıyorum…'],
  [16, 'Kırmızılar burada, maviler şurada…'],
  [24, 'Bu fotoğrafta çok parça var, biraz daha sabır Ilgaz…'],
  [40, 'Hâlâ sayıyorum, az kaldı…'],
  [60, 'Yapay zeka bugün biraz yavaş, ama vazgeçmiyorum!'],
];

export function Bekleme({ foto, yenidenDeneniyor }: { foto: string | null; yenidenDeneniyor: boolean }) {
  const [saniye, setSaniye] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSaniye((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mesaj = yenidenDeneniyor
    ? 'Yapay zeka takıldı, bir daha deniyorum…'
    : MESAJLAR.filter(([s]) => saniye >= s).at(-1)![1];

  return (
    <div className="koyu">
      <main className="ekran menusuz bekleme" style={{ minHeight: '100dvh' }}>
        {foto && (
          <div className="tarama-cercevesi">
            <img src={foto} alt="" />
            <div className="tarama-cizgisi" />
          </div>
        )}
        <p className="bekleme-yazisi" aria-live="polite">{mesaj}</p>
        <p className="bekleme-sure">{saniye} sn</p>
      </main>
    </div>
  );
}

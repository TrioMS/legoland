import { FotoButonlari } from '../bilesenler/FotoButonlari';

interface Props {
  foto: string | null;
  hata: string | null;
  fotoSecildi: (f: File) => void;
  analizEt: () => void;
  geri: () => void;
}

export function Onizleme({ foto, hata, fotoSecildi, analizEt, geri }: Props) {
  return (
    <main className="ekran">
      <button className="geri-buton" onClick={geri}>⬅️ Geri</button>
      {foto && <img src={foto} alt="Çekilen fotoğraf" className="onizleme-resmi" />}
      {hata && <p className="hata-kutusu">{hata}</p>}
      <div className="buton-yigini">
        <button className="buyuk-buton yesil" onClick={analizEt} disabled={!foto}>
          <span className="buton-emoji">🔍</span> {hata ? 'Tekrar Dene' : 'Parçaları Bul!'}
        </button>
        <FotoButonlari fotoSecildi={fotoSecildi} kameraYazisi="Yeniden Çek" />
      </div>
    </main>
  );
}

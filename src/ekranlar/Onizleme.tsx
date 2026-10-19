import { FotoButonlari } from '../bilesenler/FotoButonlari';

interface Props {
  foto: string | null;
  hata: string | null;
  /** Mevcut listeye yeni parti ekleniyor mu */
  ekleme: boolean;
  fotoSecildi: (f: File) => void;
  analizEt: () => void;
  geri: () => void;
}

export function Onizleme({ foto, hata, ekleme, fotoSecildi, analizEt, geri }: Props) {
  return (
    <div className="koyu">
      <main className="ekran menusuz">
        <button className="geri-buton" onClick={geri}>✕ Vazgeç</button>
        {ekleme && !foto && (
          <p className="bilgi-kutusu">📷 Kalan parçaların fotoğrafını çek. Bulduklarımı listene ekleyeceğim!</p>
        )}
        {foto && <img src={foto} alt="Çekilen fotoğraf" className="onizleme-resmi" />}
        {hata && <p className="hata-kutusu">{hata}</p>}
        <div className="buton-yigini">
          {foto && (
            <button className="buyuk-buton turuncu" onClick={analizEt}>
              <span className="buton-emoji">🔍</span> {hata ? 'Tekrar Dene' : ekleme ? 'Bul ve Listeye Ekle!' : 'Parçaları Bul!'}
            </button>
          )}
          <FotoButonlari fotoSecildi={fotoSecildi} kameraYazisi={foto ? 'Yeniden Çek' : 'Fotoğraf Çek'} />
        </div>
      </main>
    </div>
  );
}

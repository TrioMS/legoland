import { FotoButonlari } from '../bilesenler/FotoButonlari';

export function AnaSayfa({ hata, fotoSecildi, kayitlar }: { hata: string | null; fotoSecildi: (f: File) => void; kayitlar: () => void }) {
  return (
    <main className="ekran ana">
      <header className="baslik-alani">
        <img src="/favicon.svg" alt="" className="logo" />
        <h1>Lego Yardımcı</h1>
        <p className="alt-baslik">Parçalarının fotoğrafını çek, ben sayayım!</p>
      </header>

      <div className="buton-yigini">
        <FotoButonlari fotoSecildi={fotoSecildi} />
        <button className="buyuk-buton sari" onClick={kayitlar}>
          <span className="buton-emoji">📦</span> Kayıtlarım
        </button>
      </div>

      {hata && <p className="hata-kutusu">{hata}</p>}

      <section className="ipucu">
        <h2>💡 İyi fotoğraf için</h2>
        <ul>
          <li>Parçaları <b>düz ve tek renk</b> bir zemine yay.</li>
          <li>Parçalar <b>üst üste binmesin</b>, aralarında boşluk olsun.</li>
          <li>Aydınlık bir yerde, <b>tam yukarıdan</b> çek.</li>
          <li>Çok parça varsa <b>birkaç parti</b> halinde çek.</li>
        </ul>
      </section>

      <footer className="surum">Sürüm {__SURUM__}</footer>
    </main>
  );
}

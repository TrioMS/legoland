import { useState } from 'react';
import { erisimKodu } from '../api/analiz';

/** Ebeveyn için: sunucuda ERISIM_KODU tanımlıysa bir kez girilir, tablette saklanır. */
export function KodEkrani({ tamam, geri }: { tamam: () => void; geri: () => void }) {
  const [kod, setKod] = useState(erisimKodu.oku());
  return (
    <main className="ekran">
      <button className="geri-buton" onClick={geri}>⬅️ Geri</button>
      <h2 className="ekran-basligi">👨‍👦 Aile kodu</h2>
      <p className="bilgi-kutusu">Bu kısım anne-baba için. Aile kodunu bir kez gir, tablet hatırlayacak.</p>
      <form
        className="buton-yigini"
        onSubmit={(e) => {
          e.preventDefault();
          erisimKodu.yaz(kod);
          tamam();
        }}
      >
        <input className="kod-girisi" type="password" value={kod} onChange={(e) => setKod(e.target.value)} autoFocus />
        <button className="buyuk-buton yesil" type="submit" disabled={!kod.trim()}>
          Kaydet
        </button>
      </form>
    </main>
  );
}

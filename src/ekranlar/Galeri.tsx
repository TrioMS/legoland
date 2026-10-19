import { useState } from 'react';
import { KUTUPHANE, ROL_RENKLERI, boya } from '../../shared/kutuphane';
import { IzometrikModel } from '../bilesenler/IzometrikModel';

/** Sadece geliştirmede (?galeri): kütüphanedeki tüm modelleri varsayılan renkleriyle gösterir. */
export function Galeri() {
  const [donus, setDonus] = useState(0);
  const bas = Number(new URLSearchParams(location.search).get('galeri')) || 0;
  return (
    <main className="ekran menusuz">
      <h2 className="ekran-basligi">Model galerisi ({KUTUPHANE.length})</h2>
      <button className="cip" onClick={() => setDonus((d) => d + 1)}>🔄 Döndür ({donus % 4})</button>
      <ul className="oneri-izgarasi">
        {KUTUPHANE.slice(bas).map((m) => {
          const adimlar = boya(m, (r) => m.renkler?.[r] ?? ROL_RENKLERI[r][0]);
          return (
            <li key={m.id}>
              <div className="oneri-karti">
                <span className="oneri-gorsel">
                  <IzometrikModel parcalar={adimlar.flatMap((a) => a.parcalar)} donus={donus} />
                </span>
                <span className="oneri-adi">{m.emoji} {m.ad}</span>
                <span className="oneri-alt">{adimlar.flatMap((a) => a.parcalar).length} parça · {m.id}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

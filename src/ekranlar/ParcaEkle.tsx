import { useState } from 'react';
import { KATEGORILER, PARCA_TURLERI, RENKLER } from '../../shared/katalog';
import { ParcaResmi } from '../bilesenler/ParcaResmi';

export function ParcaEkle({ ekle, geri }: { ekle: (parcaId: string, renkId: string) => void; geri: () => void }) {
  const [renkId, setRenkId] = useState('kirmizi');
  const [kategori, setKategori] = useState(0);
  const parcalar = PARCA_TURLERI.filter((p) => KATEGORILER[kategori].sekil.includes(p.sekil));

  return (
    <main className="ekran">
      <button className="geri-buton" onClick={geri}>⬅️ Geri</button>
      <h2 className="ekran-basligi">1. Rengi seç</h2>
      <div className="renk-paleti">
        {RENKLER.map((r) => (
          <button
            key={r.id}
            className={`renk-dugmesi ${r.id === renkId ? 'secili' : ''}`}
            style={{ background: r.hex }}
            onClick={() => setRenkId(r.id)}
            aria-label={r.ad}
            title={r.ad}
          />
        ))}
      </div>

      <h2 className="ekran-basligi">2. Parçaya dokun</h2>
      <div className="sekmeler">
        {KATEGORILER.map((k, i) => (
          <button key={k.ad} className={i === kategori ? 'secili' : ''} onClick={() => setKategori(i)}>
            {k.emoji} {k.ad}
          </button>
        ))}
      </div>
      <ul className="parca-izgarasi secim">
        {parcalar.map((p) => (
          <li key={p.id}>
            <button className="parca-karti" onClick={() => ekle(p.id, renkId)}>
              <ParcaResmi parcaId={p.id} renkId={renkId} boyut={72} />
              <div className="parca-adi">{p.ad}</div>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

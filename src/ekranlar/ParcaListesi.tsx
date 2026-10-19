import { useState } from 'react';
import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../../shared/katalog';
import type { ParcaSatiri } from '../../shared/tipler';
import { ParcaResmi } from '../bilesenler/ParcaResmi';
import { toplamAdet, type Tarama } from '../depo/taramalar';

interface Props {
  tarama: Tarama;
  guncelle: (p: ParcaSatiri[]) => void;
  parcaEkle: () => void;
  fotoEkle: () => void;
  oneriler: () => void;
  anaSayfa: () => void;
}

const parcaSirasi = (id: string) => PARCA_TURLERI.findIndex((p) => p.id === id);
const renkSirasi = (id: string) => RENKLER.findIndex((r) => r.id === id);

export function ParcaListesi({ tarama, guncelle, parcaEkle, fotoEkle, oneriler, anaSayfa }: Props) {
  const [duzenle, setDuzenle] = useState(false);
  const [buyukResim, setBuyukResim] = useState(false);

  const sirali = [...tarama.parcalar].sort(
    (a, b) => parcaSirasi(a.parcaId) - parcaSirasi(b.parcaId) || renkSirasi(a.renkId) - renkSirasi(b.renkId),
  );
  const toplam = toplamAdet(tarama.parcalar);
  const supheliVar = tarama.parcalar.some((p) => p.guven === 'dusuk');

  const adetDegistir = (satir: ParcaSatiri, fark: number) =>
    guncelle(tarama.parcalar.map((p) => (p === satir ? { ...p, adet: p.adet + fark, guven: 'yuksek' } : p)));
  const sil = (satir: ParcaSatiri) => guncelle(tarama.parcalar.filter((p) => p !== satir));

  return (
    <main className="ekran">
      <div className="ust-cubuk">
        <button className="geri-buton" onClick={anaSayfa}>🏠 Ana Sayfa</button>
        <button className={`geri-buton ${duzenle ? 'aktif' : ''}`} onClick={() => setDuzenle(!duzenle)}>
          {duzenle ? '✅ Bitti' : '✏️ Düzelt'}
        </button>
      </div>

      <section className="ozet">
        <img src={tarama.resim} alt="Fotoğraf" className="ozet-resmi" onClick={() => setBuyukResim(true)} />
        <div>
          <div className="toplam-sayi">{toplam}</div>
          <div className="toplam-yazi">parça buldum!</div>
          {(tarama.fotoSayisi ?? 1) > 1 && <div className="foto-sayisi">📷 {tarama.fotoSayisi} fotoğraftan</div>}
        </div>
      </section>

      {tarama.sahte && <p className="bilgi-kutusu">🧪 Deneme modu: bu sonuçlar örnek.</p>}
      {tarama.not && !tarama.sahte && <p className="bilgi-kutusu">💬 {tarama.not}</p>}
      {supheliVar && !duzenle && (
        <p className="bilgi-kutusu sari-kutu">🤔 Sarı çerçeveli parçalardan emin değilim. Yanlışsa <b>Düzelt</b>'e bas.</p>
      )}

      {sirali.length === 0 && <p className="bilgi-kutusu">Hiç parça bulamadım. Parça ekleyebilir ya da yeni fotoğraf çekebilirsin.</p>}

      <ul className="parca-izgarasi">
        {sirali.map((satir) => {
          const parca = parcaBul(satir.parcaId);
          const renk = renkBul(satir.renkId);
          return (
            <li key={`${satir.parcaId}|${satir.renkId}`} className={`parca-karti guven-${satir.guven}`}>
              <div className="adet-rozeti">{satir.adet}</div>
              <ParcaResmi parcaId={satir.parcaId} renkId={satir.renkId} boyut={84} />
              <div className="parca-adi">{parca.ad}</div>
              <div className="renk-adi">
                <span className="renk-noktasi" style={{ background: renk.hex }} /> {renk.ad}
              </div>
              {duzenle && (
                <div className="adet-kontrolleri">
                  <button aria-label="Bir azalt" onClick={() => (satir.adet > 1 ? adetDegistir(satir, -1) : sil(satir))}>➖</button>
                  <button aria-label="Bir artır" onClick={() => adetDegistir(satir, 1)}>➕</button>
                  <button aria-label="Sil" className="sil" onClick={() => sil(satir)}>🗑️</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="buton-yigini">
        {duzenle && (
          <button className="buyuk-buton yesil" onClick={parcaEkle}>
            <span className="buton-emoji">➕</span> Parça Ekle
          </button>
        )}
        {!duzenle && (
          <>
            <button className="buyuk-buton kirmizi" onClick={oneriler} disabled={sirali.length === 0}>
              <span className="buton-emoji">🏗️</span> Ne yapabilirim?
            </button>
            <button className="buyuk-buton mavi" onClick={fotoEkle}>
              <span className="buton-emoji">📷</span> Fotoğraf ekle
            </button>
          </>
        )}
      </div>

      {buyukResim && (
        <div className="tam-ekran" onClick={() => setBuyukResim(false)}>
          <img src={tarama.resim} alt="Fotoğraf" />
        </div>
      )}
    </main>
  );
}

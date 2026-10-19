import { useState } from 'react';
import { PARCA_TURLERI, RENKLER, parcaBul, renkBul } from '../../shared/katalog';
import type { ParcaSatiri } from '../../shared/tipler';
import { ParcaResmi } from '../bilesenler/ParcaResmi';
import { IsaretliFoto, type Vurgu } from '../bilesenler/IsaretliFoto';
import { toplamAdet, type Tarama } from '../depo/taramalar';

interface Props {
  tarama: Tarama;
  guncelle: (p: ParcaSatiri[]) => void;
  parcaEkle: () => void;
  fotoEkle: () => void;
  oneriler: () => void;
}

const parcaSirasi = (id: string) => PARCA_TURLERI.findIndex((p) => p.id === id);
const renkSirasi = (id: string) => RENKLER.findIndex((r) => r.id === id);

export function ParcaListesi({ tarama, guncelle, parcaEkle, fotoEkle, oneriler }: Props) {
  const [duzenle, setDuzenle] = useState(false);
  const [buyukResim, setBuyukResim] = useState(false);
  const [vurgu, setVurgu] = useState<Vurgu | null>(null);
  const [fotoNo, setFotoNo] = useState(0);

  const fotolar = tarama.fotolar ?? [];
  const foto = fotolar[Math.min(fotoNo, fotolar.length - 1)];
  const vurguSayisi = vurgu && foto ? foto.isaretler.filter((i) => i.parcaId === vurgu.parcaId && i.renkId === vurgu.renkId).length : 0;

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
      <section className="foto-sahnesi">
        {foto ? (
          <IsaretliFoto resim={foto.resim} isaretler={foto.isaretler} vurgu={vurgu} onClick={() => setBuyukResim(true)} />
        ) : (
          <img src={tarama.resim} alt="" className="eski-foto" onClick={() => setBuyukResim(true)} />
        )}
        {fotolar.length > 1 && (
          <div className="foto-gecis">
            {fotolar.map((_, i) => (
              <button key={i} className={i === fotoNo ? 'aktif' : ''} onClick={() => setFotoNo(i)} aria-label={`${i + 1}. fotoğraf`} />
            ))}
          </div>
        )}
        {vurgu ? (
          <div className="vurgu-cubugu">
            <ParcaResmi parcaId={vurgu.parcaId} renkId={vurgu.renkId} boyut={44} />
            <span>
              <b>{parcaBul(vurgu.parcaId).ad}</b> · {renkBul(vurgu.renkId).ad}
              <br />
              {vurguSayisi > 0 ? `Fotoğrafta ${vurguSayisi} tane işaretledim` : 'Bu fotoğrafta işaret yok'}
            </span>
            <button onClick={() => setVurgu(null)} aria-label="Kapat">✕</button>
          </div>
        ) : (
          <div className="foto-baslik-yazi">
            <div className="toplam-sayi">{toplam}</div>
            <div className="toplam-yazi">parça buldum, Ilgaz!</div>
            {(tarama.fotoSayisi ?? 1) > 1 && <div className="foto-sayisi">📷 {tarama.fotoSayisi} fotoğraftan</div>}
          </div>
        )}
      </section>
      {foto && !vurgu && sirali.length > 0 && <p className="not-yazisi">👆 Bir parçaya dokun, fotoğrafta nerede olduğunu göstereyim.</p>}

      <div className="cip-satiri">
        <button className={`cip ${duzenle ? 'aktif' : ''}`} onClick={() => setDuzenle(!duzenle)}>
          {duzenle ? '✅ Bitti' : '✏️ Düzelt'}
        </button>
        {duzenle ? (
          <button className="cip" onClick={parcaEkle}>➕ Parça ekle</button>
        ) : (
          <button className="cip" onClick={fotoEkle}>📷 Fotoğraf ekle</button>
        )}
      </div>

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
            <li
              key={`${satir.parcaId}|${satir.renkId}`}
              className={`parca-karti guven-${satir.guven} ${vurgu?.parcaId === satir.parcaId && vurgu?.renkId === satir.renkId ? 'vurgulanan' : ''}`}
              onClick={() => {
                if (duzenle || !foto) return;
                setVurgu({ parcaId: satir.parcaId, renkId: satir.renkId });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
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

      {!duzenle && sirali.length > 0 && (
        <div className="yapiskan-eylem">
          <button className="buyuk-buton turuncu" onClick={oneriler}>
            <span className="buton-emoji">💡</span> Ne yapabilirim?
          </button>
        </div>
      )}

      {buyukResim && (
        <div className="tam-ekran" onClick={() => setBuyukResim(false)}>
          {foto ? (
            <IsaretliFoto resim={foto.resim} isaretler={foto.isaretler} vurgu={vurgu} enFazlaYukseklik="92dvh" />
          ) : (
            <img src={tarama.resim} alt="Fotoğraf" />
          )}
        </div>
      )}
    </main>
  );
}

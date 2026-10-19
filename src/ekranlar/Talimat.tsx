import { useMemo, useState } from 'react';
import { parcaBul, renkBul } from '../../shared/katalog';
import type { ModelOnerisi } from '../../shared/tipler';
import { yapiParcalari } from '../../shared/yapi';
import { IsaretliFoto } from '../bilesenler/IsaretliFoto';
import { IzometrikModel } from '../bilesenler/IzometrikModel';
import { ParcaResmi } from '../bilesenler/ParcaResmi';
import type { Tarama } from '../depo/taramalar';

interface Props {
  model: ModelOnerisi;
  tarama: Tarama;
  geri: () => void;
}

/** Adım adım 3D montaj kılavuzu. Her adımda yeni parçalar turuncu kenarla gösterilir. */
export function Talimat({ model, tarama, geri }: Props) {
  const adimlar = model.adimlar ?? [];
  const [no, setNo] = useState(0);
  const [donus, setDonus] = useState(0);
  const [fotoAcik, setFotoAcik] = useState(false);
  const bitti = no >= adimlar.length;

  // Bu adıma kadar olan tüm parçalar ve bu adımda eklenenlerin indeksleri
  const { parcalar, yeniler } = useMemo(() => {
    const onceki = adimlar.slice(0, no).flatMap((a) => a.parcalar);
    const bu = bitti ? [] : adimlar[no].parcalar;
    return {
      parcalar: [...onceki, ...bu],
      yeniler: bitti ? undefined : new Set(bu.map((_, i) => onceki.length + i)),
    };
  }, [adimlar, no, bitti]);

  const gerekenler = bitti ? [] : yapiParcalari([adimlar[no]]);
  const foto = tarama.fotolar?.find((f) => f.isaretler.length > 0);

  const git = (yeni: number) => {
    setNo(Math.max(0, Math.min(adimlar.length, yeni)));
    setFotoAcik(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="ekran talimat">
      <div className="ust-cubuk">
        <button className="geri-buton" onClick={geri}>✕ Çık</button>
        <span className="adim-sayaci">{bitti ? '🎉 Bitti!' : `Adım ${no + 1} / ${adimlar.length}`}</span>
        <button className="geri-buton" onClick={() => setDonus((d) => d + 1)} aria-label="Modeli döndür">🔄 Döndür</button>
      </div>
      <div className="ilerleme"><span style={{ width: `${(Math.min(no, adimlar.length) / Math.max(1, adimlar.length)) * 100}%` }} /></div>

      <section className="talimat-sahnesi">
        <IzometrikModel parcalar={parcalar} yeniler={yeniler} donus={donus} className="talimat-cizimi" />
      </section>

      {bitti ? (
        <section className="kutlama">
          <div className="kutlama-emoji">🎉🏆🎉</div>
          <h2>Harika Ilgaz! {model.ad} hazır!</h2>
          <p>Şimdi onunla oyna, ya da renkleri değiştirip kendi tasarımını yap!</p>
          <div className="buton-yigini">
            <button className="buyuk-buton ikincil" onClick={() => git(0)}>🔁 Baştan izle</button>
            <button className="buyuk-buton turuncu" onClick={geri}>💡 Başka fikirler</button>
          </div>
        </section>
      ) : (
        <>
          <section className="adim-parcalari">
            <h3>Bu adımda gerekenler</h3>
            <ul>
              {gerekenler.map((g) => (
                <li key={`${g.parcaId}|${g.renkId}`}>
                  <ParcaResmi parcaId={g.parcaId} renkId={g.renkId} boyut={64} />
                  <span className="adet">×{g.adet}</span>
                  <span className="ad">{parcaBul(g.parcaId).ad}<br /><small>{renkBul(g.renkId).ad}</small></span>
                </li>
              ))}
            </ul>
            {foto && (
              <button className="cip" onClick={() => setFotoAcik(!fotoAcik)}>
                {fotoAcik ? '🙈 Fotoğrafı gizle' : '📍 Fotoğrafımda nerede?'}
              </button>
            )}
          </section>
          {fotoAcik && foto && (
            <section className="foto-sahnesi">
              <IsaretliFoto resim={foto.resim} isaretler={foto.isaretler} vurgu={gerekenler.map((g) => ({ parcaId: g.parcaId, renkId: g.renkId }))} />
            </section>
          )}
        </>
      )}

      {!bitti && (
        <div className="adim-dugmeleri">
          <button className="buyuk-buton ikincil" onClick={() => git(no - 1)} disabled={no === 0}>◀ Geri</button>
          <button className="buyuk-buton turuncu" onClick={() => git(no + 1)}>
            {no === adimlar.length - 1 ? 'Bitir 🎉' : 'İleri ▶'}
          </button>
        </div>
      )}
    </main>
  );
}

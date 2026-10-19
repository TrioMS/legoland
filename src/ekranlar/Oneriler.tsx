import { useEffect, useMemo, useState } from 'react';
import { parcaBul, renkBul } from '../../shared/katalog';
import type { MocOnerisi, ModelOnerisi, ModelParcasi, ParcaSatiri } from '../../shared/tipler';
import { AnalizHatasi, mocleriAl } from '../api/analiz';
import { kutuphaneOnerileri, type KutuphaneOnerisi } from '../oneriler/kutuphaneEslestir';
import { ParcaResmi } from '../bilesenler/ParcaResmi';
import { IzometrikModel } from '../bilesenler/IzometrikModel';
import { Talimat } from './Talimat';
import type { Tarama } from '../depo/taramalar';
import {
  legoTalimatLinki,
  parcalariKontrolEt,
  rebrickableLinki,
  setResmi,
  uyanSetleriBul,
  type EksikSatir,
  type SetEslesmesi,
} from '../oneriler/eslestir';

interface Props {
  tarama: Tarama;
  kodGerekli: () => void;
}

type Secili =
  | { tur: 'model'; model: ModelOnerisi }
  | { tur: 'talimat'; model: ModelOnerisi }
  | { tur: 'set'; set: SetEslesmesi }
  | null;

const yildizlar = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function Oneriler({ tarama, kodGerekli }: Props) {
  const [sekme, setSekme] = useState<'fikir' | 'set'>('fikir');
  const [secili, setSecili] = useState<Secili>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [secili, sekme]);

  if (secili?.tur === 'talimat') {
    return <Talimat model={secili.model} tarama={tarama} geri={() => setSecili({ tur: 'model', model: secili.model })} />;
  }
  if (secili?.tur === 'model') {
    return (
      <ModelDetay
        model={secili.model}
        eldekiler={tarama.parcalar}
        yap={() => setSecili({ tur: 'talimat', model: secili.model })}
        geri={() => setSecili(null)}
      />
    );
  }
  if (secili?.tur === 'set') return <SetDetay set={secili.set} kodGerekli={kodGerekli} geri={() => setSecili(null)} />;

  return (
    <main className="ekran">
      <h2 className="ekran-basligi">Ilgaz, ne yapabiliriz?</h2>
      <div className="sekmeler buyuk">
        <button className={sekme === 'fikir' ? 'secili' : ''} onClick={() => setSekme('fikir')}>💡 Fikirler</button>
        <button className={sekme === 'set' ? 'secili' : ''} onClick={() => setSekme('set')}>📦 LEGO Setleri</button>
      </div>
      {sekme === 'fikir' ? (
        <Fikirler tarama={tarama} sec={(model) => setSecili({ tur: 'model', model })} />
      ) : (
        <Setler eldekiler={tarama.parcalar} sec={(set) => setSecili({ tur: 'set', set })} />
      )}
    </main>
  );
}

// ---- Kütüphaneden fikirler ------------------------------------------------------------

function FikirKarti({ o, sec }: { o: KutuphaneOnerisi; sec: (m: ModelOnerisi) => void }) {
  const eksik = o.kontrol.toplam - o.kontrol.sekilUyan;
  const renkFarki = o.kontrol.sekilUyan - o.kontrol.tamUyan;
  return (
    <li>
      <button className="oneri-karti" onClick={() => sec(o.oneri)}>
        <span className="oneri-gorsel"><ModelGorseli model={o.oneri} /></span>
        <span className="oneri-adi">{o.oneri.emoji} {o.oneri.ad}</span>
        <span className="oneri-aciklama">{o.oneri.aciklama}</span>
        <span className="oneri-alt">
          <span className="zorluk">{yildizlar(o.oneri.zorluk)}</span>
          <span>🧱 {o.kontrol.toplam}</span>
          {eksik === 0 && renkFarki === 0 && <span className="rozet yesil-rozet">Hepsi var</span>}
          {eksik === 0 && renkFarki > 0 && <span className="rozet yesil-rozet">Hepsi var · {renkFarki} renk farklı</span>}
          {eksik > 0 && <span className="rozet sari-rozet">{eksik} parça eksik</span>}
        </span>
      </button>
    </li>
  );
}

function Fikirler({ tarama, sec }: { tarama: Tarama; sec: (m: ModelOnerisi) => void }) {
  const [hepsi, setHepsi] = useState(false);
  const oneriler = useMemo(() => kutuphaneOnerileri(tarama.parcalar), [tarama.parcalar]);

  if (tarama.parcalar.length === 0) return <p className="bilgi-kutusu">Önce parça listesine birkaç parça eklemelisin.</p>;

  const hazir = oneriler.filter((o) => o.oran === 1);
  const yakin = oneriler.filter((o) => o.oran < 1 && o.oran >= 0.6);
  const diger = oneriler.filter((o) => o.oran < 0.6);

  return (
    <>
      {hazir.length > 0 ? (
        <>
          <h3 className="alt-baslik-kucuk">✅ Hemen yapabilirsin</h3>
          <ul className="oneri-izgarasi">{hazir.map((o) => <FikirKarti key={o.model.id} o={o} sec={sec} />)}</ul>
        </>
      ) : (
        <p className="bilgi-kutusu">Tam yapabileceğin bir model bulamadım ama aşağıdakilere çok az parça eksik! Eksik yerlere başka parça koyabilirsin.</p>
      )}
      {yakin.length > 0 && (
        <>
          <h3 className="alt-baslik-kucuk">🧩 Birkaç parça eksik</h3>
          <ul className="oneri-izgarasi">{yakin.map((o) => <FikirKarti key={o.model.id} o={o} sec={sec} />)}</ul>
        </>
      )}
      {diger.length > 0 &&
        (hepsi ? (
          <>
            <h3 className="alt-baslik-kucuk">📚 Diğer modeller</h3>
            <ul className="oneri-izgarasi">{diger.map((o) => <FikirKarti key={o.model.id} o={o} sec={sec} />)}</ul>
          </>
        ) : (
          <button className="buyuk-buton ikincil" onClick={() => setHepsi(true)}>
            📚 Diğer {diger.length} modeli de göster
          </button>
        ))}
    </>
  );
}

function ParcaSatirlari({ satirlar, eksikler }: { satirlar: ModelParcasi[]; eksikler?: EksikSatir[] }) {
  return (
    <ul className="parca-izgarasi kucuk">
      {satirlar.map((s) => {
        const eksik = eksikler?.find((e) => e.parcaId === s.parcaId && e.renkId === s.renkId);
        const yok = eksik ? eksik.adet - eksik.renkleYapilir : 0;
        return (
          <li key={`${s.parcaId}|${s.renkId}`} className={`parca-karti ${yok ? 'eksik' : eksik ? 'guven-dusuk' : ''}`}>
            <div className="adet-rozeti">{s.adet}</div>
            <ParcaResmi parcaId={s.parcaId} renkId={s.renkId} boyut={64} />
            <div className="parca-adi">{parcaBul(s.parcaId).ad}</div>
            <div className="renk-adi">{renkBul(s.renkId).ad}</div>
            {eksik && eksik.renkleYapilir > 0 && <div className="eksik-notu">🎨 {eksik.renkleYapilir} tanesini başka renkle yap</div>}
            {yok > 0 && <div className="eksik-notu">❌ {yok} eksik</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Modelin 3D resmi; adım bilgisi yoksa (eski kayıt) emoji */
function ModelGorseli({ model, donus = 0 }: { model: ModelOnerisi; donus?: number }) {
  const parcalar = model.adimlar?.flatMap((a) => a.parcalar) ?? [];
  return parcalar.length ? <IzometrikModel parcalar={parcalar} donus={donus} /> : <>{model.emoji}</>;
}

function ModelDetay({ model, eldekiler, yap, geri }: { model: ModelOnerisi; eldekiler: ParcaSatiri[]; yap: () => void; geri: () => void }) {
  const k = parcalariKontrolEt(model.parcalar, eldekiler);
  const [donus, setDonus] = useState(0);
  const adimVar = !!model.adimlar?.length;
  return (
    <main className="ekran">
      <button className="geri-buton" onClick={geri}>⬅️ Fikirler</button>
      <section className="detay-baslik">
        <button className="detay-gorsel" onClick={() => setDonus((d) => d + 1)} aria-label="Modeli döndür">
          <ModelGorseli model={model} donus={donus} />
        </button>
        <div>
          <h2 className="ekran-basligi">{model.emoji} {model.ad}</h2>
          <p className="detay-aciklama">{model.aciklama}</p>
          <p><span className="zorluk">{yildizlar(model.zorluk)}</span> · {k.toplam} parça{adimVar ? ` · ${model.adimlar!.length} adım` : ''}</p>
          {adimVar && <p className="not-yazisi">👆 Resme dokun, modeli döndür.</p>}
        </div>
      </section>
      <div className="yapiskan-eylem">
        <button className="buyuk-buton turuncu" onClick={yap} disabled={!adimVar}>
          <span className="buton-emoji">🔨</span> Bunu yapalım!
        </button>
      </div>
      <h3 className="alt-baslik-kucuk">Gereken parçalar</h3>
      <ParcaSatirlari satirlar={model.parcalar} eksikler={k.eksikler} />
    </main>
  );
}

// ---- Resmi LEGO setleri --------------------------------------------------------------

function Setler({ eldekiler, sec }: { eldekiler: ParcaSatiri[]; sec: (s: SetEslesmesi) => void }) {
  const [setler, setSetler] = useState<SetEslesmesi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    uyanSetleriBul(eldekiler).then(setSetler, () => setHata('Set listesi yüklenemedi. İnternet bağlantını kontrol et.'));
  }, [eldekiler]);

  if (hata) return <p className="hata-kutusu">{hata}</p>;
  if (!setler) return <YukleniyorKutusu yazi="LEGO setlerine bakıyorum…" />;
  if (setler.length === 0) {
    return <p className="bilgi-kutusu">Bu parçalarla yakın bir set bulamadım. Daha çok parça ekleyince tekrar bak!</p>;
  }

  return (
    <>
      <p className="bilgi-kutusu">Gerçek LEGO setleri. Yüzde, setin parçalarından kaçının sende olduğunu gösterir (renkler farklı olabilir).</p>
      <ul className="set-izgarasi">
        {setler.map((s) => (
          <li key={s.no}>
            <button className="set-karti" onClick={() => sec(s)}>
              <img src={setResmi(s.no)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              <span className="set-adi">{s.ad}</span>
              <span className="set-alt">{s.tema} · {s.yil}</span>
              <span className="uyum-cubugu"><span style={{ width: `${Math.round(s.oran * 100)}%` }} /></span>
              <span className="uyum-yazi">%{Math.round(s.oran * 100)} sende var</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function SetDetay({ set, kodGerekli, geri }: { set: SetEslesmesi; kodGerekli: () => void; geri: () => void }) {
  const [mocler, setMocler] = useState<MocOnerisi[] | null>(null);
  const [mocDurumu, setMocDurumu] = useState<'yukleniyor' | 'anahtarYok' | 'hata' | 'tamam'>('yukleniyor');

  useEffect(() => {
    mocleriAl(set.no).then(
      (y) => {
        setMocler(y.mocler);
        setMocDurumu(y.anahtarYok ? 'anahtarYok' : 'tamam');
      },
      (e) => {
        if (e instanceof AnalizHatasi && e.kod === 'erisim') return kodGerekli();
        setMocDurumu('hata');
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.no]);

  const k = set.kontrol;
  return (
    <main className="ekran">
      <button className="geri-buton" onClick={geri}>⬅️ Setler</button>
      <section className="set-detay-baslik">
        <img src={setResmi(set.no)} alt={set.ad} />
        <div>
          <h2 className="ekran-basligi">{set.ad}</h2>
          <p>{set.tema} · {set.yil} · Set {set.no.split('-')[0]}</p>
          <p className="uyum-yazi buyuk">%{Math.round(set.oran * 100)} sende var</p>
          <p>
            {set.toplamParca} parçalık set ·{' '}
            {set.toplamParca - k.sekilUyan === 0
              ? '✅ Tüm parçalar sende!'
              : `${set.toplamParca - k.sekilUyan} parça eksik`}
            {k.sekilUyan > k.tamUyan && `, ${k.sekilUyan - k.tamUyan} parçayı başka renkle yapabilirsin`}
          </p>
        </div>
      </section>
      <div className="buton-yigini">
        <a className="buyuk-buton yesil" href={legoTalimatLinki(set.no)} target="_blank" rel="noreferrer">
          <span className="buton-emoji">📘</span> Talimatları aç
        </a>
        <a className="buyuk-buton mavi" href={rebrickableLinki(set.no)} target="_blank" rel="noreferrer">
          <span className="buton-emoji">🔎</span> Rebrickable'da gör
        </a>
      </div>

      <h3 className="alt-baslik-kucuk">Setin parçaları</h3>
      <p className="not-yazisi">Not: Listede sadece uygulamanın tanıdığı parçalar var; özel parçalar gösterilmez.</p>
      <ParcaSatirlari satirlar={set.parcalar} eksikler={k.eksikler} />

      <h3 className="alt-baslik-kucuk">🎨 Bu setin parçalarıyla hayran tasarımları</h3>
      {mocDurumu === 'yukleniyor' && <YukleniyorKutusu yazi="Hayran tasarımlarına bakıyorum…" />}
      {mocDurumu === 'anahtarYok' && <p className="bilgi-kutusu">Hayran tasarımları için Rebrickable anahtarı gerekiyor (anne-baba ayarı).</p>}
      {mocDurumu === 'hata' && <p className="hata-kutusu">Hayran tasarımları şu an alınamadı.</p>}
      {mocDurumu === 'tamam' && mocler?.length === 0 && <p className="bilgi-kutusu">Bu set için hayran tasarımı yok.</p>}
      {mocDurumu === 'tamam' && !!mocler?.length && (
        <ul className="set-izgarasi">
          {mocler.map((m) => (
            <li key={m.no}>
              <a className="set-karti" href={m.link} target="_blank" rel="noreferrer">
                {m.resim && <img src={m.resim} alt="" loading="lazy" />}
                <span className="set-adi">{m.ad}</span>
                <span className="set-alt">{m.parcaSayisi} parça{m.tasarimci ? ` · ${m.tasarimci}` : ''}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function YukleniyorKutusu({ yazi }: { yazi: string }) {
  return (
    <div className="yukleniyor-kutusu">
      <div className="ziplayan-tuglalar" aria-hidden>
        <span style={{ background: '#C91A09' }} />
        <span style={{ background: '#F2CD37' }} />
        <span style={{ background: '#0055BF' }} />
      </div>
      <p className="bekleme-yazisi">{yazi}</p>
    </div>
  );
}

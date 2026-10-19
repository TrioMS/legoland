import { useEffect, useState } from 'react';
import { birlestir, type ParcaSatiri } from '../shared/tipler';
import { AnalizHatasi, analizEt, kucult } from './api/analiz';
import { taramaGetir, taramaKaydet, taramalariListele, type Tarama } from './depo/taramalar';
import { AltMenu } from './bilesenler/AltMenu';
import { AnaSayfa } from './ekranlar/AnaSayfa';
import { Onizleme } from './ekranlar/Onizleme';
import { Bekleme } from './ekranlar/Bekleme';
import { ParcaListesi } from './ekranlar/ParcaListesi';
import { ParcaEkle } from './ekranlar/ParcaEkle';
import { Kayitlar } from './ekranlar/Kayitlar';
import { KodEkrani } from './ekranlar/KodEkrani';
import { Oneriler } from './ekranlar/Oneriler';

export type Ekran = 'ana' | 'onizleme' | 'bekleme' | 'liste' | 'ekle' | 'kayitlar' | 'kod' | 'oneriler';

// Güncelleme sonrası sayfa yenilenirse çocuk kaldığı yerden devam etsin
const KONUM_ANAHTARI = 'lego-konum';
const TARAMALI_EKRANLAR: Ekran[] = ['liste', 'ekle', 'oneriler'];
const MENULU_EKRANLAR: Ekran[] = ['ana', 'liste', 'oneriler', 'kayitlar'];
const konumOku = (): { ekran: Ekran; taramaId?: string } => {
  try {
    return JSON.parse(localStorage.getItem(KONUM_ANAHTARI) ?? '') ?? { ekran: 'ana' };
  } catch {
    return { ekran: 'ana' };
  }
};

export default function App() {
  const [ekran, setEkran] = useState<Ekran>('ana');
  const [aktif, setAktif] = useState<Tarama | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  /** true ise yeni fotoğrafın parçaları aktif listeye eklenir */
  const [ekleme, setEkleme] = useState(false);
  /** Aile kodu girildikten sonra dönülecek ekran */
  const [kodSonrasi, setKodSonrasi] = useState<Ekran>('ana');

  useEffect(() => {
    const k = konumOku();
    if (TARAMALI_EKRANLAR.includes(k.ekran) && k.taramaId) {
      taramaGetir(k.taramaId).then((t) => {
        if (t) {
          setAktif(t);
          setEkran(k.ekran);
        }
      });
    } else {
      if (k.ekran === 'kayitlar') setEkran('kayitlar');
      // "Parçalarım" sekmesi hemen çalışsın diye son taramayı hazır tut
      taramalariListele().then((l) => l[0] && setAktif((a) => a ?? l[0]));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KONUM_ANAHTARI, JSON.stringify({ ekran, taramaId: aktif?.id }));
    window.scrollTo(0, 0);
  }, [ekran, aktif?.id]);

  const kodIste = (donus: Ekran) => {
    setKodSonrasi(donus);
    setEkran('kod');
  };

  const taramayiDegistir = (yeni: Tarama) => {
    setAktif(yeni);
    taramaKaydet(yeni);
  };

  const fotoSecildi = async (dosya: File) => {
    setHata(null);
    try {
      setFoto(await kucult(dosya, 1600));
      setEkran('onizleme');
    } catch {
      setHata('Bu fotoğraf açılamadı. Başka bir tane dene.');
    }
  };

  const analizBaslat = async () => {
    if (!foto) return;
    setHata(null);
    setEkran('bekleme');
    try {
      const sonuc = await analizEt(foto);
      const yeniFoto = { resim: await kucult(await (await fetch(foto)).blob(), 1000, 0.8), isaretler: sonuc.isaretler ?? [] };
      if (ekleme && aktif) {
        taramayiDegistir({
          ...aktif,
          parcalar: birlestir([...aktif.parcalar, ...sonuc.parcalar]),
          not: sonuc.not ?? aktif.not,
          fotoSayisi: (aktif.fotoSayisi ?? 1) + 1,
          fotolar: [...(aktif.fotolar ?? []), yeniFoto],
          oneriler: undefined,
        });
      } else {
        const tarama: Tarama = {
          id: crypto.randomUUID(),
          tarih: Date.now(),
          resim: await kucult(await (await fetch(foto)).blob(), 480, 0.75),
          parcalar: sonuc.parcalar,
          not: sonuc.not,
          sahte: sonuc.sahte,
          fotoSayisi: 1,
          fotolar: [yeniFoto],
        };
        await taramaKaydet(tarama);
        setAktif(tarama);
      }
      setFoto(null);
      setEkleme(false);
      setEkran('liste');
    } catch (e) {
      if (e instanceof AnalizHatasi && e.kod === 'erisim') return kodIste('onizleme');
      setHata(e instanceof Error ? e.message : 'Bir şeyler ters gitti.');
      setEkran('onizleme');
    }
  };

  const parcalariGuncelle = (parcalar: ParcaSatiri[]) => {
    if (aktif) taramayiDegistir({ ...aktif, parcalar: birlestir(parcalar), oneriler: undefined });
  };

  const icerik = ekranIcerigi();
  if (!MENULU_EKRANLAR.includes(ekran)) return icerik;
  return (
    <>
      {icerik}
      <AltMenu ekran={ekran} taramaVar={Boolean(aktif)} git={setEkran} />
    </>
  );

  function ekranIcerigi() {
  switch (ekran) {
    case 'onizleme':
      return (
        <Onizleme
          foto={foto}
          hata={hata}
          ekleme={ekleme}
          fotoSecildi={fotoSecildi}
          analizEt={analizBaslat}
          geri={() => {
            setFoto(null);
            setHata(null);
            setEkran(ekleme ? 'liste' : 'ana');
            setEkleme(false);
          }}
        />
      );
    case 'bekleme':
      return <Bekleme foto={foto} />;
    case 'liste':
      return aktif ? (
        <ParcaListesi
          tarama={aktif}
          guncelle={parcalariGuncelle}
          parcaEkle={() => setEkran('ekle')}
          fotoEkle={() => {
            setEkleme(true);
            setFoto(null);
            setHata(null);
            setEkran('onizleme');
          }}
          oneriler={() => setEkran('oneriler')}
        />
      ) : null;
    case 'ekle':
      return (
        <ParcaEkle
          ekle={(parcaId, renkId) => {
            parcalariGuncelle([...(aktif?.parcalar ?? []), { parcaId, renkId, adet: 1, guven: 'yuksek' }]);
            setEkran('liste');
          }}
          geri={() => setEkran('liste')}
        />
      );
    case 'oneriler':
      return aktif ? (
        <Oneriler
          tarama={aktif}
          kodGerekli={() => kodIste('oneriler')}
        />
      ) : null;
    case 'kayitlar':
      return (
        <Kayitlar
          ac={(t) => {
            setAktif(t);
            setEkran('liste');
          }}
        />
      );
    case 'kod':
      return (
        <KodEkrani
          tamam={() => (kodSonrasi === 'onizleme' && foto ? analizBaslat() : setEkran(kodSonrasi))}
          geri={() => setEkran(kodSonrasi === 'oneriler' ? 'liste' : foto ? 'onizleme' : 'ana')}
        />
      );
    default:
      return <AnaSayfa hata={hata} fotoSecildi={fotoSecildi} />;
  }
  }
}

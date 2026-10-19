import { useEffect, useState } from 'react';
import { birlestir, type ParcaSatiri } from '../shared/tipler';
import { AnalizHatasi, analizEt, kucult } from './api/analiz';
import { taramaGetir, taramaKaydet, type Tarama } from './depo/taramalar';
import { AnaSayfa } from './ekranlar/AnaSayfa';
import { Onizleme } from './ekranlar/Onizleme';
import { Bekleme } from './ekranlar/Bekleme';
import { ParcaListesi } from './ekranlar/ParcaListesi';
import { ParcaEkle } from './ekranlar/ParcaEkle';
import { Kayitlar } from './ekranlar/Kayitlar';
import { KodEkrani } from './ekranlar/KodEkrani';

export type Ekran = 'ana' | 'onizleme' | 'bekleme' | 'liste' | 'ekle' | 'kayitlar' | 'kod';

// Güncelleme sonrası sayfa yenilenirse çocuk kaldığı yerden devam etsin
const KONUM_ANAHTARI = 'lego-konum';
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

  useEffect(() => {
    const k = konumOku();
    if ((k.ekran === 'liste' || k.ekran === 'ekle') && k.taramaId) {
      taramaGetir(k.taramaId).then((t) => {
        if (t) {
          setAktif(t);
          setEkran(k.ekran);
        }
      });
    } else if (k.ekran === 'kayitlar') {
      setEkran('kayitlar');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KONUM_ANAHTARI, JSON.stringify({ ekran, taramaId: aktif?.id }));
    window.scrollTo(0, 0);
  }, [ekran, aktif?.id]);

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
      const kucukResim = await kucult(await (await fetch(foto)).blob(), 480, 0.75);
      const tarama: Tarama = {
        id: crypto.randomUUID(),
        tarih: Date.now(),
        resim: kucukResim,
        parcalar: sonuc.parcalar,
        not: sonuc.not,
        sahte: sonuc.sahte,
      };
      await taramaKaydet(tarama);
      setAktif(tarama);
      setFoto(null);
      setEkran('liste');
    } catch (e) {
      if (e instanceof AnalizHatasi && e.kod === 'erisim') {
        setEkran('kod');
        return;
      }
      setHata(e instanceof Error ? e.message : 'Bir şeyler ters gitti.');
      setEkran('onizleme');
    }
  };

  const parcalariGuncelle = (parcalar: ParcaSatiri[]) => {
    if (!aktif) return;
    const yeni = { ...aktif, parcalar: birlestir(parcalar) };
    setAktif(yeni);
    taramaKaydet(yeni);
  };

  switch (ekran) {
    case 'onizleme':
      return (
        <Onizleme
          foto={foto}
          hata={hata}
          fotoSecildi={fotoSecildi}
          analizEt={analizBaslat}
          geri={() => {
            setFoto(null);
            setHata(null);
            setEkran('ana');
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
          anaSayfa={() => setEkran('ana')}
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
    case 'kayitlar':
      return (
        <Kayitlar
          ac={(t) => {
            setAktif(t);
            setEkran('liste');
          }}
          geri={() => setEkran('ana')}
        />
      );
    case 'kod':
      return <KodEkrani tamam={() => (foto ? analizBaslat() : setEkran('ana'))} geri={() => setEkran(foto ? 'onizleme' : 'ana')} />;
    default:
      return <AnaSayfa hata={hata} fotoSecildi={fotoSecildi} kayitlar={() => setEkran('kayitlar')} />;
  }
}

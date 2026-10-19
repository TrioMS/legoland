import { useRef } from 'react';

interface Props {
  fotoSecildi: (f: File) => void;
  kameraYazisi?: string;
  /** 'deklansor': büyük yuvarlak kamera düğmesi (ana sayfa); 'buton': iki geniş düğme */
  gorunum?: 'deklansor' | 'buton';
}

/** Kamera ve galeri düğmeleri. Dosya girişi HTTP'de de çalışır. */
export function FotoButonlari({ fotoSecildi, kameraYazisi = 'Fotoğraf Çek', gorunum = 'buton' }: Props) {
  const kamera = useRef<HTMLInputElement>(null);
  const galeri = useRef<HTMLInputElement>(null);

  const degisti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (dosya) fotoSecildi(dosya);
  };

  const girisler = (
    <>
      <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={degisti} />
      <input ref={galeri} type="file" accept="image/*" hidden onChange={degisti} />
    </>
  );

  if (gorunum === 'deklansor') {
    return (
      <>
        <button className="deklansor" onClick={() => kamera.current?.click()} aria-label={kameraYazisi}>
          📷
        </button>
        <button className="metin-buton" onClick={() => galeri.current?.click()}>
          🖼️ Galeriden seç
        </button>
        {girisler}
      </>
    );
  }

  return (
    <>
      <button className="buyuk-buton turuncu" onClick={() => kamera.current?.click()}>
        <span className="buton-emoji">📷</span> {kameraYazisi}
      </button>
      <button className="buyuk-buton ikincil" onClick={() => galeri.current?.click()}>
        <span className="buton-emoji">🖼️</span> Galeriden Seç
      </button>
      {girisler}
    </>
  );
}

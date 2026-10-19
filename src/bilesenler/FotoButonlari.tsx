import { useRef } from 'react';

/** Kamera ve galeri için büyük butonlar. Dosya girişi HTTP'de de çalışır. */
export function FotoButonlari({ fotoSecildi, kameraYazisi = 'Fotoğraf Çek' }: { fotoSecildi: (f: File) => void; kameraYazisi?: string }) {
  const kamera = useRef<HTMLInputElement>(null);
  const galeri = useRef<HTMLInputElement>(null);

  const degisti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (dosya) fotoSecildi(dosya);
  };

  return (
    <>
      <button className="buyuk-buton kirmizi" onClick={() => kamera.current?.click()}>
        <span className="buton-emoji">📷</span> {kameraYazisi}
      </button>
      <button className="buyuk-buton mavi" onClick={() => galeri.current?.click()}>
        <span className="buton-emoji">🖼️</span> Galeriden Seç
      </button>
      <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={degisti} />
      <input ref={galeri} type="file" accept="image/*" hidden onChange={degisti} />
    </>
  );
}

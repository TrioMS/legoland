import { useEffect, useRef, useState } from 'react';
import { taramaSil, taramalariListele, toplamAdet, type Tarama } from '../depo/taramalar';

const tarihYaz = (t: number) =>
  new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const UZUN_BASMA_MS = 500;

interface Props {
  ac: (t: Tarama) => void;
  /** Silinen kayıtların kimlikleri (açık olan kayıt silindiyse uygulama onu kapatsın) */
  silindi: (idler: string[]) => void;
}

export function Kayitlar({ ac, silindi }: Props) {
  const [liste, setListe] = useState<Tarama[] | null>(null);
  /** null: normal mod; Set: çoklu seçim modu */
  const [secili, setSecili] = useState<Set<string> | null>(null);
  const zamanlayici = useRef<number | null>(null);
  const uzunBasildi = useRef(false);

  useEffect(() => {
    taramalariListele().then(setListe);
  }, []);

  const sil = async (idler: string[], soru: string) => {
    if (!idler.length || !confirm(soru)) return;
    await Promise.all(idler.map(taramaSil));
    setListe((l) => l?.filter((x) => !idler.includes(x.id)) ?? null);
    setSecili(null);
    silindi(idler);
  };

  const sec = (id: string) =>
    setSecili((s) => {
      const yeni = new Set(s ?? []);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });

  const basmaBasladi = (id: string) => {
    uzunBasildi.current = false;
    zamanlayici.current = window.setTimeout(() => {
      uzunBasildi.current = true;
      navigator.vibrate?.(30);
      sec(id);
    }, UZUN_BASMA_MS);
  };
  const basmaBitti = () => {
    if (zamanlayici.current) window.clearTimeout(zamanlayici.current);
    zamanlayici.current = null;
  };

  const dokun = (t: Tarama) => {
    if (uzunBasildi.current) {
      uzunBasildi.current = false; // uzun basmanın ardından gelen tıklamayı yut
      return;
    }
    if (secili) sec(t.id);
    else ac(t);
  };

  const hepsi = liste ?? [];

  return (
    <main className="ekran">
      <h2 className="ekran-basligi">📦 Ilgaz'ın Kayıtları</h2>
      {hepsi.length === 0 && liste && <p className="bilgi-kutusu">Henüz kayıt yok Ilgaz. Bir fotoğraf çekerek başla!</p>}

      {hepsi.length > 0 &&
        (secili ? (
          <div className="secim-cubugu">
            <span className="secim-sayisi">{secili.size} seçildi</span>
            <button className="cip" onClick={() => setSecili(secili.size === hepsi.length ? new Set() : new Set(hepsi.map((t) => t.id)))}>
              {secili.size === hepsi.length ? '☐ Hiçbiri' : '☑️ Tümünü seç'}
            </button>
            <button
              className="cip tehlike"
              disabled={secili.size === 0}
              onClick={() => sil([...secili], `${secili.size} kaydı silmek istediğine emin misin?`)}
            >
              🗑️ Sil
            </button>
            <button className="cip" onClick={() => setSecili(null)}>✕ Vazgeç</button>
          </div>
        ) : (
          <div className="secim-cubugu">
            <span className="not-yazisi">👆 Birden çok seçmek için bir kayda uzun bas.</span>
            <button className="cip tehlike" onClick={() => sil(hepsi.map((t) => t.id), `Tüm kayıtları (${hepsi.length}) silmek istediğine emin misin? Bu geri alınamaz.`)}>
              🗑️ Tümünü sil
            </button>
          </div>
        ))}

      <ul className="kayit-listesi">
        {hepsi.map((t) => {
          const isaretli = secili?.has(t.id) ?? false;
          return (
            <li key={t.id} className={`kayit-karti ${isaretli ? 'secili' : ''}`}>
              <button
                className="kayit-ac"
                onClick={() => dokun(t)}
                onPointerDown={() => basmaBasladi(t.id)}
                onPointerUp={basmaBitti}
                onPointerLeave={basmaBitti}
                onPointerCancel={basmaBitti}
                onContextMenu={(e) => e.preventDefault()}
              >
                {secili && <span className={`secim-kutusu ${isaretli ? 'dolu' : ''}`}>{isaretli ? '✓' : ''}</span>}
                <img src={t.resim} alt="" draggable={false} />
                <div>
                  <div className="kayit-sayi">{toplamAdet(t.parcalar)} parça</div>
                  <div className="kayit-tarih">{tarihYaz(t.tarih)}</div>
                </div>
              </button>
              {!secili && (
                <button className="kayit-sil" aria-label="Sil" onClick={() => sil([t.id], 'Bu kaydı silmek istediğine emin misin?')}>🗑️</button>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

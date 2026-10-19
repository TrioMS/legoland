import { useEffect, useState } from 'react';
import { taramaSil, taramalariListele, toplamAdet, type Tarama } from '../depo/taramalar';

const tarihYaz = (t: number) =>
  new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function Kayitlar({ ac }: { ac: (t: Tarama) => void }) {
  const [liste, setListe] = useState<Tarama[] | null>(null);
  useEffect(() => {
    taramalariListele().then(setListe);
  }, []);

  const sil = async (t: Tarama) => {
    if (!confirm('Bu kaydı silmek istediğine emin misin?')) return;
    await taramaSil(t.id);
    setListe((l) => l?.filter((x) => x.id !== t.id) ?? null);
  };

  return (
    <main className="ekran">
      <h2 className="ekran-basligi">📦 Ilgaz'ın Kayıtları</h2>
      {liste?.length === 0 && <p className="bilgi-kutusu">Henüz kayıt yok Ilgaz. Bir fotoğraf çekerek başla!</p>}
      <ul className="kayit-listesi">
        {liste?.map((t) => (
          <li key={t.id} className="kayit-karti">
            <button className="kayit-ac" onClick={() => ac(t)}>
              <img src={t.resim} alt="" />
              <div>
                <div className="kayit-sayi">{toplamAdet(t.parcalar)} parça</div>
                <div className="kayit-tarih">{tarihYaz(t.tarih)}</div>
              </div>
            </button>
            <button className="kayit-sil" aria-label="Sil" onClick={() => sil(t)}>🗑️</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

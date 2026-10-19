import { RENKLER } from '../../shared/katalog';
import { KUTUPHANE, ROL_RENKLERI, boya, type KutuphaneModeli, type Rol } from '../../shared/kutuphane';
import type { ModelOnerisi, ParcaSatiri } from '../../shared/tipler';
import { yapiParcalari } from '../../shared/yapi';
import { parcalariKontrolEt, type KontrolSonucu } from './eslestir';

export interface KutuphaneOnerisi {
  model: KutuphaneModeli;
  oneri: ModelOnerisi;
  kontrol: KontrolSonucu;
  /** 0-1: şekli tutan parçaların oranı (renk farkı sayılmaz) */
  oran: number;
}

/**
 * Modelin her rolüne (ana renk, lastik, cam...) Ilgaz'ın elinde en çok bulunan rengi verir.
 * Roller, ihtiyaç duydukları parça sayısına göre büyükten küçüğe sırayla boyanır;
 * kullanılan parçalar eldeki stoktan düşülür ki iki rol aynı parçaları paylaşmasın.
 */
function rolleriBoya(model: KutuphaneModeli, eldekiler: ParcaSatiri[]): (r: Rol) => string {
  const stok = new Map<string, number>();
  for (const s of eldekiler) stok.set(`${s.parcaId}|${s.renkId}`, (stok.get(`${s.parcaId}|${s.renkId}`) ?? 0) + s.adet);

  // Rol → (parça türü → adet)
  const ihtiyac = new Map<Rol, Map<string, number>>();
  for (const parca of model.adimlar.flatMap((a) => a.parcalar)) {
    const m = ihtiyac.get(parca.rol) ?? new Map<string, number>();
    m.set(parca.parcaId, (m.get(parca.parcaId) ?? 0) + 1);
    ihtiyac.set(parca.rol, m);
  }
  const roller = [...ihtiyac.keys()].sort(
    (a, b) => [...ihtiyac.get(b)!.values()].reduce((t, n) => t + n, 0) - [...ihtiyac.get(a)!.values()].reduce((t, n) => t + n, 0),
  );

  const secilen = new Map<Rol, string>();
  for (const rol of roller) {
    const varsayilan = model.renkler?.[rol] ?? ROL_RENKLERI[rol][0];
    const tercih = model.renkler?.[rol] ? [model.renkler[rol]!, ...ROL_RENKLERI[rol]] : ROL_RENKLERI[rol];
    // Özel roller (lastik, cam, çimen...) sadece kendi tercih listesinden renk alır; diğerleri her rengi alabilir
    const serbest = rol === 'a' || rol === 'b' || rol === 'c';
    const adaylar = serbest ? RENKLER.map((r) => r.id) : tercih;
    const kullanilan = new Set(secilen.values());

    let enIyi = varsayilan;
    let enIyiPuan = -Infinity;
    for (const renk of adaylar) {
      let puan = 0;
      for (const [parcaId, adet] of ihtiyac.get(rol)!) puan += Math.min(adet, stok.get(`${parcaId}|${renk}`) ?? 0);
      // Eşitlikte: varsayılan / tercih sırası öne, başka rolün rengi geriye
      const sira = tercih.indexOf(renk);
      puan += (renk === varsayilan ? 0.3 : 0) + (sira >= 0 ? 0.2 - sira * 0.01 : 0) - (kullanilan.has(renk) ? 0.5 : 0);
      if (puan > enIyiPuan) {
        enIyiPuan = puan;
        enIyi = renk;
      }
    }
    secilen.set(rol, enIyi);
    for (const [parcaId, adet] of ihtiyac.get(rol)!) {
      const k = `${parcaId}|${enIyi}`;
      stok.set(k, Math.max(0, (stok.get(k) ?? 0) - adet));
    }
  }
  return (r) => secilen.get(r) ?? model.renkler?.[r] ?? ROL_RENKLERI[r][0];
}

/** Kütüphanedeki tüm modelleri Ilgaz'ın parçalarına göre boyar ve en uygundan sıralar. */
export function kutuphaneOnerileri(eldekiler: ParcaSatiri[]): KutuphaneOnerisi[] {
  return KUTUPHANE.map((model) => {
    const adimlar = boya(model, rolleriBoya(model, eldekiler));
    const parcalar = yapiParcalari(adimlar);
    const kontrol = parcalariKontrolEt(parcalar, eldekiler);
    const oneri: ModelOnerisi = {
      ad: model.ad,
      emoji: model.emoji,
      aciklama: model.aciklama,
      zorluk: model.zorluk,
      parcalar,
      adimlar,
    };
    return { model, oneri, kontrol, oran: kontrol.toplam ? kontrol.sekilUyan / kontrol.toplam : 0 };
  }).sort((a, b) => b.oran - a.oran || b.kontrol.tamUyan / b.kontrol.toplam - a.kontrol.tamUyan / a.kontrol.toplam || a.kontrol.toplam - b.kontrol.toplam);
}

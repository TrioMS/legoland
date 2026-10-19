import type { ModelParcasi, ParcaSatiri } from '../../shared/tipler';

export interface EksikSatir extends ModelParcasi {
  /** Eksik adetten kaç tanesi, aynı şeklin başka renkteki artanlarıyla yapılabilir */
  renkleYapilir: number;
}

export interface KontrolSonucu {
  toplam: number;
  /** Rengi ve şekli tutan parça sayısı */
  tamUyan: number;
  /** Rengi farklı olsa da şekli tutan parça sayısı (tamUyan dahil) */
  sekilUyan: number;
  eksikler: EksikSatir[];
}

/** Bir modelin/setin parçalarını eldeki parçalarla karşılaştırır. */
export function parcalariKontrolEt(gerekenler: ModelParcasi[], eldekiler: ParcaSatiri[]): KontrolSonucu {
  const tam = new Map<string, number>();
  const sekil = new Map<string, number>();
  for (const s of eldekiler) {
    tam.set(`${s.parcaId}|${s.renkId}`, (tam.get(`${s.parcaId}|${s.renkId}`) ?? 0) + s.adet);
    sekil.set(s.parcaId, (sekil.get(s.parcaId) ?? 0) + s.adet);
  }

  let toplam = 0;
  let tamUyan = 0;
  const eksikler: EksikSatir[] = [];

  // 1. tur: aynı şekil + aynı renk
  for (const g of gerekenler) {
    toplam += g.adet;
    const anahtar = `${g.parcaId}|${g.renkId}`;
    const var_ = tam.get(anahtar) ?? 0;
    const kullanilan = Math.min(var_, g.adet);
    tam.set(anahtar, var_ - kullanilan);
    sekil.set(g.parcaId, (sekil.get(g.parcaId) ?? 0) - kullanilan);
    tamUyan += kullanilan;
    if (kullanilan < g.adet) eksikler.push({ ...g, adet: g.adet - kullanilan, renkleYapilir: 0 });
  }

  // 2. tur: eksikleri aynı şeklin artan (başka renkteki) parçalarıyla kapat
  let sekilUyan = tamUyan;
  for (const e of eksikler) {
    const artan = sekil.get(e.parcaId) ?? 0;
    e.renkleYapilir = Math.min(artan, e.adet);
    sekil.set(e.parcaId, artan - e.renkleYapilir);
    sekilUyan += e.renkleYapilir;
  }

  return { toplam, tamUyan, sekilUyan, eksikler };
}

// ---- Resmi LEGO setleri -----------------------------------------------------------

export interface SetBilgisi {
  no: string;
  ad: string;
  yil: number;
  tema: string;
  /** Setteki tüm parçalar (uygulamanın tanımadığı özel parçalar dahil) */
  toplamParca: number;
  /** Sadece katalogla eşleşen parçalar */
  parcalar: ModelParcasi[];
}

export interface SetEslesmesi extends SetBilgisi {
  kontrol: KontrolSonucu;
  /** 0-1 arası: setin tüm parçalarına göre renkten bağımsız şekil uyumu */
  oran: number;
}

let setlerSozu: Promise<SetBilgisi[]> | null = null;

/** public/setler.json dosyasını bir kez yükler (scripts/set-verisi-uret.mjs ile üretilir). */
export function setleriYukle(): Promise<SetBilgisi[]> {
  // Sürüm eki: yeni yayında tarayıcı eski veri dosyasını önbellekten vermesin
  setlerSozu ??= fetch(`/setler.json?v=${encodeURIComponent(__SURUM__)}`)
    .then((y) => {
      if (!y.ok) throw new Error('setler.json yüklenemedi');
      return y.json();
    })
    .then((veri: { parcalar: string[]; renkler: string[]; setler: [string, string, number, string, number, number[]][] }) =>
      veri.setler.map(([no, ad, yil, tema, toplamParca, duz]) => {
        const parcalar: ModelParcasi[] = [];
        for (let i = 0; i < duz.length; i += 3) {
          parcalar.push({ parcaId: veri.parcalar[duz[i]], renkId: veri.renkler[duz[i + 1]], adet: duz[i + 2] });
        }
        return { no, ad, yil, tema, toplamParca, parcalar };
      }),
    )
    .catch((e) => {
      setlerSozu = null;
      throw e;
    });
  return setlerSozu;
}

export async function uyanSetleriBul(eldekiler: ParcaSatiri[], enFazla = 20): Promise<SetEslesmesi[]> {
  const setler = await setleriYukle();
  return setler
    .map((s) => {
      const kontrol = parcalariKontrolEt(s.parcalar, eldekiler);
      return { ...s, kontrol, oran: s.toplamParca ? kontrol.sekilUyan / s.toplamParca : 0 };
    })
    .filter((s) => s.oran >= 0.3)
    .sort((a, b) => b.oran - a.oran || b.kontrol.tamUyan - a.kontrol.tamUyan || a.kontrol.toplam - b.kontrol.toplam)
    .slice(0, enFazla);
}

export const setResmi = (no: string) => `https://cdn.rebrickable.com/media/sets/${no.toLowerCase()}.jpg`;
export const legoTalimatLinki = (no: string) => `https://www.lego.com/tr-tr/service/building-instructions/${no.split('-')[0]}`;
export const rebrickableLinki = (no: string) => `https://rebrickable.com/sets/${no}/`;

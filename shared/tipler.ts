export type Guven = 'yuksek' | 'orta' | 'dusuk';

export interface ParcaSatiri {
  parcaId: string;
  renkId: string;
  adet: number;
  guven: Guven;
}

export interface AnalizIstegi {
  /** base64 JPEG, "data:" öneki olmadan */
  resim: string;
}

export interface AnalizYaniti {
  parcalar: ParcaSatiri[];
  /** Yapay zekanın çocuğa/ebeveyne kısa notu (ör. "bazı parçalar üst üste") */
  not?: string;
  sahte?: boolean;
}

export interface HataYaniti {
  hata: string;
  kod?: 'erisim' | 'kota' | 'anahtar' | 'gecersiz' | 'sunucu';
}

/** Aynı tür+renk satırlarını birleştirir, adedi 0 olanları atar. */
export function birlestir(satirlar: ParcaSatiri[]): ParcaSatiri[] {
  const harita = new Map<string, ParcaSatiri>();
  const sira: Guven[] = ['dusuk', 'orta', 'yuksek'];
  for (const s of satirlar) {
    if (s.adet <= 0) continue;
    const anahtar = `${s.parcaId}|${s.renkId}`;
    const var_ = harita.get(anahtar);
    if (var_) {
      var_.adet += s.adet;
      if (sira.indexOf(s.guven) < sira.indexOf(var_.guven)) var_.guven = s.guven;
    } else {
      harita.set(anahtar, { ...s });
    }
  }
  return [...harita.values()];
}

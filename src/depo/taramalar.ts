import { createStore, del, get, set, values } from 'idb-keyval';
import type { ModelOnerisi, ParcaSatiri } from '../../shared/tipler';

export interface Tarama {
  id: string;
  tarih: number;
  /** Küçük önizleme resmi (data URL) */
  resim: string;
  parcalar: ParcaSatiri[];
  not?: string;
  sahte?: boolean;
  /** Kaç fotoğraftan birleştirildi */
  fotoSayisi?: number;
  /** Yapay zekanın son model önerileri; parçalar değişince silinir */
  oneriler?: ModelOnerisi[];
}

const depo = createStore('lego-yardimci', 'taramalar');

export const taramaKaydet = (t: Tarama) => set(t.id, t, depo);
export const taramaGetir = (id: string) => get<Tarama>(id, depo);
export const taramaSil = (id: string) => del(id, depo);
export const taramalariListele = async () =>
  (await values<Tarama>(depo)).sort((a, b) => b.tarih - a.tarih);

export const toplamAdet = (parcalar: ParcaSatiri[]) => parcalar.reduce((t, p) => t + p.adet, 0);

import { renkBul } from '../../shared/katalog';
import type { Isaret } from '../../shared/tipler';

export interface Vurgu {
  parcaId: string;
  renkId: string;
}

interface Props {
  resim: string;
  isaretler: Isaret[];
  /** Verilirse sadece bu parçanın kutuları öne çıkar, diğerleri soluklaşır */
  vurgu?: Vurgu | Vurgu[] | null;
  /** Resmin en fazla yüksekliği (CSS değeri) */
  enFazlaYukseklik?: string;
  onClick?: () => void;
}

const eslesir = (i: Isaret, v?: Vurgu | Vurgu[] | null) =>
  !!v && (Array.isArray(v) ? v : [v]).some((x) => i.parcaId === x.parcaId && i.renkId === x.renkId);

/** Fotoğrafın üstüne, yapay zekanın bulduğu her parça için bir çerçeve çizer. */
export function IsaretliFoto({ resim, isaretler, vurgu, enFazlaYukseklik = '46vh', onClick }: Props) {
  return (
    <div className={`isaretli-foto ${vurgu ? 'vurgulu' : ''}`} onClick={onClick}>
      <img src={resim} alt="" style={{ maxHeight: enFazlaYukseklik }} />
      {isaretler.map((i, n) => {
        const [y1, x1, y2, x2] = i.kutu;
        const secili = eslesir(i, vurgu);
        return (
          <span
            key={n}
            className={`isaret ${secili ? 'secili' : ''}`}
            style={{
              top: `${y1 / 10}%`,
              left: `${x1 / 10}%`,
              width: `${(x2 - x1) / 10}%`,
              height: `${(y2 - y1) / 10}%`,
              ['--isaret-renk' as string]: renkBul(i.renkId).hex,
            }}
          />
        );
      })}
    </div>
  );
}

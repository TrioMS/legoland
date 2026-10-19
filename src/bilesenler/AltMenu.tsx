import type { Ekran } from '../App';

interface Props {
  ekran: Ekran;
  taramaVar: boolean;
  git: (e: Ekran) => void;
}

const SEKMELER: { ekran: Ekran; ad: string; ikon: string; taramaGerekir?: boolean; sinif?: string }[] = [
  { ekran: 'ana', ad: 'Tara', ikon: '📷', sinif: 'tara-sekmesi' },
  { ekran: 'liste', ad: 'Parçalarım', ikon: '🧱', taramaGerekir: true },
  { ekran: 'oneriler', ad: 'Fikirler', ikon: '💡', taramaGerekir: true },
  { ekran: 'kayitlar', ad: 'Kayıtlar', ikon: '📦' },
];

/** Altta sabit sekme çubuğu (tarama, liste, fikirler, kayıtlar). */
export function AltMenu({ ekran, taramaVar, git }: Props) {
  return (
    <nav className="alt-menu" aria-label="Ana menü">
      <div className="alt-menu-ic">
        {SEKMELER.map((s) => (
          <button
            key={s.ekran}
            className={`${s.sinif ?? ''} ${ekran === s.ekran ? 'aktif' : ''}`}
            disabled={s.taramaGerekir && !taramaVar}
            onClick={() => git(s.ekran)}
            aria-current={ekran === s.ekran ? 'page' : undefined}
          >
            <span className="menu-ikon">{s.ikon}</span>
            {s.ad}
          </button>
        ))}
      </div>
    </nav>
  );
}

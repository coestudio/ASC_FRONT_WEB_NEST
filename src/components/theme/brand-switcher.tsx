import { Dropdown } from "react-bootstrap";

import type { Brand } from "@/styles/globals/brand";
import { useBrand, useSetBrand } from "@/lib/ui-prefs";
import styles from "@/layouts/AppShell/index.module.css";

/**
 * Marcas disponíveis no switcher — label e var CSS da amostra (swatch).
 * As vars `--brand-swatch-*` são fixas (não dependem da brand ativa) — ver
 * src/styles/globals/tokens.css.
 */
export const BRANDS: Array<{ id: Brand; label: string; swatch: string }> = [
  { id: "asa", label: "ASA", swatch: "var(--brand-swatch-asa)" },
  { id: "asi", label: "ASI", swatch: "var(--brand-swatch-asi)" },
  { id: "asc", label: "ASC", swatch: "var(--brand-swatch-asc)" },
];

/**
 * Seletor de brand (identidade visual). Mesmo padrão do LanguageSwitcher
 * (Dropdown react-bootstrap) — ver src/components/i18n/language-switcher.tsx.
 * Troca `data-brand` no <html> na hora, sem reload, sem afetar o modo.
 */
export function BrandSwitcher({ align = "end" as const }) {
  const brand = useBrand();
  const setBrand = useSetBrand();
  const current = BRANDS.find((b) => b.id === brand) ?? BRANDS[0];

  return (
    <Dropdown align={align}>
      <Dropdown.Toggle
        variant="link"
        size="sm"
        id="brand-switcher"
        className={`text-body ${styles.brandSwitcherToggle}`}
        aria-label={`Marca: ${current.label}`}
        title={`Marca: ${current.label}`}
      >
        <span className={styles.swatch} style={{ backgroundColor: current.swatch }} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {BRANDS.map((b) => (
          <Dropdown.Item key={b.id} active={b.id === brand} onClick={() => setBrand(b.id)}>
            <span className={styles.swatch} style={{ backgroundColor: b.swatch }} />
            {b.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

import { Dropdown } from "react-bootstrap";

import { locales, LOCALE_LABELS } from "@/i18n/config";
import { useLocale, useSetLocale } from "@/lib/ui-prefs";
import styles from "./language-switcher.module.css";

/**
 * Seletor de idioma. Persiste em cookie (asc_locale) e troca na hora.
 * `styles.toggle` (SPEC-11 item 6) dá o mesmo tratamento pill/hover do
 * resto dos controles do topbar (ex. ThemeToggle) — antes ficava com a
 * aparência default de `Dropdown.Toggle`/`btn-link`.
 */
export function LanguageSwitcher({ align = "end" as const }) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const current = LOCALE_LABELS[locale];

  return (
    <Dropdown align={align}>
      <Dropdown.Toggle variant="link" id="language-switcher" className={styles.toggle}>
        <span className="me-1" aria-hidden="true">
          {current.flag}
        </span>
        <span className="d-none d-sm-inline">{current.label}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {locales.map((l) => (
          <Dropdown.Item key={l} active={l === locale} onClick={() => setLocale(l)}>
            <span className="me-2">{LOCALE_LABELS[l].flag}</span>
            {LOCALE_LABELS[l].label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

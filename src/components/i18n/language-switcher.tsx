import { Dropdown } from "react-bootstrap";

import { locales, LOCALE_LABELS } from "@/i18n/config";
import { useLocale, useSetLocale } from "@/lib/ui-prefs";

/** Seletor de idioma. Persiste em cookie (asc_locale) e troca na hora. */
export function LanguageSwitcher({ align = "end" as const }) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const current = LOCALE_LABELS[locale];

  return (
    <Dropdown align={align}>
      <Dropdown.Toggle variant="link" size="sm" id="language-switcher" className="text-body">
        <span className="me-1">{current.flag}</span>
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

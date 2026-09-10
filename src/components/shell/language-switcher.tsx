"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dropdown } from "react-bootstrap";
import { Check2 } from "react-bootstrap-icons";
import type { Locale } from "@/i18n/config";
import { replaceLocaleInPath } from "@/lib/locale-path";
import { LANGUAGES } from "./languages";
import styles from "./app-shell.module.css";

type LanguageSwitcherProps = {
  lang: Locale;
  label: string;
};

export function LanguageSwitcher({ lang, label }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const current = LANGUAGES.find((option) => option.locale === lang) ?? LANGUAGES[0];

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as="button"
        className={styles.languageToggle}
        aria-label={label}
        title={label}
      >
        <span aria-hidden>{current.flag}</span>
        <span className={styles.languageToggleLabel}>{current.label}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {LANGUAGES.map((option) => {
          const active = option.locale === lang;
          return (
            <Dropdown.Item
              key={option.locale}
              as={Link}
              href={replaceLocaleInPath(pathname, option.locale)}
              active={active}
              className={styles.dropdownItemRow}
            >
              <span aria-hidden>{option.flag}</span>
              <span className={styles.dropdownItemText}>{option.label}</span>
              {active && <Check2 aria-hidden className={styles.checkIcon} />}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dropdown } from "react-bootstrap";
import {
  ChevronRight,
  Check2,
  SunFill,
  MoonStarsFill,
  Grid3x3GapFill,
  ListUl,
  BoxArrowRight,
} from "react-bootstrap-icons";
import { signOutAction } from "@/components/auth/actions";
import {
  useThemeMode,
  setThemeMode,
  useSyncThemeToDocument,
} from "@/styles/globals/theme-store";
import { useViewMode, setViewMode } from "@/lib/view-mode";
import { replaceLocaleInPath } from "@/lib/locale-path";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LANGUAGES } from "./languages";
import styles from "./app-shell.module.css";

type UserMenuProps = {
  lang: Locale;
  dict: Dictionary;
  name: string;
  email: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ lang, dict, name, email }: UserMenuProps) {
  const pathname = usePathname();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Mesmo estado (mesma chave de localStorage) do ThemeToggle — ver
  // src/styles/globals/color-modes.ts. useSyncThemeToDocument aqui não é
  // estritamente necessário (o AppShell já chama o dele), mas garantir que
  // o clique aplica o atributo imediatamente independe de onde o hook global
  // está montado.
  const themeMode = useThemeMode();
  useSyncThemeToDocument(themeMode);

  const viewMode = useViewMode();
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <Dropdown drop="up" autoClose="outside">
      <Dropdown.Toggle as="button" className={styles.userMenuToggle}>
        <span className={styles.avatar} aria-hidden>
          {getInitials(name)}
        </span>
        <span className={styles.userMenuInfo}>
          <span className={styles.userMenuName}>{firstName}</span>
          <span className={styles.userMenuEmail}>{email}</span>
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className={styles.userMenu}>
        <Dropdown.Item disabled>{dict.shell.profile}</Dropdown.Item>

        <button
          type="button"
          className={[styles.navItemToggle, styles.preferencesToggle].join(
            " "
          )}
          onClick={() => setPreferencesOpen((open) => !open)}
          aria-expanded={preferencesOpen}
        >
          <span>{dict.shell.preferences}</span>
          <ChevronRight
            aria-hidden
            className={[styles.chevron, preferencesOpen ? styles.chevronOpen : ""]
              .filter(Boolean)
              .join(" ")}
          />
        </button>

        <div
          className={[
            styles.navSubWrapper,
            preferencesOpen ? styles.navSubWrapperOpen : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.navSubInner}>
            <div className={styles.preferencesGroup}>
              <p className={styles.preferencesGroupLabel}>{dict.shell.theme}</p>
              <button
                type="button"
                className={[
                  styles.preferencesOption,
                  themeMode === "light" ? styles.preferencesOptionActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setThemeMode("light")}
              >
                <SunFill aria-hidden />
                <span className={styles.preferencesOptionLabel}>
                  {dict.theme.light}
                </span>
                {themeMode === "light" && (
                  <Check2 aria-hidden className={styles.checkIcon} />
                )}
              </button>
              <button
                type="button"
                className={[
                  styles.preferencesOption,
                  themeMode === "dark" ? styles.preferencesOptionActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setThemeMode("dark")}
              >
                <MoonStarsFill aria-hidden />
                <span className={styles.preferencesOptionLabel}>
                  {dict.theme.dark}
                </span>
                {themeMode === "dark" && (
                  <Check2 aria-hidden className={styles.checkIcon} />
                )}
              </button>
            </div>

            <div className={styles.preferencesGroup}>
              <p className={styles.preferencesGroupLabel}>{dict.shell.language}</p>
              {LANGUAGES.map((option) => {
                const active = option.locale === lang;
                return (
                  <Link
                    key={option.locale}
                    href={replaceLocaleInPath(pathname, option.locale)}
                    className={[
                      styles.preferencesOption,
                      active ? styles.preferencesOptionActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span aria-hidden>{option.flag}</span>
                    <span className={styles.preferencesOptionLabel}>
                      {option.label}
                    </span>
                    {active && <Check2 aria-hidden className={styles.checkIcon} />}
                  </Link>
                );
              })}
            </div>

            <div className={styles.preferencesGroup}>
              <p className={styles.preferencesGroupLabel}>{dict.shell.viewMode}</p>
              <button
                type="button"
                className={[
                  styles.preferencesOption,
                  viewMode === "cards" ? styles.preferencesOptionActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setViewMode("cards")}
              >
                <Grid3x3GapFill aria-hidden />
                <span className={styles.preferencesOptionLabel}>
                  {dict.shell.viewModeCards}
                </span>
                {viewMode === "cards" && (
                  <Check2 aria-hidden className={styles.checkIcon} />
                )}
              </button>
              <button
                type="button"
                className={[
                  styles.preferencesOption,
                  viewMode === "list" ? styles.preferencesOptionActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setViewMode("list")}
              >
                <ListUl aria-hidden />
                <span className={styles.preferencesOptionLabel}>
                  {dict.shell.viewModeList}
                </span>
                {viewMode === "list" && (
                  <Check2 aria-hidden className={styles.checkIcon} />
                )}
              </button>
            </div>
          </div>
        </div>

        <Dropdown.Divider />

        <form action={signOutAction}>
          <button
            type="submit"
            className={[styles.preferencesOption, styles.signOutItem].join(
              " "
            )}
          >
            <BoxArrowRight aria-hidden />
            <span className={styles.preferencesOptionLabel}>
              {dict.auth.signOut}
            </span>
          </button>
        </form>
      </Dropdown.Menu>
    </Dropdown>
  );
}

import { useState } from "react";
import { Dropdown } from "react-bootstrap";

import { useUser } from "@/hooks";
import {
  useT,
  useThemeMode,
  useSetThemeMode,
  useBrand,
  useSetBrand,
  useLocale,
  useSetLocale,
} from "@/lib/ui-prefs";
import type { ThemeMode } from "@/styles/globals/color-modes";
import { BRANDS } from "@/components/theme/brand-switcher";
import { locales, LOCALE_LABELS } from "@/i18n/config";
import { useViewMode } from "@/lib/view-mode";
import { ProfileModal } from "@/components/profile/profile-modal";
import styles from "./index.module.css";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const THEME_OPTIONS: { value: ThemeMode; icon: string }[] = [
  { value: "light", icon: "bi-sun" },
  { value: "dark", icon: "bi-moon-stars" },
  { value: "system", icon: "bi-circle-half" },
];

/**
 * Submenu com accordion aninhado (Preferências > Tema/Marca/Idioma/
 * Visualização), espelhando warren/Portal/src/Layouts/SideBar/components/
 * UserMenu.tsx — cada seção expande inline dentro do dropdown, sem flyout
 * lateral (evita clipping na borda da viewport).
 */
type SectionKey = "theme" | "brand" | "language" | "view";

export function UserMenu() {
  const { user } = useUser();
  const t = useT();
  const [showProfile, setShowProfile] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const fullName = user?.profile?.fullName ?? user?.userName ?? "";
  const email = user?.profile?.email ?? user?.userName ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const avatarUrl = user?.profile?.avatarFile?.url ?? null;

  const themeMode = useThemeMode();
  const setThemeMode = useSetThemeMode();
  const brand = useBrand();
  const setBrand = useSetBrand();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const [viewMode, setViewMode] = useViewMode();

  const themeLabels: Record<ThemeMode, string> = {
    light: t("theme.light"),
    dark: t("theme.dark"),
    system: t("theme.system"),
  };

  const SECTIONS: { key: SectionKey; labelKey: Parameters<typeof t>[0]; icon: string }[] = [
    { key: "theme", labelKey: "shell.theme", icon: "bi-palette" },
    { key: "brand", labelKey: "shell.brand", icon: "bi-flower2" },
    { key: "language", labelKey: "shell.language", icon: "bi-translate" },
    { key: "view", labelKey: "shell.viewMode", icon: "bi-layout-text-window" },
  ];

  return (
    <>
      <Dropdown align="end" drop="up">
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix={styles.userToggle}
          id="user-menu-toggle"
        >
          <div className="app-topbar__avatar flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "inherit",
                  objectFit: "cover",
                }}
              />
            ) : (
              getInitials(fullName)
            )}
          </div>
          <div className={`d-flex flex-column overflow-hidden text-start ${styles.userNames}`}>
            <span className={`text-truncate ${styles.userFirstName}`}>{firstName}</span>
            <span className={`text-truncate ${styles.userEmail}`}>{email}</span>
          </div>
        </Dropdown.Toggle>
        <Dropdown.Menu popperConfig={{ strategy: "fixed" }} renderOnMount>
          <Dropdown.Item onClick={() => setShowProfile(true)}>
            <i className="bi bi-person me-2" aria-hidden />
            {t("shell.profile")}
          </Dropdown.Item>

          <div className={styles.submenu} onClick={(e) => e.stopPropagation()}>
            <div
              className={`dropdown-item ${styles.submenuToggle}`}
              onClick={() => setPrefOpen((v) => !v)}
              role="button"
              aria-expanded={prefOpen}
            >
              <span>
                <i className="bi bi-sliders me-2" aria-hidden />
                {t("shell.preferences")}
              </span>
              <i
                className={`bi bi-chevron-right ${styles.submenuCaret} ${prefOpen ? styles.submenuCaretOpen : ""}`}
              />
            </div>
            <div
              className={`${styles.accordionOuter} ${prefOpen ? styles.accordionOuterOpen : ""}`}
            >
              <div className={styles.accordionInner}>
                <div className={styles.accordionBody}>
                  {SECTIONS.map((sec) => (
                    <div key={sec.key} className={styles.submenu}>
                      <div
                        className={`dropdown-item ${styles.submenuToggle}`}
                        onClick={() => setOpenSection((v) => (v === sec.key ? null : sec.key))}
                        role="button"
                        aria-expanded={openSection === sec.key}
                      >
                        <span>
                          <i className={`bi ${sec.icon} me-2`} aria-hidden />
                          {t(sec.labelKey)}
                        </span>
                        <i
                          className={`bi bi-chevron-right ${styles.submenuCaret} ${openSection === sec.key ? styles.submenuCaretOpen : ""}`}
                        />
                      </div>
                      <div
                        className={`${styles.accordionOuter} ${openSection === sec.key ? styles.accordionOuterOpen : ""}`}
                      >
                        <div className={styles.accordionInner}>
                          <div className={styles.accordionBody}>
                            {sec.key === "theme" &&
                              THEME_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${o.value === themeMode ? "active" : ""}`}
                                  onClick={() => setThemeMode(o.value)}
                                >
                                  <i className={`bi ${o.icon}`} />
                                  <span className="flex-grow-1 text-start">
                                    {themeLabels[o.value]}
                                  </span>
                                  {o.value === themeMode && (
                                    <i className="bi bi-check2" aria-hidden />
                                  )}
                                </button>
                              ))}
                            {sec.key === "brand" &&
                              BRANDS.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${b.id === brand ? "active" : ""}`}
                                  onClick={() => setBrand(b.id)}
                                >
                                  <span
                                    className={styles.swatch}
                                    style={{ backgroundColor: b.swatch }}
                                  />
                                  <span className="flex-grow-1 text-start">{b.label}</span>
                                  {b.id === brand && <i className="bi bi-check2" aria-hidden />}
                                </button>
                              ))}
                            {sec.key === "language" &&
                              locales.map((l) => (
                                <button
                                  key={l}
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${l === locale ? "active" : ""}`}
                                  onClick={() => setLocale(l)}
                                >
                                  <span>{LOCALE_LABELS[l].flag}</span>
                                  <span className="flex-grow-1 text-start">
                                    {LOCALE_LABELS[l].label}
                                  </span>
                                  {l === locale && <i className="bi bi-check2" aria-hidden />}
                                </button>
                              ))}
                            {sec.key === "view" && (
                              <>
                                <button
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${viewMode === "cards" ? "active" : ""}`}
                                  onClick={() => setViewMode("cards")}
                                >
                                  <i className="bi bi-grid-3x3-gap" aria-hidden />
                                  <span className="flex-grow-1 text-start">
                                    {t("shell.viewModeCards")}
                                  </span>
                                  {viewMode === "cards" && (
                                    <i className="bi bi-check2" aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${viewMode === "list" ? "active" : ""}`}
                                  onClick={() => setViewMode("list")}
                                >
                                  <i className="bi bi-list-ul" aria-hidden />
                                  <span className="flex-grow-1 text-start">
                                    {t("shell.viewModeList")}
                                  </span>
                                  {viewMode === "list" && (
                                    <i className="bi bi-check2" aria-hidden />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Dropdown.Divider />
          <Dropdown.Item href="/auth/logout">
            <i className="bi bi-box-arrow-right me-2" aria-hidden />
            {t("auth.signOut")}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}

import { useState, useEffect } from "react";
import { Dropdown } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "Pages/Profile/ProfileModal";
import { useT, LANGUAGE_OPTIONS, type TranslationKey } from "@/I18n";
import { useAuthStore } from "Global/Auth/use";
import { resolveFileUrl } from "Api/index";
import { useThemeStore, type Theme } from "Hooks/useTheme";
import { useLanguageStore } from "Hooks/useLanguage";
import { useViewPreferenceStore, type ViewMode } from "Hooks/useViewMode";
import styles from "../index.module.css";


function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const THEME_OPTIONS: { value: Theme; labelKey: TranslationKey; icon: string }[] = [
  { value: "light", labelKey: "theme.light", icon: "bi-sun" },
  { value: "dark", labelKey: "theme.dark", icon: "bi-moon-stars" },
];

const VIEW_OPTIONS: { value: ViewMode; labelKey: TranslationKey; icon: string }[] = [
  { value: "cards", labelKey: "view.cards", icon: "bi-grid-3x3-gap" },
  { value: "list", labelKey: "view.list", icon: "bi-list-ul" },
];

const SECTIONS: { key: "theme" | "language" | "view"; labelKey: TranslationKey; icon: string }[] = [
  { key: "theme", labelKey: "menu.theme", icon: "bi-palette" },
  { key: "language", labelKey: "menu.language", icon: "bi-translate" },
  { key: "view", labelKey: "menu.viewMode", icon: "bi-layout-text-window" },
];

export function UserMenu() {
  const navigate = useNavigate();
  const t = useT();
  const [showProfile, setShowProfile] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  const [openSection, setOpenSection] = useState<null | "theme" | "language" | "view">(null);
  const user = useAuthStore((s) => s.user);

  const email = user?.profile?.email ?? user?.userName ?? "";
  const fullName = user?.profile?.fullName ?? user?.userName ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] ?? fullName;
  const avatarLabel = getInitials(fullName) || "?";
  const avatarUrl = resolveFileUrl(user?.profile.avatarFile?.url);

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const viewMode = useViewPreferenceStore((s) => s.defaultMode);
  const setViewMode = useViewPreferenceStore((s) => s.setDefaultMode);

  useEffect(() => {
    console.log("UserMenu: avatarUrl changed:", user?.profile, avatarUrl);
  }, [avatarUrl])

  return (
    <>
      <Dropdown align="end" drop="up">
        <Dropdown.Toggle as="button" type="button" bsPrefix={styles.userToggle} id="user-menu-toggle">
          <div className="app-topbar__avatar flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} />
            ) : (
              avatarLabel
            )}
          </div>
          <div className={`d-flex flex-column overflow-hidden text-start ${styles.userNames}`}>
            <span className={`text-truncate ${styles.userFirstName}`}>{firstName}</span>
            <span className={`text-truncate ${styles.userEmail}`}>{email}</span>
          </div>
        </Dropdown.Toggle>
        <Dropdown.Menu popperConfig={{ strategy: "fixed" }} renderOnMount>
          <Dropdown.Item onClick={() => setShowProfile(true)}>
            <i className="bi bi-person me-2" />
            {t("menu.profile")}
          </Dropdown.Item>

          <div className={styles.submenu} onClick={(e) => e.stopPropagation()}>
            <div
              className={`dropdown-item ${styles.submenuToggle}`}
              onClick={() => setPrefOpen((v) => !v)}
              role="button"
              aria-expanded={prefOpen}
            >
              <span>
                <i className="bi bi-sliders me-2" />
                {t("menu.preferences")}
              </span>
              <i className={`bi bi-chevron-right ${styles.submenuCaret} ${prefOpen ? styles.submenuCaretOpen : ""}`} />
            </div>
            <div className={`${styles.accordionOuter} ${prefOpen ? styles.accordionOuterOpen : ""}`}>
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
                          <i className={`bi ${sec.icon} me-2`} />
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
                                  className={`dropdown-item d-flex align-items-center gap-2 ${o.value === theme ? "active" : ""}`}
                                  onClick={() => setTheme(o.value)}
                                >
                                  <i className={`bi ${o.icon}`} />
                                  <span className="flex-grow-1 text-start">{t(o.labelKey)}</span>
                                  {o.value === theme && <i className="bi bi-check2" />}
                                </button>
                              ))}
                            {sec.key === "language" &&
                              LANGUAGE_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${o.value === language ? "active" : ""}`}
                                  onClick={() => setLanguage(o.value)}
                                >
                                  <span>{o.flag}</span>
                                  <span className="flex-grow-1 text-start">{o.label}</span>
                                  {o.value === language && <i className="bi bi-check2" />}
                                </button>
                              ))}
                            {sec.key === "view" &&
                              VIEW_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${o.value === viewMode ? "active" : ""}`}
                                  onClick={() => setViewMode(o.value)}
                                >
                                  <i className={`bi ${o.icon}`} />
                                  <span className="flex-grow-1 text-start">{t(o.labelKey)}</span>
                                  {o.value === viewMode && <i className="bi bi-check2" />}
                                </button>
                              ))}
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
          <Dropdown.Item onClick={() => navigate("/logout")}>
            <i className="bi bi-box-arrow-right me-2" />
            {t("menu.logout")}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <ProfileModal show={showProfile} onHide={() => setShowProfile(false)} />
    </>
  );
}

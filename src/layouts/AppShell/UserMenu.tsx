import { useState } from "react";
import { Dropdown } from "react-bootstrap";

import { useUser } from "@/hooks";
import { useT } from "@/lib/ui-prefs";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandSwitcher } from "@/components/theme/brand-switcher";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ProfileModal } from "@/components/profile/profile-modal";
import styles from "./index.module.css";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu() {
  const { user } = useUser();
  const t = useT();
  const [showProfile, setShowProfile] = useState(false);

  const fullName = user?.profile?.fullName ?? user?.userName ?? "";
  const email = user?.profile?.email ?? user?.userName ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const avatarUrl = user?.profile?.avatarFile?.url ?? null;

  const themeLabels = {
    light: t("theme.light"),
    dark: t("theme.dark"),
    system: t("theme.system"),
  };

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
          <Dropdown.Divider />
          <Dropdown.ItemText className="d-flex justify-content-between align-items-center gap-2">
            <span className="small text-body-secondary">{t("shell.theme")}</span>
            <ThemeToggle labels={themeLabels} />
          </Dropdown.ItemText>
          <Dropdown.ItemText className="d-flex justify-content-between align-items-center gap-2">
            <span className="small text-body-secondary">{t("shell.brand")}</span>
            <BrandSwitcher align="end" />
          </Dropdown.ItemText>
          <Dropdown.ItemText className="d-flex justify-content-between align-items-center gap-2">
            <span className="small text-body-secondary">{t("shell.language")}</span>
            <LanguageSwitcher align="end" />
          </Dropdown.ItemText>
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

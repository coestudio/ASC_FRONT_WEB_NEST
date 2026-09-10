import { Dropdown } from "react-bootstrap";

import { useUser } from "@/hooks";
import styles from "./index.module.css";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu() {
  const { user } = useUser();

  const fullName = user?.profile?.fullName ?? user?.userName ?? "";
  const email = user?.profile?.email ?? user?.userName ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const avatarUrl = user?.profile?.avatarFile?.url ?? null;

  return (
    <Dropdown align="end" drop="up">
      <Dropdown.Toggle as="button" type="button" bsPrefix={styles.userToggle} id="user-menu-toggle">
        <div className="app-topbar__avatar flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
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
        {/* TODO: item de Perfil quando a rota /profile existir. */}
        {/* TODO(user): Preferências (tema / idioma) entram aqui. */}
        <Dropdown.Item href="/auth/logout">
          <i className="bi bi-box-arrow-right me-2" />
          Sair
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

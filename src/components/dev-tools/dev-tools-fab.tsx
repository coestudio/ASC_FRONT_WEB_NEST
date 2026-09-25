import { Dropdown } from "react-bootstrap";

import { useT } from "@/lib/ui-prefs";
import { useDevTools } from "./use-dev-tools";
import styles from "./dev-tools-fab.module.css";

/**
 * Botão flutuante das ferramentas de desenvolvedor (SPEC-104) — substitui
 * o antigo `DevClearCacheButton` (bolha vermelha). Discreto: pequeno,
 * contorno neutro e semitransparente até o hover. O clique abre um menu pra
 * cima com as ações de `useDevTools` (debug, `/files` do Core, limpar
 * cache). Só renderiza com `VITE_DEVELOPMENT=true` — nunca em produção.
 */
export function DevToolsFab() {
  const t = useT();
  const { enabled, actions, modal } = useDevTools();

  if (!enabled) return null;

  return (
    <>
      <Dropdown drop="up" align="end" className={styles.fab}>
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix={styles.toggle}
          aria-label={t("devTools.menuLabel")}
          title={t("devTools.menuLabel")}
        >
          <i className="bi bi-tools" aria-hidden />
        </Dropdown.Toggle>
        <Dropdown.Menu popperConfig={{ strategy: "fixed" }}>
          <Dropdown.Header className="small text-uppercase">
            {t("devTools.devMode")}
          </Dropdown.Header>
          {actions.map((action) => (
            <Dropdown.Item key={action.key} onClick={action.onSelect}>
              <i className={`bi ${action.icon} me-2`} aria-hidden />
              {t(action.labelKey)}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
      {modal}
    </>
  );
}

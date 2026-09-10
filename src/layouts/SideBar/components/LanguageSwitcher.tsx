import { Dropdown } from "react-bootstrap";
import { useT, LANGUAGE_OPTIONS } from "@/I18n";
import { useLanguageStore } from "Hooks/useLanguage";
import styles from "../index.module.css";

/**
 * Botão de idioma no topbar — mesma lista de LANGUAGE_OPTIONS já usada no
 * menu do usuário (Preferências › Idioma), só que como toggle direto
 * (sem precisar abrir o menu do usuário pra trocar). A detecção do
 * idioma do navegador/SO já acontece em `Hooks/useLanguage.ts`
 * (getInitialLanguage lê `navigator.language` na primeira carga, antes
 * de qualquer escolha salva).
 */
export function LanguageSwitcher() {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const current = LANGUAGE_OPTIONS.find((o) => o.value === language) ?? LANGUAGE_OPTIONS[0];

  return (
    <Dropdown align="end">
      <Dropdown.Toggle as="button" type="button" bsPrefix={styles.languageToggle} id="topbar-language-toggle">
        <span>{current.flag}</span>
        <span className="d-none d-sm-inline">{current.label}</span>
        <i className="bi bi-chevron-down" style={{ fontSize: "0.65rem" }} />
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={{ strategy: "fixed" }} renderOnMount>
        <Dropdown.Header>{t("menu.language")}</Dropdown.Header>
        {LANGUAGE_OPTIONS.map((o) => (
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
      </Dropdown.Menu>
    </Dropdown>
  );
}

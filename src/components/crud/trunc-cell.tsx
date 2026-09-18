import { useRef, useState } from "react";

import { useT } from "@/lib/ui-prefs";
import styles from "./crud-list-page.module.css";

/**
 * Conteúdo de célula da variante planilha: texto longo vira `...` e só o
 * botão de chevron (visível no hover, e apenas quando o texto está de fato
 * cortado) expande/recolhe. O clique no resto da célula NÃO é tratado aqui,
 * então sobe até a `<tr>` e seleciona a linha normalmente.
 */
export function TruncCell({
  text,
  expanded,
  onToggle,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  // Mede só quando o mouse entra — evita observers por célula.
  const measure = () => {
    const el = textRef.current;
    if (el) setTruncated(el.scrollWidth > el.clientWidth);
  };

  return (
    <div className={styles.truncWrap} onMouseEnter={measure}>
      <span
        ref={textRef}
        className={expanded ? styles.truncTextOpen : styles.truncText}
        title={expanded ? undefined : text}
      >
        {text}
      </span>
      {truncated || expanded ? (
        <button
          type="button"
          className={styles.truncToggle}
          aria-expanded={expanded}
          aria-label={t(expanded ? "crud.list.collapseCell" : "crud.list.expandCell")}
          title={t(expanded ? "crud.list.collapseCell" : "crud.list.expandCell")}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          // Evita que o duplo clique no botão dispare edição da linha.
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <i
            className={`bi ${expanded ? "bi-chevron-contract" : "bi-chevron-expand"}`}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}

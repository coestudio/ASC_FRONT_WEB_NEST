import { useRef } from "react";

import styles from "./crud-list-page.module.css";

/**
 * Conteúdo de célula da variante planilha: texto longo vira `...` e, se está
 * de fato cortado, o clique nele expande/recolhe (o valor expandido quebra
 * em linhas dentro da célula, sem gerar rolagem horizontal). Texto que cabe
 * inteiro não intercepta o clique — ele sobe até a `<tr>` e seleciona a linha.
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
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={ref}
      className={expanded ? styles.truncTextOpen : styles.truncText}
      title={expanded ? undefined : text}
      onClick={(e) => {
        const el = ref.current;
        // Cortado (ou já expandido, pra poder recolher): expande/recolhe e
        // não seleciona a linha. Cabe inteiro: deixa o clique subir.
        if (el && (expanded || el.scrollWidth > el.clientWidth)) {
          e.stopPropagation();
          onToggle();
        }
      }}
      onDoubleClick={(e) => {
        const el = ref.current;
        if (el && (expanded || el.scrollWidth > el.clientWidth)) e.stopPropagation();
      }}
    >
      {text}
    </span>
  );
}

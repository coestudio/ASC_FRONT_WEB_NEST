import type { ReactNode } from "react";

import styles from "./index.module.css";

export type PageLayoutDensity = "standard" | "wide" | "compact";

type PageLayoutProps = {
  children?: ReactNode;
  density?: PageLayoutDensity;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/**
 * Moldura visual única das páginas autenticadas. O AppShell cuida da área
 * externa; este componente define somente a largura e o ritmo do conteúdo.
 */
export function PageLayout({
  children,
  density = "standard",
  title,
  description,
  actions,
}: PageLayoutProps) {
  const hasHeader = title || description || actions;

  return (
    <section className={`${styles.page} ${styles[density]}`}>
      {hasHeader ? (
        <header className={styles.header}>
          <div className={styles.heading}>
            {title ? <h1 className="h4 mb-1">{title}</h1> : null}
            {description ? <p className="text-body-secondary mb-0">{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

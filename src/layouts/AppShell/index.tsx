import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Nav } from "react-bootstrap";

import { useCan } from "@/hooks";
import type { AreaId } from "@/lib/permissions";
import { UserMenu } from "./UserMenu";
import styles from "./index.module.css";

/**
 * Shell da área autenticada — sidebar + topbar. Montado pelo layout
 * /_dashboard (src/routes/_dashboard.tsx), envolve todas as rotas do dashboard.
 *
 * Migração: os links apontam para rotas que ainda não existem (administrativo,
 * operacional, etc.) — por isso são <a> (navegação full-page) e não <Link>
 * tipado. Trocar por <Link> conforme as rotas forem migradas.
 *
 * Tema / idioma: o slot no topbar (`.topbar`) e o menu do usuário têm TODOs
 * para os controles — a implementação fica a cargo de quem migrar o i18n.
 */

type NavItem = { to: string; icon: string; label: string };
type NavSection = { id: string; area: AreaId; icon: string; label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    id: "administrador",
    area: "admin",
    icon: "bi-shield-lock",
    label: "Administrador",
    items: [
      { to: "/admin/acesso", icon: "bi-shield-lock", label: "Acesso" },
      { to: "/admin/acessos", icon: "bi-shield-check", label: "Perfis de acesso" },
    ],
  },
  {
    id: "administrativo",
    area: "administrativo",
    icon: "bi-grid-1x2",
    label: "Administrativo",
    items: [
      { to: "/administrativo", icon: "bi-house", label: "Início" },
      { to: "/administrativo/clientes", icon: "bi-people", label: "Clientes" },
      { to: "/operacoes", icon: "bi-clipboard-data", label: "Operações" },
      { to: "/administrativo/cadastro/navio", icon: "bi-water", label: "Navio" },
      { to: "/administrativo/cadastro/container", icon: "bi-box-seam", label: "Container" },
      { to: "/administrativo/cadastro/terminal", icon: "bi-building", label: "Terminal" },
      { to: "/administrativo/cadastro/porto", icon: "bi-geo-alt", label: "Porto" },
      { to: "/administrativo/cadastro/produto", icon: "bi-box2", label: "Produto" },
      { to: "/administrativo/log", icon: "bi-journal-text", label: "Log" },
      { to: "/administrativo/ocorrencias", icon: "bi-exclamation-triangle", label: "Ocorrências" },
    ],
  },
  {
    id: "operacional",
    area: "operacional",
    icon: "bi-diagram-3",
    label: "Operacional",
    items: [
      { to: "/operacional", icon: "bi-house", label: "Início" },
      { to: "/operacional/operacoes", icon: "bi-clipboard-data", label: "Operações" },
    ],
  },
  {
    id: "area-cliente",
    area: "client",
    icon: "bi-person-badge",
    label: "Área do cliente",
    items: [
      { to: "/client", icon: "bi-house", label: "Início" },
      { to: "/client/relatorio-final", icon: "bi-file-earmark-text", label: "Relatório Final" },
      { to: "/client/acompanhamento", icon: "bi-graph-up-arrow", label: "Acompanhamento" },
      { to: "/client/colaboradores", icon: "bi-people", label: "Colaboradores" },
    ],
  },
  {
    id: "laboratorio",
    area: "laboratorio",
    icon: "bi-flask",
    label: "Laboratório",
    items: [{ to: "/laboratory", icon: "bi-flask-fill", label: "Laboratório" }],
  },
];

function isChildActive(items: NavItem[], pathname: string): boolean {
  return items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
}

function SidebarSection({
  section,
  pathname,
  expanded,
  onToggle,
}: {
  section: NavSection;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const active = isChildActive(section.items, pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="mb-1">
      <div
        className={`${styles.navItemToggle} ${active ? styles.active : ""}`}
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <span>
          <i className={`bi ${section.icon} me-2`} />
          {section.label}
        </span>
        <i
          className={`bi bi-chevron-right ${styles.submenuCaret} ${expanded ? styles.submenuCaretOpen : ""}`}
        />
      </div>
      <div className={styles.sidebarAccordionInner} style={{ maxHeight: expanded ? height : 0 }}>
        <div ref={contentRef}>
          <Nav as="ul" className={`${styles.navSub} flex-column`}>
            {section.items.map((item) => {
              const itemActive = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Nav.Item as="li" key={item.to}>
                  <Nav.Link as="a" href={item.to} active={itemActive}>
                    <i className={`bi ${item.icon} me-2`} />
                    {item.label}
                  </Nav.Link>
                </Nav.Item>
              );
            })}
          </Nav>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // fecha o menu mobile ao navegar
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // auto-expande a seção da rota atual
  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const s of SECTIONS) {
        if (isChildActive(s.items, pathname)) next[s.id] = true;
      }
      return next;
    });
  }, [pathname]);

  return (
    <div className={styles.shell}>
      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div
          className={`${styles.sidebarHeader} d-flex align-items-center justify-content-between`}
        >
          <a href="/dashboard" className={styles.sidebarBrand}>
            <span className={styles.sidebarTitle}>Alex Stewart</span>
          </a>
        </div>

        <Nav className={`${styles.sidebarNav} flex-column`}>
          {SECTIONS.map((section) => (
            <GatedSection
              key={section.id}
              section={section}
              pathname={pathname}
              expanded={!!expanded[section.id]}
              onToggle={() =>
                setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
              }
            />
          ))}
        </Nav>

        <div className={styles.sidebarFooter}>
          <UserMenu />
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <i className="bi bi-list" />
          </button>
          <div className={`${styles.topbarTitle} flex-grow-1`}>Portal interno</div>
          {/* TODO(user): controles de tema / idioma entram aqui. */}
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

/** Renderiza a seção só se o usuário logado tem acesso à área. */
function GatedSection(props: {
  section: NavSection;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const can = useCan(props.section.area);
  if (!can) return null;
  return <SidebarSection {...props} />;
}

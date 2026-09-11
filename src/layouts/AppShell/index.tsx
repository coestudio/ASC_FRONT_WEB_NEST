import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Nav } from "react-bootstrap";

import { useCan, useUser } from "@/hooks";
import { useT } from "@/lib/ui-prefs";
import { getUserAreas, type AreaId, type PermissionUser } from "@/lib/permissions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { BrandSwitcher } from "@/components/theme/brand-switcher";
import { AppBrand } from "@/layouts/AppBrand";
import { getNavSections, type NavItem, type NavSection } from "./nav";
import { UserMenu } from "./UserMenu";
import styles from "./index.module.css";

/**
 * Shell da área autenticada — sidebar + topbar. Montado pelo layout
 * /_dashboard (src/routes/_dashboard.tsx), envolve todas as rotas do dashboard.
 *
 * Nav config: as seções vêm de `getNavSections` (merge declarativo de
 * `nav/*.ts`, ver SPEC-02 §3.1) — não é mais um literal central aqui.
 *
 * Migração: os links apontam para rotas que ainda não existem (administrativo,
 * operacional, etc.) — por isso são <a> (navegação full-page) e não <Link>
 * tipado. Trocar por <Link> conforme as rotas forem migradas.
 */

function isChildActive(items: NavItem[], pathname: string): boolean {
  return items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
}

function SidebarSection({
  section,
  pathname,
  expanded,
  onToggle,
  t,
}: {
  section: NavSection;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  t: (key: NavSection["sectionLabelKey"]) => string;
}) {
  const active = isChildActive(section.items, pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // Depois que a animação de abertura termina, solta o teto de altura
  // (`max-height: none`) — daí em diante o acordeão nunca mais fica "com
  // limite", mesmo que os itens mudem (ex.: permissão carregada depois) sem
  // disparar um novo resize a tempo do próximo clique. Só volta a usar a
  // altura medida enquanto está de fato animando a abertura.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) setSettled(false);
  }, [expanded]);

  return (
    <div className="mb-1">
      <div
        className={`${styles.navItemToggle} ${active ? styles.active : ""}`}
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <span>
          <i className="bi bi-grid-1x2 me-2" aria-hidden />
          {t(section.sectionLabelKey)}
        </span>
        <i
          className={`bi bi-chevron-right ${styles.submenuCaret} ${expanded ? styles.submenuCaretOpen : ""}`}
        />
      </div>
      <div
        className={styles.sidebarAccordionInner}
        style={{ maxHeight: expanded ? (settled ? "none" : height) : 0 }}
        onTransitionEnd={() => {
          if (expanded) setSettled(true);
        }}
      >
        <div ref={contentRef}>
          <Nav as="ul" className={`${styles.navSub} flex-column`}>
            {section.items.map((item) => {
              const itemActive = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Nav.Item as="li" key={item.to}>
                  <Nav.Link as="a" href={item.to} active={itemActive}>
                    {item.icon ? <i className={`bi ${item.icon} me-2`} aria-hidden /> : null}
                    {t(item.labelKey)}
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
  const t = useT();
  const { user } = useUser();
  const themeLabels = {
    light: t("theme.light"),
    dark: t("theme.dark"),
    system: t("theme.system"),
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sections = getNavSections(getUserAreas(user as PermissionUser | null));

  // fecha o menu mobile ao navegar
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // auto-expande a seção da rota atual
  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const s of sections) {
        if (isChildActive(s.items, pathname)) next[s.area] = true;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <AppBrand as="link" to="/dashboard" size="sm" className={styles.sidebarBrand} />
        </div>

        <Nav className={`${styles.sidebarNav} flex-column`}>
          {sections.map((section) => (
            <GatedSection
              key={section.area}
              section={section}
              pathname={pathname}
              expanded={!!expanded[section.area]}
              onToggle={() =>
                setExpanded((prev) => ({ ...prev, [section.area]: !prev[section.area] }))
              }
              t={t}
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
            aria-label={t("shell.openMenu")}
            onClick={() => setMenuOpen(true)}
          >
            <i className="bi bi-list" />
          </button>
          <div className={`${styles.topbarTitle} flex-grow-1`}>Portal interno</div>
          <div className="d-flex align-items-center gap-2">
            <BrandSwitcher />
            <LanguageSwitcher />
            <ThemeToggle labels={themeLabels} />
          </div>
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
  t: (key: NavSection["sectionLabelKey"]) => string;
}) {
  const can = useCan(props.section.area as AreaId);
  if (!can) return null;
  return <SidebarSection {...props} />;
}

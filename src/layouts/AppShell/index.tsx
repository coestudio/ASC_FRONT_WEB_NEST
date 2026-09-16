import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Nav } from "react-bootstrap";

import { useCan, useUser } from "@/hooks";
import { useT } from "@/lib/ui-prefs";
import { APP_VERSION } from "@/lib/app-version";
import { getUserAreas, type AreaId, type PermissionUser } from "@/lib/permissions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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
 * Navegação: itens com rota real usam `<Link to>` tipado (client-side,
 * sem full-page reload — antes todo o sidebar usava `<a href>`, causando um
 * flash branco a cada clique). Itens `legacyOrphanRoute: true` (ver
 * `nav/types.ts`) continuam em `<a href>` — apontam pra rota que não existe
 * em `routeTree.gen.ts`, `<Link to>` tipado não aceitaria. Nenhum item usa a
 * flag hoje (os dois órfãos de Administrativo saíram nas SPEC-39/SPEC-43).
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
          <i className={`bi ${section.icon || "bi-grid-1x2"} me-2`} />
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
                  {item.legacyOrphanRoute ? (
                    <Nav.Link as="a" href={item.to} active={itemActive}>
                      {item.icon ? <i className={`bi ${item.icon} me-2`} aria-hidden /> : null}
                      {t(item.labelKey)}
                    </Nav.Link>
                  ) : (
                    <Nav.Link as={Link} to={item.to} active={itemActive}>
                      {item.icon ? <i className={`bi ${item.icon} me-2`} aria-hidden /> : null}
                      {t(item.labelKey)}
                    </Nav.Link>
                  )}
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
  // Accordion de exclusão mútua (SPEC-25): só uma seção aberta por vez —
  // antes era um mapa independente por seção (`Record<string, boolean>`),
  // o que deixava múltiplas seções abertas ao mesmo tempo e estourava a
  // altura de `.sidebarNav` (`overflow-y: auto`), forçando barra de rolagem.
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const sections = getNavSections(getUserAreas(user as PermissionUser | null));

  // fecha o menu mobile ao navegar
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // auto-expande só a seção da rota atual, fechando qualquer outra que
  // estivesse aberta (mesma regra de exclusividade do clique manual).
  useEffect(() => {
    const activeSection = sections.find((s) => isChildActive(s.items, pathname));
    setExpandedArea(activeSection?.area ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className={styles.shell}>
      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        {/* SPEC-29: reverte SPEC-26 — logo da marca ativa volta a aparecer
            aqui, reagindo a `data-brand` via `useBrand()` (AppBrand). */}
        <div className={styles.sidebarHeader}>
          <AppBrand as="link" to="/" size="sm" />
        </div>

        <Nav className={`${styles.sidebarNav} flex-column`}>
          {sections.map((section) => (
            <GatedSection
              key={section.area}
              section={section}
              pathname={pathname}
              expanded={expandedArea === section.area}
              onToggle={() =>
                setExpandedArea((prev) => (prev === section.area ? null : section.area))
              }
              t={t}
            />
          ))}
        </Nav>

        <div className={styles.sidebarFooter}>
          <UserMenu />
          {/* Versão do app — SPEC-11 item 7 (decisão do usuário: só a
              string da versão, sem duplicar dado que já existe no UserMenu). */}
          <div className={styles.appVersion}>v{APP_VERSION}</div>
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

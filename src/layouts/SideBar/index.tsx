import { Link, useLocation, useParams } from "react-router-dom";
import { Nav } from "react-bootstrap";
import { modules } from "@/Data/screens";
import { UserMenu } from "./components/UserMenu";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { AppBrand } from "Components/AppBrand";
import { ShipIcon } from "Components/Icons/ShipIcon";
import { Can } from "Components/Can";
import { useT } from "@/I18n";
import styles from "./index.module.css";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Section = "administrador" | "administrativo" | "operacional" | "area-cliente" | "laboratorio";

function hasActiveChild(items: { to: string }[], pathname: string): boolean {
  return items.some((item) => pathname.startsWith(item.to));
}

function SidebarSection({
  id,
  icon,
  label,
  to,
  items,
  expanded,
  onToggle,
  pathname,
}: {
  id: Section;
  icon: string;
  label: string;
  to: string;
  items: { to: string; icon: string; label: string }[];
  expanded: boolean;
  onToggle: (id: Section) => void;
  pathname: string;
}) {
  const isActive = hasActiveChild(items, pathname);

  // Altura medida via ResizeObserver em vez de `grid-template-rows: 0fr/1fr`:
  // o truque de grid-fr recalcula o track fracionário a cada frame e, com
  // várias seções da sidebar animando ao mesmo tempo dentro do container com
  // scroll (.sidebarNav), o reflow contaminava os irmãos e jogava o último
  // item pro lado. max-height com altura real (scrollHeight) não tem esse problema.
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="mb-1">
      <div
        className={`${styles.navItemToggle} ${isActive ? styles.active : ""}`}
        onClick={() => onToggle(id)}
        role="button"
        aria-expanded={expanded}
      >
        <span>
          <i className={`bi ${icon} me-2`} />
          {label}
        </span>
        <i className={`bi bi-chevron-right ${styles.caret} ${expanded ? styles.caretOpen : ""}`} />
      </div>
      <div
        className={styles.sidebarAccordionInner}
        style={{ maxHeight: expanded ? contentHeight : 0 }}
      >
        <div ref={contentRef}>
          <Nav as="ul" className={`${styles.navSub} flex-column`}>
            {items.map((item) => (
              <Nav.Item as="li" key={item.to}>
                <Nav.Link as={Link} to={item.to} active={pathname === item.to || pathname.startsWith(item.to + "/")}>
                  {item.icon === "custom-ship" ? (
                    <ShipIcon className="me-2" />
                  ) : (
                    <i className={`bi ${item.icon} me-2`} />
                  )}
                  {item.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const params = useParams() as { modulo?: string; tela?: string };
  const location = useLocation();
  const t = useT();
  const activeMod = params.modulo;
  const activeScreen = params.tela;
  const currentModule = modules?.find((m) => m.slug === activeMod);
  const currentScreen = currentModule?.screens.find((s) => s.slug === activeScreen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    administrador: false,
    administrativo: false,
    operacional: false,
    "area-cliente": false,
    laboratorio: false,
  });

  const toggle = (id: Section) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Auto-expand sections when navigating to a child route
  useEffect(() => {
    const p = location.pathname;
    setExpanded((prev) => ({
      ...prev,
      administrador: prev.administrador || hasActiveChild(administradorItems, p),
      administrativo: prev.administrativo || hasActiveChild(administrativoItems, p),
      operacional: prev.operacional || hasActiveChild(operacionalItems, p),
      "area-cliente": prev["area-cliente"] || hasActiveChild(areaClienteItems, p),
      laboratorio: prev.laboratorio || hasActiveChild(laboratorioItems, p),
    }));
  }, [location.pathname]);

  const administradorItems = [
    { to: "/admin/acesso", icon: "bi-shield-lock", label: "Acesso" },
    { to: "/admin/acessos", icon: "bi-shield-check", label: "Perfis de acesso" },
  ];

  const administrativoItems = [
    { to: "/administrativo", icon: "bi-house", label: "Início" },
    { to: "/administrativo/clientes", icon: "bi-people", label: "Clientes" },
    { to: "/operacoes", icon: "bi-clipboard-data", label: "Operações" },
    { to: "/administrativo/cadastro/navio", icon: "custom-ship", label: "Navio" },
    { to: "/administrativo/cadastro/container", icon: "bi-box-seam", label: "Container" },
    { to: "/administrativo/cadastro/terminal", icon: "bi-building", label: "Terminal" },
    { to: "/administrativo/cadastro/porto", icon: "bi-geo-alt", label: "Porto" },
    { to: "/administrativo/cadastro/produto", icon: "bi-box2", label: "Produto" },
    { to: "/administrativo/log", icon: "bi-journal-text", label: "Log" },
    { to: "/administrativo/ocorrencias", icon: "bi-exclamation-triangle", label: "Ocorrências" },
  ];

  const operacionalItems = [
    { to: "/operacional", icon: "bi-house", label: "Início" },
    { to: "/operacional/operacoes", icon: "bi-clipboard-data", label: "Operacional Opc 1" },
  ];

  const areaClienteItems = [
    { to: "/client", icon: "bi-house", label: "Início" },
    { to: "/client/relatorio-final", icon: "bi-file-earmark-text", label: "Relatório Final" },
    { to: "/client/acompanhamento", icon: "bi-graph-up-arrow", label: "Acompanhamento" },
    { to: "/client/colaboradores", icon: "bi-people", label: "Colaboradores" },
  ];

  const laboratorioItems = [
    { to: "/laboratorio", icon: "bi-flask-fill", label: "Laboratório" },
  ];

  return (
    <div className={styles.shell}>
      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={`${styles.sidebarHeader} d-flex align-items-center justify-content-between`}>
          <AppBrand as="link" to="/" size="md" className={styles.sidebarBrand} />
        </div>
        <Nav className={`${styles.sidebarNav} flex-column`}>
          {/* Cada seção só aparece se a área for liberada pro usuário logado
              (ver Global/Auth/permissions.ts) — guard de UI, não de rota. */}
          <Can area="admin">
            <SidebarSection
              id="administrador"
              icon="bi-shield-lock"
              label="Administrador"
              to="/admin/acesso"
              items={administradorItems}
              expanded={expanded.administrador}
              onToggle={toggle}
              pathname={location.pathname}
            />
          </Can>
          <Can area="administrativo">
            <SidebarSection
              id="administrativo"
              icon="bi-grid-1x2"
              label="Administrativo"
              to="/administrativo"
              items={administrativoItems}
              expanded={expanded.administrativo}
              onToggle={toggle}
              pathname={location.pathname}
            />
          </Can>
          <Can area="operacional">
            <SidebarSection
              id="operacional"
              icon="bi-diagram-3"
              label="Operacional"
              to="/operacional"
              items={operacionalItems}
              expanded={expanded.operacional}
              onToggle={toggle}
              pathname={location.pathname}
            />
          </Can>
          <Can area="client">
            <SidebarSection
              id="area-cliente"
              icon="bi-person-badge"
              label="Área do cliente"
              to="/client"
              items={areaClienteItems}
              expanded={expanded["area-cliente"]}
              onToggle={toggle}
              pathname={location.pathname}
            />
          </Can>
          <Can area="laboratorio">
            <SidebarSection
              id="laboratorio"
              icon="bi-flask"
              label="Laboratório"
              to="/laboratorio"
              items={laboratorioItems}
              expanded={expanded.laboratorio}
              onToggle={toggle}
              pathname={location.pathname}
            />
          </Can>
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
          <div className={`${styles.topbarTitle} flex-grow-1`}>
            {currentModule ? currentModule.title : t("nav.home")}
            {currentScreen ? ` / ${currentScreen.title}` : ""}
          </div>
          <LanguageSwitcher />
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

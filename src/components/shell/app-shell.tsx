"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List } from "react-bootstrap-icons";
import logo from "@/assets/images/logo.png";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AreaId } from "@/lib/permissions";
import { useThemeMode, useSyncThemeToDocument } from "@/styles/globals/theme-store";
import { TokenExpiryChecker } from "@/components/token-expiry-checker";
import { getNavSections } from "./nav-config";
import { SidebarSection } from "./sidebar-section";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import styles from "./app-shell.module.css";

type AppShellProps = {
  lang: Locale;
  dict: Dictionary;
  areas: AreaId[];
  userName: string;
  userEmail: string;
  children: React.ReactNode;
};

export function AppShell({
  lang,
  dict,
  areas,
  userName,
  userEmail,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  // Mantém o data-bs-theme sincronizado enquanto qualquer página logada
  // estiver montada, independente de o ThemeToggle "solto" estar na tela.
  const themeMode = useThemeMode();
  useSyncThemeToDocument(themeMode);

  const sections = useMemo(
    () => getNavSections(dict, areas, lang),
    [dict, areas, lang]
  );

  const homeHref = `/${lang}`;

  const activeSectionId = useMemo(() => {
    return sections.find((section) =>
      section.items.some((item) => item.href === pathname)
    )?.id;
  }, [sections, pathname]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  // Já nasce com a seção da rota atual aberta (primeiro render / hard
  // navigation / refresh da página).
  const [openSections, setOpenSections] = useState<Set<AreaId>>(
    () => new Set(activeSectionId ? [activeSectionId] : [])
  );
  // Guarda o pathname já processado pra "ajustar estado durante a
  // renderização" (padrão recomendado pelo React em vez de useEffect pra
  // reagir a mudança de prop/rota — evita o cascading render de setState
  // dentro de efeito) quando a rota muda: fecha o drawer mobile e auto-abre
  // a seção da rota ativa.
  const [processedPathname, setProcessedPathname] = useState(pathname);

  if (pathname !== processedPathname) {
    setProcessedPathname(pathname);
    // Fecha o drawer mobile a cada navegação.
    setDrawerOpen(false);
    // Auto-abre a seção que contém a rota ativa (sem fechar outras que o
    // usuário já tenha aberto manualmente).
    if (activeSectionId) {
      setOpenSections((current) =>
        current.has(activeSectionId)
          ? current
          : new Set(current).add(activeSectionId)
      );
    }
  }

  function toggleSection(id: AreaId) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pageTitle = useMemo(() => {
    for (const section of sections) {
      const item = section.items.find((entry) => entry.href === pathname);
      if (item) return item.label;
    }
    return dict.nav.home;
  }, [sections, pathname, dict.nav.home]);

  return (
    <div className={styles.shell}>
      <TokenExpiryChecker />
      {drawerOpen && (
        <button
          type="button"
          aria-label={dict.shell.closeMenu}
          className={styles.backdrop}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={[styles.sidebar, drawerOpen ? styles.sidebarOpen : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <Link href={homeHref} className={styles.sidebarHeader}>
          <Image src={logo} alt="Alex Stewart" width={36} height={36} />
          <div>
            <p className={styles.brandName}>Alex Stewart</p>
            <p className={styles.brandTagline}>Agriculture</p>
          </div>
        </Link>

        <nav className={styles.sidebarNav}>
          {sections.map((section) => (
            <SidebarSection
              key={section.id}
              section={section}
              pathname={pathname}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onNavigate={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <UserMenu lang={lang} dict={dict} name={userName} email={userEmail} />
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.menuButton}
              aria-label={dict.shell.openMenu}
              onClick={() => setDrawerOpen(true)}
            >
              <List aria-hidden />
            </button>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>

          <LanguageSwitcher lang={lang} label={dict.shell.language} />
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

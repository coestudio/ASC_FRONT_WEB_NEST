import { auth } from "@/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getUserAreas } from "@/lib/permissions";
import { AppShell } from "@/components/shell/app-shell";

// Layout do route group (app) — não afeta a URL. Compartilhado por todas as
// telas pós-login (sidebar + topbar + menu de usuário). A proteção de rota
// em si (redirecionar não-logado pro /login) continua só em src/proxy.ts;
// aqui só resolvemos sessão/dicionário/áreas permitidas pra montar a UI.
export default async function AppLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang: rawLang } = await params;
  const lang = isLocale(rawLang) ? rawLang : defaultLocale;
  const dict = await getDictionary(lang);
  const session = await auth();

  const areas = getUserAreas(session?.user);
  const userName =
    session?.user?.name ?? session?.user?.userName ?? session?.user?.email ?? "";
  const userEmail = session?.user?.email ?? "";

  return (
    <AppShell
      lang={lang}
      dict={dict}
      areas={areas}
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </AppShell>
  );
}

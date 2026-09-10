import { locales, type Locale } from "@/i18n/config";

/**
 * Troca o segmento [lang] de um pathname absoluto (ex.: "/pt-BR/administrativo"
 * -> "/en/administrativo"), preservando o resto do caminho. Usado pelo
 * seletor de idioma da topbar e pelo submenu de preferências do sidebar.
 */
export function replaceLocaleInPath(pathname: string, locale: Locale): string {
  const parts = pathname.split("/");

  if (parts.length > 1 && locales.includes(parts[1] as Locale)) {
    parts[1] = locale;
  } else {
    parts.splice(1, 0, locale);
  }

  return parts.join("/") || `/${locale}`;
}

import { getCookie, getRequestHeader } from "@tanstack/react-start/server";

import { LOCALE_COOKIE_NAME, isLocale, negotiateLocale, type Locale } from "@/i18n/config";

/**
 * Resolve o locale ativo da request atual (server-only) — usado pelos
 * `*-fns.ts` que chamam `coreClient` diretamente (fora do proxy BFF), pra
 * mandar o header `x-locale` pro Core (SPEC-15). Mesmo critério do
 * `readUiPrefs` (src/lib/ui-prefs.tsx): cookie `asc_locale` primeiro,
 * senão negocia por `Accept-Language`.
 *
 * `coreClient` (src/lib/core-client.ts) é uma instância singleton sem
 * contexto de request — por isso a resolução acontece por chamada, aqui,
 * não como header default fixo no client.
 */
export function getRequestLocale(): Locale {
  const cookieLocale = getCookie(LOCALE_COOKIE_NAME);
  if (isLocale(cookieLocale)) return cookieLocale;
  return negotiateLocale(getRequestHeader("accept-language"));
}

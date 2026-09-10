// STUB — provider de i18n client-side pro TanStack Start ainda não migrado.
// O resto de src/i18n (config.ts, dictionaries.ts) é server-side do app Next.js antigo
// e não se aplica aqui. Por ora este provider só repassa os filhos sem tradução.
import type { ReactNode } from "react";

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

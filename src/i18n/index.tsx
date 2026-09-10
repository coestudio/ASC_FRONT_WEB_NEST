// STUB — provider de i18n client-side pro TanStack Start ainda não migrado.
// O resto de src/i18n (config.ts, dictionaries/*.json) ainda precisa de um
// carregador client-side. Por ora este provider só repassa os filhos sem tradução.
import type { ReactNode } from "react";

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

import { Alert } from "react-bootstrap";

import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

type MockDataBannerProps = {
  /** Chave i18n opcional — default `crud.mockDataBanner.message`. */
  messageKey?: TranslationKey;
  className?: string;
};

/**
 * Aviso único "dados de exemplo — sem endpoint no Core" — usado por toda
 * tela/seção UI-only (SPEC-05 a SPEC-09). Nunca recriado por SPEC de área;
 * ver CA8 da SPEC-02.
 */
export function MockDataBanner({ messageKey, className }: MockDataBannerProps) {
  const t = useT();
  return (
    <Alert variant="warning" className={className}>
      <i className="bi bi-info-circle me-2" aria-hidden />
      {t(messageKey ?? "crud.mockDataBanner.message")}
    </Alert>
  );
}

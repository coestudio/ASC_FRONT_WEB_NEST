import { Spinner } from "react-bootstrap";

export type LoadingStateProps = {
  /** `page` centraliza no viewport inteiro (uso como pendingComponent de rota).
   * `inline` centraliza só na área do container pai (uso dentro de listas/telas). */
  variant?: "page" | "inline";
  /** Tamanho do spinner do react-bootstrap. */
  size?: "sm" | undefined;
  className?: string;
};

/**
 * Loading padrão da aplicação — substitui os `<Spinner animation="border" />`
 * soltos espalhados pelas telas. Usado também como `defaultPendingComponent`
 * do router (ver `src/router.tsx`), por isso não depende de i18n/contexto:
 * pode renderizar antes do `UiPrefsProvider` montar durante a navegação SSR.
 */
export function LoadingState({ variant = "inline", size, className }: LoadingStateProps) {
  return (
    <div
      className={[
        "d-flex align-items-center justify-content-center",
        variant === "page" ? "min-vh-100 w-100" : "py-5 w-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Spinner animation="border" role="status" size={size}>
        <span className="visually-hidden">Carregando…</span>
      </Spinner>
    </div>
  );
}

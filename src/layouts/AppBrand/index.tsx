import { Link } from "@tanstack/react-router";

import asaLogo from "@/assets/ASA/logo.png";
import asiLogo from "@/assets/ASI/logo.png";
import ascLogo from "@/assets/ASC/logo.png";
import { useBrand } from "@/lib/ui-prefs";
import type { Brand } from "@/styles/globals/brand";

const BRAND_CONTENT: Record<Brand, { logo: string; subtitle: string }> = {
  asa: { logo: asaLogo, subtitle: "Agriculture" },
  asi: { logo: asiLogo, subtitle: "International" },
  asc: { logo: ascLogo, subtitle: "Core" },
};

interface AppBrandProps {
  as?: "div" | "link";
  to?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * `logo` (default) usa o PNG importado de `src/assets/<brand>/logo.png`.
   * `badge` renderiza um selo circular via CSS (fundo branco + anel de
   * destaque + sigla da marca) — usado no card de login, SPEC-11 item 2/5.
   */
  variant?: "logo" | "badge";
}

// Sigla exibida dentro do badge circular, por marca.
const BRAND_INITIALS: Record<Brand, string> = {
  asa: "ASA",
  asi: "ASI",
  asc: "ASC",
};

/**
 * Logo + título/subtítulo da marca ativa. Fonte da brand = `useBrand()`
 * (cookie `asc_brand`, ver @/lib/ui-prefs) — troca em runtime junto com o
 * switcher, sem reload. Classes `.app-brand*` vêm de
 * src/styles/globals/base.css (SPEC-14: o `src/assets/css/base.css` legado
 * que este comentário citava nunca foi importado no bundle e foi apagado).
 */
export function AppBrand({
  as = "div",
  to = "/",
  size = "md",
  className = "",
  variant = "logo",
}: AppBrandProps) {
  const brand = useBrand();
  const { logo, subtitle } = BRAND_CONTENT[brand];
  const sizeClass = `app-brand--${size}`;
  const variantClass = variant === "badge" ? "app-brand--badge" : "";
  const classes = `app-brand ${sizeClass} ${variantClass} ${className}`.trim();

  const inner = (
    <>
      {variant === "badge" ? (
        <span className="app-brand__badge" aria-hidden="true">
          {BRAND_INITIALS[brand]}
        </span>
      ) : (
        <img src={logo} alt={`Alex Stewart ${subtitle}`} className="app-brand__logo" />
      )}
      <div className="app-brand__text">
        <div className="app-brand__title">Alex Stewart</div>
        <div className="app-brand__subtitle">{subtitle}</div>
      </div>
    </>
  );

  if (as === "link") {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    );
  }
  return <div className={classes}>{inner}</div>;
}

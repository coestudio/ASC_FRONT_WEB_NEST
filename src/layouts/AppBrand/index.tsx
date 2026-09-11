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
}

/**
 * Logo + título/subtítulo da marca ativa. Fonte da brand = `useBrand()`
 * (cookie `asc_brand`, ver @/lib/ui-prefs) — troca em runtime junto com o
 * switcher, sem reload. Classes `.app-brand*` vêm de src/assets/css/base.css.
 */
export function AppBrand({ as = "div", to = "/", size = "md", className = "" }: AppBrandProps) {
  const brand = useBrand();
  const { logo, subtitle } = BRAND_CONTENT[brand];
  const sizeClass = `app-brand--${size}`;
  const classes = `app-brand ${sizeClass} ${className}`.trim();

  const inner = (
    <>
      <img src={logo} alt={`Alex Stewart ${subtitle}`} className="app-brand__logo" />
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

import { Link } from "react-router-dom";
import { useBrandStore } from "Hooks/useBrand";
import asaLogo from "Assets/ASA/logo.png";
import asiLogo from "Assets/ASI/logo_box.png";

const BRAND_CONTENT = {
  asa: { logo: asaLogo, subtitle: "Agriculture" },
  asi: { logo: asiLogo, subtitle: "International" },
};

interface AppBrandProps {
  as?: "div" | "link";
  to?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AppBrand({ as = "div", to = "/", size = "md", className = "" }: AppBrandProps) {
  const brand = useBrandStore((s) => s.brand);
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

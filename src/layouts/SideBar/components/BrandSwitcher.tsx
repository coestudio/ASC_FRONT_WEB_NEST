import { Dropdown } from "react-bootstrap";
import { useBrandStore, type Brand } from "Hooks/useBrand";
import styles from "../index.module.css";

const BRAND_OPTIONS: { value: Brand; label: string; swatch: string }[] = [
  { value: "asa", label: "ASA", swatch: "#38a56e" },
  { value: "asi", label: "ASI", swatch: "#ec1e26" },
];

export function BrandSwitcher() {
  const brand = useBrandStore((s) => s.brand);
  const setBrand = useBrandStore((s) => s.setBrand);
  const currentBrand = BRAND_OPTIONS.find((o) => o.value === brand) ?? BRAND_OPTIONS[0];

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as="button"
        type="button"
        bsPrefix={styles.brandSwitcherToggle}
        id="brand-switcher-toggle"
        title={`Marca: ${currentBrand.label}`}
      >
        <span className={styles.swatch} style={{ backgroundColor: currentBrand.swatch }} />
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={{ strategy: "fixed" }} renderOnMount>
        {BRAND_OPTIONS.map((o) => (
          <Dropdown.Item key={o.value} active={o.value === brand} onClick={() => setBrand(o.value)}>
            <span className={styles.swatch} style={{ backgroundColor: o.swatch }} />
            {o.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

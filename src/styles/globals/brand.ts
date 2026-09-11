// Constantes/tipos puros para a brand (client-side).
// Sem hooks aqui — ver src/lib/ui-prefs.tsx para o provider.
// Irmão de color-modes.ts: aquele cobre o modo (light/dark), este cobre a
// marca (asa/asi/asc). São dimensões ortogonais — ver specs/01-brand-theming.

export const BRAND_COOKIE_NAME = "asc_brand";

/** As 3 marcas suportadas. `asa` é o default (Alex Stewart Agriculture). */
export type Brand = "asa" | "asi" | "asc";

export const DEFAULT_BRAND: Brand = "asa";

export const isBrand = (v: string | null | undefined): v is Brand =>
  v === "asa" || v === "asi" || v === "asc";

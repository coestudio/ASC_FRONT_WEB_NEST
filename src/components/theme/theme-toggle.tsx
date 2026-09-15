import { useId } from "react";
import { SunFill, MoonStarsFill, CircleHalf } from "react-bootstrap-icons";

import type { ThemeMode } from "@/styles/globals/color-modes";
import { useThemeMode, useSetThemeMode } from "@/lib/ui-prefs";
import styles from "./theme-toggle.module.css";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

const ICONS: Record<ThemeMode, typeof SunFill> = {
  light: SunFill,
  dark: MoonStarsFill,
  system: CircleHalf,
};

const ICON_CLASS: Record<ThemeMode, string> = {
  light: "iconLight",
  dark: "iconDark",
  system: "iconSystem",
};

export type ThemeToggleLabels = Record<ThemeMode, string>;

/**
 * Switch de tema (SPEC-11 item 6) — trilho + thumb com o ícone do modo
 * atual sempre visível dentro do thumb (sol/lua/meio-a-meio). Lógica
 * inalterada: clique continua ciclando light → dark → system.
 */
export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const mode = useThemeMode();
  const setThemeMode = useSetThemeMode();
  const id = useId();

  const Icon = ICONS[mode];
  // Thumb à direita (trilho "ligado") pra dark e system — só light fica
  // à esquerda.
  const isOn = mode !== "light";

  const cycle = () => {
    setThemeMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);
  };

  return (
    <label htmlFor={id} className={styles.switch} title={labels[mode]}>
      <input
        type="checkbox"
        role="switch"
        id={id}
        className={styles.input}
        checked={isOn}
        onChange={cycle}
        aria-label={labels[mode]}
      />
      <span className={styles.track} aria-hidden="true" />
      <span className={styles.thumb} aria-hidden="true">
        <Icon className={`${styles.icon} ${styles[ICON_CLASS[mode]]}`} />
      </span>
    </label>
  );
}

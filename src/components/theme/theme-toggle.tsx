import { SunFill, MoonStarsFill, CircleHalf } from "react-bootstrap-icons";

import { Button } from "@/components/ui/button";
import type { ThemeMode } from "@/styles/globals/color-modes";
import { useThemeMode, useSetThemeMode } from "@/lib/ui-prefs";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

const ICONS: Record<ThemeMode, typeof SunFill> = {
  light: SunFill,
  dark: MoonStarsFill,
  system: CircleHalf,
};

export type ThemeToggleLabels = Record<ThemeMode, string>;

export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const mode = useThemeMode();
  const setThemeMode = useSetThemeMode();

  const Icon = ICONS[mode];

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => setThemeMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length])}
      aria-label={labels[mode]}
      title={labels[mode]}
    >
      <Icon aria-hidden />
    </Button>
  );
}

"use client";

import { SunFill, MoonStarsFill } from "react-bootstrap-icons";
import { Button } from "@/components/ui/button";
import type { ThemeMode } from "@/styles/globals/color-modes";
import { useThemeMode, setThemeMode, useSyncThemeToDocument } from "@/styles/globals/theme-store";

const ORDER: ThemeMode[] = ["light", "dark"];

const ICONS: Record<ThemeMode, typeof SunFill> = {
  light: SunFill,
  dark: MoonStarsFill,
};

export type ThemeToggleLabels = Record<ThemeMode, string>;

export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const mode = useThemeMode();
  useSyncThemeToDocument(mode);

  function cycle() {
    setThemeMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);
  }

  const Icon = ICONS[mode];

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={cycle}
      aria-label={labels[mode]}
      title={labels[mode]}
    >
      <Icon aria-hidden />
    </Button>
  );
}

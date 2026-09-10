"use client";

import { Grid3x3GapFill, ListUl } from "react-bootstrap-icons";
import type { ViewMode } from "@/lib/view-mode";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  hidden?: boolean;
};

export function ViewToggle({ value, onChange, hidden = false }: ViewToggleProps) {
  if (hidden) return null;

  return (
    <div
      className="btn-group flex-shrink-0"
      role="group"
      aria-label="Modo de visualização"
    >
      <button
        type="button"
        className={`btn btn-sm ${
          value === "cards" ? "btn-success" : "btn-outline-success"
        }`}
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
        title="Visualizar em cards"
      >
        <Grid3x3GapFill aria-hidden />
      </button>
      <button
        type="button"
        className={`btn btn-sm ${
          value === "list" ? "btn-success" : "btn-outline-success"
        }`}
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        title="Visualizar em lista"
      >
        <ListUl aria-hidden />
      </button>
    </div>
  );
}

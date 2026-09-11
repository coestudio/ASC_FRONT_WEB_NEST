import type { ViewMode } from "@/lib/view-mode";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  hidden?: boolean;
  ariaLabel?: string;
};

/** Toggle cards/lista — consome `useViewMode`/`useResponsiveViewMode` (src/lib/view-mode.ts). */
export function ViewToggle({
  value,
  onChange,
  hidden = false,
  ariaLabel = "Modo de visualização",
}: ViewToggleProps) {
  if (hidden) return null;

  return (
    <div className="btn-group flex-shrink-0" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={`btn btn-sm ${value === "cards" ? "btn-primary" : "btn-outline-primary"}`}
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
      >
        <i className="bi bi-grid-3x3-gap-fill" aria-hidden />
      </button>
      <button
        type="button"
        className={`btn btn-sm ${value === "list" ? "btn-primary" : "btn-outline-primary"}`}
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
      >
        <i className="bi bi-list-ul" aria-hidden />
      </button>
    </div>
  );
}

// Bootstrap Icons não tem ícone de barco/navio/âncora — SVG próprio (casco +
// mastro + vela), no mesmo estilo monocromático (16x16, fill currentColor)
// dos ícones `bi-*` usados no resto do app.
export function ShipIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
      className={className}
      style={{ verticalAlign: "-0.125em" }}
    >
      <path d="M7.5 1.5a.5.5 0 0 1 .5.5v1h.5a.5.5 0 0 1 .4.2l3 4a.5.5 0 0 1-.4.8H8v2h-1V8H4a.5.5 0 0 1-.4-.8l3-4a.5.5 0 0 1 .4-.2h.5V2a.5.5 0 0 1 .5-.5z" />
      <path d="M1.05 10.5h13.9l-1.62 3.9a1 1 0 0 1-.92.6H3.59a1 1 0 0 1-.92-.6L1.05 10.5z" />
    </svg>
  );
}

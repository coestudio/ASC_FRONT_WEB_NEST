"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  section: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ section, title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-4">
      <p
        className="text-uppercase fw-semibold mb-1"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          color: "var(--bs-secondary)",
        }}
      >
        {section}
      </p>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          {icon && <span style={{ color: "var(--bs-secondary)" }}>{icon}</span>}
          <h1 className="h3 mb-0 fw-bold">{title}</h1>
        </div>
        {actions}
      </div>
      {description && (
        <p className="mt-1 mb-0" style={{ color: "var(--bs-secondary)" }}>
          {description}
        </p>
      )}
    </div>
  );
}

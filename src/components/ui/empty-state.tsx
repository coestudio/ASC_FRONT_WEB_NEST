"use client";

import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  message: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, message, description, action }: EmptyStateProps) {
  return (
    <div
      className="text-center py-5 rounded-3"
      style={{
        border: "1px solid var(--bs-border-color)",
        backgroundColor: "var(--bs-body-bg)",
      }}
    >
      {icon && (
        <div className="mb-3" style={{ color: "var(--bs-secondary)", opacity: 0.5 }}>
          {icon}
        </div>
      )}
      <p className="mb-1 fw-medium" style={{ color: "var(--bs-secondary)" }}>
        {message}
      </p>
      {description && (
        <p className="mb-3" style={{ color: "var(--bs-secondary)", fontSize: "0.875rem" }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

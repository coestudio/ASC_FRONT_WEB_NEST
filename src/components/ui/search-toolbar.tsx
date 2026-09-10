"use client";

import { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";

type ViewMode = "table" | "cards";

type SearchToolbarProps = {
  placeholder?: string;
  onSearch: (query: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  actions?: React.ReactNode;
};

export function SearchToolbar({
  placeholder = "Buscar...",
  onSearch,
  viewMode = "table",
  onViewModeChange,
  actions,
}: SearchToolbarProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query);
  }

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
      <Form onSubmit={handleSubmit} className="flex-grow-1">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </Form>

      {onViewModeChange && (
        <div className="btn-group" role="group">
          <Button
            variant={viewMode === "table" ? "secondary" : "outline-secondary"}
            onClick={() => onViewModeChange("table")}
            className="px-2 py-1"
            title="Tabela"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "outline-secondary"}
            onClick={() => onViewModeChange("cards")}
            className="px-2 py-1"
            title="Cards"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </Button>
        </div>
      )}

      {actions}
    </div>
  );
}

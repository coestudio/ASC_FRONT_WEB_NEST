"use client";

import { useId } from "react";

type FormFieldProps = {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
};

export function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  minLength,
  maxLength,
  inputMode,
  className,
}: FormFieldProps) {
  const controlId = useId();

  return (
    <div className={className ?? ""}>
      <label
        htmlFor={controlId}
        className="form-label fw-semibold text-uppercase"
        style={{ fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--bs-secondary)" }}
      >
        {label}
      </label>
      <input
        id={controlId}
        type={type}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
        style={{
          borderRadius: "0.5rem",
          padding: "0.6rem 0.75rem",
          fontSize: "0.9rem",
        }}
      />
    </div>
  );
}

type FormSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
};

export function FormSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className,
}: FormSelectProps) {
  const controlId = useId();

  return (
    <div className={className ?? ""}>
      <label
        htmlFor={controlId}
        className="form-label fw-semibold text-uppercase"
        style={{ fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--bs-secondary)" }}
      >
        {label}
      </label>
      <select
        id={controlId}
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          borderRadius: "0.5rem",
          padding: "0.6rem 0.75rem",
          fontSize: "0.9rem",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type FormCheckGroupProps = {
  label: string;
  options: { value: string; label: string; checked: boolean }[];
  onChange: (value: string, checked: boolean) => void;
  className?: string;
};

export function FormCheckGroup({
  label,
  options,
  onChange,
  className,
}: FormCheckGroupProps) {
  return (
    <div className={className ?? ""}>
      <span
        className="d-block fw-semibold text-uppercase mb-2"
        style={{ fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--bs-secondary)" }}
      >
        {label}
      </span>
      <div className="d-flex flex-wrap gap-3">
        {options.map((opt) => (
          <div key={opt.value} className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              checked={opt.checked}
              onChange={(e) => onChange(opt.value, e.target.checked)}
              id={`check-${opt.value}`}
              style={{ borderColor: "var(--bs-secondary)" }}
            />
            <label
              className="form-check-label"
              htmlFor={`check-${opt.value}`}
              style={{ fontSize: "0.9rem" }}
            >
              {opt.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

type FormSwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function FormSwitch({
  label,
  checked,
  onChange,
  className,
}: FormSwitchProps) {
  return (
    <div className={className ?? ""}>
      <span
        className="d-block fw-semibold text-uppercase mb-2"
        style={{ fontSize: "0.7rem", letterSpacing: "0.04em", color: "var(--bs-secondary)" }}
      >
        {label}
      </span>
      <div className="form-check form-switch">
        <input
          type="checkbox"
          className="form-check-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          role="switch"
          style={{ cursor: "pointer" }}
        />
      </div>
    </div>
  );
}

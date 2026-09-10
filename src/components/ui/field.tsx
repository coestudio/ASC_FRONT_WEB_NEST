import type { InputHTMLAttributes } from "react";
import { Input } from "./input";
import styles from "./ui.module.css";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
};

export function Field({ label, name, error, ...inputProps }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
      </label>
      <Input id={name} name={name} {...inputProps} />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

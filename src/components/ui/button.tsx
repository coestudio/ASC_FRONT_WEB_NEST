import type { ButtonHTMLAttributes } from "react";
import styles from "./ui.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary;

  return (
    <button
      className={[styles.button, variantClass, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

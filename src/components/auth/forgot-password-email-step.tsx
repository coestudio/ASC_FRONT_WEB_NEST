"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Button, Spinner } from "react-bootstrap";
import { Envelope } from "react-bootstrap-icons";
import { TextField } from "@/components/ui/text-field";
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailInput,
} from "@/lib/validation/reset-password";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./forgot-password-form.module.css";

type ForgotPasswordEmailStepProps = {
  dict: Dictionary["auth"];
  pending: boolean;
  error?: "invalidInput" | "genericError";
  onSubmit: (email: string) => void;
};

export function ForgotPasswordEmailStep({
  dict,
  pending,
  error,
  onSubmit,
}: ForgotPasswordEmailStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordEmailInput>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: "" },
  });

  return (
    <Form
      onSubmit={handleSubmit((data) => onSubmit(data.email))}
      noValidate
    >
      <TextField
        type="email"
        label={dict.email}
        placeholder={dict.emailPlaceholder}
        autoComplete="email"
        labelClassName={styles.label}
        icon={Envelope}
        isInvalid={Boolean(errors.email)}
        feedback={errors.email ? dict.invalidInput : undefined}
        {...register("email")}
      />

      {error && <p className={styles.error}>{dict[error]}</p>}

      <div className={styles.actions}>
        <Button type="submit" variant="success" disabled={pending}>
          {pending && (
            <Spinner size="sm" animation="border" className="me-2" />
          )}
          {dict.forgotPasswordSubmit}
        </Button>
      </div>
    </Form>
  );
}

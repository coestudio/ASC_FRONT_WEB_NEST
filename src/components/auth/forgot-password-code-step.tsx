"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Button, Spinner } from "react-bootstrap";
import { Shield } from "react-bootstrap-icons";
import { TextField } from "@/components/ui/text-field";
import {
  verificationCodeSchema,
  type VerificationCodeInput,
} from "@/lib/validation/reset-password";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./forgot-password-form.module.css";

type ForgotPasswordCodeStepProps = {
  dict: Dictionary["auth"];
  email: string;
  pending: boolean;
  resending: boolean;
  error?: "invalidInput" | "invalidCode" | "genericError";
  resendMessage?: string;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
};

export function ForgotPasswordCodeStep({
  dict,
  email,
  pending,
  resending,
  error,
  resendMessage,
  onSubmit,
  onResend,
  onBack,
}: ForgotPasswordCodeStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationCodeInput>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: { code: "" },
  });

  return (
    <>
      <p className={styles.stepSubtitle}>
        {dict.codeSubtitle.replace("{email}", email)}
      </p>

      <Form onSubmit={handleSubmit((data) => onSubmit(data.code))} noValidate>
        <TextField
          type="text"
          label={dict.codeLabel}
          placeholder={dict.codePlaceholder}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          labelClassName={styles.label}
          icon={Shield}
          isInvalid={Boolean(errors.code) || Boolean(error)}
          feedback={
            errors.code
              ? dict.invalidInput
              : error === "invalidCode"
                ? dict.invalidCode
                : error
                  ? dict.genericError
                  : undefined
          }
          {...register("code")}
        />

        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={onResend}
            disabled={resending}
          >
            {resending && (
              <Spinner size="sm" animation="border" className="me-2" />
            )}
            {dict.resendCode}
          </button>
          {resendMessage && (
            <span className={styles.success}>{resendMessage}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline-secondary"
            onClick={onBack}
            disabled={pending}
          >
            {dict.backStep}
          </Button>
          <Button type="submit" variant="success" disabled={pending}>
            {pending && (
              <Spinner size="sm" animation="border" className="me-2" />
            )}
            {pending ? dict.codeVerifying : dict.codeSubmit}
          </Button>
        </div>
      </Form>
    </>
  );
}

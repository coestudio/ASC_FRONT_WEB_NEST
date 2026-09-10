"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Button, Spinner } from "react-bootstrap";
import { Lock } from "react-bootstrap-icons";
import { PasswordField } from "@/components/ui/password-field";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validation/reset-password";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  postApiAuthResetPasswordBodyNewPasswordMin,
  postApiAuthResetPasswordBodyNewPasswordMax,
} from "@/api/generated/zod/auth/auth.zod";
import styles from "./forgot-password-form.module.css";

type ForgotPasswordResetStepProps = {
  dict: Dictionary["auth"];
  pending: boolean;
  error?: "invalidInput" | "passwordsDontMatch" | "genericError";
  onSubmit: (newPassword: string, newPasswordConfirm: string) => void;
  onBack: () => void;
};

export function ForgotPasswordResetStep({
  dict,
  pending,
  error,
  onSubmit,
  onBack,
}: ForgotPasswordResetStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", newPasswordConfirm: "" },
  });

  return (
    <Form
      onSubmit={handleSubmit((data) =>
        onSubmit(data.newPassword, data.newPasswordConfirm)
      )}
      noValidate
    >
      <PasswordField
        label={dict.newPassword}
        placeholder={dict.newPasswordPlaceholder}
        autoComplete="new-password"
        minLength={postApiAuthResetPasswordBodyNewPasswordMin}
        maxLength={postApiAuthResetPasswordBodyNewPasswordMax}
        labelClassName={styles.label}
        icon={Lock}
        isInvalid={Boolean(errors.newPassword)}
        feedback={errors.newPassword ? dict.invalidInput : undefined}
        {...register("newPassword")}
      />

      <PasswordField
        label={dict.confirmPassword}
        placeholder={dict.confirmPasswordPlaceholder}
        autoComplete="new-password"
        labelClassName={styles.label}
        icon={Lock}
        isInvalid={Boolean(errors.newPasswordConfirm)}
        feedback={
          errors.newPasswordConfirm
            ? errors.newPasswordConfirm.message === "passwordsDontMatch"
              ? dict.passwordsDontMatch
              : dict.invalidInput
            : undefined
        }
        {...register("newPasswordConfirm")}
      />

      {error && (
        <p className={styles.error}>
          {error === "passwordsDontMatch"
            ? dict.passwordsDontMatch
            : dict[error]}
        </p>
      )}

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
          {pending ? dict.resetSubmitting : dict.resetSubmit}
        </Button>
      </div>
    </Form>
  );
}

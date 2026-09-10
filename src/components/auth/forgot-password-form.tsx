"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordEmailStep } from "@/components/auth/forgot-password-email-step";
import { ForgotPasswordCodeStep } from "@/components/auth/forgot-password-code-step";
import { ForgotPasswordResetStep } from "@/components/auth/forgot-password-reset-step";
import {
  sendResetCodeAction,
  validateResetCodeAction,
  resetPasswordAction,
  type ForgotPasswordErrorCode,
  type ValidateResetCodeErrorCode,
  type ResetPasswordErrorCode,
} from "@/app/[lang]/forgot-password/actions";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./forgot-password-form.module.css";

type ForgotPasswordFormProps = {
  dict: Dictionary["auth"];
  lang: string;
};

type Step = "email" | "code" | "reset";

const ERROR_LABELS: Record<string, string | undefined> = {};

function getErrorMessage(
  code: string | undefined,
  dict: Dictionary["auth"]
): string | undefined {
  if (!code) return undefined;
  if (ERROR_LABELS[code] !== undefined) return ERROR_LABELS[code];
  const key = code as keyof Dictionary["auth"];
  return typeof dict[key] === "string" ? (dict[key] as string) : code;
}

export function ForgotPasswordForm({ dict, lang }: ForgotPasswordFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendMessage, setResendMessage] = useState<string>();

  const [emailError, setEmailError] = useState<ForgotPasswordErrorCode>();
  const [codeError, setCodeError] = useState<ValidateResetCodeErrorCode>();
  const [resetError, setResetError] = useState<ResetPasswordErrorCode>();

  const [sendPending, startSend] = useTransition();
  const [resendPending, startResend] = useTransition();
  const [validatePending, startValidate] = useTransition();
  const [resetPending, startReset] = useTransition();

  function handleSendCode(value: string) {
    setEmailError(undefined);
    startSend(async () => {
      const result = await sendResetCodeAction(value);
      if (result.status === "success") {
        setEmail(value);
        setStep("code");
        toast.success(dict.forgotPasswordSuccess);
      } else {
        setEmailError(result.error);
        toast.error(getErrorMessage(result.error, dict) ?? dict.genericError);
      }
    });
  }

  function handleResend() {
    setResendMessage(undefined);
    startResend(async () => {
      const result = await sendResetCodeAction(email);
      if (result.status === "success") {
        setResendMessage(dict.resendCodeSent);
        toast.success(dict.resendCodeSent);
      } else {
        setCodeError(result.error);
        toast.error(getErrorMessage(result.error, dict) ?? dict.genericError);
      }
    });
  }

  function handleValidateCode(value: string) {
    setCodeError(undefined);
    startValidate(async () => {
      const result = await validateResetCodeAction(value);
      if (result.status === "success") {
        setCode(value);
        setStep("reset");
      } else {
        setCodeError(result.error);
        toast.error(getErrorMessage(result.error, dict) ?? dict.invalidCode);
      }
    });
  }

  function handleResetPassword(
    newPassword: string,
    newPasswordConfirm: string
  ) {
    setResetError(undefined);
    startReset(async () => {
      const result = await resetPasswordAction(
        code,
        newPassword,
        newPasswordConfirm
      );
      if (result.status === "success") {
        router.push(`/${lang}/login?toast=reset-success`);
      } else {
        setResetError(result.error);
        toast.error(getErrorMessage(result.error, dict) ?? dict.genericError);
      }
    });
  }

  const titles: Record<Step, { title: string; subtitle?: string }> = {
    email: {
      title: dict.forgotPasswordTitle,
      subtitle: dict.forgotPasswordSubtitle,
    },
    code: { title: dict.codeTitle },
    reset: { title: dict.resetTitle, subtitle: dict.resetSubtitle },
  };

  return (
    <AuthCard title={titles[step].title} subtitle={titles[step].subtitle}>
      {step === "email" && (
        <ForgotPasswordEmailStep
          dict={dict}
          pending={sendPending}
          error={emailError}
          onSubmit={handleSendCode}
        />
      )}

      {step === "code" && (
        <ForgotPasswordCodeStep
          dict={dict}
          email={email}
          pending={validatePending}
          resending={resendPending}
          error={codeError}
          resendMessage={resendMessage}
          onSubmit={handleValidateCode}
          onResend={handleResend}
          onBack={() => setStep("email")}
        />
      )}

      {step === "reset" && (
        <ForgotPasswordResetStep
          dict={dict}
          pending={resetPending}
          error={resetError}
          onSubmit={handleResetPassword}
          onBack={() => setStep("code")}
        />
      )}

      <div className={styles.actions}>
        <a href={`/${lang}/login`} className={styles.backLink}>
          {dict.backToLogin}
        </a>
      </div>
    </AuthCard>
  );
}

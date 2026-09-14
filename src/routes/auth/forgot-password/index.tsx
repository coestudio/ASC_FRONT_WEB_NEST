import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Spinner } from "react-bootstrap";

import {
  postApiAuthForgotPassword,
  postApiAuthValidateResetCode,
  postApiAuthResetPassword,
} from "@/api/generated/endpoints/auth/auth";
import { InputText, InputPassword } from "@/layouts/Form/Fields/Index";
import {
  forgotPasswordEmailSchema,
  verificationCodeSchema,
  newPasswordSchema,
  type ForgotPasswordEmailInput,
  type VerificationCodeInput,
  type NewPasswordInput,
} from "@/lib/validation/reset-password";

export const Route = createFileRoute("/auth/forgot-password/")({
  head: () => ({ meta: [{ title: "Recuperar senha — ASC" }] }),
  component: ForgotPasswordPage,
});

type Step = 1 | 2 | 3;

const SUBTITLES: Record<Step, string> = {
  1: "Informe seu e-mail para receber um código de verificação.",
  2: "Digite o código de 6 dígitos que enviamos.",
  3: "Escolha uma nova senha para sua conta.",
};

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const emailForm = useForm<ForgotPasswordEmailInput>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: "" },
  });
  const codeForm = useForm<VerificationCodeInput>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: { code: "" },
  });
  const pwdForm = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  return (
    <>
      <h1 className="auth-title">Recuperar senha</h1>
      <p className="auth-subtitle">{SUBTITLES[step]}</p>

      {step === 1 && (
        <Form
          noValidate
          onSubmit={emailForm.handleSubmit(async ({ email: e }) => {
            await postApiAuthForgotPassword({ email: e });
            setEmail(e);
            setStep(2);
          })}
        >
          <InputText
            methods={emailForm}
            fieldName="email"
            label="E-mail"
            placeholder="voce@empresa.com"
            config={{ containerClass: "mb-4", icon: "bi-envelope" }}
          />
          <SubmitButton loading={emailForm.formState.isSubmitting}>Enviar código</SubmitButton>
        </Form>
      )}

      {step === 2 && (
        <Form
          noValidate
          onSubmit={codeForm.handleSubmit(async ({ code }) => {
            await postApiAuthValidateResetCode({ token: code });
            setToken(code);
            setStep(3);
          })}
        >
          <p className="small text-body-secondary">
            Enviamos um código para <strong>{email}</strong>.
          </p>
          <InputText
            methods={codeForm}
            fieldName="code"
            label="Código"
            placeholder="000000"
            maxLength={6}
            config={{ containerClass: "mb-4" }}
          />
          <SubmitButton loading={codeForm.formState.isSubmitting}>Validar código</SubmitButton>
        </Form>
      )}

      {step === 3 && (
        <Form
          noValidate
          onSubmit={pwdForm.handleSubmit(async ({ newPassword, confirmPassword }) => {
            if (newPassword !== confirmPassword) {
              pwdForm.setError("confirmPassword", { message: "As senhas não coincidem" });
              return;
            }
            await postApiAuthResetPassword({
              token,
              newPassword,
              newPasswordConfirm: confirmPassword,
            });
            navigate({ to: "/auth/login", replace: true });
          })}
        >
          <InputPassword methods={pwdForm} fieldName="newPassword" label="Nova senha" />
          <InputPassword
            methods={pwdForm}
            fieldName="confirmPassword"
            label="Confirmar senha"
            config={{ containerClass: "mb-4" }}
          />
          <SubmitButton loading={pwdForm.formState.isSubmitting}>Redefinir senha</SubmitButton>
        </Form>
      )}

      <div className="text-center mt-3">
        <Link to="/auth/login" className="small text-body-secondary">
          Voltar para o login
        </Link>
      </div>
    </>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="w-100" disabled={loading}>
      {loading ? (
        <>
          <Spinner size="sm" animation="border" className="me-2" />
          Aguarde...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

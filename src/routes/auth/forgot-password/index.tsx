import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { Button, Form, Spinner } from "react-bootstrap";

import {
  postApiAuthForgotPassword,
  postApiAuthValidateResetCode,
  postApiAuthResetPassword,
} from "@/api/generated/endpoints/auth/auth";
import { PasswordField } from "@/components/ui/password-field";

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

  const emailForm = useForm<{ email: string }>({ defaultValues: { email: "" } });
  const codeForm = useForm<{ code: string }>({ defaultValues: { code: "" } });
  const pwdForm = useForm<{ newPassword: string; confirmPassword: string }>({
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
          <Form.Group className="mb-4">
            <Form.Label>E-mail</Form.Label>
            <Form.Control
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              isInvalid={!!emailForm.formState.errors.email}
              {...emailForm.register("email", { required: "Informe o e-mail" })}
            />
            <Form.Control.Feedback type="invalid">
              {emailForm.formState.errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>
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
          <Form.Group className="mb-4">
            <Form.Label>Código</Form.Label>
            <Form.Control
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              isInvalid={!!codeForm.formState.errors.code}
              {...codeForm.register("code", {
                required: "Informe o código",
                pattern: { value: /^\d{6}$/, message: "O código tem 6 dígitos" },
              })}
            />
            <Form.Control.Feedback type="invalid">
              {codeForm.formState.errors.code?.message}
            </Form.Control.Feedback>
          </Form.Group>
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
          <PasswordField
            label="Nova senha"
            autoComplete="new-password"
            isInvalid={!!pwdForm.formState.errors.newPassword}
            feedback={pwdForm.formState.errors.newPassword?.message}
            {...pwdForm.register("newPassword", { required: "Informe a senha", minLength: 6, maxLength: 100 })}
          />
          <PasswordField
            label="Confirmar senha"
            autoComplete="new-password"
            className="mb-4"
            isInvalid={!!pwdForm.formState.errors.confirmPassword}
            feedback={pwdForm.formState.errors.confirmPassword?.message}
            {...pwdForm.register("confirmPassword", { required: "Confirme a senha" })}
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

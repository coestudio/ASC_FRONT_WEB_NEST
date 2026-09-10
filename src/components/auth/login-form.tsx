"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Button, Spinner } from "react-bootstrap";
import { Envelope, Lock } from "react-bootstrap-icons";
import { toast } from "react-toastify";
import { loginAction, type LoginState } from "@/app/[lang]/login/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { loginSchema, type LoginInput } from "@/lib/validation/login";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  postApiAuthLoginBodyUserNameMin,
  postApiAuthLoginBodyUserNameMax,
  postApiAuthLoginBodyPasswordMin,
  postApiAuthLoginBodyPasswordMax,
} from "@/api/generated/zod/auth/auth.zod";
import styles from "./login-form.module.css";

type LoginFormProps = {
  callbackUrl: string;
  dict: Dictionary["auth"];
  lang: string;
};

export function LoginForm({ callbackUrl, dict, lang }: LoginFormProps) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (state?.error) {
      toast.error(dict[state.error]);
    }
  }, [state, dict]);

  function onValid(data: LoginInput) {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("callbackUrl", callbackUrl);
    startTransition(() => action(formData));
  }

  function onSuperLogin() {
    const formData = new FormData();
    formData.set("superLogin", "true");
    formData.set("callbackUrl", callbackUrl);
    startTransition(() => action(formData));
  }

  return (
    <AuthCard title={dict.welcomeBack} subtitle={dict.subtitle}>
      <Form onSubmit={handleSubmit(onValid)} noValidate>
        <TextField
          type="email"
          label={dict.email}
          placeholder={dict.emailPlaceholder}
          autoComplete="email"
          minLength={postApiAuthLoginBodyUserNameMin}
          maxLength={postApiAuthLoginBodyUserNameMax}
          labelClassName={styles.label}
          icon={Envelope}
          isInvalid={Boolean(errors.email)}
          feedback={errors.email ? dict.invalidInput : undefined}
          {...register("email")}
        />

        <PasswordField
          label={dict.password}
          placeholder={dict.passwordPlaceholder}
          autoComplete="current-password"
          minLength={postApiAuthLoginBodyPasswordMin}
          maxLength={postApiAuthLoginBodyPasswordMax}
          labelClassName={styles.label}
          icon={Lock}
          isInvalid={Boolean(errors.password)}
          feedback={errors.password ? dict.invalidInput : undefined}
          labelAction={
            <a href={`/${lang}/forgot-password`} className={styles.forgotLink}>
              {dict.forgotPassword}
            </a>
          }
          {...register("password")}
        />

        {state?.error && <p className={styles.error}>{dict[state.error]}</p>}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="success"
            onClick={onSuperLogin}
            disabled={pending}
          >
            {dict.superLogin}
          </Button>
          <Button type="submit" variant="success" disabled={pending}>
            {pending && (
              <Spinner size="sm" animation="border" className="me-2" />
            )}
            {pending ? dict.submitting : dict.submit}
          </Button>
        </div>
      </Form>
    </AuthCard>
  );
}

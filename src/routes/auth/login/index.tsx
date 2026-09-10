import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Button, Form, Spinner } from "react-bootstrap";

import type { AuthControllerLoginRequest } from "@/api/generated/model";
import { loginFn } from "@/lib/auth-fns";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { PasswordField } from "@/components/ui/password-field";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/auth/login/")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Entrar — ASC" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthControllerLoginRequest>({
    defaultValues: { userName: "", password: "" },
  });

  const onSubmit = async (data: AuthControllerLoginRequest) => {
    try {
      const { user } = await loginFn({ data });
      queryClient.setQueryData(profileMeQueryOptions().queryKey, user);
      await router.invalidate();
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    }
  };

  return (
    <>
      <h1 className="auth-title">Bem-vindo de volta</h1>
      <p className="auth-subtitle">Acesse o portal interno.</p>

      <Form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Form.Group className="mb-3">
          <Form.Label>Usuário</Form.Label>
          <Form.Control
            type="text"
            autoComplete="username"
            placeholder="Seu usuário"
            isInvalid={!!errors.userName}
            {...register("userName", { required: "Informe o usuário", minLength: 3, maxLength: 150 })}
          />
          <Form.Control.Feedback type="invalid">{errors.userName?.message}</Form.Control.Feedback>
        </Form.Group>

        <PasswordField
          label="Senha"
          autoComplete="current-password"
          placeholder="Sua senha"
          className="mb-4"
          isInvalid={!!errors.password}
          feedback={errors.password?.message}
          labelAction={
            <Link to="/auth/forgot-password" className="small text-body-secondary">
              Esqueci minha senha
            </Link>
          }
          {...register("password", { required: "Informe a senha", minLength: 6, maxLength: 100 })}
        />

        <Button type="submit" className="w-100" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </Form>
    </>
  );
}

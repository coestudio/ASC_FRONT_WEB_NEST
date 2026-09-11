import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Button, Form, Spinner } from "react-bootstrap";

import { loginFn } from "@/lib/auth-fns";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { loginSchema, type LoginInput } from "@/lib/validation/login";
import { InputText, InputPassword } from "@/layouts/Form/Fields/Index";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/auth/login/")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Entrar — ASC" }] }),
  component: LoginPage,
});

// Super login (credenciais de teste) — só aparece quando as duas vars estão
// definidas no build. Nomes versionados em .env (valor vazio); valor real de
// dev vai em .env.local (gitignored).
const SUPER_LOGIN_USER = import.meta.env.VITE_SUPER_LOGIN_USER;
const SUPER_LOGIN_PASSWORD = import.meta.env.VITE_SUPER_LOGIN_PASSWORD;
const hasSuperLogin = !!SUPER_LOGIN_USER && !!SUPER_LOGIN_PASSWORD;

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userName: "", password: "" },
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data: LoginInput) => {
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
        <InputText
          methods={methods}
          fieldName="userName"
          label="Usuário"
          placeholder="Seu usuário"
          config={{ containerClass: "mb-3", icon: "bi-person" }}
        />

        {/* Wrapper com posição relativa pra alinhar "Esqueceu a senha?" na
            mesma linha da label SENHA (SPEC-11 revisão 2, item 6). */}
        <div className="auth-password-wrap position-relative mb-4">
          <Link to="/auth/forgot-password" className="auth-forgot-link small">
            Esqueceu a senha?
          </Link>
          <InputPassword
            methods={methods}
            fieldName="password"
            label="Senha"
            config={{ icon: "bi-lock" }}
          />
        </div>

        {hasSuperLogin && (
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() =>
              onSubmit({
                userName: SUPER_LOGIN_USER,
                password: SUPER_LOGIN_PASSWORD,
              })
            }
            className="w-100 mb-2"
            disabled={isSubmitting}
          >
            Super login
          </Button>
        )}

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

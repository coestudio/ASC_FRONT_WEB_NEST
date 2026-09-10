"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validation/login";

// error é um código, não texto — a página traduz via dicionário do idioma atual.
export type LoginState =
  | { error?: "invalidCredentials" | "invalidInput" }
  | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const callbackUrl = String(formData.get("callbackUrl") || "/");

  // Adiciona toast=welcome na URL de redirect para mostrar toast pós-login
  const url = new URL(callbackUrl, "http://localhost");
  url.searchParams.set("toast", "welcome");
  const redirectUrl = url.pathname + url.search;

  if (formData.get("superLogin") === "true") {
    const userName = process.env.SUPER_LOGIN_USER;
    const password = process.env.SUPER_LOGIN_PASSWORD;

    if (!userName || !password) {
      console.error(
        "SUPER_LOGIN_USER/SUPER_LOGIN_PASSWORD não configurados no ambiente."
      );
      return { error: "invalidCredentials" };
    }

    return runSignIn(userName, password, redirectUrl, true);
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalidInput" };
  }

  return runSignIn(parsed.data.email, parsed.data.password, redirectUrl);
}

async function runSignIn(
  email: string,
  password: string,
  callbackUrl: string,
  isSuperLogin = false
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email,
      password,
      superLogin: isSuperLogin ? "true" : undefined,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "invalidCredentials" };
    }
    throw error;
  }
}

"use server";

import axios from "axios";
import { coreClient } from "@/lib/core-client";
import {
  forgotPasswordEmailSchema,
  resetPasswordSchema,
  verificationCodeSchema,
} from "@/lib/validation/reset-password";

// error é um código, não texto — a página traduz via dicionário do idioma
// atual (mesmo padrão de src/app/[lang]/login/actions.ts). Nunca expor
// mensagem crua do Core pro usuário.
export type ForgotPasswordErrorCode = "invalidInput" | "genericError";

export type ValidateResetCodeErrorCode =
  | "invalidInput"
  | "invalidCode"
  | "genericError";

export type ResetPasswordErrorCode =
  | "invalidInput"
  | "passwordsDontMatch"
  | "genericError";

export type ForgotPasswordState =
  | { status: "success" }
  | { status: "error"; error: ForgotPasswordErrorCode };

export type ValidateResetCodeState =
  | { status: "success" }
  | { status: "error"; error: ValidateResetCodeErrorCode };

export type ResetPasswordState =
  | { status: "success" }
  | { status: "error"; error: ResetPasswordErrorCode };

export async function sendResetCodeAction(
  email: string
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordEmailSchema.safeParse({ email });

  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    await coreClient.post("/api/auth/forgot-password", {
      email: parsed.data.email,
    });
    return { status: "success" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      // Backend responde 400 tanto pra email malformado quanto (por design,
      // pra não revelar se o email existe) pra email não encontrado — em
      // ambos os casos o passo seguinte já trata como "reenviar" possível.
      return { status: "error", error: "invalidInput" };
    }
    return { status: "error", error: "genericError" };
  }
}

export async function validateResetCodeAction(
  code: string
): Promise<ValidateResetCodeState> {
  const parsed = verificationCodeSchema.safeParse({ code });

  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    await coreClient.post("/api/auth/validate-reset-code", {
      token: parsed.data.code,
    });
    return { status: "success" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return { status: "error", error: "invalidCode" };
    }
    return { status: "error", error: "genericError" };
  }
}

export async function resetPasswordAction(
  token: string,
  newPassword: string,
  newPasswordConfirm: string
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword,
    newPasswordConfirm,
  });

  if (!parsed.success) {
    const isMismatch = parsed.error.issues.some(
      (issue) => issue.message === "passwordsDontMatch"
    );
    return {
      status: "error",
      error: isMismatch ? "passwordsDontMatch" : "invalidInput",
    };
  }

  try {
    await coreClient.post("/api/auth/reset-password", {
      token,
      newPassword: parsed.data.newPassword,
      newPasswordConfirm: parsed.data.newPasswordConfirm,
    });
    return { status: "success" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return { status: "error", error: "invalidInput" };
    }
    return { status: "error", error: "genericError" };
  }
}

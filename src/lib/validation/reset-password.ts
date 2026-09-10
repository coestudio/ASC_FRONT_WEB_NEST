import { z } from "zod";
import { PostApiAuthResetPasswordBody } from "@/api/generated/zod/auth/auth.zod";

/**
 * Validação do passo 3 do fluxo de recuperação de senha (nova senha +
 * confirmação) — reaproveita min/max de `newPassword` do DTO do Core
 * (mesmo padrão de src/lib/validation/login.ts) e adiciona a checagem de
 * que as duas senhas digitadas coincidem, que é puramente client-side.
 */
export const resetPasswordSchema = z
  .object({
    newPassword: PostApiAuthResetPasswordBody.shape.newPassword,
    newPasswordConfirm: PostApiAuthResetPasswordBody.shape.newPasswordConfirm,
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "passwordsDontMatch",
    path: ["newPasswordConfirm"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Validação do passo 2 (código de verificação de 6 dígitos).
 */
export const verificationCodeSchema = z.object({
  code: z.string().length(6),
});

export type VerificationCodeInput = z.infer<typeof verificationCodeSchema>;

/**
 * Validação do passo 1 (email).
 */
export const forgotPasswordEmailSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;

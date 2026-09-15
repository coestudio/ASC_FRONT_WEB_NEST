import { z } from "zod";

import {
  PostApiAuthForgotPasswordBody,
  PostApiAuthValidateResetCodeBody,
  PostApiAuthResetPasswordBody,
} from "@/api/generated/zod/auth/auth.zod";

/**
 * Validação do fluxo de recuperação de senha — um schema por etapa, cada um
 * remapeando o shape do schema gerado equivalente (regra 2 do AGENTS.md, só
 * `Xxx.shape.campo`, sem `.refine`/regra nova).
 */

/** Passo 1 — e-mail. */
export const forgotPasswordEmailSchema = z.object({
  email: PostApiAuthForgotPasswordBody.shape.email,
});
export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;

/** Passo 2 — código de verificação (campo do Core é `token`; a tela chama de `code`). */
export const verificationCodeSchema = z.object({
  code: PostApiAuthValidateResetCodeBody.shape.token,
});
export type VerificationCodeInput = z.infer<typeof verificationCodeSchema>;

/**
 * Passo 3 — nova senha + confirmação. A comparação entre as duas fica FORA
 * do schema (regra 2 proíbe `.refine` de regra de negócio em
 * `src/lib/validation/*`) — é validação manual no `onSubmit` da tela, com
 * `setError("confirmPassword", ...)` quando os valores não baterem.
 */
export const newPasswordSchema = z.object({
  newPassword: PostApiAuthResetPasswordBody.shape.newPassword,
  confirmPassword: PostApiAuthResetPasswordBody.shape.newPasswordConfirm,
});
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

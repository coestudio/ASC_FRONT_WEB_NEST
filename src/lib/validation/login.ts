import { z } from "zod";
import { PostApiAuthLoginBody } from "@/api/generated/zod/auth/auth.zod";

/**
 * Validação do form de login — reaproveita as regras (min/max) do schema
 * gerado pelo Orval a partir do DTO do Core (`AuthControllerLoginRequest`,
 * ver orval.config.ts / just map). Sem `.refine` nem regra nova: só remapeia
 * o shape (regra 2 do AGENTS.md). `userName` não é e-mail — o Core aceita
 * usuário genérico (ex. "SuperAdmin").
 */
export const loginSchema = z.object({
  userName: PostApiAuthLoginBody.shape.userName,
  password: PostApiAuthLoginBody.shape.password,
});

export type LoginInput = z.infer<typeof loginSchema>;

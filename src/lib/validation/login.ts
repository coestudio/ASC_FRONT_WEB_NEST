import { z } from "zod";
import { PostApiAuthLoginBody } from "@/api/generated/zod/auth/auth.zod";

/**
 * Validação do form de login — reaproveita as regras (min/max) do próprio
 * DTO do Core (`AuthControllerLoginRequest`, gerado por `just map` a partir
 * do OpenAPI, ver orval.config.ts). O Core chama o campo de `userName`; a UI
 * usa `email`, então só remapeamos o shape, sem reescrever a regra.
 *
 * O login em si ainda é local (next-auth Credentials, ver src/auth.ts) — isso
 * só garante que o formato exigido no input já bate com o que o backend vai
 * exigir quando o login passar a chamar o Core de verdade.
 */
export const loginSchema = z.object({
  email: PostApiAuthLoginBody.shape.userName,
  password: PostApiAuthLoginBody.shape.password,
});

export type LoginInput = z.infer<typeof loginSchema>;

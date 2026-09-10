import "dotenv/config";
import { defineConfig } from "orval";

/**
 * Geração do client de API a partir do contrato OpenAPI do Core.
 *
 * Fonte: o documento servido em runtime por `AddCoreOpenApi()` em `warren/Core`
 * (`{API_URL}/api/openapi/v1.json`, OpenAPI 3.1). A URL vem de `API_URL` no
 * `.env` — o Core precisa estar no ar pra rodar `just map` (mesmo padrão do
 * `warren/Portal`, ver `warren/Portal/orval.config.ts`).
 *
 * Saídas (todas 100% geradas — NUNCA editar à mão):
 *  - `src/api/generated/endpoints/**` — hooks TanStack Query (client
 *    `react-query`, transporte `axios` via `src/api/mutator.ts`). Rodam no
 *    browser — usam `VITE_API_URL` em runtime.
 *  - `src/api/generated/model/**`    — tipos TypeScript dos DTOs/ViewModels.
 *  - `src/api/generated/zod/**`      — schemas `zod` (validação de input),
 *    fonte de verdade das regras que já existem nos DTOs do backend — ver
 *    `src/lib/validation/*.ts`.
 *  - `src/api/generated/static/**`   — gerado por `scripts/staticSnapshots.ts`
 *    (snapshots `x-snapshot` de rotas de enum estáticas, ver justfile → `map`).
 *
 * Login e o fluxo de "esqueci a senha" devem passar por server functions do
 * TanStack Start (com `API_URL` server-only), pra nunca expor essas chamadas
 * sensíveis ao browser — essa camada ainda está pendente. Os hooks
 * react-query gerados aqui servem pras telas de leitura/listagem de dados
 * que rodem client-side.
 *
 * O Core ainda não define `operationId` nas actions — os nomes gerados saem de
 * verbo+rota (ex.: `getApiProduct`, `usePostApiProduct`).
 */

const apiUrl = process.env.API_URL;

if (!apiUrl) {
  throw new Error("API_URL ausente — defina em .env (ver .env.exemple).");
}

const openApiUrl = `${apiUrl.replace(/\/$/, "")}/api/openapi/v1.json`;

export default defineConfig({
  api: {
    input: {
      target: openApiUrl,
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated/endpoints",
      schemas: "./src/api/generated/model",
      client: "react-query",
      httpClient: "axios",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/mutator.ts",
          name: "apiRequest",
        },
        query: {
          // Default do Orval: GET → useQuery, POST/PUT/PATCH/DELETE → useMutation.
          signal: true,
        },
      },
    },
  },
  zod: {
    input: {
      target: openApiUrl,
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated/zod",
      client: "zod",
      fileExtension: ".zod.ts",
      clean: true,
    },
  },
});

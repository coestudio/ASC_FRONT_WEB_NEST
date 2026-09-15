---
applyTo: "src/api/**,src/lib/queries/**"
description: "Use ao mexer no client de API gerado, no transporte, no proxy BFF ou nas query options. Fixa o que é gerado (read-only), os três caminhos de chamada ao Core e o padrão de queryKey."
---

# API / Data Instructions

## O que é gerado — não editar

- `src/api/generated/endpoints/**` — hooks TanStack Query.
- `src/api/generated/model/**` — tipos de DTO / ViewModel do Core.
- `src/api/generated/zod/**` — schemas zod (regras min/max dos DTOs).
- `src/api/generated/static/**` — snapshots de rotas de enum estáticas.
- `src/api/snapshot.json` — marcador de hash do contrato.

Tudo isso sai de `just map` (`orval` + `scripts/staticSnapshots.ts` + `tsc`).
Fonte: `{API_URL}/api/openapi/v1.json` do `warren/Core` no ar. **Nunca** editar
à mão, nunca commitar edição manual. Se precisa de um endpoint que não existe
no client, o endpoint precisa existir no Core primeiro.

O Core ainda não define `operationId` — nomes saem de verbo+rota
(`getApiProduct`, `usePostApiProduct`).

## Três caminhos de chamada ao Core

1. **Hook Orval (client, leitura)** — telas de listagem/consulta. Passa pelo
   `src/api/mutator.ts` → `fetch("/api/core")` com header `x-core-path`.
2. **Proxy BFF `src/routes/api/core.ts`** — server route de path fixo. Lê a
   sessão selada, anexa `Authorization: Bearer`, repassa em stream. Checa
   CSRF (mesma origem) em `POST/PUT/PATCH/DELETE`. Em 401 do Core, devolve
   `Set-Cookie` que expira `asc_session`. Não colocar regra de negócio aqui.
3. **Server function (`createServerFn`)** — login, forgot-password, seed de
   identidade no SSR. Usa `coreClient` (`src/lib/core-client.ts`, axios com
   `API_URL` server-only). É o único jeito de chamar o Core autenticado no
   SSR — o `mutator` faz `throw` fora do browser de propósito.

## queryKey e query options

- Query option isolada vai em `src/lib/queries/<recurso>.ts` como
  `xxxQueryOptions()` retornando `queryOptions({ ... })`.
- A `queryKey` é **o path do Core** (`["/api/profile/me"]`) — a mesma que o
  hook gerado usa, para o cache ser compartilhado entre o hook e o seed do
  SSR.
- `staleTime` alto (minutos) para dados de identidade/enum — navegação
  client-side não deve refetch.
- Seed no SSR: `__root.loader` / `beforeLoad` da rota chamam a server fn e
  `queryClient.setQueryData(xxxQueryOptions().queryKey, data)`.

## Transporte / erros (`mutator.ts`)

- `apiRequest` é a assinatura que o Orval espera (`httpClient: "axios"`),
  resolve com o corpo já desembrulhado.
- O interceptor de resposta já: mostra `toast.success` quando o corpo é
  string; em 401 redireciona pro login; traduz `ProblemDetails`/EF Core pra
  PT-BR; `toast.warning` em 4xx, `toast.error` em 5xx/rede. Não duplicar esse
  tratamento nas telas — só tratar o que for específico da tela.

## Formulário — sempre `react-hook-form` + `zodResolver` + `layouts/Form/Fields`

Regra inviolável (dupla): todo formulário usa `useForm` (`react-hook-form`)
com `zodResolver(schema)` (`@hookform/resolvers/zod`, já é dependência)
sobre um schema Zod **gerado** (ou remapeado — seção abaixo); e todo campo
vem de `src/layouts/Form/Fields/**` (`Controller`-based), nunca `<input>`
cru nem `register(...)` direto num `<Form.Control>`. Ver
`.github/instructions/components.instructions.md` pra biblioteca de campos.

```tsx
const methods = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

<InputEmail fieldName="email" methods={methods} label="Email" />
<InputPassword fieldName="password" methods={methods} label="Senha" />
```

`src/routes/auth/{login,forgot-password}` ainda usam `register(...)` com
regras soltas sobre `<Form.Control>`/`components/ui/input` (débito anterior
a estas regras) — a correção é escopo de
`specs/02-app-shell-navigation/spec.md`, não copiar esse padrão em tela nova.

## Validação de formulário — Zod é gerado, nunca escrito

- **Proibido criar ou editar schema Zod.** Os únicos válidos são os de
  `src/api/generated/zod/**` (saída do Orval).
- `src/lib/validation/*.ts` só pode **remapear o shape** reusando os schemas
  gerados: `z.object({ email: PostApiAuthLoginBody.shape.userName, ... })`.
  Nada de `z.string().min(...)` escrito à mão, nada de novo `.refine`,
  `.regex`, `.transform` de regra de negócio.
- Regra de validação que precisa mudar (novo limite, novo formato, campo
  obrigatório) → muda no **DTO/ViewModel do Core**, volta pelo `just map`.
  No front isso é `[NEEDS_DECISION]`: consultar o back-end.

# SPEC-13 — Nomeação clara dos snapshots estáticos de enum

- **ID:** SPEC-13
- **Nome:** static-enum-snapshot-naming
- **Status:** WAITING_APPROVAL
- **Autor:** portal-dev-agent
- **Área:** `scripts/staticSnapshots.ts`, `src/api/generated/static/**`
  (saída gerada)
- **Depende de:** `warren/Core/specs/00-enum-contract/spec.md`
  (`WAITING_APPROVAL`) — precisa estar `IMPLEMENTED` primeiro: esta SPEC
  consome o campo `x-enum-name` que o Core passa a embutir na extensão
  `x-snapshot` (ver lá §8.3). Sem isso, não há fonte de nome confiável pra
  consumir.

---

## 1. Objetivo

Trocar o nome dos arquivos/consts gerados por `scripts/staticSnapshots.ts`
(hoje derivado do verbo+path da rota) pelo nome real do enum C# do Core, e
gerar junto um mapa por chave + um helper de resolução de label — elimina
uma colisão de nome real e mata a necessidade de cada tela reimplementar
"achar o label certo pro idioma atual".

## 2. Contexto

Achado durante revisão de `src/api/generated/static/getApiUserTypes.ts`
(sessão de 2026-09-11, ver `warren/Core/specs/00-enum-contract/spec.md`
§2.3 pro relato completo): `src/api/generated/endpoints/user/user.ts`
(saída normal do Orval) já exporta `export const getApiUserTypes = (...)`
— a função real que chama `GET /api/user/types` ao vivo. O gerador de
snapshot estático exporta, num arquivo **diferente**,
`export const getApiUserTypes: EnumOptionDTO[] = [...]` — o array pronto,
**mesmo identificador**, coisa completamente diferente (dado vs. função),
só distinguível pelo caminho do import.

Causa raiz: `operationName(method, path)` em `scripts/staticSnapshots.ts`
deriva o nome só do path da rota (`GET /api/user/types` → `getApiUserTypes`),
sem nenhuma ligação com o nome do enum C# real (`UserType`). O padrão
`resolveEnumOptionName` (achado em `admin/access/index.tsx`, ver
`warren/Core/specs/00-enum-contract/spec.md` e a revisão de
`specs/03-admin-access/spec.md`) é sintoma do mesmo problema: sem um jeito
central e claro de resolver "código → label no idioma atual", cada tela
reimplementa.

## 3. Escopo

1. **Nome derivado de `x-enum-name`, não do path** — em vez de
   `operationName(method, path)`, o arquivo/const nasce
   `camelCase(x-enum-name)` + sufixo `Options` — ex. `userTypeOptions`,
   `userRoleOptions`, `operationStatusOptions`, `documentTypeOptions`. Sem
   `get`/`use` no nome (não é ação, é dado) e sem qualquer chance de
   colidir com nome de hook do Orval (que sempre carrega o verbo).
2. **Mapa por `Key`, não só array** — `export const userTypeOptionsByKey:
Record<string, EnumOptionDTO> = { Internal: {...}, External: {...} }`,
   construído a partir do array (`Object.fromEntries(list.map(o =>
[o.key, o]))`) — resolve lookup O(1) em vez de `.find()` em toda tela.
3. **Helper de resolução gerado junto** —
   `export function resolveUserTypeLabel(key: string, locale: Locale):
string { return userTypeOptionsByKey[key]?.name[locale] ?? key; }`
   (`Locale` importado de `@/i18n/config`, já que as chaves de `name`
   batem 1:1 com `Locale` depois de `warren/Core/specs/00-enum-contract`
   alinhar `Langs`). Elimina a necessidade de qualquer tela reimplementar
   "achar o label certo pro idioma atual".
4. Arquivo `index.ts` (barrel) e nome de arquivo seguem o mesmo padrão
   (`userTypeOptions.ts`, não `getApiUserTypes.ts`).
5. **Remover `resolveEnumOptionName`** (`admin/access/index.tsx`) — passa a
   usar o helper gerado (`resolveUserTypeLabel`) no lugar do shim local.

## 4. Fora do escopo

- Qualquer mudança no Core além de consumir `x-enum-name` (já entregue por
  `warren/Core/specs/00-enum-contract/spec.md`).
- Mudança de shape de `EnumOptionDTO` — já definido pelo Core.
- Cobertura de enum novo (`warren/Core/specs/01-enum-coverage/spec.md`) —
  esta SPEC só muda **como** o que já existe é nomeado/consumido, não
  amplia a lista de enums cobertos.

## 5. Requisitos funcionais

- **RF1** — Todo arquivo em `src/api/generated/static/**` nasce nomeado
  pelo enum C# real (`x-enum-name`), não pelo path da rota.
- **RF2** — Nenhum nome gerado por este script colide com nome de hook do
  Orval (`useGetApiXxx`) ou função de chamada real (`getApiXxx`).
- **RF3** — `admin/access/index.tsx` usa o helper gerado, não
  `resolveEnumOptionName`.

## 6. Requisitos não funcionais

- **RNF1** — `bun run check` + `bun run lint` passam.
- **RNF2** — Nomes de arquivo em inglês, comentário em PT-BR (regras 6/7
  do `AGENTS.md`).
- **RNF3** — Script continua idempotente (rodar de novo não duplica nem
  deixa lixo — já tem remoção de órfãos, manter).

## 7. Desenho

```ts
// scripts/staticSnapshots.ts — trecho relevante, substitui operationName()
function enumOptionName(xEnumName: string): string {
  return xEnumName.charAt(0).toLowerCase() + xEnumName.slice(1) + "Options";
}

// body do arquivo gerado, por rota com x-snapshot:
const body =
  `// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de ${method.toUpperCase()} ${path}\n` +
  `// Rota estática (dados só mudam em restart da API). NÃO editar à mão.\n` +
  `import type { EnumOptionDTO } from "../model";\n` +
  `import type { Locale } from "@/i18n/config";\n\n` +
  `export const ${name}: EnumOptionDTO[] = ${JSON.stringify(snapshot, null, 2)};\n\n` +
  `export const ${name}ByKey: Record<string, EnumOptionDTO> = Object.fromEntries(\n` +
  `  ${name}.map((o) => [o.key, o]),\n` +
  `);\n\n` +
  `export function resolve${pascal(xEnumName)}Label(key: string, locale: Locale): string {\n` +
  `  return ${name}ByKey[key]?.name[locale] ?? key;\n` +
  `}\n`;
```

Se `x-enum-name` estiver ausente (Core ainda não implementou
`00-enum-contract`, ou uma rota `x-snapshot` sem enum por trás — não deveria
existir, mas defensivo): cair de volta no nome por path atual
(`operationName`), sem quebrar o script — migração incremental, não
big-bang forçado no gerador.

## 8. Contrato de rota

N/A — não cria nem altera rota, só o gerador de código estático.

## 9. Camada de dados

N/A.

## 10. Arquivos esperados

| Arquivo                                        | Ação                                                            |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `scripts/staticSnapshots.ts`                   | editar — nova função de nome, mapa `ByKey`, helper de resolução |
| `src/api/generated/static/*.ts`                | regenerado (saída do script, não editar à mão)                  |
| `src/routes/_dashboard/admin/access/index.tsx` | editar — remove `resolveEnumOptionName`, usa o helper gerado    |

## 11. Critérios de aceitação

| #   | Critério                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 | Depois de `just map` contra um Core com `00-enum-contract` implementado, `src/api/generated/static/userTypeOptions.ts` existe (não `getApiUserTypes.ts`) |
| CA2 | `grep -rn "export const getApiUserTypes" src/api/generated/static` → vazio (zero colisão de nome com o hook do Orval)                                    |
| CA3 | `userTypeOptionsByKey["Internal"]` resolve o objeto certo, `resolveUserTypeLabel("Internal", "en")` devolve `"Internal"`                                 |
| CA4 | `grep -rn "resolveEnumOptionName" src` → vazio                                                                                                           |
| CA5 | `bun run check` + `bun run lint` passam                                                                                                                  |

## 12. Riscos

- **R1** — `x-enum-name` ausente numa rota `x-snapshot` (Core desatualizado
  ou caso não previsto) — mitigação: fallback pro nome por path (§7),
  script nunca quebra por falta do campo.

## 13. Decisões

Nenhuma pendente — desenho já resolvido em conjunto com
`warren/Core/specs/00-enum-contract/spec.md` §11 (mesma sessão).

---

**Próximo passo:** `warren/Core/specs/00-enum-contract/spec.md` precisa
estar `IMPLEMENTED` primeiro (senão não há `x-enum-name` pra consumir).
Usuário responde `APROVAR SPEC-13`.

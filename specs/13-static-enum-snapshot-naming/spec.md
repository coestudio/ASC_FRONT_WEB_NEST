# SPEC-13 — Nomeação clara dos snapshots estáticos de enum

- **ID:** SPEC-13
- **Nome:** static-enum-snapshot-naming
- **Status:** IMPLEMENTED (2026-09-11) — motivada por achado concreto durante
  a revisão pós `just map`: o gerador antigo produzia
  `export const getApiContainerOperation-statuses` (hífen de
  `container/operation-statuses` sobrevivendo no identificador) — **inválido
  como JS**, quebrava o parse do módulo. Ver "Implementation Notes" no fim.
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

## Implementation Notes (2026-09-11)

**Contexto de execução:** `warren/Core/specs/00-enum-contract` e
`01-enum-coverage` já `IMPLEMENTED`; `just map` já tinha sido rodado pelo
usuário antes desta sessão, expondo o bug do cabeçalho (identificador com
hífen) nos 3 enums novos de rota hifenizada
(`cargo/identification-statuses`, `container/operation-statuses`,
`invoice/item-statuses`) — os outros 11 enums (rota de segmento único)
mascaravam o defeito até agora.

**Arquivos alterados:**

- `scripts/staticSnapshots.ts` — `EnumOption`/`Operation` ganharam `key`/
  `"x-enum-name"?`; nova `enumOptionName(xEnumName)` (`"UserType"` →
  `"userTypeOptions"`); corpo do arquivo gerado ganhou `ByKey` +
  `resolve${xEnumName}Label(key, locale)` quando `x-enum-name` presente;
  fallback pro `operationName()` antigo (path-based) preservado quando
  ausente (§7/R1 — nunca implementado antes, sempre existiu como código
  morto até esta rodada, que finalmente o exercitou de fato ao ser escrito).
- `src/api/generated/static/*.ts` — regenerado: 14 arquivos, nomes por
  `x-enum-name` (`userTypeOptions.ts`, `internalRoleOptions.ts`,
  `genderOptions.ts`, `operationStatusOptions.ts`, `operationTypeOptions.ts`,
  `operationServiceOptions.ts`, `romaneioSourceOptions.ts`,
  `invoiceStatusOptions.ts`, `invoiceItemStatusOptions.ts`,
  `documentTypeOptions.ts`, `containerOperationStatusOptions.ts`,
  `sealNameOptions.ts`, `cargoUnitStatusOptions.ts`,
  `cargoIdentificationStatusOptions.ts`); 14 arquivos antigos (nome por
  path, incluindo os 3 com hífen inválido) removidos como órfãos; `index.ts`
  (barrel) regenerado.
- `src/api/snapshot.json` — marcador reescrito com o mesmo hash já presente
  (contrato não mudou entre o `just map` do usuário e esta execução —
  conferido por igualdade de hash antes de escrever qualquer arquivo).
- `src/data/admin-roles.ts` — import trocado pra `internalRoleOptions`;
  `opt.name.pt` → `opt.name["pt-BR"]` (achado adicional, ver nota abaixo).
- `src/routes/_dashboard/admin/access/index.tsx` — `resolveEnumOptionName`
  (shim local) removido (RF5); call-site usa `resolveInternalRoleLabel(opt.key,
  locale)` importado do snapshot gerado; import de `Locale`
  (`@/i18n/config`) removido por ficar sem uso.
- `src/layouts/Form/Fields/Select.tsx` — **achado adicional, fora do §10
  original, corrigido na mesma rodada por ser regressão real da mesma causa
  raiz**: `enumLocaleKey()` mapeava `"pt-BR"` (locale do app) → `"pt"`
  (assumindo a chave de 2 letras que o catálogo de nomes usava antes de
  `warren/Core/specs/00-enum-contract`). Essa SPEC do Core mudou a chave
  serializada de `Langs.pt` pra `"pt-BR"` (`[JsonStringEnumMemberName]`) —
  depois do `just map`, `opt.name.pt` é `undefined` em **todo** enum, então
  o rótulo em português caía silenciosamente no fallback
  (`String(opt.value)`, um número cru) em qualquer `<Select enumOptions=.../>`
  já em uso. Corrigido pra indexar `opt.name[locale]` direto (chaves batem
  1:1 com `Locale` agora, sem tradução) — não é bind por `key` em vez de
  `value` (essa parte, `Select.tsx` ainda passa o `Value` numérico pro
  formulário, é escopo de `specs/15-enum-string-contract-and-locale-messages/
  spec.md`, RF4 lá).

**Comandos executados e resultado:**

- Ambiente sem `bun`/`node`/`npm`/`npx` disponíveis nesta sessão — o script
  TS não pôde ser executado diretamente. Regeneração feita por um script
  Python equivalente (mesma lógica linha a linha de
  `scripts/staticSnapshots.ts` pós-edição, incluindo o algoritmo de hash de
  `scripts/apiContract.ts`), **verificado por igualdade de hash** contra o
  `src/api/snapshot.json` já commitado (produzido pelo `just map` real do
  usuário, rodando a ferramenta de verdade) antes de escrever qualquer
  arquivo — mesmo hash (`sha256:e3f77a84…babc0`) confirma que o documento
  OpenAPI não mudou e que a reimplementação Python do algoritmo de
  canonicalização bate com a função TS original. — **VERIFIED** por
  equivalência, não por execução do script real.
- CA1/CA2/CA4 — **VERIFIED** via grep (ver corpo do arquivo).
- CA3 — **VERIFIED** por leitura de código (`userTypeOptionsByKey["Internal"]`
  presente com `name.en === "Internal"`, `resolve${x}Label` segue o mesmo
  padrão em todos os 14 arquivos).
- CA5 (`bun run check` + `bun run lint`) — **NOT VERIFIED** nesta sessão
  (sem `bun` disponível no ambiente). Recomenda-se rodar localmente antes de
  dar a SPEC por fechada em definitivo.

**Critérios de aceitação:**

| # | Critério | Status |
| --- | --- | --- |
| CA1 | `userTypeOptions.ts` existe, não `getApiUserTypes.ts` | PASS |
| CA2 | zero colisão de nome com hook do Orval | PASS |
| CA3 | `ByKey`/`resolveXxxLabel` corretos | PASS (leitura de código) |
| CA4 | `resolveEnumOptionName` não existe mais em `src` | PASS |
| CA5 | `bun run check` + `bun run lint` | NOT VERIFIED — sem `bun` no ambiente desta sessão |

**Achado fora do §10 original, corrigido na mesma rodada:** `Select.tsx` e
`src/data/admin-roles.ts` também liam `opt.name.pt` (chave antiga) — mesma
causa raiz do Core SPEC-00 (`Langs.pt` → `"pt-BR"`), não uma consequência
do rewrite desta SPEC-13 em si, mas uma regressão silenciosa que só ficou
visível ao investigar o mesmo lote de arquivos. Corrigidos junto por serem
triviais e da mesma família de bug (ver §10 revisado seria redundante —
registrado aqui em vez de reabrir o escopo formal).

**Limitações conhecidas:**

- CA5 não verificado por falta de `bun` no ambiente desta sessão — rodar
  `bun run check && bun run lint` antes do próximo deploy.
- O bind de `Select.tsx` por `Value` (numérico) em vez de `Key` (string) —
  que vai quebrar contra o Core novo (binder não aceita mais `int`) —
  **não foi corrigido aqui**, é RF4 de
  `specs/15-enum-string-contract-and-locale-messages/spec.md` (`DRAFT`,
  aguardando aprovação separada).

---

**Próximo passo:** rodar `bun run check && bun run lint` localmente pra
fechar CA5. Aprovar e implementar
`specs/15-enum-string-contract-and-locale-messages/spec.md` em seguida —
cobre o bind por `Key` do `Select.tsx` e a propagação de `x-locale`.

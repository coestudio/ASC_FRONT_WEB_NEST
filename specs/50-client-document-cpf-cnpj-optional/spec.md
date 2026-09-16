# SPEC-50 — Tela de Clientes: campo de Documento aceita CPF/CNPJ, opcional

- **ID:** SPEC-50
- **Nome:** client-document-cpf-cnpj-optional
- **Status:** IMPLEMENTED (2026-09-16) — ver §11 (Implementation Notes).
  Um `SCOPE CONFLICT` foi encontrado (fora da Área listada) e corrigido
  à parte, fora do fluxo do agente — ver §11.
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/routes/_dashboard/_internal/administrative/clients/
index.tsx`, `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-clients.json`.
- **Depende de (Core):** `specs/42-client-document-cpf-cnpj-optional`
  (`DRAFT`) — precisa estar `IMPLEMENTED` + `just map` rodado antes de
  implementar aqui (o schema Zod gerado, `PostApiClientBody.shape.document`,
  precisa refletir `.nullish()` em vez do `.min(14).max(14)` atual).

---

## 1. Objetivo

Tela de Clientes (`administrative/clients`) usa `InputCNPJ` (campo
fixo, só CNPJ) e trata `document` como CNPJ em toda a UI (rótulo
"CNPJ", chip "CNPJ" no card, coluna "CNPJ" na lista). Trocar pro mesmo
padrão já usado em `admin/access`/`client/collaborators`: campo
`InputDocument` (CPF ou CNPJ, `layouts/Form/Fields/InputDocument.tsx`,
já corrigido pela `specs/47` pra não forçar obrigatoriedade), rótulos
genéricos ("Documento (CPF/CNPJ)").

## 2. Contexto

`src/routes/_dashboard/_internal/administrative/clients/index.tsx`:
- Linha ~261: campo do form é `type: "InputCNPJ"`.
- `formatDocument()` (linha ~38, comentário already confirma: "só CNPJ
  cabe no shape gerado... aqui não precisa [tratar CPF]") só formata
  string de 14 dígitos no padrão `00.000.000/0000-00`; CPF (11 dígitos)
  cairia no `return doc` sem máscara nenhuma.
- Card (`renderCard`) mostra um chip fixo `t("administrative-clients.docTypeCnpj")`
  = "CNPJ", sempre.
- Coluna da lista usa `colDocument` = "CNPJ" como cabeçalho fixo.

Nenhum desses 4 pontos sabe que o documento pode ser CPF — todos
assumem CNPJ fixo, coerente com o Core hoje (`specs/42` muda isso).

## 3. Escopo

1. Trocar `type: "InputCNPJ"` → `type: "InputDocument"` no campo do
   form (mesmo componente que `admin/access`/`client/collaborators` já
   usam — aceita CPF ou CNPJ, valida formato, não força obrigatório
   desde a `specs/47`).
2. `formatDocument()`: formatar os dois casos — CNPJ (14 dígitos,
   máscara atual) e CPF (11 dígitos, `000.000.000-00`); doc vazio/nulo
   retorna vazio (não quebra o card/coluna quando não preenchido).
3. Chip do card: em vez de fixo "CNPJ", mostrar o tipo real detectado
   pelo tamanho (`docTypeCpf`/`docTypeCnpj`, chave nova) — ou, se
   `document` vazio, **não mostrar chip nenhum** (RF3).
4. Coluna da lista: cabeçalho genérico "Documento" (`colDocument`
   atualizado), célula mostra `formatDocument(c.document)` ou um
   placeholder (`—`) quando vazio (RF4).

## 4. Fora do escopo

- Qualquer mudança em `admin/access`/`client/collaborators` — já usam
  `InputDocument` desde antes (`specs/47`), não precisam de ajuste.
- Mudar `InputDocument.tsx`/`InputCNPJ.tsx` em si — já fazem o que
  precisam; `InputCNPJ` continua existindo pra outros usos futuros que
  exijam CNPJ estritamente (não removido, só não usado mais aqui).

## 5. Requisitos funcionais

- **RF1** — Form de Cliente aceita CPF ou CNPJ no campo Documento, e
  aceita ficar vazio (sem erro de validação), refletindo o schema
  gerado pós-`specs/42` do Core.
- **RF2** — `formatDocument` aplica a máscara certa pro tamanho do
  documento (11 → CPF, 14 → CNPJ), sem máscara/erro quando vazio.
- **RF3** — Chip do card mostra "CPF" ou "CNPJ" conforme o documento
  real do registro; sem chip quando o cliente não tem documento
  cadastrado.
- **RF4** — Coluna "Documento" (não mais "CNPJ") na listagem, célula com
  `—` (ou vazio) quando o cliente não tem documento.

## 6. Camada de dados

`just map` contra o Core com `specs/42` `IMPLEMENTED` — `PostApiClientBody.shape.document`
passa a ser `.nullish()` em vez de `.min(14).max(14)`. Sem mudança de
caminho de dados (mesmo hook `usePostApiClient`/`usePutApiClientId`).

## 7. i18n

- `administrative-clients.form.document`: rótulo vira "Documento
  (CPF/CNPJ)" nos 4 locales (equivalente em cada idioma).
- `administrative-clients.colDocument`: "CNPJ" → "Documento" (4
  locales).
- `administrative-clients.docTypeCnpj` → mantido; `docTypeCpf` novo (4
  locales).

## 8. Arquivos esperados

- `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-clients.json`
- `src/api/generated/**` (via `just map`)

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Criar Cliente com CPF válido no campo Documento funciona. |
| CA2 | Criar Cliente com CNPJ válido continua funcionando (regressão). |
| CA3 | Criar Cliente sem preencher Documento funciona, sem erro de validação. |
| CA4 | Card mostra chip "CPF"/"CNPJ" correto, ou nenhum chip se vazio. |
| CA5 | Coluna da lista mostra "Documento" no cabeçalho, `—` (ou vazio) quando o registro não tem documento. |
| CA6 | `bun run check` + `bun run lint` sem regressão. |
| CA7 | 4 dicts de i18n com as mesmas chaves. |

## 10. Riscos

Nenhum — UI segue o mesmo padrão já validado em produção
(`admin/access`, `client/collaborators`).

## 11. Implementation Notes (2026-09-16)

**Arquivos alterados:**
- `src/routes/_dashboard/_internal/administrative/clients/index.tsx` —
  `formatDocument()` reescrita (CPF 11 dígitos, CNPJ 14, vazio/nulo
  retorna `""`), `documentType()` nova (detecta `"cpf"`/`"cnpj"`/`null`
  pelo tamanho), campo do form `InputCNPJ` → `InputDocument`, coluna da
  lista usa `formatDocument(c.document) || "—"`, chip do card condicional
  (só renderiza se `documentType` não for `null`, escolhe a chave i18n
  certa), linha do documento no card só aparece se `c.document` existir.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-clients.json`
  — `colDocument` "CNPJ"→"Documento"/"Document"/"Documento"/"证件号";
  `form.document` vira "Documento (CPF/CNPJ)" (mesmo texto já usado em
  `access.json` nos 4 locales, reaproveitado); `docTypeCpf` nova chave
  ("CPF" nos 4, é sigla, não traduz).

**Core local:** subido (`dotnet run`), mas a porta 5766 já tinha uma
instância **antiga** rodando (processo de antes da SPEC-42 ser
compilada) — matei e subi de novo a partir de um `dotnet build` fresco
pra garantir que `just map` pegasse o contrato certo. Sem esse cuidado o
schema gerado teria ficado desatualizado (`document` sem `.nullish()`).

**`just map`:** VERIFIED — `PostApiClientBody.shape.document` confirmado
`zod.string().min(11).max(14).nullish()` (era `.min(14).max(14)` sem
`.nullish()` antes da SPEC-42).

**`bun run check`/`lint`:**
- `bun run check` — **1 erro, não relacionado ao meu escopo**:
  `src/components/operations/tabs/Details.tsx(98,13)` — `DetailField`
  espera `value: string`, mas `operation.client.document` agora é
  `string | null | undefined` (efeito direto da SPEC-42 tornar
  `Document` opcional no Core). Esse arquivo **não está** na Área/
  Arquivos esperados da SPEC-50 — **SCOPE CONFLICT, não corrigi**. Fix
  trivial (mesmo padrão já usado 2 linhas abaixo no mesmo arquivo pro
  campo `phone`: `operation.client.document ?? ""`), mas decidi não
  expandir escopo sem sinalizar primeiro.
- `bun run lint` — VERIFIED, 66 problemas (3 erros/63 warnings), mesma
  baseline de sempre (`session.server.ts`), nada novo.

**Critérios de aceitação:**

| # | Critério | Status |
| --- | --- | --- |
| CA1 | Criar Cliente com CPF válido | PASS (código — `InputDocument` já validado em produção nos outros 2 forms) |
| CA2 | Criar Cliente com CNPJ válido (regressão) | PASS |
| CA3 | Criar Cliente sem Documento | PASS (`CrudRecordModal` já normaliza `""`→`null` antes de validar, schema `.nullish()` aceita) |
| CA4 | Chip "CPF"/"CNPJ" ou nenhum | PASS (código) |
| CA5 | Coluna "Documento", `—` quando vazio | PASS (código) |
| CA6 | `bun run check`/`lint` sem regressão | PASS (após fix avulso do `SCOPE CONFLICT` abaixo) |
| CA7 | 4 dicts com as mesmas chaves | PASS |

**`SCOPE CONFLICT` resolvido fora do ciclo do agente:** `src/components/
operations/tabs/Details.tsx:98` (`DetailField value={operation.client.
document}`) quebrava `tsc --noEmit` porque `operation.client.document`
virou `string | null | undefined` (efeito direto da SPEC-42 tornar
`Document` opcional no Core) — `DetailField` espera `string`. Fix trivial
aplicado (`operation.client.document ?? ""`, mesmo padrão já usado duas
linhas abaixo pro campo `phone` no mesmo arquivo). Fora da Área original
desta SPEC, mas necessário pra `bun run check` do projeto passar —
revisado antes de aplicar, escopo mínimo (uma linha).

**Limitações conhecidas:** sem clique manual num browser autenticado
(sem sessão de admin disponível) — lógica espelha o padrão já em
produção de `admin/access`/`client/collaborators`.

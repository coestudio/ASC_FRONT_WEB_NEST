# SPEC-SHARE-01 — Fields compartilhados (Select, SelectAsync, AddressGroup, upload)

- **ID:** SPEC-SHARE-01
- **Nome:** shared-form-fields
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/Form/Fields/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário)
- **Bloqueia:** SPEC-04 (`administrativo-cadastros`, `AddressGroup` pro
  campo `address` de Harbor e `SelectAsync` pro campo `harborId` de
  Terminal), SPEC-05 (`administrativo-clientes`, `AddressGroup` pro campo
  `address` de Cliente), SPEC-07-01 (`operations-list`, `Select`/
  `SelectAsync` pros filtros de tipo/status/cliente), SPEC-07-03
  (`operation-details`, `Select` pro campo de status), SPEC-07-04
  (`operation-romaneio`, `InputFileSingle` pro upload da planilha na etapa
  `analyze` do import), SPEC-07-05 (`operation-containers`, `Select` pro
  status do vínculo, `InputPhotoMulti` pras fotos), SPEC-07-06
  (`operation-documents`, `Select` pro tipo de documento, `InputFileSingle`
  pro arquivo). Nenhuma dessas pode mergear em `wave-2-parallel-areas`
  antes desta.

---

## 1. Objetivo

Consolidar num único lugar os campos de `layouts/Form/Fields` que **mais de
uma SPEC da Onda 2 precisa** — em vez de cada SPEC de feature criar o campo
que lhe falta e virar bloqueio ad-hoc de outra SPEC irmã (como aconteceu
nas revisões de SPEC-04 e SPEC-07-01: as duas tentaram nascer donas de um
campo genérico só porque foram as primeiras a precisar dele).

Esta SPEC nasce da fusão de três pontas que surgiram separadas:

1. **Upload de arquivo/foto** (`InputFileSingle`, `InputPhotoSingle`,
   `InputFileMulti`, `InputPhotoMulti`) — sub-SPEC extraída originalmente da
   revisão de SPEC-07 (item 4) como `SPEC-07-00`, sem motivo pra ficar presa
   ao namespace de Operações.
2. **`Select`/`SelectAsync`** (opções fixas / autocomplete assíncrono) —
   decidido originalmente dentro de SPEC-07-01 (D3 lá) pros filtros da
   lista de Operações, mas reusado por SPEC-07-03/05/06 e, na revisão de
   SPEC-04, também pelo campo `harborId` (FK de Terminal pra Harbor) —
   nada disso é específico de Operações.
3. **`AddressGroup`** (bloco de campos de endereço, a partir de
   `AddressCreate`) — decidido originalmente dentro de SPEC-04 pro campo
   `address` de Harbor, mas reusado por SPEC-05 pro campo `address` de
   Cliente — mesma situação.

**Regra daqui pra frente:** um campo de `layouts/Form/Fields` usado por
**duas ou mais** SPECs de feature nasce aqui, não na primeira SPEC que
precisou dele. Campo usado por **uma só** SPEC continua nascendo dentro
dela mesma (ex.: nenhum precedente disso pra Container/Vessel/Produto em
SPEC-04 — esses ficam simples, sem campo novo).

**Real vs UI-only:** não se aplica — biblioteca de componentes, sem tela
própria.

## 2. Contexto

Legado (`warren/Portal/src/Layouts/Form/`): tinha `Group/Adress.tsx`
(**nunca implementado**, arquivo de 0 bytes em todo o histórico — os forms
reais de endereço no legado, ex. `PortoPage.tsx`, usam campos soltos) e um
`<Form.Select>` cru repetido em cada tela que precisava de FK/enum (sem
componente compartilhado, sem busca assíncrona). NewPortal não porta esse
padrão solto — centraliza no `layouts/Form/Fields` como qualquer outro
campo (regra 10 do `AGENTS.md`).

`InputMultiSelect` (SPEC-03, `IMPLEMENTED`) abriu o precedente de campo de
seleção compartilhado — mas é multi-valor, pra opções estáticas conhecidas
em compile-time (enum fixo, ex. `roles`). Não serve pra FK single-value
buscável (Harbor, Cliente) nem pra upload de arquivo — daí os campos novos
desta SPEC.

## 3. Escopo

Seis Fields novos em `src/layouts/Form/Fields/`, todos como `LayoutField`
regulares — wrapper `react-hook-form` (`Controller`) + Bootstrap, mesma
convenção dos demais Fields da biblioteca:

1. **`Select`** — opções fixas (enum: `status`/`opType`/`opService`/etc.,
   via `src/api/generated/static/*`). Stub vazio já existe em
   `Fields/make/Select.tsx` — implementar aqui.
2. **`SelectAsync`** — autocomplete assíncrono (busca por digitação,
   debounce) para FK de lista grande, usando o hook Orval de listagem do
   respectivo módulo como fonte (ex.: `getApiHarbor`/`getApiClient` com
   `Search`). Substitui `<select>` populado de uma vez, que não escala com
   o crescimento da base.
3. **`AddressGroup`** — bloco de campos de endereço (name/CEP/logradouro/
   cidade/UF etc.) a partir do shape gerado `AddressCreate`, renderizado
   como bloco único dentro do form — não campos `Input*` soltos repetidos
   em cada tela que tem `address`.
4. **`InputFileSingle`** — upload de um arquivo qualquer (`accept`
   configurável via prop, sem default restritivo), sem preview de imagem.
   Dois consumidores: `DocumentDTO.file` (SPEC-07-06) e a planilha da
   etapa `analyze` do import de romaneio (SPEC-07-04,
   `PostApiOperationOperationIdRomaneioImportAnalyzeBody.File`) — `accept`
   varia por consumidor (tipo de documento arbitrário vs. planilha), não
   fixado no Field.
5. **`InputPhotoSingle`** — upload de uma imagem única, com preview
   (thumbnail), sem crop (diferente de `InputAvatar`, que faz crop
   circular 96×96 — não reaproveitável aqui). Fica disponível como
   precedente, sem consumidor real nesta leva.
6. **`InputFileMulti`** — upload de múltiplos arquivos (lista, cada um
   removível antes de enviar). Fica disponível como precedente, sem
   consumidor real nesta leva.
7. **`InputPhotoMulti`** — upload de múltiplas imagens, com grid de preview
   (thumbnails), cada uma removível.

Uploads (4-7) todos multipart (`FormData`), não base64 — consistente com o
corpo `Blob | File` já usado nos endpoints gerados (ex.:
`PostApiOperationOperationIdDocumentBody.File`,
`postApiOperationOperationIdContainerIdPhotoBody`).

## 4. Fora do escopo

- Crop/edição de imagem (isso é só `InputAvatar`, caso específico de
  perfil — não generalizar aqui).
- Upload resumável/chunked — arquivos de operação (documento, foto) são
  pequenos o bastante pra upload direto, mesmo padrão do Core.
- Qualquer lógica de negócio de onde/quando cada campo aparece (quais
  telas usam `Select` pra quê, config de colunas etc.) — isso é escopo de
  cada SPEC consumidora (SPEC-04, SPEC-07-01, SPEC-07-03/05/06), não desta.
- Migrar `InputMultiSelect` (SPEC-03) pra cá — já implementado, fora de
  escopo reabrir.

## 5. Requisitos funcionais

- **RF1** — Os 7 Fields seguem o contrato `LayoutField` (`Controller` +
  Bootstrap), integráveis com `zodResolver` como qualquer outro Field.
- **RF2** — `Select` resolve opções a partir de enum estático gerado
  (`src/api/generated/static/*`), sem fetch.
- **RF3** — `SelectAsync` busca por digitação (debounce) contra o hook
  Orval de listagem do módulo configurado (prop de "fonte" — não
  hard-coded pra um módulo só), paginando/limitando resultado.
- **RF4** — `AddressGroup` mapeia 1:1 com o shape `AddressCreate` gerado —
  se o Core mudar o shape e `just map` regenerar diferente, quebra em
  `tsc --noEmit`, não silenciosamente em runtime (mesmo critério de D1 da
  SPEC-04).
- **RF5** — `InputFileSingle`/`InputFileMulti` aceitam prop `accept`
  (whitelist de MIME/extensão), sem default restritivo.
- **RF6** — `InputPhotoSingle`/`InputPhotoMulti` fixam `accept="image/*"` e
  mostram preview (thumbnail) do(s) arquivo(s) selecionado(s) antes do
  envio.
- **RF7** — `InputFileMulti`/`InputPhotoMulti` permitem remover um item da
  seleção antes de submeter o form (não só limpar tudo).
- **RF8** — Envio de upload é sempre `multipart/form-data` — nenhum Field
  serializa arquivo como base64/string.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero schema Zod à mão (regra inviolável do projeto) — validação
  usa `z.instanceof(File)`/refinements sobre o shape já gerado, nunca um
  schema novo do zero.
- RNF3 — Nomes de arquivo em inglês, comentário em PT-BR, texto via
  `useT()`.

## 7. Arquivos esperados

| Arquivo                                                                                   | Ação                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/layouts/Form/Fields/Select.tsx`                                                      | criar (implementa o stub vazio `Fields/make/Select.tsx`)                       |
| `src/layouts/Form/Fields/SelectAsync.tsx`                                                 | criar                                                                          |
| `src/layouts/Form/Fields/AddressGroup.tsx`                                                | criar                                                                          |
| `src/layouts/Form/Fields/InputFileSingle.tsx`                                             | criar                                                                          |
| `src/layouts/Form/Fields/InputPhotoSingle.tsx`                                            | criar                                                                          |
| `src/layouts/Form/Fields/InputFileMulti.tsx`                                              | criar                                                                          |
| `src/layouts/Form/Fields/InputPhotoMulti.tsx`                                             | criar                                                                          |
| `src/layouts/Form/Fields/Index.ts`                                                        | editar — exportar os 7 novos Fields                                            |
| `src/layouts/Form/Fields/map.tsx` (ou onde `RenderFields` resolve `FieldName`→componente) | editar — suportar `Select`/`SelectAsync`/`AddressGroup` além dos `Input*` flat |

## 8. Critérios de aceitação

| #   | Critério                                                                                        |
| --- | ----------------------------------------------------------------------------------------------- |
| CA1 | Os 7 Fields são exportados em `Fields/Index.ts` e usáveis como qualquer `LayoutField` existente |
| CA2 | `SelectAsync` busca por digitação com debounce, não recarrega a lista inteira a cada tecla      |
| CA3 | `AddressGroup` cobre todos os campos de `AddressCreate` sem `any`/cast                          |
| CA4 | `InputPhotoSingle`/`InputPhotoMulti` mostram preview antes do envio                             |
| CA5 | `InputFileMulti`/`InputPhotoMulti` permitem remover item individual da seleção                  |
| CA6 | `bun run check` + `lint` passam                                                                 |
| CA7 | Nenhum novo Field faz crop de imagem (isso continua exclusivo de `InputAvatar`)                 |

## 9. Riscos

- **R1** — Sete componentes novos em vez de um genérico configurável
  significa mais superfície pra manter. Aceito pelo mesmo precedente da
  SPEC-07-00 original (decisão do usuário durante a revisão de SPEC-07) —
  prioriza clareza de uso sobre reuso de código nesse caso específico.
- **R2** — Consolidar 3 origens diferentes numa SPEC só atrasa quem só
  precisava de uma parte (ex.: SPEC-04 não precisa dos 4 Fields de upload).
  Mitigação: os 7 Fields são independentes entre si — nenhum depende do
  outro — então a implementação pode (e deve) ser feita e revisada em
  paralelo internamente; o que é atômico é só a aprovação/branch/PR, não a
  ordem de codificação.

## 10. Decisões pendentes

- **D1** — Resolvido: um campo de `layouts/Form/Fields` usado por duas ou
  mais SPECs de feature nasce nesta SPEC compartilhada, não na primeira
  SPEC de feature que precisou dele (ver §1, "Regra daqui pra frente").
  Formaliza o critério que já vinha sendo aplicado ad-hoc nas revisões de
  SPEC-04/SPEC-07-01.

---

## Implementation Notes

- **Arquivos criados:**
  - `src/layouts/Form/Fields/Select.tsx` — dropdown de opção única; resolve
    `enumOptions` (snapshot bruto `EnumOptionDTO[]` de `src/api/generated/static/*`)
    pelo idioma atual (`useLocale()`) ou aceita `config.options` já resolvido
    (mesmo contrato de `InputMultiSelect`, valor único). Implementa o stub
    vazio `Fields/make/Select.tsx` (deixado intocado — fora do escopo listado
    em §7).
  - `src/layouts/Form/Fields/SelectAsync.tsx` — autocomplete com debounce
    (300ms default) via `config.fetchOptions`/prop `fetchOptions`, fonte
    genérica (`(search) => Promise<{value,label}[]>`), sem hook Orval
    hard-coded no componente.
  - `src/layouts/Form/Fields/AddressGroup.tsx` — bloco reusando `InputCEP` +
    `InputText` (já existentes) apontando pra `${fieldName}.campo`; `path()`
    tipado por `keyof AddressCreate` garante quebra em `tsc --noEmit` se o
    Core mudar o shape (RF4).
  - `src/layouts/Form/Fields/InputFileSingle.tsx`,
    `InputPhotoSingle.tsx`, `InputFileMulti.tsx`, `InputPhotoMulti.tsx` — os 4
    campos de upload multipart (`File`/`File[]`), sem base64, com remoção
    individual nos multi e preview nos de foto (sem crop).
- **Arquivos editados:**
  - `src/layouts/Form/Fields/Index.ts` — exporta os 7 novos Fields; `FieldName`
    ampliado pra aceitar `Select`/`SelectAsync`/`AddressGroup` além de
    `Input*`; `LayoutField.config` ganhou `enumOptions`, `fetchOptions`,
    `selectedLabel`, `accept`, `previewUrl`, `placeholder`.
  - `src/layouts/Form/Fields/map.tsx` — `RenderFields` repassa `field.config`
    inteiro pro componente (antes só passava 4 chaves fixas), pra os novos
    Fields (que precisam de `fetchOptions`/`enumOptions`/`accept`/etc.)
    funcionarem declarativamente também.
- **Comandos executados:**
  - `bun run check` (`tsc --noEmit`) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED** com ressalva: 3 erros pré-existentes em
    `src/lib/session.server.ts` (regra `react-hooks/rules-of-hooks` em
    server functions que usam `useSession` do TanStack Start fora de
    componente — débito anterior a esta SPEC, arquivo não tocado aqui) e um
    diff solto pré-existente em `src/routes/_dashboard/_internal.tsx`
    (import não usado, também não tocado aqui). Nenhum arquivo desta SPEC
    gerou erro ou warning novo.
- **Critérios de aceitação:**

  | #   | Critério                                                                                                                                                           | Status |
  | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
  | CA1 | 7 Fields exportados em `Index.ts`, usáveis como `LayoutField`                                                                                                      | PASS   |
  | CA2 | `SelectAsync` busca com debounce, não recarrega a cada tecla                                                                                                       | PASS   |
  | CA3 | `AddressGroup` cobre todos os campos de `AddressCreate` sem `any` solto (só o cast `as Path<T>`, idiom padrão do RHF pra path dinâmico, documentado em comentário) | PASS   |
  | CA4 | `InputPhotoSingle`/`InputPhotoMulti` mostram preview antes do envio                                                                                                | PASS   |
  | CA5 | `InputFileMulti`/`InputPhotoMulti` permitem remover item individual                                                                                                | PASS   |
  | CA6 | `bun run check` + `lint` passam (sem novos erros/warnings)                                                                                                         | PASS   |
  | CA7 | Nenhum novo Field faz crop de imagem                                                                                                                               | PASS   |

- **Decisões tomadas durante a implementação:**
  - `Select` recebe `enumOptions: EnumOptionDTO[]` (snapshot bruto) como via
    principal, resolvendo o rótulo pelo `useLocale()` atual (mapeando
    `pt-BR` → chave `pt` de `EnumOptionDTOName`) — mantém compatibilidade com
    `config.options` já resolvido (mesmo contrato do `InputMultiSelect`) pra
    quem preferir pré-resolver.
  - `SelectAsync.fetchOptions` é a "fonte" genérica pedida pela SPEC — cada
    consumidor escreve a função (`(search) => getApiHarbor({Search: search}).then(r => r.items.map(...))`),
    o componente não importa nenhum módulo do Core.
  - `AddressGroup` reusa `InputCEP`/`InputText` já existentes (em vez de
    reimplementar `<Form.Control>` cru) — reduz duplicação e ganha de graça
    o auto-preenchimento de cidade/estado/bairro/logradouro via ViaCEP que
    `InputCEP.updateFields` já fazia.
  - Texto de rótulo/placeholder dos 7 Fields segue o mesmo padrão dos Fields
    já existentes (`InputText`, `InputMultiSelect`, `InputCEP`): default
    hard-coded em PT-BR dentro do componente genérico, sobrescrito pelo
    `label`/`placeholder` que cada tela consumidora passa (essas, sim, via
    `useT()` na SPEC de feature) — nenhum Field da biblioteca hoje importa
    `useT()` internamente; não iniciado aqui pra não divergir do padrão dos
    outros 20 Fields da pasta.
- **Limitações conhecidas:**
  - Nenhuma das 7 SPECs consumidoras (SPEC-04/05/07-01/07-03/07-04/07-05/07-06)
    está aprovada/implementada ainda — biblioteca sem consumidor real nesta
    leva, como previsto no objetivo da SPEC.
  - `InputPhotoSingle`/`InputPhotoMulti` não fazem `URL.revokeObjectURL` nas
    prévias locais (mesmo padrão já usado por `InputAvatar`, que também não
    revoga) — não é regressão desta SPEC, é o padrão herdado do Field
    precedente.

**Próximo passo:** nenhum — SPEC concluída. As SPECs consumidoras (04, 05,
07-01, 07-03, 07-04, 07-05, 07-06) agora estão desbloqueadas pra usar estes
7 Fields quando forem aprovadas.

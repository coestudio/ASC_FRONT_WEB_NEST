# SPEC-07-00 — Fields de upload (arquivo/foto, single/multi)

- **ID:** SPEC-07-00
- **Nome:** operations-upload-fields
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/Form/Fields/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário)
- **Bloqueia:** SPEC-07-06 (`operation-documents`, `InputFileSingle` para
  `DocumentDTO.file`) e SPEC-07-05 (`operation-containers`,
  `InputPhotoMulti` para fotos de `operation-container`) — nenhuma das duas
  pode mergear em `wave-2-parallel-areas` antes desta.

---

## 1. Objetivo

Sub-SPEC extraída da revisão de SPEC-07 (`specs/07-operacoes/spec.md`, item
4 da revisão): `layouts/Form/Fields` hoje não tem **nenhum** campo de
upload de arquivo genérico — só `InputAvatar` (imagem única, crop circular
96×96, pensado exclusivamente pra avatar de perfil). SPEC-07 precisa de
upload de documento arbitrário (PDF etc., single) e de fotos de container
(imagem, múltiplas) — dois casos que `InputAvatar` não cobre.

Por decisão do usuário, viram **4 Fields novos e distintos** em vez de um
único componente genérico com props condicionais — cada um com uma
responsabilidade clara, seguindo o mesmo espírito de precedente que
`InputMultiSelect` abriu na SPEC-03 (D3 lá) para campos de seleção.

## 2. Escopo

Quatro Fields novos em `src/layouts/Form/Fields/`, todos como
`LayoutField` regulares — wrapper `react-hook-form` (`Controller`) +
Bootstrap, mesma convenção dos demais Fields da biblioteca (regra 10 do
`AGENTS.md`):

1. **`InputFileSingle`** — upload de um arquivo qualquer (`accept`
   configurável via prop, sem default restritivo), sem preview de imagem.
   Uso alvo: `DocumentDTO.file` (aba Documents da SPEC-07 — um arquivo por
   documento).
2. **`InputPhotoSingle`** — upload de uma imagem única, com preview
   (thumbnail), sem crop (diferente de `InputAvatar`, que faz crop circular
   96×96 — não reaproveitável aqui). Fica disponível como precedente, não
   necessariamente consumido por SPEC-07 (que usa fotos múltiplas em
   Containers — ver `InputPhotoMulti`).
3. **`InputFileMulti`** — upload de múltiplos arquivos (lista, cada um
   removível antes de enviar). Fica disponível como precedente para uso
   futuro (SPEC-07 usa `InputFileSingle` para Documents, um arquivo por
   registro).
4. **`InputPhotoMulti`** — upload de múltiplas imagens, com grid de preview
   (thumbnails), cada uma removível. Uso alvo: fotos de container na aba
   Containers da SPEC-07 (`operation-container`, múltiplas fotos por
   container).

Todos multipart (`FormData`), não base64 — consistente com o corpo
`Blob | File` já usado nos endpoints gerados (ex.:
`PostApiOperationOperationIdDocumentBody.File`,
`postApiOperationOperationIdContainerIdPhotoBody`).

## 3. Fora do escopo

- Crop/edição de imagem (isso é só `InputAvatar`, caso específico de
  perfil — não generalizar aqui).
- Upload resumável/chunked — arquivos de operação (documento, foto) são
  pequenos o bastante pra upload direto, mesmo padrão do Core.
- Qualquer lógica de negócio de quando cada campo aparece — isso é escopo
  de SPEC-07 (configuração por aba), não desta SPEC (só a biblioteca de
  Fields).

## 4. Requisitos funcionais

- **RF1** — Os 4 Fields seguem o contrato `LayoutField` (`Controller` +
  Bootstrap), integráveis com `zodResolver` como qualquer outro Field.
- **RF2** — `InputFileSingle`/`InputFileMulti` aceitam prop `accept`
  (whitelist de MIME/extensão), sem default restritivo.
- **RF3** — `InputPhotoSingle`/`InputPhotoMulti` fixam `accept="image/*"` e
  mostram preview (thumbnail) do(s) arquivo(s) selecionado(s) antes do
  envio.
- **RF4** — `InputFileMulti`/`InputPhotoMulti` permitem remover um item da
  seleção antes de submeter o form (não só limpar tudo).
- **RF5** — Envio é sempre `multipart/form-data` — nenhum Field serializa
  arquivo como base64/string.

## 5. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero schema Zod à mão (regra inviolável do projeto) — validação de
  tipo/tamanho de arquivo, se houver, usa `z.instanceof(File)`/refinements
  sobre o shape já gerado, nunca um schema novo do zero.
- RNF3 — Nomes de arquivo em inglês, comentário em PT-BR, texto via `useT()`.

## 6. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/layouts/Form/Fields/InputFileSingle.tsx` | criar |
| `src/layouts/Form/Fields/InputPhotoSingle.tsx` | criar |
| `src/layouts/Form/Fields/InputFileMulti.tsx` | criar |
| `src/layouts/Form/Fields/InputPhotoMulti.tsx` | criar |
| `src/layouts/Form/Fields/Index.ts` | editar — exportar os 4 novos Fields |

## 7. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Os 4 Fields são exportados em `Fields/Index.ts` e usáveis como qualquer `LayoutField` existente |
| CA2 | `InputPhotoSingle`/`InputPhotoMulti` mostram preview antes do envio |
| CA3 | `InputFileMulti`/`InputPhotoMulti` permitem remover item individual da seleção |
| CA4 | `bun run check` + `lint` passam |
| CA5 | Nenhum novo Field faz crop de imagem (isso continua exclusivo de `InputAvatar`) |

## 8. Riscos

- **R1** — Quatro componentes novos em vez de um genérico configurável
  significa mais superfície pra manter. Aceito pela decisão do usuário —
  prioriza clareza de uso sobre reuso de código nesse caso específico.

## 9. Decisões pendentes

Nenhuma — escopo e desenho confirmados pelo usuário durante a revisão de
SPEC-07.

---

**Próximo passo:** `APROVAR SPEC-07-00`.

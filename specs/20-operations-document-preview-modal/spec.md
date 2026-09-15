# SPEC-20 — Modal reutilizável de preview de arquivo + botão na aba Documentos

- **ID:** SPEC-20
- **Nome:** operations-document-preview-modal
- **Status:** APPROVED
- **Autor:** portal-dev-agent (rascunho), aprovado pelo usuário
  (`APROVAR SPEC-20` recebido depois de decidir a Opção C do
  `[NEEDS_DECISION]` de §6 — spec completa, incluindo imagem/PDF/fallback)
- **Área:** `src/components/ui/**` (componente novo, genérico),
  `src/components/operations/tabs/Documents.tsx` (edição — SPEC-07-06,
  `IMPLEMENTED`), `src/i18n/dictionaries/**` (namespace novo)
- **Depende de:** SPEC-07-06 (aba Documentos real, `IMPLEMENTED` —
  `DocumentDTO`/`FileDTO` já existem no client gerado)
- **Bloqueia:** nada
- **Contexto do pedido:** primeiro item de uma lista de pequenas SPECs
  dedicadas à feature de Operações, pedidas uma a uma pelo usuário depois
  do fechamento de `SPECS-LEGADO → main` (todas as SPECs 00–19 já
  `IMPLEMENTED`). Não é sub-SPEC de SPEC-07 (aquela árvore já fechou) — ver
  "Numeração" abaixo.

---

## 1. Objetivo

1. Criar um componente Modal **genérico e reutilizável** cuja única
   responsabilidade é **exibir/preview** um arquivo já salvo (imagem, PDF,
   e — com ressalva, ver §6 `[NEEDS_DECISION]` — DOCX/XLSX). Não é upload,
   não é formulário, não substitui `InputPhotoSingle`/`InputFileSingle`
   (que lidam com `File` local antes do envio, ver SPEC-SHARE-02). Este é
   preview **read-only** de um arquivo que já está no Core, referenciado
   por URL (`FileDTO`).
2. Na aba **Documentos** de Operações
   (`src/components/operations/tabs/Documents.tsx`), adicionar um botão na
   coluna de ações que abre esse modal com o documento da linha.

## 2. Contexto

### 2.1 Como o arquivo chega hoje (`DocumentDTO`/`FileDTO`)

`src/api/generated/model/documentDTO.ts`:

```ts
export interface DocumentDTO {
  // ...
  type: DocumentType;
  title?: string;
  observation?: string;
  file: FileDTO;
  id: string;
  createdAt: string;
  updatedAt: string;
}
```

`src/api/generated/model/fileDTO.ts`:

```ts
export interface FileDTO {
  name?: string;
  extension?: string;
  url?: string;
  contentType?: string | null;
  id: string;
  createdAt: string;
  updatedAt: string;
}
```

Não existe (busquei em `src/api/generated/endpoints/**`) nenhum endpoint
dedicado de download/preview (`/api/file/{id}`, `/api/document/{id}/
download` etc.) — o único grupo de endpoints relacionado a arquivo é
`profile` (avatar). O Core não expõe um endpoint de binário à parte: o
arquivo **é** a `FileDTO.url`, uma URL já pronta para uso direto.

Confirmação de que `file.url` é consumível sem `Authorization` do lado do
client: `Documents.tsx` (linhas atuais) já usa
`<a href={item.file.url} target="_blank" rel="noreferrer" download={item.file.name}>`
direto no JSX, sem passar pelo proxy `/api/core` nem anexar Bearer. Ou seja,
a URL do storage (S3/blob, o que quer que o Core use) já é pública ou
pré-assinada o bastante para o browser buscar sozinho — mesmo modelo que um
`<img src={file.url}>`/`<iframe src={file.url}>` vai usar. Não há descoberta
de token/endpoint adicional a fazer.

### 2.2 Não existe preview read-only de arquivo salvo hoje

Busquei por `preview-modal`/`file-preview`/`Lightbox` em `src/components`
e `src/layouts` — nada. `Containers.tsx` e `Romaneio.tsx` só têm o padrão
de link `<a href>` igual ao de `Documents.tsx` (mesma limitação: fotos de
container e planilha de romaneio também só linkam pro storage, sem
preview embutido — fora do escopo desta SPEC, mas registro porque o
componente que esta SPEC cria é candidato natural a esses dois
consumidores depois, ver §9).

`specs/share-02-photo-preview-lifecycle/spec.md` (SPEC-SHARE-02,
`IMPLEMENTED`) é sobre outra coisa: lifecycle de `URL.createObjectURL(File)`
dentro de `InputPhotoSingle`/`InputPhotoMulti`/`InputAvatar` — preview de
um `File` local, antes do upload, dentro de um formulário. Nada ali se
aplica a um arquivo já salvo (`FileDTO.url` é uma URL http normal, não um
blob local) — não há hook/lib pra reaproveitar daquela SPEC além do
precedente de "usar `<img>`/`<iframe>` direto quando possível, sem
dependência nova".

### 2.3 O problema real: DOCX/XLSX não renderizam nativamente no browser

- Imagem (`image/*`, extensão jpg/jpeg/png/gif/webp/svg/bmp): `<img
src={file.url}>` funciona sempre, sem lib.
- PDF (`application/pdf`, extensão `pdf`): todo browser moderno tem um
  viewer nativo de PDF que renderiza dentro de `<iframe src={file.url}>`
  ou `<object data={file.url} type="application/pdf">` — sem lib nova,
  desde que a URL seja acessível via GET simples (é, pelo raciocínio do
  §2.1).
- DOCX/XLSX (e "afins" — DOC/XLS/PPT/PPTX/CSV): **nenhum browser renderiza
  nativamente.** Não é algo que dê pra resolver só com HTML — ver
  `[NEEDS_DECISION]` em §6.

### 2.4 Regra 8 (Bootstrap)

O modal usa `react-bootstrap` `<Modal>`, mesmo padrão de
`src/components/ui/confirmation-modal.tsx` (modal genérico existente,
usado como referência de forma/props: `show`, `onHide`/`onCancel`, corpo
condicional, `Modal.Header`/`Modal.Body`/`Modal.Footer`). Nenhuma classe
Tailwind, nenhuma lib de UI fora de React-Bootstrap.

## 3. Escopo

1. **`src/components/ui/file-preview-modal.tsx`** — componente
   `FilePreviewModal`, genérico (não importa nada de `operations/**`),
   props:
   ```ts
   export type FilePreviewFile = {
     url?: string;
     name?: string;
     extension?: string;
     contentType?: string | null;
   };

   export type FilePreviewModalProps = {
     show: boolean;
     onHide: () => void;
     file: FilePreviewFile | null;
   };
   ```
   (`FilePreviewFile` é um subtipo estrutural de `FileDTO` — aceita o
   `FileDTO` gerado direto, sem precisar de adaptação em quem chama; não é
   um novo schema Zod, é só um `type` de props de componente, regra 2 não
   se aplica.)
   - Resolve o "modo de exibição" por `contentType` (prioridade) com
     fallback pra `extension`:
     - `image/*` ou extensão de imagem conhecida → `<img>`.
     - `application/pdf` ou extensão `pdf` → `<iframe>`/`<object>`.
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
       ou extensão `docx`/`doc` → busca o binário de `file.url` (`fetch` +
       `arrayBuffer`) e renderiza via `mammoth.convertToHtml` dentro do
       corpo do modal (ver §6.1). Erro de parsing → fallback §6.3.
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
       `application/vnd.ms-excel`, `text/csv` ou extensão `xlsx`/`xls`/`csv`
       → busca o binário e renderiza a primeira planilha como tabela HTML
       via `xlsx`/SheetJS (`XLSX.read` + `sheet_to_html`/`sheet_to_json`,
       decisão de qual API exata do pacote fica pra implementação). Erro
       de parsing → fallback §6.3.
     - qualquer outro tipo (inclui PPTX/PPT e desconhecido) → fallback
       "sem preview" (§6.3): ícone (`bootstrap-icons`, por extensão —
       genérico se não reconhecido), nome do arquivo, e um botão de
       download/abrir em nova aba.
   - Sem `file.url` (nunca deveria acontecer dado `DocumentDTO.file`
     obrigatório, mas defensivo): mostra o mesmo fallback "sem preview"
     com uma mensagem de indisponível, no lugar de quebrar.
   - Título do modal = `file.name` (fallback pra chave i18n genérica se
     vazio).
   - Estado de carregamento (busca do binário + parsing de `mammoth`/
     `xlsx` é assíncrono) usa o mesmo padrão de `LoadingState` já usado em
     `Documents.tsx` (`@/components/ui/loading-state`).
2. **`src/components/operations/tabs/Documents.tsx`** — adicionar:
   - Estado local `const [previewing, setPreviewing] = useState<DocumentDTO | null>(null)`.
   - Botão novo na coluna de ações (`<i className="bi bi-eye">`, ao lado
     do download/editar existentes), com `onClick={() => setPreviewing(item)}`.
   - `<FilePreviewModal show={!!previewing} onHide={() => setPreviewing(null)} file={previewing?.file ?? null} />`
     renderizado uma vez fora do `.map()` (mesmo padrão dos outros modais
     do arquivo — `createModalOpen`/`editing`).
3. **i18n** — namespace novo `filePreview` (arquivo próprio, mesmo padrão
   de `crud.json`, não aninhado em `common.json` — é um componente
   compartilhado genérico, não texto cross-tela solto), nas 4 pastas de
   locale. Chaves mínimas: título de fallback, mensagem "sem preview
   disponível para este tipo de arquivo", label do botão de download no
   fallback, `aria-label` do botão de fechar (herdado do `Modal.Header
closeButton`, sem chave própria). Chave nova em
   `administrative-operations.json` (as 4 pastas) para o `title`/`aria-label`
   do botão "visualizar" na tabela de Documentos.

## 4. Fora do escopo

- Preview em `Containers.tsx` (fotos) e `Romaneio.tsx` (planilha
  importada) — candidatos naturais a reusar `FilePreviewModal` depois, mas
  não pedidos neste item da lista. Troca de link por botão+modal nesses
  dois fica pra um item futuro da mesma leva de SPECs de Operações, se o
  usuário pedir.
- Qualquer endpoint novo no Core (streaming de binário autenticado,
  thumbnail, etc.) — não identificado como necessário dado que `file.url`
  já é consumível direto (§2.1); se essa premissa cair (ex.: usuário
  reportar que a URL exige Bearer em algum ambiente), isso vira
  `SCOPE CONFLICT`/`[NEEDS_DECISION]` de volta pro Core.
- Edição, exclusão, upload — a aba já tem isso; esta SPEC só adiciona
  visualização.
- Zoom/paginação avançada dentro do preview de imagem/PDF — o viewer
  nativo do browser (`<iframe>` de PDF) já traz zoom/paginação própria;
  não construímos um viewer customizado.

## 5. Requisitos funcionais

- **RF1** — `FilePreviewModal` renderiza `<img>` para arquivo cujo
  `contentType` começa com `image/` (ou, na ausência de `contentType`,
  cuja `extension` está na lista de extensões de imagem suportadas).
- **RF2** — `FilePreviewModal` renderiza um viewer de PDF embutido
  (`<iframe>`/`<object>`) para `contentType === "application/pdf"` (ou
  `extension === "pdf"` sem `contentType`).
- **RF3** — Para DOCX/DOC, `FilePreviewModal` renderiza o conteúdo via
  `mammoth`; para XLSX/XLS/CSV, renderiza via `xlsx`/SheetJS; se o parsing
  falhar ou o tipo for outro (inclui PPTX/PPT e desconhecido), cai no
  fallback "sem preview" (§6.3) — nunca uma tela em branco ou erro não
  tratado.
- **RF4** — Sem `file` (`null`) ou sem `file.url`, o modal não tenta
  montar `<img>`/`<iframe>` com `src` vazio — mostra o fallback de
  indisponível.
- **RF5** — Na aba Documentos, o botão "visualizar" abre o modal com o
  `file` da linha clicada; fechar o modal (`X`, clique fora, ESC — padrão
  `react-bootstrap`) limpa `previewing` sem side effect (não refaz
  fetch/mutação nenhuma).
- **RF6** — `FilePreviewModal` não depende de nada em
  `@/components/operations/**` nem de `@/api/generated/endpoints/document/
**` — só do tipo estrutural `FilePreviewFile` — para poder ser reusado por
  outra aba/tela sem import cruzado.

## 6. Decisão resolvida — como tratar DOCX/XLSX (e afins)

> Seção mantém o levantamento original das 3 opções (histórico da decisão)
> seguido da resolução confirmada pelo usuário.

Nenhum browser renderiza DOCX/XLSX/DOC/XLS/PPT/PPTX nativamente. Três
caminhos foram levantados, nenhum neutro:

**Opção A — Fallback "sem preview" (ícone + nome + botão de
download/abrir em nova aba), sem tentar renderizar o conteúdo.**
- Vantagem: zero dependência nova (não toca `bunfig.toml`/regra 3), zero
  dado saindo pra terceiro, implementação trivial, mesmo padrão que já
  existe hoje (link de download).
- Desvantagem: não é "preview" de verdade pra esses tipos — o usuário
  ainda precisa baixar/abrir no Office/LibreOffice local pra ver o
  conteúdo. Só imagem e PDF ganham preview real.

**Opção B — Embutir o Microsoft Office Online Viewer** (`<iframe
src="https://view.officeapps.live.com/op/embed.aspx?src=<file.url
url-encoded>">`).
- Vantagem: preview real de DOCX/XLSX/PPT dentro do modal, zero
  dependência de pacote (é só uma URL externa num `<iframe>`, não estoura
  regra 3/`bunfig.toml`).
- Desvantagem séria: o servidor da Microsoft **busca o arquivo pela URL**
  pra renderizar — isso envia a URL (e, indiretamente, o conteúdo) do
  documento da operação pra fora da infraestrutura ASC/Core, pra um
  serviço de terceiro. Só funciona se `file.url` for **publicamente
  acessível pela internet** (sem geobloqueio/firewall interno) — se o
  storage do Core estiver atrás de rede privada/VPN, a Microsoft não
  consegue buscar e o viewer falha. Implicação de segurança/compliance
  (documentos de operação podem ser sensíveis — notas fiscais, romaneios)
  que não é decisão técnica, é decisão de produto/negócio.

**Opção C — Lib client-side de renderização (ex.: `mammoth` pra DOCX,
`xlsx`/`sheetjs` pra planilha, renderizando em HTML/canvas dentro do
modal).**
- Vantagem: preview real, sem enviar o arquivo pra terceiro (processa no
  browser do usuário, só busca o binário do storage já confiável).
- Desvantagem: **dependência nova no `package.json`** — estoura
  diretamente a regra 3 (trava de 24h + allowlist do `bunfig.toml`) e a
  regra 4 (precisa confirmar compatibilidade bun+npm). Formatos legados
  binários (`.doc`/`.xls`, pré-OOXML) normalmente não são suportados por
  essas libs, só os `.docx`/`.xlsx` modernos — cobertura parcial de
  "e afins". Exige aprovação explícita antes de eu sequer propor o nome
  do pacote no plano de implementação.

**Minha recomendação (não é decisão minha, é sugestão):** Opção A agora
(zero risco, zero dependência, cobre o pedido literal — "exibir" pode
legitimamente incluir "oferecer visualização segura mesmo que seja
download-then-open" para tipos que o browser não renderiza), com a porta
aberta pra Opção B ou C como incremento futuro *se* o usuário confirmar
que a URL do storage é pública/segura o bastante e que preview real de
Office vale o dependency risk.

### 6.1 Decisão confirmada pelo usuário

**Opção C — libs client-side**, com pacotes exatos autorizados
explicitamente:

- **`mammoth`** — renderiza DOCX (e DOC, com a ressalva de cobertura de
  `mammoth` abaixo) em HTML dentro do modal, direto no browser do
  usuário. Não envia o arquivo pra nenhum serviço de terceiro — só busca
  o binário da própria `file.url` (storage do Core) e processa
  localmente.
- **`xlsx`** (SheetJS) — lê XLSX/XLS/CSV e renderiza como tabela HTML
  dentro do modal, mesmo raciocínio de processamento local.
- **PPTX/PPT — sem lib client-side viável.** Não existe biblioteca madura
  e amplamente usada pra renderizar apresentações PowerPoint em HTML/canvas
  no browser (o equivalente de `mammoth`/`xlsx` pra esse formato não
  existe no mesmo nível de maturidade) — nenhuma foi proposta nem
  autorizada. PPTX cai na **Opção A** (fallback ícone + nome + botão de
  download/abrir em nova aba), pela mesma razão prática de "não há
  alternativa viável", não por escolha de produto.

**Autorização explícita da regra 3 (AGENTS.md):** o usuário autorizou por
nome exato os dois pacotes (`mammoth`, `xlsx`) como dependência nova do
`package.json` — isso satisfaz o requisito de "confirmar com o usuário
antes de adicionar qualquer pacote" da regra 3. Fica registrado aqui como
a evidência dessa confirmação, pro `portal-dev-agent` não precisar
perguntar de novo na hora de implementar.

Isso é **duas coisas distintas**, e só a primeira já está resolvida por
esta SPEC:

1. **Adicionar `mammoth` e `xlsx` como dependência em `package.json`**
   (`bun add mammoth xlsx`) — autorizado, sem pendência.
2. **Se** o `bun install` recusar a versão resolvida por causa da trava de
   24h (`minimumReleaseAge = 86400` em `bunfig.toml` — só dispara se a
   versão publicada do pacote no momento da instalação tiver menos de 24h),
   **então** (e só então) os nomes `mammoth`/`xlsx` entram em
   `minimumReleaseAgeExcludes`. Também já autorizado por esta mesma
   decisão do usuário (mesmo pedido, mesma confirmação) — não é uma nova
   pergunta a fazer se isso acontecer durante a implementação, é só
   executar o passo. Ver §8/§10 pro registro desse passo no plano de
   arquivos.

### 6.2 Cobertura e ressalvas conhecidas (documentado, não bloqueia aprovação)

- `mammoth` é focado em `.docx` (formato OOXML); suporte a `.doc` binário
  legado (pré-2007) é limitado/inexistente na prática — se um `.doc`
  antigo não renderizar, `FilePreviewModal` cai no mesmo fallback da
  Opção A (§6.3) em vez de mostrar erro.
- `xlsx`/SheetJS cobre `.xlsx`/`.xls`/`.csv` bem; planilhas muito grandes
  podem ficar pesadas pra renderizar como tabela HTML dentro de um modal —
  sem paginação/virtualização nesta primeira versão (fora de escopo,
  registrado como risco em §13).
- Fórmulas, formatação condicional, gráficos embutidos (XLSX) e
  formatação rica avançada (DOCX) não são objetivo — o preview é
  "conteúdo legível", não um substituto do Word/Excel.

### 6.3 Fallback (Opção A) — quando não há preview real

Usado para: PPTX/PPT (sem lib viável), qualquer tipo não reconhecido, e
qualquer erro de parsing de `mammoth`/`xlsx` (arquivo corrompido, `.doc`
legado não suportado, etc.). Ícone genérico por extensão + nome do
arquivo + botão de download/abrir em nova aba (reaproveita o mesmo link
que já existe na tabela de Documentos hoje) — nunca tela em branco/erro
não tratado (RF3).

## 7. Requisitos não funcionais

- RNF1 — `bun run check` + `bun run lint` passam.
- RNF2 — Duas dependências novas autorizadas explicitamente (§6.1):
  `mammoth` e `xlsx`. Adicionadas via `bun add mammoth xlsx` (mantendo
  `package-lock.json` em paridade pra compatibilidade npm, regra 4). Se o
  `bun install` acionar a trava de 24h (`minimumReleaseAge` em
  `bunfig.toml`) pra alguma delas, os dois nomes já estão pré-autorizados
  a entrar em `minimumReleaseAgeExcludes` — não é uma nova pergunta.
- RNF3 — `FilePreviewModal` fica em `src/components/ui/**` (não é input de
  formulário — regra 10 não se aplica; é apresentação read-only, mesmo
  critério de `confirmation-modal.tsx`/`view-toggle`).
- RNF4 — Sem alteração de contrato do Core — nenhum endpoint novo
  necessário (confirmado em §2.1); se essa premissa se provar errada
  durante a implementação, isso vira `SCOPE CONFLICT`.

## 8. Desenho

```
package.json / bun.lock / package-lock.json
  + mammoth                    (dependência nova, autorizada em §6.1)
  + xlsx                       (dependência nova, autorizada em §6.1)

bunfig.toml
  minimumReleaseAgeExcludes    (editar SE E SOMENTE SE o bun install
                                 acionar a trava de 24h pra `mammoth`
                                 e/ou `xlsx` — autorização já dada em
                                 §6.1, não repetir a pergunta)

src/components/ui/
  file-preview-modal.tsx     (criar — FilePreviewModal, FilePreviewFile,
                               usa mammoth/xlsx pros ramos DOCX/XLSX)
  file-preview-modal.module.css  (criar, se precisar de CSS local —
                                   ex.: altura fixa do <iframe> de PDF /
                                   altura com scroll da tabela XLSX
                                   renderizada; avaliar na implementação
                                   se dá pra resolver só com utilitárias
                                   Bootstrap)

src/components/operations/tabs/
  Documents.tsx               (editar — estado `previewing`, botão
                                "visualizar", `<FilePreviewModal>`)

src/i18n/dictionaries/{pt-BR,en,es,zh}/
  filePreview.json             (criar — namespace do modal genérico)
  administrative-operations.json (editar — chave do botão "visualizar" na
                                   aba Documentos)
```

## 9. Reuso futuro (fora do escopo desta SPEC, registrado por transparência)

`Containers.tsx` (fotos, `FileDTO[]`) e `Romaneio.tsx` (planilha
importada, `FileDTO`) hoje só linkam pro storage do mesmo jeito que
`Documents.tsx` linkava antes desta SPEC. Como `FilePreviewModal` é
genérico por desenho (RF6), eles são candidatos diretos a um item futuro
da mesma leva ("Item 2", "Item 3"...) da lista do usuário — não estou
implementando isso agora, só registrando que o componente já nasce pronto
pra esse reuso sem precisar de refactor.

## 10. Arquivos esperados

| Arquivo                                                          | Ação   |
| ----------------------------------------------------------------- | ------ |
| `package.json`                                                    | editar — `+ mammoth`, `+ xlsx` |
| `bun.lock`                                                        | editar (gerado por `bun add`) |
| `package-lock.json`                                                | editar (paridade npm, regra 4) |
| `bunfig.toml`                                                     | editar **só se** a trava de 24h disparar pra `mammoth`/`xlsx` (§6.1) |
| `src/components/ui/file-preview-modal.tsx`                       | criar  |
| `src/components/operations/tabs/Documents.tsx`                   | editar |
| `src/i18n/dictionaries/pt-BR/filePreview.json`                   | criar  |
| `src/i18n/dictionaries/en/filePreview.json`                      | criar  |
| `src/i18n/dictionaries/es/filePreview.json`                      | criar  |
| `src/i18n/dictionaries/zh/filePreview.json`                      | criar  |
| `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json` | editar (chave do botão) |

## 11. Critérios de aceitação

| #   | Critério                                                                                                     | Como verificar                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| CA1 | `FilePreviewModal` renderiza `<img>` para `contentType` `image/*` (ou extensão de imagem sem `contentType`)   | leitura de código + teste manual com um documento imagem |
| CA2 | `FilePreviewModal` renderiza `<iframe>`/`<object>` de PDF para `contentType application/pdf`                  | leitura de código + teste manual                |
| CA3 | `.docx` renderiza via `mammoth`, `.xlsx` via `xlsx`/SheetJS; `.pptx` e tipo desconhecido caem no fallback §6.3; erro de parsing também cai no fallback — nunca tela branca/erro não tratado | leitura de código + teste manual com um `.docx` e um `.xlsx` reais, e um `.pptx` |
| CA4 | Botão "visualizar" na aba Documentos abre o modal com o arquivo da linha correta                              | teste manual em `/administrative/operations/:id` (aba Documentos) |
| CA5 | Fechar o modal (X, ESC, clique fora) não deixa estado orfão nem refaz chamada de rede                         | leitura de código (`onHide` só limpa state local) |
| CA6 | `FilePreviewModal` não importa nada de `@/components/operations/**` nem `@/api/generated/endpoints/document/**` | `grep` no arquivo do componente                  |
| CA7 | As 4 pastas de locale têm `filePreview.json` com as mesmas chaves (pt-BR canônico)                            | diff estrutural dos 4 arquivos                  |
| CA8 | `bun run check` e `bun run lint` passam                                                                       | rodar os comandos                                |
| CA9 | `mammoth` e `xlsx` aparecem em `package.json` (dependencies), instalação via `bun add` bem-sucedida; se a trava de 24h disparou, os nomes aparecem em `bunfig.toml` (`minimumReleaseAgeExcludes`) | leitura de `package.json`/`bunfig.toml` + `bun install` sem erro |

## 12. Numeração e branch

`specs/` já tem SPECs sequenciais até `19` (`19-dashboard-home-redirect`,
`IMPLEMENTED`, também fora do plano de ondas de `BRANCHING.md`, mesmo
precedente de "pequena, isolada, direto na branch corrente"). Esta é a
primeira de uma lista de pequenas SPECs de Operações que o usuário vai
pedir uma a uma — não é sub-SPEC de SPEC-07 (aquela árvore, `07-01` a
`07-09`, já fechou e está `IMPLEMENTED`/mergeada). Sigo a numeração linear
existente: `SPEC-20`. As próximas da mesma lista continuam a sequência
(`21`, `22`, ...) — não uso um prefixo `operations-NN` separado porque
isso criaria dois esquemas de numeração coexistindo em `specs/` sem
necessidade (não há uma "onda" nova o bastante pra justificar isolamento,
diferente da árvore `07-NN` que existia por causa do tamanho da SPEC-07
original). Vou registrar essa decisão de numeração em `specs/BRANCHING.md`
(nova seção curta, "SPECs pós-fechamento") quando esta SPEC for aprovada,
para não repetir a pergunta a cada item da lista.

Branch: a definir junto com a aprovação — segue o mesmo precedente de
SPEC-19 (branch pequena e isolada nascendo da branch corrente do
workspace) salvo instrução em contrário do usuário.

## 13. Riscos

- `mammoth`/`xlsx` processam o binário inteiro no browser do usuário —
  arquivo muito grande pode travar a UI por alguns instantes (parsing
  síncrono no thread principal); mitigação mínima: estado de loading
  (`LoadingState`) enquanto o `fetch`+parsing roda, sem debounce/worker
  nesta primeira versão (fora de escopo — registrar como possível
  follow-up se algum documento real se mostrar grande o bastante pra
  incomodar).
- `.doc`/`.xls` legados (binário pré-OOXML) têm suporte limitado/nulo nas
  duas libs — cai no fallback §6.3 em vez de erro, mas o usuário perde o
  preview real pra esses arquivos antigos; aceito, documentado em §6.2.
- `<iframe>`/`<object>` de PDF depende do viewer nativo do browser — em
  browsers/engines sem viewer de PDF embutido (raro hoje, mas existe em
  alguns webviews restritos) cai pra download do arquivo em vez de
  preview inline; aceito como limitação de plataforma, não bug desta SPEC.
- Ícone genérico por extensão desconhecida (`bi-file-earmark`) pode não
  cobrir toda extensão real que o Core aceita em `DocumentType`/upload —
  aceito, não é bloqueante (fallback visual, não funcional).
- Duas dependências novas (`mammoth`, `xlsx`) aumentam a superfície de
  supply-chain do projeto — mitigado pela trava de 24h padrão do
  `bunfig.toml` (só bypassada por nome explícito, já autorizado em §6.1)
  e pela natureza dos pacotes (bibliotecas de parsing puro, sem rede,
  amplamente usadas — `xlsx`/SheetJS e `mammoth` são padrão de fato pra
  esses formatos no ecossistema JS).

## 14. Decisões pendentes

Nenhuma. O `[NEEDS_DECISION]` de §6 foi resolvido pelo usuário: Opção C
(`mammoth` + `xlsx`), com PPTX/PPT caindo no fallback §6.3 por falta de
lib viável. SPEC aprovada por inteiro (imagem, PDF, DOCX/XLSX via lib,
PPTX/fallback, botão na aba Documentos).

---

**Status:** `APPROVED` — usuário decidiu o `[NEEDS_DECISION]` de §6 (Opção
C: `mammoth` + `xlsx`, PPTX no fallback §6.3) e aprovou a SPEC por inteiro
(`APROVAR SPEC-20`, imagem/PDF/DOCX/XLSX/fallback todos juntos). Pronta
pra virar `IN_PROGRESS` quando a implementação começar — ver §12 pra
branch (ainda a confirmar/criar) e §10 pro primeiro passo prático
(`bun add mammoth xlsx`, revisar se a trava de 24h dispara antes de
seguir pro resto dos arquivos).

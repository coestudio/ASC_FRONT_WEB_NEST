# SPEC-35 — Suporte a câmera no mobile (`InputPhotoSingle`/`InputPhotoMulti`)

- **ID:** SPEC-35
- **Nome:** photo-capture-mobile
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/Form/Fields/{InputPhotoSingle,InputPhotoMulti}.tsx`
- **Contexto do pedido:** item do `TODO.md` sobre suporte mobile de
  câmera nos campos de foto.

---

## 1. Objetivo

Permitir que o usuário tire uma foto na hora, direto pela câmera do
celular, ao usar `InputPhotoSingle`/`InputPhotoMulti` — hoje os dois
campos têm só `accept="image/*"`, sem o atributo `capture`, então o
browser mobile abre o seletor de arquivo genérico (galeria), não a
câmera diretamente.

## 2. Contexto

Confirmado em código: `InputPhotoSingle.tsx:92` e
`InputPhotoMulti.tsx:59` têm `accept="image/*"` sem `capture`. O
atributo HTML `capture` (`capture="environment"` ou `capture="user"`)
sinaliza ao browser mobile para abrir a câmera diretamente em vez do
seletor de arquivos — suportado nos principais browsers mobile (Chrome
Android, Safari iOS), mas **não força** o comportamento (o usuário ainda
pode optar por escolher da galeria em alguns browsers/versões — é uma
sugestão de UI, não uma garantia).

O segundo pedido do `TODO.md` — "garantir que fique salva no celular da
pessoa também" — é ambíguo e tecnicamente delicado (ver §3
`[NEEDS_DECISION]`).

## 3. `[NEEDS_DECISION]`

O que exatamente significa "garantir que fique salva no celular"? Em um
formulário web comum, o navegador **não tem permissão programática**
para salvar automaticamente um arquivo na galeria/armazenamento do
dispositivo sem ação explícita do usuário — isso seria um risco de
segurança se fosse possível (nenhum site deveria poder gravar arquivos no
storage do usuário sem consentimento por clique). O que **é** possível:

1. **Nada automático — comportamento padrão do browser.** Quando o
   usuário tira a foto pela câmera nativa (via `capture`), em muitos
   browsers/OS a foto tirada **já fica salva na galeria do aparelho por
   padrão** (comportamento do próprio app de câmera nativo do celular,
   não algo que o site controla) — nesse caso, "garantir que fique salva"
   já aconteceria de graça, sem código adicional, na maioria dos
   aparelhos modernos. Precisa ser validado empiricamente (Android/iOS,
   diferentes browsers) se isso é sempre verdade.
2. **Botão explícito de "Salvar cópia no dispositivo"** — depois de tirar
   a foto e ela aparecer no preview do formulário, oferecer um botão que
   dispara um download do arquivo (`<a download>` ou
   `URL.createObjectURL` + clique programático) — isso conta como "ação
   do usuário" e é tecnicamente viável, mas é um passo extra que o
   usuário precisa clicar (não é automático).
3. **Não implementar nada além do `capture`** — se a opção 1 já cobre o
   caso de uso (foto tirada pela câmera nativa já cai na galeria por
   comportamento padrão do SO), pode não haver necessidade de nenhum
   código adicional além de adicionar o atributo `capture`.

**Vantagens/desvantagens:**

- Opção 1 não exige código, mas depende de comportamento de SO/browser
  fora do controle do projeto — precisa validação manual em pelo menos
  Android + iOS antes de considerar resolvido.
- Opção 2 dá controle explícito ao usuário, mas adiciona um clique extra
  e complexidade de UI (quando mostrar o botão, o que fazer se
  falhar).
- Opção 3 é a mais simples, mas só resolve o problema se a opção 1 for
  confirmada como verdadeira na prática.

**Impacto:** sem essa decisão, não dá para escrever requisitos
funcionais precisos além de "adicionar `capture`" (que é consenso, ver
§4). A parte de "garantir salvo no celular" fica bloqueada.

**Aguardando decisão do usuário** sobre qual comportamento é esperado
antes de fechar o escopo completo desta SPEC.

## 4. Escopo (parte não ambígua, pode avançar já)

1. Adicionar `capture="environment"` (câmera traseira, mais comum para
   fotos de documento/produto/container) a `InputPhotoSingle` e
   `InputPhotoMulti`, mantendo `accept="image/*"` — em desktop/browsers
   sem suporte a `capture`, o atributo é ignorado silenciosamente (abre o
   seletor de arquivo normal), sem regressão.
2. A parte de "garantir salvo no celular" (RF a definir) fica bloqueada
   até a decisão do §3.

## 5. Fora do escopo

- Mudar o fluxo de upload em si (`onChange`/`field.value` como `File`) —
  só o atributo do `<input type="file">` muda.
- `InputAvatar` (crop circular, caso específico de perfil) — não faz
  parte do pedido do `TODO.md`, que cita só
  `InputPhotoSingle`/`InputPhotoMulti`. Se o usuário quiser o mesmo
  tratamento lá, é extensão a confirmar.

## 6. Requisitos funcionais

- **RF1** — `InputPhotoSingle`/`InputPhotoMulti` usam
  `capture="environment"` no `<input type="file">`.
- **RF2 (bloqueado por §3)** — comportamento de garantir a foto salva no
  dispositivo, conforme a opção decidida.

## 7. Camada de dados

Não se aplica — mudança de atributo HTML em componente de UI existente.

## 8. Arquivos esperados

- `src/layouts/Form/Fields/InputPhotoSingle.tsx`
- `src/layouts/Form/Fields/InputPhotoMulti.tsx`

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Em um browser mobile real (Android Chrome e/ou iOS Safari), tocar em "Escolher foto"/"Adicionar foto" abre a câmera (ou oferece a opção de câmera de forma proeminente), não só a galeria |
| CA2 | Em desktop, o comportamento não muda (nenhuma regressão) |
| CA3 (bloqueado) | Critério de "salvo no dispositivo" a definir conforme decisão do §3 |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 10. Riscos

- **R1** — Comportamento de `capture` varia entre browsers/versões —
  validar manualmente em pelo menos 2 combinações reais de
  aparelho/browser antes de fechar como `IMPLEMENTED`.

# SPEC-35 — Suporte a câmera no mobile (`InputPhotoSingle`/`InputPhotoMulti`)

- **ID:** SPEC-35
- **Nome:** photo-capture-mobile
- **Status:** IMPLEMENTED (2026-09-16) — ver §11 (Implementation Notes).
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

**RESOLVIDA (2026-09-15):** opção 3 — **nada além do `capture`**. O
usuário confirmou que o comportamento padrão do celular (foto tirada
pela câmera nativa já cai na galeria do aparelho) já é suficiente, sem
necessidade de botão de download explícito nem validação formal por
opção 1. Nenhum código adicional além de RF1 (§4).

## 4. Escopo (parte não ambígua, pode avançar já)

1. Adicionar `capture="environment"` (câmera traseira, mais comum para
   fotos de documento/produto/container) a `InputPhotoSingle` e
   `InputPhotoMulti`, mantendo `accept="image/*"` — em desktop/browsers
   sem suporte a `capture`, o atributo é ignorado silenciosamente (abre o
   seletor de arquivo normal), sem regressão.
2. "Garantir salvo no celular" não exige nenhum código adicional (§3,
   opção 3 confirmada) — o comportamento padrão do SO/câmera nativa já
   cobre o pedido.

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
- **RF2** — nenhuma ação adicional além de RF1 (§3 confirmou que o
  comportamento padrão do celular já basta).

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
| CA3 | Nenhum critério adicional — comportamento padrão do celular já atende (§3) |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 10. Riscos

- **R1** — Comportamento de `capture` varia entre browsers/versões —
  validar manualmente em pelo menos 2 combinações reais de
  aparelho/browser antes de fechar como `IMPLEMENTED`.

## 11. Implementation Notes (2026-09-16)

`capture="environment"` adicionado ao `<input type="file">` de
`InputPhotoSingle.tsx` e `InputPhotoMulti.tsx`, mantendo `accept="image/*"`
— único atributo alterado em cada arquivo, nenhuma mudança de
`onChange`/`field.value`. Comentário de topo de cada arquivo atualizado
pra documentar o novo atributo (não-óbvio: por que `capture` e não outra
coisa). RF2 (§3, opção 3 confirmada) não exigiu nenhum código além disso.

**Arquivos alterados:**
- `src/layouts/Form/Fields/InputPhotoSingle.tsx`
- `src/layouts/Form/Fields/InputPhotoMulti.tsx`

**Validação:** `bun run check`/`lint` limpos, sem findings novos nos dois
arquivos (CA4). **CA1/R1 seguem pendentes de verificação manual** — não
tenho como testar `capture` num browser mobile real a partir daqui;
precisa ser confirmado num Android Chrome e/ou iOS Safari de verdade
antes de considerar R1 encerrado. CA2 (sem regressão em desktop) é
esperado por natureza do atributo (`capture` é ignorado silenciosamente
onde não há suporte), mas também vale uma conferida rápida.

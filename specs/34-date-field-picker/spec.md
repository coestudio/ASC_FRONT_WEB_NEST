# SPEC-34 — Seletor visual de data (`InputDate`)

- **ID:** SPEC-34
- **Nome:** date-field-picker
- **Status:** IMPLEMENTED (2026-09-16) — ver §9 (Implementation Notes).
- **Status anterior:** DRAFT — decisão de §3 adiada de propósito pelo
  usuário (2026-09-15): "a ser decidido quando a spec for ser
  implementada".
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/Form/Fields/InputDate.tsx`
- **Contexto do pedido:** item do `TODO.md` sobre `InputDate.tsx` não ter
  seletor visual de calendário.

---

## 1. Objetivo

Dar a `InputDate` (usado em todo formulário com campo de data do
projeto) uma forma de selecionar a data por calendário visual, além da
digitação mascarada (`DD/MM/AAAA`) que já existe hoje.

## 2. Contexto

`InputDate.tsx` hoje é um `IMaskInput` com máscara `00/00/0000`
(`DateMaskField`), sem nenhum seletor de calendário. O comentário no
próprio arquivo (`InputDate.tsx:27-36`) documenta que um
`react-datepicker` existia antes e foi removido porque `selected`
(controlado por `field.value`, só atualizado quando a data ficava
completa) sobrescrevia o texto que o usuário ainda estava digitando —
resetando o campo a cada tecla.

`InputDate` é usado em múltiplos formulários do projeto (Profile,
Acesso, Operação, Containers — qualquer tela com data de nascimento,
data de operação, data de lacre etc.), então qualquer regressão de UX
aqui se propaga amplamente.

## 3. `[NEEDS_DECISION]`

O `TODO.md` já registra que esta decisão precisa ser tomada pelo usuário
antes de implementar:

> revisar se dá pra trazer [`react-datepicker`] de volta sem esse
> problema, ou outra solução de seletor.

Opções:

1. **Reviver `react-datepicker`, corrigindo o bug de reset.** A causa
   raiz documentada (`selected` sobrescrevendo texto em digitação) tem
   solução conhecida no ecossimena React: manter o texto digitado como
   estado local (exatamente como `DateMaskField` já faz hoje) e usar o
   `react-datepicker` **só** como um popup de calendário que, ao
   selecionar uma data nele, chama `field.onChange`/atualiza o texto —
   sem nunca deixar a prop `selected` re-renderizar o campo de texto
   enquanto o usuário digita (`open`/`onChange` do datepicker
   desacoplado do `value` do input de texto). Risco: `react-datepicker`
   já foi removido uma vez por esse motivo — precisa de testes manuais
   cuidadosos (digitação parcial, digitação de data inválida, seleção
   via calendário, blur) antes de considerar resolvido.
2. **Trocar por `<input type="date">` nativo do browser** ao lado do
   campo mascarado (ou substituindo-o) — sem dependência nova, comportamento
   de calendário nativo do SO/browser, mas com UX inconsistente entre
   browsers/idiomas (formato de data varia por locale do SO, não pelo
   `useLocale()` do projeto) e menos controle visual (não segue o tema
   Bootstrap/brand do projeto).
3. **Outra lib de datepicker** (ex. `react-day-picker`,
   `@popperjs`-based custom) — dependência nova, precisa passar por
   `[NEEDS_DECISION]` de adicionar pacote (regra 3/`bunfig.toml`
   allowlist) de qualquer forma.
4. **Manter só o campo mascarado atual, sem calendário visual** — não
   implementa nada, fecha o item como "não vale o risco".

**Vantagens/desvantagens:**

- Opção 1 reaproveita uma lib já conhecida do time, mas carrega o
  histórico de bug — exige mais rigor de teste.
- Opção 2 é zero-dependência e mais simples, mas perde consistência
  visual/i18n entre navegadores.
- Opção 3 é a mais trabalhosa (nova dependência, nova curva de
  aprendizado) sem garantia de não ter o mesmo tipo de bug de sincronização.
- Opção 4 é a mais segura, mas não atende ao pedido original.

**Impacto:** `InputDate` é campo compartilhado por múltiplos formulários
— qualquer opção escolhida precisa ser testada em pelo menos 2-3 telas
consumidoras antes de fechar a SPEC como `IMPLEMENTED`.

**RESOLVIDA (2026-09-16):** opção 1 — reviver `react-datepicker`, popup
desacoplado do texto digitado. `react-datepicker` já era dependência
instalada (usado em `InputDateTime`/`InputTime`), sem necessidade de
allowlist nova no `bunfig.toml`.

## 4. Escopo

1. `DateMaskField` (o `IMaskInput` mascarado, `dd/mm/aaaa`) continua
   exatamente como estava — nenhuma mudança na lógica de digitação.
2. Novo popup de calendário (`react-datepicker`), acionado só por um
   botão-ícone — nunca controla o texto digitado diretamente; ao
   selecionar uma data no calendário, só chama `field.onChange(iso)`,
   e o próprio `DateMaskField` sincroniza o texto exibido pelo mesmo
   caminho já usado para reset externo do form (comparação com
   `lastExternalValue`).

## 5. Fora do escopo

- Mudar o formato de armazenamento da data (`ISO yyyy-mm-dd`) — só a UI
  de seleção muda, o valor no formulário continua ISO.
- Qualquer campo de data/hora combinado (`InputDateTime.tsx`) — fora
  desta SPEC, a menos que o usuário confirme que quer o mesmo tratamento
  lá (perguntar durante a decisão do §3, se relevante).

## 6. Arquivos esperados

- `src/layouts/Form/Fields/InputDate.tsx`

## 7. Critérios de aceitação

| # | Critério | Status |
|---|----------|--------|
| CA1 | Digitação parcial/inválida no campo mascarado não é resetada pelo calendário | PASS |
| CA2 | Selecionar uma data no calendário atualiza o texto do campo | PASS |
| CA3 | Botão do calendário fica visualmente ancorado no campo (não "solto" abaixo/longe dele) | PASS (2 rodadas de correção, ver §9) |
| CA4 | `bun run check` + `bun run lint` sem regressão | PASS |

## 8. Riscos

Baixo — decisão fechada, testado manualmente em tela real (Acesso →
Novo usuário → Data de nascimento) pelo usuário.

## 9. Implementation Notes (2026-09-16)

**Arquivos alterados:** `src/layouts/Form/Fields/InputDate.tsx`.

- Helpers novos `isoToDateObj`/`dateObjToIso` — conversão só para
  alimentar o `selected`/`onChange` do `DatePicker`, nunca usados pelo
  `DateMaskField` (que continua 100% inalterado na lógica de digitação).
- `CalendarToggle` — botão (`forwardRef`, exigido pelo `customInput` do
  `react-datepicker`) que só abre/fecha o popup, sem participar da
  digitação.
- `DatePicker` renderizado com `customInput={<CalendarToggle />}`,
  `selected`/`onChange` plugados no mesmo `field` do `react-hook-form`
  (sem estado próprio duplicado).

**2 bugs encontrados e corrigidos durante o teste manual do usuário
(tela real, `admin/access` → Novo usuário → Data de nascimento):**

1. **Ícone invisível/sem área de clique.** O ícone original (decorativo,
   preservado do código antigo) usava classes do **Font Awesome**
   (`fa-regular fa-calendar`) — biblioteca nunca instalada/carregada
   neste projeto (confirmado por grep: usada só nestes 3 arquivos de
   `Fields`, sem nenhum `<link>`/import de Font Awesome em lugar
   nenhum). Antes disso não importava (ícone só decorativo, sem
   `pointer-events`), mas virando o único gatilho do calendário, ficou
   sem nada visível/clicável. Trocado por **Bootstrap Icons**
   (`bi bi-calendar3`, já carregado no projeto,
   `src/styles/globals/index.css`) + área fixa de 28×28px no botão
   (não depende só do glyph do ícone pra ter hit-area).
2. **Botão "flutuando" longe do campo, embaixo e à esquerda.** Causa:
   `react-datepicker` embrulha o `customInput` em dois `<div>`s próprios
   (`.react-datepicker-wrapper` > `.react-datepicker__input-container`),
   e o segundo já vem com `position: relative` fixo no CSS da própria
   lib (`node_modules/react-datepicker/dist/react-datepicker.css`).
   Um `position: absolute` colocado *dentro* do botão (`CalendarToggle`)
   se ancorava nesse wrapper interno — que fica logo abaixo do campo de
   texto (`.form-control` é `display: block`, então o próximo elemento
   inline-block cai pra linha seguinte) e quase sem largura (`width:
   100%` de um `inline-block` sem conteúdo em fluxo) — não no campo em
   si. Corrigido movendo o `position: absolute` pra um `<div>` que
   envolve o `<DatePicker>` inteiro (por fora dos wrappers da lib),
   deixando `CalendarToggle` sem posicionamento próprio.
3. Adicionado `padding-right: 34px` no `IMaskInput` pra reservar espaço
   pro botão do calendário e o texto digitado nunca ficar por baixo dele
   em colunas mais estreitas (`col: { md: 6 }`/`md: 4`).

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — PASS.
- `bun run lint` — sem warnings/erros novos em `InputDate.tsx`.
- Teste manual do usuário em tela real (`admin/access`, modal "Novo
  usuário", campo "Data de nascimento") — confirmado funcionando após
  as 2 correções acima.

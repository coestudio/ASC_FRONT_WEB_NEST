# SPEC-34 — Seletor visual de data (`InputDate`)

- **ID:** SPEC-34
- **Nome:** date-field-picker
- **Status:** DRAFT
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

**Aguardando decisão do usuário** sobre qual opção seguir antes de
detalhar requisitos funcionais e aprovar esta SPEC.

## 4. Escopo (a definir após a decisão)

Bloqueado até a decisão do §3. Depois de decidido, esta SPEC será
atualizada com RF/CA específicos da opção escolhida.

## 5. Fora do escopo

- Mudar o formato de armazenamento da data (`ISO yyyy-mm-dd`) — só a UI
  de seleção muda, o valor no formulário continua ISO.
- Qualquer campo de data/hora combinado (`InputDateTime.tsx`) — fora
  desta SPEC, a menos que o usuário confirme que quer o mesmo tratamento
  lá (perguntar durante a decisão do §3, se relevante).

## 6. Arquivos esperados (estimativa, depende da opção escolhida)

- `src/layouts/Form/Fields/InputDate.tsx`
- `package.json` / `bunfig.toml` (só se a opção 1 ou 3 exigir
  adicionar/reinstalar dependência)

## 7. Critérios de aceitação (a definir após a decisão)

Bloqueado até a decisão do §3.

## 8. Riscos

- **R1** — Reviver `react-datepicker` sem testar exaustivamente pode
  reintroduzir o bug original (reset ao digitar) — é o risco central
  desta SPEC, independente da opção escolhida.

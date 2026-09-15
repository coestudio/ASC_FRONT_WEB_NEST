# SPEC-27 — Investigação: excluir um "acesso" derruba a própria sessão (redireciona pro login)

- **ID:** SPEC-27
- **Nome:** delete-user-unexpected-logout-audit
- **Status:** IN_PROGRESS — Fase 1 (instrumentação de diagnóstico)
  `IMPLEMENTED`; Fase 2 (correção definitiva) permanece `BLOCKED` até o
  usuário reproduzir o bug com DevTools/Network aberto (ver §6) e decidir
  §7.
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/admin/access/index.tsx` (ação de
  excluir), `src/api/mutator.ts` (interceptor global de erro),
  `src/routes/api/core.ts` (proxy BFF, limpeza de cookie em 401) — e,
  possivelmente, `warren/Core` (fora do território deste agente, se a
  causa raiz confirmada estiver lá)
- **Depende de:** nenhuma
- **Bloqueia:** nada
- **Contexto do pedido:** "Verificar, pois estou excluindo um acesso e ele
  me redireciona pro login" — usuário logado, ao excluir um usuário
  (`admin/access`, ação "delete"), é jogado de volta para `/auth/login`.

---

## 1. Objetivo

Diagnosticar por que excluir um registro de "acesso" (usuário, em
`admin/access`) desloga a sessão de quem está executando a ação, e propor
o ponto de correção — front ou Core — dependendo da causa confirmada.

## 2. Causa mecânica confirmada em código (front)

Existe um único caminho no front que desloga o usuário: qualquer resposta
HTTP com `status === 401` em **qualquer** chamada feita via
`axiosInstance` (todos os hooks gerados pelo Orval passam por aqui) dispara
`redirectToLogin()`:

```ts
// src/api/mutator.ts, linhas 194-199
if (axios.isAxiosError(error)) {
  const status = error.response?.status;
  if (status === 401) {
    redirectToLogin();
    return Promise.reject(error);
  }
```

`redirectToLogin()` (linhas 168-175) faz `window.location.href =
"/auth/login"` — full navigation, exatamente o sintoma relatado. Esse
comportamento é **intencional e documentado** (comentário linhas 161-167:
"usado tanto pra sessão expirada... quanto, a pedido explícito, pra falha
de servidor") — ou seja, **qualquer** 401 vindo de **qualquer** endpoint,
incluindo `DELETE /api/user/{id}` (`deleteMutation`, `access/index.tsx`
linha 226/371), derruba a sessão inteira, não só a ação que falhou.

Adicionalmente, o proxy BFF reage a 401 do Core **apagando o cookie de
sessão** na resposta:

```ts
// src/routes/api/core.ts, linhas 103-105
if (coreRes.status === 401) {
  outHeaders.append("set-cookie", "asc_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
}
```

Ou seja: se o Core responder `401` para a chamada de `DELETE
/api/user/{id}` por **qualquer** motivo (mesmo um motivo que não devesse
implicar logout — ex. uma regra de negócio específica daquele delete
retornando 401 em vez de 400/403/409), o efeito automático e já existente
no front é: apaga o cookie de sessão do usuário que fez a chamada **e**
força o front a navegar pra `/auth/login`. O front não distingue "minha
sessão expirou de verdade" de "esta ação específica retornou 401 por outro
motivo" — os dois casos têm o mesmo tratamento hoje, por decisão de design
anterior.

## 3. O que ainda não está confirmado

Não há, no código do front, nenhuma lógica que invalide a própria sessão do
usuário logado como efeito colateral de excluir outro usuário (`
invalidateList()`, linha 219/375, só invalida a query de listagem —
`getGetApiUserQueryKey()` — não mexe em `profileMeQueryOptions()` nem em
cookie/sessão). Isso deixa duas hipóteses **não confirmadas por este
agente** (fora do alcance de `NewPortal` verificar sozinho, já que a
resposta real vem do Core):

1. **Hipótese Core (mais provável, dado o sintoma):** `DELETE
/api/user/{id}` está retornando `401 Unauthorized` para o Core em algum
   cenário legítimo de negócio (ex.: tentar excluir um usuário com alguma
   restrição, ou uma regra de auth mal mapeada especificamente nesse
   endpoint) — quando deveria responder `400`/`403`/`409` (erro de
   requisição/permissão/conflito, que o front trata com toast, sem
   deslogar — ver `mutator.ts` linhas 215-232). Confirmar exige acesso ao
   código/logs do `warren/Core`, fora do território deste agente.
2. **Hipótese sessão real expirando por coincidência de tempo:** se o
   token de acesso (`accessToken`, `session.server.ts`) expira durante o
   uso da tela e a próxima chamada (o próprio delete) é a primeira a
   revelar isso, o 401 seria "correto" tecnicamente — mas o usuário
   percebe como "excluir causou o logout", quando na verdade foi
   coincidência de timing. Precisa confirmar quanto tempo a sessão dura
   (`session.server.ts`/`expiresAt`) e se o usuário reproduz isso logo
   após logar (afastando essa hipótese) ou só depois de uso prolongado.

## 4. Por que este agente não fecha a causa raiz sozinho

Território deste agente é só `NewPortal` (regra "Território" do
`portal-dev-agent`). Confirmar qual das duas hipóteses (ou outra) é real
exige ver a resposta HTTP de verdade da chamada `DELETE /api/user/{id}`
(status code exato + corpo) — algo que só aparece:

- No painel de rede do browser (DevTools → Network) no momento da
  reprodução, **ou**
- No código/logs do `warren/Core` (fora do território deste agente —
  território do `core-spec-agent`).

## 5. Plano — 2 fases

### Fase 1 (este agente, front, incondicional — pode ser feita já)

Independente da causa raiz do 401 em si, o comportamento de "qualquer 401
em qualquer chamada desloga a sessão inteira" é uma decisão de design já
tomada e documentada — mas vale registrar como risco (`R1`, §9): ele
**amplifica** qualquer 401 pontual (ainda que seja bug do Core, ainda que
seja um caso de borda de negócio) em "desloga o usuário sem aviso claro do
motivo real". Nesta fase, sem mudar essa política (mudar a política é
`[NEEDS_DECISION]`, ver §7), a melhoria possível e de baixo risco é:

- Adicionar instrumentação de diagnóstico: logar (`console.error` /
  telemetria já existente, se houver) o `status` + corpo da resposta antes
  de chamar `redirectToLogin()` em `mutator.ts`, especificamente para poder
  confirmar em produção/homologação, na próxima reprodução, exatamente o
  que o Core respondeu para `DELETE /api/user/{id}`.

### Fase 2 (depende da Fase 1 confirmar a causa)

- **Se confirmado que é bug do Core** (endpoint retornando 401 quando
  deveria ser outro código): abrir pedido formal ao Core (mesmo modelo da
  SPEC-23 §15) para corrigir o status code de `DELETE /api/user/{id}` no
  cenário identificado. Front não muda mais nada além da Fase 1.
- **Se confirmado que é expiração real de token durante uso prolongado**:
  não é bug, é UX de sessão expirando durante uso — nesse caso, o ajuste
  cabível seria um refresh de token silencioso antes de expirar, ou um
  aviso alguns minutos antes de expirar — **fora do escopo original desta
  SPEC**, viraria pedido novo (SPEC própria) se o usuário confirmar essa
  hipótese e quiser corrigir.

## 6. O que falta para decidir o plano definitivo

```
[NEEDS_DECISION]

Para fechar a causa raiz, preciso que o usuário reproduza o bug uma vez
com o DevTools do browser aberto (aba Network) e informe:

1. Qual o `status` HTTP exato da chamada que aparece como
   `DELETE .../api/core` (o front sempre bate em `/api/core`, com o path
   real do Core no header `x-core-path` — filtrar por esse endpoint) no
   momento da exclusão que causou o logout.
2. O corpo da resposta dessa chamada (aba Response/Preview do DevTools) —
   normalmente `{ "message": "..." }` ou um `ProblemDetails` do Core.
3. Se possível, quanto tempo o usuário estava logado antes de reproduzir
   (para descartar/confirmar a hipótese de expiração natural do token —
   §3.2).
4. Se o usuário estava excluindo **a própria conta** (login atual) ou a
   conta de **outro** usuário — se for a própria conta, o comportamento
   pode ser o esperado (você se excluiu, não tem mais sessão válida); o
   relato ("excluindo um acesso") sugere ser outro usuário, mas vale
   confirmar.

Sem essa informação, esta SPEC permanece `WAITING_APPROVAL` só para a Fase
1 (instrumentação de diagnóstico) — a Fase 2 (correção definitiva) fica
`BLOCKED` até a reprodução confirmar a causa.
```

## 7. Decisão de design pré-existente que este pedido reabre

```
[NEEDS_DECISION]

A política "qualquer 401, em qualquer chamada, desloga a sessão inteira"
(`mutator.ts`, comentário linhas 161-167) foi uma decisão explícita
anterior do usuário. Esta SPEC não a contesta por padrão — mas o próprio
sintoma relatado é uma consequência direta dela. Perguntas em aberto:

1. Manter a política como está (qualquer 401 desloga), e resolver o
   problema só na origem (Core não deveria mandar 401 nesse caso) —
   opção mais simples, não muda front além da Fase 1.
2. Restringir quando o front trata um 401 como "sessão expirada, deslogar"
   — ex.: só deslogar em 401 de endpoints "de identidade"
   (`/api/profile/me`, `/api/auth/*`), e para os demais 401 (ações
   pontuais como delete) mostrar um toast de erro sem deslogar, deixando
   quem decide se a sessão realmente caiu ser uma tentativa de navegação
   subsequente. Mudança de comportamento global, mais invasiva, precisa de
   decisão explícita por reverter uma decisão de design anterior (regra
   "Decisão já tomada, alguém pede pra mudar → PARE e confirme").

Aguardando decisão do usuário sobre 1 vs 2, e a reprodução de §6, antes de
qualquer implementação além da instrumentação de diagnóstico (Fase 1).
```

## 8. Requisitos funcionais (Fase 1, o único trecho não bloqueado)

- **RF1** — Antes de `redirectToLogin()` em `mutator.ts`, logar no console
  (dev) o método, `x-core-path`/URL, status e corpo da resposta que
  disparou o 401 — só para diagnóstico, sem mudar o comportamento
  observável pelo usuário final.

## 9. Riscos

- **R1** — Política global "401 sempre desloga" amplifica qualquer 401
  pontual em logout completo — decisão de design anterior, não uma falha
  de implementação; revisão é `[NEEDS_DECISION]` (§7).
- **R2** — Sem reprodução confirmada (§6), qualquer correção "definitiva"
  seria um chute — por isso a Fase 2 fica `BLOCKED` até então.

## 10. Requisitos não funcionais

- RNF1 — Instrumentação da Fase 1 não deve vazar dados sensíveis
  (token/cookie) no `console.error` — só status/corpo da resposta de erro
  (que já não deveria conter segredo, é o que o Core devolveu).
- RNF2 — `bun run check` + `bun run lint` depois da Fase 1.

## 11. Contrato de rota

Sem mudança.

## 12. Camada de dados

Sem mudança de contrato — Fase 1 só adiciona logging no interceptor
existente (`src/api/mutator.ts`).

## 13. Arquivos esperados (Fase 1)

- `src/api/mutator.ts` (editado — log de diagnóstico antes do redirect)

## 14. Critérios de aceitação

| # | Critério | Fase | Verificação |
| --- | --- | --- | --- |
| CA1 | Log de diagnóstico aparece no console ao reproduzir qualquer 401 | 1 | manual, DevTools console |
| CA2 | Causa raiz confirmada (Core vs expiração de token vs outra) | — | reprodução do usuário (§6) |
| CA3 | Correção definitiva aplicada conforme causa confirmada | 2 | a definir após CA2 |
| CA4 | `bun run check` e `bun run lint` passam (Fase 1) | 1 | comando |

---

Esta SPEC fica `WAITING_APPROVAL` para a Fase 1 (instrumentação, baixo
risco, reversível) e `BLOCKED` para a Fase 2 (correção definitiva) até a
reprodução de §6 e a decisão de §7. `APROVAR SPEC-27` autoriza só a Fase 1;
a Fase 2 exige uma nova aprovação explícita depois que a causa raiz for
confirmada.

## Implementation Notes (Fase 1)

`APROVAR SPEC-27` recebido, escopo explicitamente limitado à Fase 1 (log de
diagnóstico) — Fase 2 continua `BLOCKED`, não implementada.

- **Arquivo alterado:** `src/api/mutator.ts` — antes de `redirectToLogin()`
  no branch `status === 401` do interceptor de resposta, adicionado
  `console.error("[mutator] 401 recebido — deslogando sessão.", { method,
corePath, responseBody })`, capturando `error.config?.method`,
  `error.config?.headers?.["x-core-path"]` (o path real do Core, já que
  toda chamada bate em `/api/core`) e `error.response?.data` (corpo da
  resposta de erro). Não muda nenhum comportamento observável — só loga
  antes do redirect que já acontecia.
- **Comandos executados:** `bun run check` — VERIFIED, sem erros.
  `bun run lint` — VERIFIED, contagem de problemas idêntica ao baseline (66:
  3 pré-existentes em `session.server.ts`, 63 warnings), nenhum novo.
- **Critérios de aceitação:**

| # | Critério | Fase | Status |
| --- | --- | --- | --- |
| CA1 | Log de diagnóstico aparece no console ao reproduzir qualquer 401 | 1 | PASS (código — dispara em todo `status === 401`, antes do redirect) |
| CA2 | Causa raiz confirmada (Core vs expiração de token vs outra) | — | NOT VERIFIED — depende da reprodução do usuário (§6) |
| CA3 | Correção definitiva aplicada conforme causa confirmada | 2 | NOT VERIFIED — Fase 2 `BLOCKED`, não iniciada |
| CA4 | `bun run check` e `bun run lint` passam (Fase 1) | 1 | VERIFIED |

- **Decisões tomadas durante a implementação:** nenhuma além do escopo já
  definido (só Fase 1).
- **Limitações conhecidas:** o log só aparece no `console.error` do browser
  (DevTools) — não há telemetria/backend de log no front hoje para
  persistir isso automaticamente. Na próxima vez que o usuário reproduzir o
  bug de exclusão, precisa ter o DevTools aberto (aba Console, além da aba
  Network já pedida em §6) para capturar a mensagem.

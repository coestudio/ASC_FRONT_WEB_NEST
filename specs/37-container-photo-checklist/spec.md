# SPEC-37 — Containers: checklist de imagens necessárias

- **ID:** SPEC-37
- **Nome:** container-photo-checklist
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Containers.tsx`
  (`InputPhotoMulti` de fotos do container)
- **Contexto do pedido:** item do `TODO.md` ("modal de adicionar imagens
  do container precisa de um checklist das imagens necessárias").

---

## 1. Objetivo

Adicionar, ao modal de adicionar fotos de um container
(`OperationContainerPhotosFormValues`/`InputPhotoMulti`, dentro de
`Containers.tsx`), um checklist indicando quais fotos são "necessárias"
e se já foram anexadas.

## 2. Contexto

Hoje o modal de fotos do container usa `InputPhotoMulti` puro — upload
livre de N imagens, sem categorização nem indicação de quais fotos são
esperadas (ex.: foto do lacre, foto de dentro do container vazio, foto do
container cheio, foto da placa/identificação). Não existe, em nenhum
lugar do código ou do contrato do Core hoje, uma lista de "tipos de foto
obrigatórios" para container — confirmado que `ContainerOperationDTO` e o
endpoint de fotos (`usePostApiOperationOperationIdContainerIdPhoto`) não
têm nenhum campo de categoria/tipo de foto.

## 3. `[NEEDS_DECISION]`

Quais fotos são consideradas "necessárias" para um container? Isso é uma
regra de negócio que não está em nenhum lugar do código nem foi
especificada pelo usuário — não pode ser inventada. Perguntas em aberto:

1. **A lista é fixa** (ex.: sempre as mesmas N categorias — "lacre",
   "vazio", "cheio", "placa" — para todo container, de toda operação)?
2. **Ou é configurável** — por tipo de operação, por cliente, por produto,
   ou até por container individualmente? Se configurável, quem
   configura (admin via alguma tela nova) e onde isso fica persistido —
   isso teria implicação direta de contrato no Core (precisaria de um
   endpoint/campo para guardar a lista de categorias esperadas), o que
   tornaria esta SPEC dependente de mudança no Core (Grupo B/C, não
   Grupo A).
3. **Se a lista for fixa**, ela é a mesma para toda a aplicação, ou pode
   variar por operação/tipo de operação (Bale/Bag,
   `OperationType`/`OperationService` já existentes no domínio de
   Operação)?
4. **O checklist bloqueia o salvamento** se alguma foto obrigatória
   estiver faltando, ou é só um indicador visual (aviso, não bloqueio)?

**Vantagens/desvantagens de cada abordagem:**

- Lista fixa e hardcoded no front: mais simples de implementar, mas
  qualquer mudança de regra de negócio exige deploy de código —
  inflexível.
- Lista configurável via Core: correta a longo prazo, mas exige uma SPEC
  de Core (endpoint/campo novo) antes de poder ser consumida no front —
  este item sairia do Grupo A (frontend puro) para o Grupo B/C.

**Impacto:** sem essa decisão, não é possível escrever requisitos
funcionais nem desenhar a UI do checklist — a estrutura de dados por trás
dele depende inteiramente da resposta.

**Aguardando decisão do usuário** sobre qual das abordagens acima seguir
(e, se for "lista fixa", quais são exatamente as categorias de foto
esperadas) antes de detalhar o restante desta SPEC.

## 4. Escopo

Bloqueado até a decisão do §3.

## 5. Fora do escopo

- Qualquer mudança no endpoint de upload de fotos do container
  (`usePostApiOperationOperationIdContainerIdPhoto`) além do que a
  decisão do §3 exigir.

## 6. Arquivos esperados (estimativa, depende de §3)

- `src/components/operations/tabs/Containers.tsx`
- Possível novo endpoint/model gerado via `just map`, se a decisão for
  "lista configurável via Core" (§3.2).

## 7. Critérios de aceitação

Bloqueado até a decisão do §3.

## 8. Riscos

- **R1** — Esta SPEC não pode avançar sem a decisão de negócio do §3 —
  qualquer suposição de "quais fotos são necessárias" seria inventar
  regra de negócio, proibido pelas regras deste agente.

# SPEC-90 — Investigação: avatar do autor não aparece na aba Log

- **ID:** SPEC-90
- **Nome:** log-tab-avatar-missing-investigation
- **Status:** IMPLEMENTED (investigação concluída, sem código pra mudar —
  ver §7)
- **Autor:** claude (bug reportado pelo usuário, 2026-09-17)
- **Área:** `src/components/operations/tabs/Log.tsx` (SPEC-86),
  `src/lib/avatar-url.ts` — investigação cruza pra `warren/Core`
  (`Controllers/User/User.Cruid.cs`, `Domain/User/User.Entity.cs`,
  `Domain/User/User.Mapping.cs`, `Domain/Bases/Profile/Profile.Mapping.cs`)
  em modo **só leitura** (território alheio, sem edição).

---

## 1. Objetivo

Investigar por que o avatar do autor de cada evento não aparece na aba
"Log" (`Operação > Log`, SPEC-86) — sempre cai no ícone genérico
`bi-person` — mesmo quando o usuário confirma ter foto de perfil
cadastrada, e o nome do mesmo autor ("por Super Administrador") aparece
correto na mesma linha, vindo do mesmo objeto de resposta.

## 2. Sintoma reportado

- Aba Log, cada entrada com `createdBy` mostra `por {nome}` correto.
- O avatar ao lado sempre cai no fallback (círculo cinza + `bi-person`),
  nunca mostra a foto real, mesmo pra um usuário que tem avatar
  cadastrado (confirmado no próprio menu do usuário, `UserMenu.tsx`, que
  mostra a foto certa hoje).

## 3. Investigação — lado front (`warren/NewPortal`)

`Log.tsx` (`src/components/operations/tabs/Log.tsx:68-98`):

```ts
const userQueries = useQueries({
  queries: uniqueUserIds.map((id) => {
    const options = getGetApiUserIdQueryOptions(id);
    return { ...options, enabled: isClient };
  }),
});
...
const url = resolveAvatarUrl(result?.data?.profile?.avatarFile);
```

- `getGetApiUserIdQueryOptions` (gerado, `src/api/generated/endpoints/
  user/user.ts:791-801`) bate em `GET /api/user/{id}`, tipado
  `UserAdminDTO`.
- `resolveAvatarUrl` (`src/lib/avatar-url.ts:12-16`) só olha
  `avatarFile?.url` — se vier `null`/`undefined`, retorna `null`
  (fallback), que é exatamente o comportamento correto pra um
  `avatarFile` ausente.
- `userNameById` (linha 77-86) e `userAvatarById` (linha 90-98) leem o
  **mesmo** `result?.data` do mesmo índice de `userQueries` — não há
  como o nome vir de uma fonte e o avatar de outra dentro do front.

**Conclusão do lado front:** nenhum defeito encontrado. Como o nome
("por Super Administrador") renderiza corretamente, a request
`GET /api/user/{id}` **teve que ter respondido 200** com um `profile`
populado — ou seja, o problema (se existir) está em `profile.avatarFile`
vir `null` nessa resposta específica, não em como o front consome o
dado. `resolveAvatarUrl`/`Log.tsx` já fazem o fallback correto pra esse
caso — não há bug de consumo a corrigir aqui.

## 4. Investigação — lado Core (`warren/Core`, só leitura)

Handler de `GET /api/user/{id}` (`Controllers/User/User.Cruid.cs:56-66`):

```csharp
[Authorize]
[RequireAdmin]
[HttpGet("{id:guid}")]
public async Task<ActionResult<UserAdminDTO>> GetById(Guid id, CancellationToken ct)
{
    UserModel user = await _userRepository.GetWithDetails(id, ct)
        ?? throw new NotFoundException(MessageCode.UserNotFound);

    return Ok(_mapper.Map<UserAdminDTO>(user));
}
```

`GetWithDetails` (`Domain/User/User.Repository.cs:59-64`):

```csharp
public Task<UserModel?> GetWithDetails(Guid id, CancellationToken ct = default) =>
    Context
        .Include(u => u.Profile.File)
        .Include(u => u.Collaborator)
            .ThenInclude(c => c!.Client)
        .FirstOrDefaultAsync(u => u.Id == id, ct);
```

Traz `Profile.File` explicitamente via `.Include()`. Além disso, o
mapeamento EF Core do `ProfileModel` como tipo `[Owned]`
(`Domain/User/User.Entity.cs:9-27`) já configura a navegação como
**AutoInclude global**:

```csharp
// O avatar é lido em praticamente toda resposta que serializa o
// usuário (login, /profile/me, /user/{id}, etc.). Sem AutoInclude
// só as queries que fazem .Include(u => u.Profile.File) à mão
// (GetByUserNameOrEmail, GetWithDetails) trazem o arquivo — as
// demais (Get/GetUserAsync, usadas pelo AuthMiddleware e pelo
// GetCurrentUserModelAsync) devolvem avatarFile null.
profile.Navigation(p => p.File).AutoInclude();
```

Esse comentário (código já existente, commit `f47979f` "Ajustes gerais",
2026-08-27 — **anterior** a SPEC-86, 2026-09-17) documenta que esse
exato cenário (avatar ausente em algumas rotas que serializam usuário)
já foi endereçado, explicitamente citando `/user/{id}` como uma das
rotas cobertas.

Mapeamento AutoMapper (mesma cadeia usada por `/profile/me` — não há
`ForMember`/caminho alternativo específico de `GetById`):

- `UserMappingProfile` (`Domain/User/User.Mapping.cs:13-17`) —
  `CreateMap<UserModel, UserDTO>().IncludeAllDerived()` +
  `CreateMap<UserModel, UserAdminDTO>()` (sem override de `Profile`,
  herda a config base).
- `ProfileMapping` (`Domain/Bases/Profile/Profile.Mapping.cs:9-12`) —
  `CreateMap<ProfileModel, ProfileDTO>().ForMember(dest =>
  dest.AvatarFile, opt => opt.MapFrom(src => src.File))`.
- `FileMappingProfile` (`Domain/System/File/File.Mapping.cs:8-9`) —
  `CreateMap<FileModel, FileDTO>()`, sem enriquecimento condicional (URL
  é o valor estático já gravado em `FileModel.Url`, não uma SAS gerada
  sob demanda só em certas rotas).

Comparação direta com `GET /profile/me`
(`Controllers/Profile/Profile.Info.cs:11-19`, que o usuário confirma
funcionar): usa `GetCurrentUserModelAsync()`
(`Extensions/Controller.Auth.cs:21-40`), que por sua vez reaproveita o
`UserModel` cacheado por `AuthMiddleware`
(`Middleware/Auth.cs:17-43`, linha 25: `await
userRepository.Get(userId)` — **sem** `.Include()` explícito) ou, se não
tiver cache, chama `userRepository.Get(userId)` direto (também sem
`.Include()`). Ou seja: `/profile/me` depende **inteiramente** do
`AutoInclude()` global (não tem `.Include()` manual), enquanto
`/user/{id}` tem `.Include()` manual **e** o `AutoInclude()` global —
duas garantias em vez de uma. Não há motivo, por leitura estática do
código atual, pra `/user/{id}` trazer `avatarFile` de forma menos
confiável que `/profile/me`.

Achado cruzado: `warren/Core/specs/40-profile-avatar-stale-response/
spec.md` (`IMPLEMENTED`, 2026-09-16 — investigação anterior, não desta
sessão) já auditou esse mesmo `AutoInclude()` e confirmou que ele está
ativo e correto — a SPEC-40 era sobre um bug diferente (resposta do
`PATCH /profile/avatar` devolvendo uma **instância em memória** obsoleta
dentro da mesma request, não sobre o `Include`/mapeamento em si, que já
era tratado como correto/dado como certo naquela investigação).

**Conclusão do lado Core (leitura estática, sem rodar o Core):** não foi
encontrado defeito de código em `GetById`/`GetWithDetails`/mapeamento
que explique `avatarFile` vir `null` enquanto `fullName` vem populado na
mesma resposta — a cadeia de `Include`/`AutoInclude`/`AutoMapper` é
idêntica (ou mais redundante) que a de `/profile/me`, que funciona.

## 5. Hipóteses (nenhuma confirmada por execução/reprodução)

1. **Mais provável — dado real ausente pro usuário específico do
   evento.** O `ProfileModel.FileId` do autor em questão pode
   genuinamente estar `null` no banco consultado pelo ambiente testado
   — ou seja, o upload do avatar desse usuário nunca persistiu de fato
   (`PATCH /api/profile/avatar` ou `PATCH /api/user/{id}/avatar`), ou o
   usuário está olhando pra uma conta/ambiente diferente daquele onde
   cadastrou a foto (ex.: viu o avatar certo num ambiente/DB, testou o
   Log noutro). Como `fullName` sempre existe (campo obrigatório) mas
   `avatarFile` é opcional por natureza, essa hipótese explica o sintoma
   sem exigir nenhum bug de código.
2. **Menos provável — deploy desatualizado.** O ambiente testado (se não
   for o mesmo checkout local do Core) pode estar rodando um build
   anterior ao commit `f47979f` (2026-08-27, que introduziu o
   `AutoInclude()`). Sem acesso ao ambiente de deploy/CI, não dá pra
   confirmar nem descartar por leitura de código.

## 6. O que falta pra confirmar (limitação desta investigação)

Sem rodar o Core/abrir um debugger/consultar o banco (fora do escopo
deste agente — território `warren/Core` é só leitura, e não há acesso a
runtime/DB do ambiente do usuário), não é possível confirmar
definitivamente qual hipótese do §5 é a real. Pra confirmar:

- (a) Abrir o DevTools Network na aba Log com o bug reproduzido, achar a
  chamada `GET /api/user/{id}` do autor em questão, e inspecionar o JSON
  cru: se `profile.avatarFile` vier `null` ali mas `GET /api/profile/me`
  (mesmo usuário, mesma sessão) vier com `avatarFile` populado — isso
  seria uma discrepância real de runtime entre as duas rotas, não
  explicada pelo código atual, e justificaria abrir uma SPEC de Core com
  prioridade pra reproduzir com debugger anexado.
- (b) Se (a) confirmar `avatarFile: null` nas duas rotas igualmente —
  aponta pra hipótese 1 (dado ausente no banco) — conferir a coluna do
  FK do avatar do `ProfileModel` owned (`FileId`) pro registro do
  usuário em questão direto no Postgres.
- (c) Confirmar qual commit do Core está de fato rodando no
  ambiente testado (`git rev-parse HEAD` no host do deploy, ou endpoint
  de health/version se existir) — descarta/confirma a hipótese 2.

## 7. Decisão de escopo — sem código pra mudar

- **Front:** nenhum defeito encontrado em `Log.tsx`/`avatar-url.ts` —
  já fazem o fallback certo pra `avatarFile` ausente (RF2 de SPEC-86).
  Nada a corrigir.
- **Core:** por leitura estática, o código atual (`GetById` +
  `GetWithDetails` + `AutoInclude` + `AutoMapper`) está correto e
  equivalente ao de `/profile/me`, que funciona — **não confirmado como
  bug**. Território alheio (`warren/Core`), sem edição feita.
  Se o usuário reproduzir com evidência de runtime (§6-a) mostrando
  `avatarFile: null` especificamente em `/user/{id}` enquanto
  `/profile/me` do mesmo usuário traz o avatar — isso vira pedido formal
  pro time/agente de Core (`core-spec-agent`), com o achado desta
  investigação como ponto de partida (a comparação de código já feita
  aqui elimina praticamente todo o `Include`/mapeamento como suspeito,
  restando causas de runtime como estado do `DbContext`/cache de
  segundo nível, se existir, ou dado real no banco).

## 8. Critérios de aceitação

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Código do front (`Log.tsx`, `avatar-url.ts`) revisado — confirmado sem defeito de consumo do `UserAdminDTO`/`avatarFile`. | PASS |
| CA2 | Handler `GET /api/user/{id}` do Core (`GetById`/`GetWithDetails`/`AutoInclude`/mapeamento) revisado linha a linha e comparado com `/profile/me` — nenhuma divergência de código encontrada. | PASS |
| CA3 | Hipóteses documentadas com nível de confiança e o que falta pra confirmar cada uma (§5-6), já que não foi possível reproduzir/rodar o Core nesta sessão. | PASS |
| CA4 | Nenhuma edição feita em `warren/Core` (território alheio, só leitura). | PASS |

## 9. Riscos

Nenhum — investigação sem mudança de código em nenhum dos dois
repositórios.

## 10. Implementation Notes

- **Arquivos alterados:** nenhum (nem front nem Core) — investigação
  pura, sem defeito confirmado que justifique mudança de código em
  qualquer um dos dois lados.
- **Comandos executados:** apenas leitura (`Read`/`grep`/`git log`) em
  `warren/NewPortal` e `warren/Core` (território alheio, só leitura,
  sem `dotnet build`/`dotnet test`/edição). `bun run check`/`bun run
  lint` não rodados nesta SPEC por não haver mudança de código no front.
- **Critérios de aceitação:** ver tabela §8, todos PASS (como
  investigação, não como fix).
- **Decisões tomadas durante a implementação:** nenhuma mudança de
  escopo — decisão explícita de não "consertar" nada sem causa raiz
  confirmada por execução, e não inventar um fix especulativo no Core
  (fora de território, e sem certeza de que resolveria algo).
- **Limitações conhecidas:** causa raiz não confirmada por reprodução
  real (sem acesso a runtime/DB do ambiente do usuário nesta sessão) —
  ver §5-6 pra hipóteses e próximos passos. Pendência mais provável:
  confirmar via DevTools se `profile.avatarFile` realmente vem `null`
  no JSON cru de `GET /api/user/{id}` pro usuário em questão; se sim,
  investigar diretamente no banco se o `FileId` do `Profile` desse
  usuário está de fato setado.

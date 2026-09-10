# Spec — Idioma (i18n) e Tema

**Status:** proposta (aguardando aprovação)
**Data:** 2026-09-10
**Contexto:** o login/BFF já está de pé (ver
[auth-httponly-cookie-bff.md](auth-httponly-cookie-bff.md)). Falta ligar as duas
preferências de UI que ficaram como stub/TODO: **idioma** e **tema**. Ambas
seguem o mesmo padrão já usado na auth — **cookie lido no servidor no `__root`,
sem flash, store no client para trocas**.

---

## 1. Estado atual

### Tema
- [src/styles/globals/color-modes.ts](../src/styles/globals/color-modes.ts) —
  `ThemeMode = "light" | "dark"` (sem `"system"`, apesar do dicionário ter a
  chave), `THEME_STORAGE_KEY`/`THEME_COOKIE_NAME = "theme"`.
- [src/styles/globals/theme-store.ts](../src/styles/globals/theme-store.ts) —
  `useThemeMode()` (`useSyncExternalStore` sobre `localStorage`), `setThemeMode()`
  (grava localStorage **e cookie**), `applyTheme()` põe `data-bs-theme` no
  `<html>`, `useSyncThemeToDocument()`.
- [src/components/theme/theme-toggle.tsx](../src/components/theme/theme-toggle.tsx)
  — `<ThemeToggle labels={...}>` cicla light/dark.
- **Problema:** o `__root` renderiza `<html lang="pt-BR">` fixo, **sem**
  `data-bs-theme`. O tema só é aplicado num `useEffect` no client → **flash**
  (FOUC) no carregamento. O cookie é escrito mas **nunca lido no servidor**.

### Idioma
- [src/i18n/config.ts](../src/i18n/config.ts) — `locales = ["pt-BR", "en", "zh"]`,
  `defaultLocale = "pt-BR"`.
- [src/i18n/dictionaries/](../src/i18n/dictionaries/) — `pt-BR.json` / `en.json` /
  `zh.json`, ~114 chaves aninhadas, com interpolação `{param}` (ex.:
  `home.welcome = "Bem-vindo, {email}"`).
- [src/i18n/index.tsx](../src/i18n/index.tsx) — `LanguageProvider` é **stub**
  (só repassa `children`).
- [src/lib/locale-path.ts](../src/lib/locale-path.ts) — `replaceLocaleInPath`,
  estilo Next.js `/[lang]/...`. **Não se aplica** ao TanStack Router (rotas
  planas, sem segmento de locale).
- `src/app/[lang]/**` — roteamento i18n do Next.js, **morto**.
- Não existe `useT()` / função de tradução no stack atual.
- [src/routes/_site.tsx](../src/routes/_site.tsx) já envolve tudo no
  `LanguageProvider` stub.

## 2. Metas / não-metas

### Metas
1. Tema e idioma resolvidos **no servidor** a partir de cookie, aplicados no
   HTML do SSR — **sem flash**, sem mismatch de hidratação.
2. `useT()` funcional com autocomplete das chaves e interpolação `{param}`.
3. Trocar idioma/tema no client é instantâneo (sem round-trip) e persiste
   (cookie), inclusive entre abas e reloads.
4. Suporte a **"system"** no tema (segue `prefers-color-scheme`).
5. Switchers montados nos slots já reservados no `AppShell` (topbar + menu do
   usuário) e no header do site.

### Não-metas
- Segmento de locale na URL (`/pt-BR/...`). Locale é preferência de usuário via
  cookie, igual ao tema. `locale-path.ts` e `src/app/[lang]/**` são removidos.
- Pluralização / ICU MessageFormat / gênero. Se surgir necessidade real,
  escalar para `i18next` (ver §8, risco 1) — não agora.
- Tradução de conteúdo vindo do Core (nomes de status, etc.) — isso é
  responsabilidade da API / de um mapa à parte.
- RTL (nenhum locale-alvo é RTL).

## 3. Padrão comum (tema + idioma)

```
┌── SSR (__root) ─────────────────────────┐   ┌── client ───────────────────────┐
│ lê cookies asc_theme / asc_locale       │   │ store (useSyncExternalStore      │
│  ↓ (fallback: Accept-Language / default) │   │   sobre cookie+localStorage)     │
│ context = { locale, theme, dict }       │──▶│ hidrata do contexto SSR         │
│ RootShell:                              │   │ trocar → grava cookie +         │
│  <html lang={locale}                    │   │   atualiza <html> + re-render   │
│        data-bs-theme={resolved}>        │   │ (sem round-trip; dicts already  │
│ + <script> no-flash inline (system)     │   │  bundled)                       │
└─────────────────────────────────────────┘   └─────────────────────────────────┘
```

Cookies (renomeados para o padrão `asc_*`, `SameSite=Lax`, `max-age` 1 ano, **não**
httpOnly — precisam ser lidos por JS no client e pelo script no-flash):
- `asc_theme` = `light | dark | system`
- `asc_locale` = `pt-BR | en | zh`

Leitura no servidor: `getCookie()` de `@tanstack/react-start/server` (já usado
na auth). Sem `useSession` — não é dado sensível.

## 4. Tema

### `color-modes.ts`
```ts
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export const THEME_COOKIE_NAME = "asc_theme";
```

### `theme-store.ts`
- `resolveTheme(mode, systemPref?)`: `"system"` → `systemPref` (do
  `matchMedia("(prefers-color-scheme: dark)")` no client; no SSR assume `"light"`
  ou o que o script no-flash já aplicou).
- `setThemeMode(mode)`: grava `localStorage` + cookie `asc_theme`, aplica
  `data-bs-theme`, emite.
- `useThemeMode()`: `useSyncExternalStore`; `getServerSnapshot` lê do contexto
  do router (via um `ThemeProvider` fino) em vez de `"light"` fixo.
- Novo listener em `matchMedia` para reatividade quando `mode === "system"`.

### Sem flash
`__root.head()` injeta um `<script>` inline (blocking, no `<head>`) que:
```js
try {
  var m = (document.cookie.match(/(?:^|; )asc_theme=([^;]+)/)||[])[1] || "system";
  var d = m === "dark" || (m === "system" &&
    matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-bs-theme", d ? "dark" : "light");
} catch (e) {}
```
Para `light`/`dark` o SSR já acerta o atributo (cookie conhecido); o script cobre
o caso `system` e divergências. React não re-renderiza `<html>`, então não há
conflito de hidratação — o efeito do store apenas confirma o mesmo valor.

### `<ThemeToggle>`
- `ORDER = ["light", "dark", "system"]`, ícone por modo (`sun` / `moon` / `circle-half`).
- `labels` já vêm traduzidas (`theme.light` / `theme.dark` / `theme.system`).

## 5. Idioma

### `src/i18n/` — arquivos

| Arquivo | Papel |
| --- | --- |
| `config.ts` | (existe) `locales`, `defaultLocale`, `isLocale`. + `LOCALE_COOKIE_NAME = "asc_locale"`, `LOCALE_LABELS` (nome + flag por locale). |
| `dictionaries.ts` | **novo** — `import ptBR from "./dictionaries/pt-BR.json"` (idem en, zh); `export const dictionaries = { "pt-BR": ptBR, en, zh }`. `pt-BR` é a **fonte de verdade** do shape. |
| `keys.ts` | **novo** — `type TranslationKey = DeepKeys<typeof ptBR>` (tipo recursivo de chaves com ponto). Dá autocomplete no `t()`. |
| `translate.ts` | **novo** — `translate(dict, key, params?)`: caminha o path com ponto, faz `String.replace(/\{(\w+)\}/g, ...)` com `params`. Chave faltando → retorna a própria chave + `console.warn` em dev. |
| `index.tsx` | `LanguageProvider` **real**: recebe `locale` (do contexto) e provê `{ locale, dict }` num React context. `useT()` → `(key, params?) => translate(dict, key, params)`. `useLocale()`, `useSetLocale()`. |
| `locale.server.ts` | **novo** — `getServerLocale()`: `getCookie("asc_locale")` válido → usa; senão negocia `Accept-Language` contra `locales`; senão `defaultLocale`. |
| `locale-store.ts` | **novo** — client store (`useSyncExternalStore` sobre cookie); `setLocale(l)` grava cookie + `document.documentElement.lang = l` + emite. Como os 3 dicts já estão no bundle, o `LanguageProvider` troca o dict na hora — **sem** `router.invalidate()`. |

### `locale-path.ts`
Removido (junto com `src/app/[lang]/**`).

### `__root`
- `beforeLoad` (ou um `createIsomorphicFn`): resolve `locale` e devolve no
  contexto. `loader`/context também expõe o `dict` (`dictionaries[locale]`) para
  o `RootShell` e o `LanguageProvider`.
- `RootShell`: `<html lang={locale}>`.
- `head()`: `metadata.title` / `metadata.description` do dict do locale ativo
  (hoje são strings PT fixas). Os textos de erro/404 do `__root` também passam a
  usar `useT()` (componentes) — nota, não bloqueia.

### Tamanho
Os 3 dicionários juntos (~10 KB minificado) entram no bundle. Se crescerem
muito, migrar para: server serializa só o dict ativo no payload SSR + client
faz `import()` dinâmico ao trocar. Não agora.

## 6. Switchers

- `src/components/i18n/language-switcher.tsx` **novo** — `Dropdown` (react-bootstrap)
  com `LOCALE_LABELS`; `onSelect` → `setLocale`.
- `ThemeToggle` já existe — só ganha `"system"`.
- Montagem:
  - `AppShell` topbar (slot `TODO(user)` já reservado) e menu do usuário
    (`UserMenu.tsx`, slot reservado).
  - `SiteHeader` (site público) — onde fizer sentido no layout.

## 7. Arquivos afetados

| Arquivo | Ação |
| --- | --- |
| `src/styles/globals/color-modes.ts` | `+ "system"`, `ResolvedTheme`, cookie `asc_theme` |
| `src/styles/globals/theme-store.ts` | `resolveTheme` com system + `matchMedia`; `getServerSnapshot` do contexto |
| `src/components/theme/theme-toggle.tsx` | ordem com `system` + ícone |
| `src/i18n/config.ts` | `+ LOCALE_COOKIE_NAME`, `LOCALE_LABELS` |
| `src/i18n/dictionaries.ts` · `keys.ts` · `translate.ts` · `locale.server.ts` · `locale-store.ts` | **novos** |
| `src/i18n/index.tsx` | `LanguageProvider` real + `useT`/`useLocale`/`useSetLocale` |
| `src/components/i18n/language-switcher.tsx` | **novo** |
| `src/routes/__root.tsx` | resolve locale+theme no contexto; `<html lang>`; `<script>` no-flash; `head()` do dict; `LanguageProvider` + `ThemeProvider` no `RootComponent` |
| `src/routes/_site.tsx` | já usa `LanguageProvider` (passa a ser o real) |
| `src/layouts/AppShell/index.tsx` · `UserMenu.tsx` | montar os switchers nos slots |
| `src/lib/locale-path.ts` | **remover** |
| `src/app/[lang]/**` | **remover** (legado Next.js) |
| textos fixos em PT no `__root` (404, erro) | passam a `useT()` |

## 8. Riscos / questões

1. **Hand-roll vs. i18next.** 114 chaves planas, interpolação simples, sem
   plural → hand-roll (~60 linhas) é proporcional e casa com o resto do código
   (o theme-store também é hand-rolled). Se aparecer plural/gênero/ICU, trocar
   `translate.ts` + `LanguageProvider` por `i18next`+`react-i18next` sem mexer
   nos call-sites (`useT` continua). Registrar a decisão aqui.
2. **`zh` (chinês)** está na lista mas o dicionário pode estar incompleto —
   validar cobertura das 114 chaves nos 3 arquivos (script de lint de chaves,
   §9).
3. **Flash em `system`.** O `<script>` inline resolve, mas é JS blocking mínimo
   no `<head>`. Alternativa sem JS: `@media (prefers-color-scheme)` no CSS
   cobrindo as variáveis do Bootstrap — mais complexo de manter. Ficar no script.
4. **`getServerSnapshot` do store lendo contexto do router.** `useSyncExternalStore`
   não tem acesso ao contexto direto; a ponte é um provider fino (`ThemeProvider`)
   que injeta o valor SSR. Validar que não gera mismatch.
5. **Cookies não-httpOnly.** Aceitável: são preferências de UI, não credenciais.
   `SameSite=Lax` basta.
6. **`head()` reativo ao locale.** Trocar idioma no client atualiza `<title>`?
   O `head()` do TanStack re-roda em `invalidate`; como o switch de locale não
   invalida, o `<title>` só muda no próximo load. Aceitável, ou um
   `useEffect(() => { document.title = t("metadata.title") })` no `RootComponent`.

## 9. Testes

- [ ] `curl` com `Cookie: asc_theme=dark` → HTML do SSR já vem com
      `<html ... data-bs-theme="dark">` (sem flash).
- [ ] `curl` com `Cookie: asc_locale=en` → textos em inglês no HTML do SSR;
      `<html lang="en">`.
- [ ] Sem cookie + `Accept-Language: en-US` → responde em inglês.
- [ ] Sem cookie + `Accept-Language` desconhecido → `pt-BR`.
- [ ] Trocar tema/idioma no client → aplica na hora, sem reload; recarregar a
      página mantém a escolha; abrir 2ª aba reflete (evento `storage`).
- [ ] `system` → alternar o tema do SO reflete ao vivo (listener `matchMedia`).
- [ ] Script de lint: as 3 dicts têm exatamente o mesmo conjunto de chaves.
- [ ] `useT("chave.inexistente")` → retorna a string da chave + warn (dev).
- [ ] Hidratação: nenhum warning de mismatch no console para `<html>` nem para
      textos traduzidos.

## 10. Fora de escopo (follow-ups)

- Traduzir os enums/labels vindos do Core.
- Formatação de data/número por locale (`Intl.DateTimeFormat` / `date-fns` locale)
  — provavelmente um `useFormat()` companheiro, spec própria.
- Persistir a preferência no perfil do usuário (Core) além do cookie.

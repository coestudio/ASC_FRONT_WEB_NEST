/**
 * Liga/desliga as ferramentas de debug do projeto (botão flutuante e
 * submenu "Dev mode" — `DevToolsFab`/`useDevTools`, SPEC-104 —, aviso de chave de i18n ausente no
 * console, etc.) via `VITE_DEVELOPMENT` no `.env`, independente do modo de
 * build (`import.meta.env.DEV`). Client-safe — não ler `process.env` aqui.
 */
export const isDevToolsEnabled = import.meta.env.VITE_DEVELOPMENT === "true";

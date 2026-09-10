import axios from "axios";

/**
 * Instância única do axios para chamadas server-side ao Core (warren/Core).
 *
 * Centraliza baseURL/timeout/headers num único lugar em vez de cada
 * server function instanciar `axios.create()` separadamente (paralelo ao
 * client do Portal, mas sem zodios/react-query — aqui é uso server-side).
 *
 * Server-only: `API_URL` nunca deve vazar pro browser, por isso este módulo
 * só deve ser importado de código que roda no servidor (server functions do
 * TanStack Start, middlewares).
 */
export const coreClient = axios.create({
  baseURL: process.env.API_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

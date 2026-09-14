import axios, { AxiosError, type AxiosAdapter, type AxiosRequestConfig } from "axios";
import { toast } from "react-toastify";

/**
 * Transporte único dos hooks gerados pelo Orval.
 *
 * Todas as chamadas ao Core passam pelo proxy same-origin `/api/core`
 * (src/routes/api/core.ts), que anexa o Bearer server-side a partir do cookie
 * httpOnly selado. O token nunca chega ao JS do browser.
 * Ver specs/auth-httponly-cookie-bff.md.
 *
 * SSR: chamadas autenticadas ao Core no servidor devem usar server functions
 * (ex.: fetchMeFn em src/lib/auth-fns.ts) — este adapter roda só no browser.
 */

/** `/api/operation` + `?Search=x&Limit=20` a partir de config.url + config.params. */
function buildCorePath(config: AxiosRequestConfig): string {
  const url = config.url ?? "";
  const params = config.params as Record<string, unknown> | undefined;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, String(v)));
    else qs.append(key, String(value));
  }
  const s = qs.toString();
  return s ? `${url}${url.includes("?") ? "&" : "?"}${s}` : url;
}

const coreProxyAdapter: AxiosAdapter = async (config) => {
  if (typeof window === "undefined") {
    throw new Error(
      "mutator: chamada autenticada ao Core no SSR — use um server fn " +
        "(ver specs/auth-httponly-cookie-bff.md §7).",
    );
  }

  const method = (config.method ?? "get").toUpperCase();
  const isForm = typeof FormData !== "undefined" && config.data instanceof FormData;

  const headers = new Headers();
  const rawHeaders = (config.headers?.toJSON?.() ?? config.headers ?? {}) as Record<
    string,
    unknown
  >;
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value != null && typeof value !== "object") headers.set(key, String(value));
  }
  headers.set("x-core-path", buildCorePath(config));
  if (!isForm && config.data != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  // `config.data` já chega serializado pelo `transformRequest` padrão do
  // Axios (roda sempre no `dispatchRequest`, antes deste adapter customizado
  // ser chamado) — pra payload de objeto JSON, `config.data` já é a *string*
  // JSON pronta, não o objeto. Re-serializar aqui com `JSON.stringify`
  // dobrava a codificação (mandava uma string JSON escapada dentro de outra
  // string pro Core, que falhava a desserializar a raiz — bug que causava
  // 400 "The <param> field is required." em todo POST/PUT/PATCH com corpo).
  const hasBody = method !== "GET" && method !== "HEAD" && config.data != null;
  const res = await fetch("/api/core", {
    method,
    headers,
    credentials: "same-origin",
    signal: config.signal as AbortSignal | undefined,
    body: hasBody ? (config.data as BodyInit) : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";
  let data: unknown;
  if (config.responseType === "blob") data = await res.blob();
  else if (config.responseType === "arraybuffer") data = await res.arrayBuffer();
  else if (contentType.includes("application/json")) data = await res.json().catch(() => null);
  else data = await res.text();

  const response = {
    data,
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    config,
    request: null,
  };

  // Adapter customizado do Axios NÃO passa pelo `settle()` interno (isso é
  // responsabilidade de cada adapter — xhr/http/fetch built-in chamam
  // `settle()` sozinhos, ver node_modules/axios/lib/core/settle.js). Sem
  // isto, QUALQUER status HTTP (400/401/403/409/500...) virava uma promise
  // *resolvida* pro Axios — nenhum `.catch`/interceptor de erro do app
  // jamais rodava, e código de sucesso (toast verde, fechar modal, invalidar
  // lista) disparava mesmo com o Core rejeitando a requisição. Replica a
  // mesma checagem do `settle()` oficial: valida status (default do Axios,
  // 200–299, ou `config.validateStatus` se customizado) e rejeita com um
  // `AxiosError` de verdade quando fora da faixa.
  const validateStatus = config.validateStatus;
  const isValid = !res.status || !validateStatus || validateStatus(res.status);
  if (!isValid) {
    throw new AxiosError(
      `Request failed with status code ${res.status}`,
      res.status >= 400 && res.status < 500
        ? AxiosError.ERR_BAD_REQUEST
        : AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    );
  }

  return response;
};

export const axiosInstance = axios.create({ adapter: coreProxyAdapter });

/** Traduz mensagens conhecidas do EF Core/ASP.NET para PT-BR. */
const KNOWN_PATTERNS: Array<[RegExp, string]> = [
  [
    /An error occurred while saving the entity changes\.\s*See the inner exception for details\.?/gi,
    "Ocorreu um erro ao salvar as alterações. Verifique os dados informados e tente novamente.",
  ],
  [
    /An error occurred while saving the entity changes\.?/gi,
    "Ocorreu um erro ao salvar as alterações.",
  ],
  [/See the inner exception for details\.?/gi, ""],
];

function translateBackendMessage(message: string): string {
  let result = message;
  for (const [pattern, replacement] of KNOWN_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

/** Extrai mensagem legível de um erro ASP.NET (ProblemDetails). */
function extractBackendMessage(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
  if (!data || typeof data !== "object") return undefined;

  if (data.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return translateBackendMessage(messages.join(" "));
  }

  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  if (typeof data.title === "string") return data.title;
  return undefined;
}

let isRedirectingToLogin = false;

function redirectToLogin() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  toast.error("Sessão expirada. Faça login novamente.");
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
}

// ── Response interceptor ──────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    if (typeof response.data === "string" && response.data.trim() !== "") {
      toast.success(response.data);
    }
    return response;
  },
  async (error) => {
    if (
      axios.isCancel(error) ||
      error?.code === "ERR_CANCELED" ||
      error?.name === "CanceledError"
    ) {
      return Promise.reject(error);
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        redirectToLogin();
        return Promise.reject(error);
      }

      const backendMessage = extractBackendMessage(error);

      let message: string;
      if (backendMessage) {
        message = backendMessage;
      } else if (status === 400) {
        message = "Requisição inválida. Verifique os dados informados.";
      } else if (status === 403) {
        message = "Você não tem permissão para esta ação.";
      } else if (status === 404) {
        message = "Recurso não encontrado.";
      } else if (status === 409) {
        message = backendMessage ?? "Conflito de dados.";
      } else if (status === 422) {
        message = backendMessage ?? "Dados inválidos.";
      } else if (status && status >= 500) {
        message = "Erro ao se comunicar com o servidor. Tente novamente.";
      } else {
        message = error.message ?? "Erro desconhecido.";
      }

      if (status && status >= 400 && status < 500) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    } else {
      toast.error("Erro de conexão. Verifique sua rede.");
    }

    return Promise.reject(error);
  },
);

/**
 * Assinatura esperada pelo Orval (`httpClient: "axios"`): recebe a config da
 * requisição e resolve direto com o corpo já desembrulhado.
 */
export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { data } = await axiosInstance.request<T>(config);
  return data;
};

export default apiRequest;

import axios, { type AxiosRequestConfig } from "axios";
import { signOut } from "next-auth/react";
import { toast } from "react-toastify";

/**
 * Transporte único dos hooks gerados pelo Orval.
 *
 * Interceptor de request:
 *  - Busca sessão em /api/auth/session (NextAuth)
 *  - Checa expiresAt: se expirado, limpa cache e redireciona pro login
 *  - Anexa accessToken no header Authorization
 *
 * Interceptor de response:
 *  - 401 → signOut + redirect /login?toast=expired
 *  - 4xx → toast.warning
 *  - 5xx → toast.error
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL ausente — defina em web/.env (ver .env.example)."
  );
}

export const axiosInstance = axios.create({ baseURL: BASE_URL });

type CachedSession = {
  accessToken: string | null;
  expiresAt: string | null;
};

let cachedSession: CachedSession | null = null;
let sessionPromise: Promise<CachedSession> | null = null;

async function fetchSession(): Promise<CachedSession> {
  try {
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    return {
      accessToken: session?.accessToken ?? null,
      expiresAt: session?.expiresAt ?? null,
    };
  } catch {
    return { accessToken: null, expiresAt: null };
  }
}

function getSession(): Promise<CachedSession> {
  if (cachedSession !== null) return Promise.resolve(cachedSession);
  if (!sessionPromise) {
    sessionPromise = fetchSession().then((s) => {
      cachedSession = s;
      sessionPromise = null;
      return s;
    });
  }
  return sessionPromise;
}

function clearSessionCache() {
  cachedSession = null;
  sessionPromise = null;
}

/** Checa se o token do Core expirou (com margem de 30s). */
function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // sem expiresAt → não bloqueia
  const expiresAtMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();
  return expiresAtMs - 30_000 <= nowMs;
}

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
  const data = (err as { response?: { data?: Record<string, unknown> } })
    .response?.data;
  if (!data) return undefined;

  if (data.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0)
      return translateBackendMessage(messages.join(" "));
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
  clearSessionCache();
  toast.error("Sessão expirada. Faça login novamente.");
  signOut({
    redirect: true,
    callbackUrl: "/login?toast=expired",
  });
}

// ── Response interceptor ──────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === "string" &&
      response.data.trim() !== ""
    ) {
      toast.success(response.data);
    }
    return response;
  },
  async (error) => {
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
  }
);

// ── Request interceptor ───────────────────────────────────────────────
axiosInstance.interceptors.request.use(async (config) => {
  const session = await getSession();

  // Token expirado? Redireciona pro login antes de fazer a request.
  if (isTokenExpired(session.expiresAt)) {
    redirectToLogin();
    return Promise.reject(new Error("Token expired"));
  }

  if (session.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

/**
 * Assinatura esperada pelo Orval (`httpClient: "axios"`): recebe a config da
 * requisição e resolve direto com o corpo já desembrulhado.
 */
export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { data } = await axiosInstance.request<T>(config);
  return data;
};

export default apiRequest;

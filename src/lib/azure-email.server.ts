// Azure Communication Services — Email via REST + HMAC (Worker-safe: no Node SDK).

const API_VERSION = "2023-03-31";

function parseConnectionString(cs: string) {
  const parts = Object.fromEntries(
    cs
      .split(";")
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()];
      }),
  ) as Record<string, string>;
  const endpoint = parts["endpoint"];
  const accessKey = parts["accesskey"];
  if (!endpoint || !accessKey) {
    throw new Error("AZURE_COMMUNICATION_CONNECTION_STRING inválida");
  }
  return { endpoint: endpoint.replace(/\/$/, ""), accessKey };
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface SendEmailInput {
  subject: string;
  plainText: string;
  html: string;
  to?: string;
  replyTo?: string;
}

function sanitizeApiErrorDetail(detail: string) {
  const compact = detail.replace(/\s+/g, " ").trim();
  return compact.length > 500 ? `${compact.slice(0, 500)}...` : compact;
}

export async function sendAzureEmail({ subject, plainText, html, to, replyTo }: SendEmailInput) {
  const { endpoint, accessKey } = parseConnectionString(
    process.env["AZURE_COMMUNICATION_CONNECTION_STRING"] ?? "",
  );
  const senderAddress = process.env["AZURE_EMAIL_SENDER"];
  const recipient = to ?? process.env["AZURE_EMAIL_RECIPIENT"];
  if (!senderAddress || !recipient) {
    throw new Error("Remetente ou destinatário de e-mail não configurado");
  }

  const body = JSON.stringify({
    senderAddress,
    content: { subject, plainText, html },
    recipients: { to: [{ address: recipient }] },
    ...(replyTo ? { replyTo: [{ address: replyTo }] } : {}),
  });

  const url = new URL(`${endpoint}/emails:send?api-version=${API_VERSION}`);
  const pathAndQuery = `${url.pathname}${url.search}`;
  const host = url.host;
  const date = new Date().toUTCString();

  const contentHash = toBase64(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
  );
  const stringToSign = `POST\n${pathAndQuery}\n${date};${host};${contentHash}`;

  const key = await crypto.subtle.importKey(
    "raw",
    fromBase64(accessKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = toBase64(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(stringToSign)),
  );

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ms-date": date,
      "x-ms-content-sha256": contentHash,
      Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    const safeDetail = sanitizeApiErrorDetail(detail);
    console.error("Azure email send failed", {
      status: response.status,
      statusText: response.statusText,
      detail: safeDetail,
    });
    throw new Error(
      `Falha no Azure Email (${response.status} ${response.statusText}): ${safeDetail || "sem detalhe"}`,
    );
  }

  return { ok: true as const };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

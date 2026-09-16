import type { FileDTO } from "@/api/generated/model";

/**
 * URL do avatar com cache-bust (`?v=<updatedAt>`, SPEC-30 RF1). Achado: após
 * trocar o avatar, o Core pode devolver a mesma URL de arquivo de antes
 * (mesmo path/nome), então sem esse sufixo o browser reaproveita a imagem
 * antiga do cache de disco até um reload forçado — mesmo com o cache do
 * React Query já atualizado corretamente. `updatedAt` muda a cada upload
 * (novo `FileModel`), então o sufixo sempre reflete a versão real do
 * arquivo, sem precisar persistir nada além do que o DTO já traz.
 */
export function resolveAvatarUrl(avatarFile: FileDTO | null | undefined): string | null {
  if (!avatarFile?.url) return null;
  const separator = avatarFile.url.includes("?") ? "&" : "?";
  return `${avatarFile.url}${separator}v=${encodeURIComponent(avatarFile.updatedAt)}`;
}

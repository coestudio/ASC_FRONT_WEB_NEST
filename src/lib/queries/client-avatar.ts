import { queryOptions, type QueryClient } from "@tanstack/react-query";

import apiRequest from "@/api/mutator";
import type { ClientDetailDTO, FileDTO, MessageDTO } from "@/api/generated/model";

/**
 * TEMPORÁRIO (SPEC-101 RF1) — adaptador das 3 rotas novas do Core SPEC-57
 * (avatar do Cliente) enquanto o contrato ainda não está no ar pra rodar
 * `just map`. Depois do `just map`, apagar este arquivo e trocar pelos
 * hooks gerados (`usePatchApiClientIdAvatar`, `useDeleteApiClientIdAvatar`,
 * `getGetApiClientMeQueryOptions`) e usar `ClientDTO.avatarFile` direto,
 * sem o `ClientAvatarFields`. Mesmo transporte dos hooks gerados
 * (`apiRequest` do `mutator.ts`) e mesmas queryKeys (path do Core).
 */

/** Campo que o Core SPEC-57 adiciona em `ClientDTO` — some com o `just map`. */
export type ClientAvatarFields = { avatarFile?: FileDTO | null };

export type ClientMeDTO = ClientDetailDTO & ClientAvatarFields;

/** Lê `avatarFile` de um DTO de cliente que ainda não conhece o campo no tipo gerado. */
export function clientAvatarOf(client: object | null | undefined): FileDTO | null {
  return (client as ClientAvatarFields | null | undefined)?.avatarFile ?? null;
}

export function patchClientAvatar(id: string, avatarFile: File): Promise<FileDTO> {
  const formData = new FormData();
  formData.append("avatarFile", avatarFile);
  return apiRequest<FileDTO>({
    url: `/api/client/${id}/avatar`,
    method: "PATCH",
    data: formData,
  });
}

export function deleteClientAvatar(id: string): Promise<MessageDTO> {
  return apiRequest<MessageDTO>({ url: `/api/client/${id}/avatar`, method: "DELETE" });
}

/** Cliente do colaborador externo logado (`GET /api/client/me`, Core SPEC-57). */
export function clientMeQueryOptions() {
  return queryOptions({
    queryKey: ["/api/client/me"] as const,
    queryFn: ({ signal }) =>
      apiRequest<ClientMeDTO>({ url: "/api/client/me", method: "GET", signal }),
    staleTime: 5 * 60_000,
  });
}

/**
 * Invalida tudo que mostra avatar de cliente: listagem (`/api/client`),
 * detalhe (`/api/client/{id}`) e o próprio cliente do externo
 * (`/api/client/me`) — todas as keys começam pelo path do Core.
 */
export function invalidateClientQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const head = query.queryKey[0];
      return typeof head === "string" && head.startsWith("/api/client");
    },
  });
}

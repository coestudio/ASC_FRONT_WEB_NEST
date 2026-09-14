import { z } from "zod";

import { PostApiClientClientIdCollaboratorBody } from "@/api/generated/zod/collaborator/collaborator.zod";

/**
 * Schema achatado do formulário de Colaborador (`/client/collaborators`) —
 * `CollaboratorCreate` do Core é `{ userName, profile: ProfileCreate }`
 * (objeto aninhado). Aqui só se remapeia o `.shape` gerado pelo Orval num
 * objeto plano (`fullName`, `document`, `email`, `phone`, `birthDate`,
 * `userName`) pra usar com `layouts/Form/Fields` — zero regra de validação
 * nova, zero Zod escrito à mão (regra 2 do AGENTS.md). A tela reagrupa em
 * `{ userName, profile: {...} }` no `onSubmit`, antes de disparar a mutation
 * (mesmo padrão de `src/components/profile/detail-tab.tsx`).
 */
export const collaboratorFormSchema = z.object({
  fullName: PostApiClientClientIdCollaboratorBody.shape.profile.shape.fullName,
  document: PostApiClientClientIdCollaboratorBody.shape.profile.shape.document,
  email: PostApiClientClientIdCollaboratorBody.shape.profile.shape.email,
  phone: PostApiClientClientIdCollaboratorBody.shape.profile.shape.phone,
  birthDate: PostApiClientClientIdCollaboratorBody.shape.profile.shape.birthDate,
  userName: PostApiClientClientIdCollaboratorBody.shape.userName,
});

export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

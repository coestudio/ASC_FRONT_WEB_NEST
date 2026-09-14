import { z } from "zod";

import { PostApiOperationOperationIdContainerIdPhotoBody } from "@/api/generated/zod/operation-container/operation-container.zod";

/**
 * Schema do formulário de upload de fotos do vínculo container↔operação
 * (aba Containers, SPEC-07-05) — `InputPhotoMulti` entrega uma lista de
 * arquivos; cada item reusa o mesmo tipo do campo `file` do schema gerado
 * (`PostApiOperationOperationIdContainerIdPhotoBody`), só "desembrulhado"
 * do `.optional()` porque aqui o array pode ficar vazio (nada selecionado
 * ainda) mas cada item, se existir, precisa ser um Blob de verdade — regra
 * 2 do AGENTS.md, zero regra de validação nova (só remapeamento de shape).
 * Cada arquivo é enviado numa chamada separada ao endpoint de foto (que só
 * aceita um arquivo por vez), nunca em lote.
 */
export const operationContainerPhotosFormSchema = z.object({
  files: z.array(PostApiOperationOperationIdContainerIdPhotoBody.shape.file.unwrap()),
});

export type OperationContainerPhotosFormValues = z.infer<typeof operationContainerPhotosFormSchema>;

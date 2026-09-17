import { useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "react-toastify";

import type { TranslationKey } from "@/i18n/translate";
import { useT } from "@/lib/ui-prefs";

/**
 * Chaves de tradução usadas pelos toasts de `useCrudMutations`. `created`/
 * `updated`/`deleted` são opcionais (omitir = não mostra toast de sucesso
 * nesse passo, caso a tela não tenha aquele fluxo). `error` não é mais usado
 * (SPEC-89) — o interceptor global do axios (`src/api/mutator.ts`) já mostra
 * o toast de erro de qualquer `mutateAsync` que falhe, então o catch daqui
 * não precisa (e não deve) mostrar um segundo toast genérico. Mantido como
 * opcional só pra não quebrar os `messages` já montados pelas telas
 * consumidoras (chave sobra sem uso).
 */
export type CrudMutationMessages = {
  created?: TranslationKey;
  updated?: TranslationKey;
  deleted?: TranslationKey;
  /** @deprecated Não é mais usado (SPEC-89) — interceptor global já notifica o erro. */
  error?: TranslationKey;
};

export type UseCrudMutationsConfig<TValues, TRecord, TDeleteRecord = TRecord> = {
  /** Chama a mutation de criação (ex.: `createMutation.mutateAsync({ data: values })`). */
  onCreate?: (values: TValues) => Promise<unknown>;
  /** Chama a mutation de atualização (ex.: `updateMutation.mutateAsync({ id: record.id, data: values })`). */
  onUpdate?: (values: TValues, record: TRecord) => Promise<unknown>;
  /** Chama a mutation de exclusão (ex.: `deleteMutation.mutateAsync({ id: record.id })`). */
  onDelete?: (record: TDeleteRecord) => Promise<unknown>;
  /** `queryKey` a invalidar depois de qualquer uma das 3 operações (mesma key que a tela já usa em `invalidateList()`). */
  invalidateKey: QueryKey;
  messages: CrudMutationMessages;
};

/**
 * Encapsula o par `try/catch` + `toast.success`/`toast.error` + invalidação
 * de query que hoje se repete, quase idêntico, em 8 telas de CRUD simples
 * (SPEC-18). Não conhece a assinatura de `mutateAsync` de cada entidade —
 * recebe `onCreate`/`onUpdate`/`onDelete` já fechados pela tela sobre a
 * mutation certa, porque essa assinatura varia por entidade (`{data}` vs
 * `{id,data}` vs `{operationId,id,data}`).
 *
 * `TDeleteRecord` é um terceiro type param opcional (default = `TRecord`)
 * porque `administrative/clients` tem um caso real onde o registro de
 * update (`ClientDetailDTO`, vindo do detalhe já carregado) e o de delete
 * (`ClientDTO`, o item cru da lista) são tipos diferentes.
 */
export function useCrudMutations<TValues, TRecord, TDeleteRecord = TRecord>({
  onCreate,
  onUpdate,
  onDelete,
  invalidateKey,
  messages,
}: UseCrudMutationsConfig<TValues, TRecord, TDeleteRecord>) {
  const t = useT();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: invalidateKey });

  const submit = async (
    mode: "create" | "edit",
    values: TValues,
    record?: TRecord,
  ): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      if (mode === "create" && onCreate) {
        await onCreate(values);
        if (messages.created) toast.success(t(messages.created));
      } else if (mode === "edit" && onUpdate && record) {
        await onUpdate(values, record);
        if (messages.updated) toast.success(t(messages.updated));
      }
      invalidate();
      return true;
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (record: TDeleteRecord): Promise<void> => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(record);
      if (messages.deleted) toast.success(t(messages.deleted));
      invalidate();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    } finally {
      setIsDeleting(false);
    }
  };

  return { submit, remove, isSubmitting, isDeleting };
}

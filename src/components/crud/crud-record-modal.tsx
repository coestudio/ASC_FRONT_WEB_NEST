import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import { Button, Form, Spinner } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import type { ZodType } from "zod";

import { withEmptyStringsAsNull } from "./empty-strings-resolver";

import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import RenderFields from "@/layouts/Form/Fields/map";

export type CrudRecordMode = "create" | "edit" | "view";

export type CrudRecordModalProps<T extends FieldValues> = {
  show: boolean;
  mode: CrudRecordMode;
  titleKeys: { create: TranslationKey; edit: TranslationKey; view: TranslationKey };
  schema: ZodType<T>;
  fields: LayoutField[];
  defaultValues?: T;
  onSubmit: (data: T) => void | Promise<void>;
  onClose: () => void;
  /** Conteúdo extra no modo `view` (ex.: seção mock de relatórios do Cliente, SPEC-05). */
  extraContent?: ReactNode;
  /**
   * Conteúdo acima dos campos, em todos os modos e fora do `fieldset
   * disabled` do `view` (ex.: avatar do Cliente, SPEC-101) — quem passa
   * decide se fica só leitura.
   */
  headerContent?: ReactNode;
  /**
   * Botão "Excluir" no rodapé, em `view`/`edit` (nunca em `create` — registro
   * ainda não existe) — SPEC-79. Opcional: sem a prop, nenhum botão aparece
   * (consumidor sem exclusão disponível, ex. `Collaborator`). Não muda o
   * fluxo de confirmação em si — cada consumidor decide o que `onDelete` faz
   * (tipicamente abrir a `ConfirmationModal` já existente na tela, mesma que
   * o menu de ações da lista já aciona).
   */
  onDelete?: () => void;
};

/**
 * Modal genérico com 3 modos: `create`, `edit`, `view`. `create`/`edit` usam
 * `useForm` + `zodResolver` sobre o schema Zod gerado passado por config, e
 * renderizam os campos a partir de `LayoutField[]` (sempre
 * `layouts/Form/Fields/*`, nunca elemento de input cru). `view` renderiza os
 * mesmos campos read-only (via `fieldset disabled`) + `extraContent`.
 */
export function CrudRecordModal<T extends FieldValues>({
  show,
  mode,
  titleKeys,
  schema,
  fields,
  defaultValues,
  onSubmit,
  onClose,
  extraContent,
  headerContent,
  onDelete,
}: CrudRecordModalProps<T>) {
  const t = useT();
  const methods = useForm<T>({
    // `withEmptyStringsAsNull` normaliza "" → null antes de validar (ver
    // comentário acima) e por baixo já usa `zodResolver` — schema gerado
    // continua sendo a única fonte de regra de validação.
    resolver: withEmptyStringsAsNull(schema),
    defaultValues: defaultValues as never,
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  // `defaultValues` normalmente chega como objeto novo a cada render do
  // componente pai (calculado inline) — se entrasse como dependência do
  // efeito, qualquer re-render do pai com o modal já aberto (refetch em
  // background, foco de janela voltando) disparava `reset()` de novo,
  // apagando seleção já feita em campos controlados antes do submit. Guarda
  // o valor mais recente num ref e reseta só na transição de abrir o modal.
  const defaultValuesRef = useRef(defaultValues);
  defaultValuesRef.current = defaultValues;

  useEffect(() => {
    if (show) reset(defaultValuesRef.current as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const readOnly = mode === "view";
  const title = t(titleKeys[mode]);

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header>
        <Modal.Title className="h5 mb-0">{title}</Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={readOnly ? undefined : handleSubmit(onSubmit as SubmitHandler<T>)}>
        <Modal.Body>
          {headerContent}
          <fieldset disabled={readOnly} className="border-0 p-0 m-0">
            <RenderFields fields={fields} methods={methods} />
          </fieldset>
          {extraContent}
        </Modal.Body>
        <Modal.Footer>
          {onDelete && mode !== "create" ? (
            <Button variant="outline-danger" onClick={onDelete} className="me-auto">
              <i className="bi bi-trash me-1" aria-hidden />
              {t("crud.recordModal.delete")}
            </Button>
          ) : null}
          <Button variant="outline-primary" onClick={onClose}>
            {t(readOnly ? "crud.recordModal.close" : "crud.recordModal.cancel")}
          </Button>
          {!readOnly ? (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : (
                <i className="bi bi-check-lg me-1" aria-hidden />
              )}
              {t("crud.recordModal.save")}
            </Button>
          ) : null}
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useForm, type FieldValues, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import type { ZodType } from "zod";

import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import RenderFields from "@/layouts/Form/Fields/map";

export type CrudRecordMode = "create" | "edit" | "view";

/**
 * Normaliza `""` pra `null` (raso, entra em objeto plano/array) antes da
 * validação Zod. Causa raiz de "cadastro não acontece" em campo opcional
 * vazio: os schemas gerados pelo Orval marcam campo opcional como
 * `.nullish()`/`.nullable()` (aceita `null`/`undefined`, não string vazia —
 * ex.: `country`/`postalCode` de `AddressCreate`, `tara` de `ContainerCreate`),
 * mas todo Field de `layouts/Form/Fields` deixa o campo vazio como `""`
 * quando o usuário não preenche (nenhum Field converte pra `null` sozinho).
 * Sem essa normalização, um campo opcional em branco falha a validação
 * (regex/formato) e trava o submit silenciosamente.
 *
 * Isso NÃO edita nenhum schema Zod (regra 2 do AGENTS.md) — só reescreve o
 * valor bruto que chega no `resolver` do react-hook-form, antes de passar
 * pro `zodResolver(schema)` de verdade.
 */
function emptyStringsToNull<V>(value: V): V {
  if (value === "") return null as unknown as V;
  if (Array.isArray(value)) {
    return value.map((item) => emptyStringsToNull(item)) as unknown as V;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        emptyStringsToNull(val),
      ]),
    ) as V;
  }
  return value;
}

/** Envolve `zodResolver` aplicando `emptyStringsToNull` nos valores brutos do form antes de validar. */
function withEmptyStringsAsNull<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  const resolver = zodResolver(schema as never) as unknown as Resolver<T>;
  return (values, context, options) => resolver(emptyStringsToNull(values), context, options);
}

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
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0">{title}</Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={readOnly ? undefined : handleSubmit(onSubmit as SubmitHandler<T>)}>
        <Modal.Body>
          <fieldset disabled={readOnly} className="border-0 p-0 m-0">
            <RenderFields fields={fields} methods={methods} />
          </fieldset>
          {extraContent}
        </Modal.Body>
        <Modal.Footer>
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

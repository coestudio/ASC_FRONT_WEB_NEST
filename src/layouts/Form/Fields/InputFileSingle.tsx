import { useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Button, Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputFileSingleProps<T extends FieldValues> extends InputDTO<T> {
  /** Whitelist de MIME/extensão (ex.: "application/pdf,.xlsx") — RF5 da
   * SPEC-SHARE-01, sem default restritivo (cada consumidor decide). */
  accept?: string;
}

/**
 * Upload de um único arquivo qualquer, sem preview de imagem —
 * `field.value` vira o `File` selecionado (ou `null`); quem envia decide o
 * `multipart/form-data` (RF8). Dois consumidores previstos: `DocumentDTO.file`
 * (SPEC-07-06) e a planilha da etapa `analyze` do import de romaneio
 * (SPEC-07-04) — `accept` varia por consumidor, por isso não tem default.
 */
function InputFileSingle<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  accept,
  ...colProps
}: InputFileSingleProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field: { value, onChange, name }, fieldState }) => {
          const file = (value as unknown) instanceof File ? (value as File) : null;

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              <Form.Label>{label || config.label || "Arquivo"}</Form.Label>
              <div className="d-flex align-items-center gap-2">
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Escolher arquivo
                </Button>
                <span className="text-truncate">{file?.name || "Nenhum arquivo selecionado"}</span>
                {file ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-danger p-0"
                    aria-label="Remover arquivo"
                    onClick={() => onChange(null)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="d-none"
                name={name}
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
              />
              {fieldState.error?.message ? (
                <Form.Control.Feedback type="invalid" className="d-block">
                  {fieldState.error.message}
                </Form.Control.Feedback>
              ) : (
                <Form.Text className="text-muted">&nbsp;</Form.Text>
              )}
            </Form.Group>
          );
        }}
      />
    </Col>
  );
}

export default InputFileSingle;

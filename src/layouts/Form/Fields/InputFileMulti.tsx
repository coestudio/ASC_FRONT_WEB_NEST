import { useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Button, Col, Form, ListGroup } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputFileMultiProps<T extends FieldValues> extends InputDTO<T> {
  /** Whitelist de MIME/extensão — RF5 da SPEC-SHARE-01, sem default restritivo. */
  accept?: string;
}

/**
 * Upload de múltiplos arquivos — lista acumulativa (cada seleção soma à
 * lista anterior), cada item removível individualmente antes do envio
 * (RF7/CA5). `field.value` vira `File[]`; quem envia decide o
 * `multipart/form-data` (um `append` por arquivo, RF8).
 */
function InputFileMulti<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  accept,
  ...colProps
}: InputFileMultiProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field: { value, onChange }, fieldState }) => {
          const files = Array.isArray(value) ? (value as File[]) : [];

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              <Form.Label>{label || config.label || "Arquivos"}</Form.Label>
              <div>
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Adicionar arquivo
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={accept}
                className="d-none"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  onChange([...files, ...picked]);
                  // Limpa o input pra permitir escolher o mesmo arquivo de novo depois de removido.
                  e.target.value = "";
                }}
              />
              {files.length > 0 ? (
                <ListGroup className="mt-2">
                  {files.map((file, i) => (
                    <ListGroup.Item
                      key={`${file.name}-${i}`}
                      className="d-flex justify-content-between align-items-center py-1"
                    >
                      <span className="text-truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        aria-label="Remover arquivo"
                        onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : null}
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

export default InputFileMulti;

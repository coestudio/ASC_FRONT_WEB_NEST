import { useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Button, Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

/**
 * Upload de múltiplas imagens com grid de preview (thumbnails), cada uma
 * removível individualmente antes do envio (RF6/RF7/CA4/CA5 da
 * SPEC-SHARE-01). `accept` fixo em `image/*`, sem crop (CA7 — crop continua
 * exclusivo de `InputAvatar`). `field.value` vira `File[]`; quem envia
 * decide o `multipart/form-data` (um `append` por foto, RF8). Ex.: fotos de
 * `OperationContainer` (SPEC-07-05).
 */
function InputPhotoMulti<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  ...colProps
}: InputDTO<T>) {
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
              <Form.Label>{label || config.label || "Fotos"}</Form.Label>
              <div>
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Adicionar foto
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="d-none"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  onChange([...files, ...picked]);
                  // Limpa o input pra permitir escolher a mesma foto de novo depois de removida.
                  e.target.value = "";
                }}
              />
              {files.length > 0 ? (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {files.map((file, i) => {
                    const url = URL.createObjectURL(file);
                    return (
                      <div
                        key={`${file.name}-${i}`}
                        className="position-relative rounded overflow-hidden border"
                        style={{ width: 88, height: 88 }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0 m-1 p-0 d-flex align-items-center justify-content-center"
                          style={{ width: 20, height: 20, lineHeight: 1 }}
                          aria-label="Remover foto"
                          onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                        >
                          <i className="bi bi-x" aria-hidden="true" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
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

export default InputPhotoMulti;

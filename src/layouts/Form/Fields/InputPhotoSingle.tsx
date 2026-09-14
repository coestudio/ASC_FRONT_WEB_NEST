import { useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Button, Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputPhotoSingleProps<T extends FieldValues> extends InputDTO<T> {
  /** URL da foto já salva no servidor (edição), usada até o usuário trocar o arquivo. */
  previewUrl?: string | null;
}

/**
 * Upload de uma única imagem com preview (thumbnail), sem crop — RF6/CA4
 * da SPEC-SHARE-01. Diferente de `InputAvatar` (crop circular 96×96, caso
 * específico de perfil — CA7: crop continua exclusivo dele). `accept` fica
 * fixo em `image/*`, não configurável. `field.value` vira o `File`
 * selecionado (ou `null`); quem envia decide o `multipart/form-data` (RF8).
 */
function InputPhotoSingle<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  previewUrl,
  ...colProps
}: InputPhotoSingleProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field: { value, onChange, name }, fieldState }) => {
          const file = (value as unknown) instanceof File ? (value as File) : null;
          const localUrl = file ? URL.createObjectURL(file) : null;
          const src = localUrl || previewUrl || null;

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              <Form.Label>{label || config.label || "Foto"}</Form.Label>
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded overflow-hidden d-inline-flex align-items-center justify-content-center bg-secondary-subtle text-secondary-emphasis"
                  style={{ width: 96, height: 96 }}
                >
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <i className="bi bi-image fs-3" aria-hidden="true" />
                  )}
                </div>
                <div className="d-flex flex-column gap-1">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                  >
                    Escolher foto
                  </Button>
                  {file ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={() => onChange(null)}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
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

export default InputPhotoSingle;

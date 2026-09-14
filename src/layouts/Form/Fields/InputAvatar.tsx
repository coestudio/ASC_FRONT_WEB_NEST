import { useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputAvatarProps<T extends FieldValues> extends InputDTO<T> {
  /** URL do avatar atual (já salvo no servidor), usada até o usuário trocar o arquivo. */
  previewUrl?: string | null;
  /** Iniciais mostradas quando não há avatar nem arquivo selecionado. */
  initials?: string;
}

/**
 * Campo de upload de avatar — único lugar do projeto com `<input type="file">`
 * cru, por dentro de `layouts/Form/Fields` (regra 10: campo de formulário
 * novo entra aqui, nunca improvisado na tela). `field.value` vira o `File`
 * selecionado (ou `null`); quem envia decide o multipart (ver profile-modal).
 */
function InputAvatar<T extends FieldValues>({
  fieldName,
  methods,
  config = {},
  previewUrl,
  initials,
  ...colProps
}: InputAvatarProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Col {...colProps}>
      <Controller
        control={methods.control}
        name={fieldName}
        render={({ field: { value, onChange, name } }) => {
          const file = (value as unknown) instanceof File ? (value as File) : null;
          const localUrl = file ? URL.createObjectURL(file) : null;
          const src = localUrl || previewUrl || null;

          return (
            <div className={config.containerClass || default_containerClass}>
              <div
                role="button"
                tabIndex={0}
                aria-label={config.label || "Trocar avatar"}
                className="rounded-circle overflow-hidden d-inline-flex align-items-center justify-content-center bg-secondary-subtle text-secondary-emphasis fs-4"
                style={{ width: 96, height: 96, cursor: "pointer" }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{initials || "?"}</span>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="d-none"
                name={name}
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
              />
            </div>
          );
        }}
      />
    </Col>
  );
}

export default InputAvatar;

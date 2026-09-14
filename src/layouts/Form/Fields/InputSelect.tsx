import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass, type FieldOption } from "layouts/Form/types/Input";

/**
 * Dropdown de seleção única (`<Form.Select>` simples) — valor sempre
 * `string | number`, casado com `config.options` (mesma fonte de
 * `InputMultiSelect`, mas pra campo que aceita só um valor, ex.:
 * `TerminalCreate.harborId`, SPEC-04). Opção vazia sempre disponível
 * (`""` → `null`, tratado por `emptyStringsToNull` do `crud-record-modal`
 * antes da validação Zod).
 */
function InputSelect<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  ...colProps
}: InputDTO<T>) {
  const options: FieldOption[] = config.options ?? [];

  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field, fieldState }) => (
          <Form.Group
            className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
          >
            <Form.Label>{label || config.label || "Selecione"}</Form.Label>
            <Form.Select
              value={field.value === undefined || field.value === null ? "" : String(field.value)}
              isInvalid={!!fieldState.error}
              className={config.className ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  field.onChange(null);
                  return;
                }
                // Mesma regra de `InputMultiSelect`: só vira `Number` se o
                // valor for numérico de verdade — um `uuid` nunca é
                // parseável como número, então permanece string.
                field.onChange(Number.isNaN(Number(raw)) ? raw : Number(raw));
              }}
            >
              <option value="">{config.placeholder || "—"}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
            {fieldState.error?.message ? (
              <Form.Control.Feedback type="invalid" className="d-block">
                {fieldState.error.message}
              </Form.Control.Feedback>
            ) : (
              <Form.Text className="text-muted">&nbsp;</Form.Text>
            )}
          </Form.Group>
        )}
      />
    </Col>
  );
}

export default InputSelect;

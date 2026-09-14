import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass, type FieldOption } from "layouts/Form/types/Input";

/**
 * Grupo de checkboxes pra campo de seleção múltipla (`config.options`) —
 * mesma forma de valor do `InputMultiSelect` (array de `string | number`),
 * só troca o widget: um checkbox por opção em vez de dropdown `<select
 * multiple>`. Útil quando o número de opções é pequeno e fixo (ex.: roles
 * do usuário) e a seleção múltipla precisa ficar visível de cara, sem abrir
 * dropdown.
 */
function InputCheckboxGroup<T extends FieldValues>({
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
        render={({ field, fieldState }) => {
          const selected = ((field.value as Array<string | number> | undefined) ?? []).map(String);

          const toggle = (value: string | number, checked: boolean) => {
            if (checked) {
              field.onChange([...selected, value]);
            } else {
              field.onChange(selected.filter((v) => v !== String(value)));
            }
          };

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              {label || config.label ? <Form.Label>{label || config.label}</Form.Label> : null}
              <div className={config.className ?? ""}>
                {options.map((opt) => (
                  <Form.Check
                    key={opt.value}
                    type="checkbox"
                    id={`${fieldName}-${opt.value}`}
                    label={opt.label}
                    inline
                    checked={selected.includes(String(opt.value))}
                    isInvalid={!!fieldState.error}
                    onChange={(e) => toggle(opt.value, e.target.checked)}
                  />
                ))}
              </div>
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

export default InputCheckboxGroup;

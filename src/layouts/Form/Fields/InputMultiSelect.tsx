import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass, type FieldOption } from "layouts/Form/types/Input";

/**
 * Grupo de checkboxes pra seleção múltipla — valor sempre um array de
 * `string | number`, casado com o tipo de `config.options` (ex.:
 * `roles: InternalRole[]`, SPEC-03 decisão D3). Trocado de
 * `<Form.Select multiple>` pra checkbox porque o dropdown nativo de seleção
 * múltipla exige ctrl/cmd+click pra marcar mais de uma opção — inviável no
 * mobile (sem ctrl) e pouco descobrível no desktop. Opções vêm de
 * `config.options` (não hardcoded aqui), pensado pra ser reaproveitado por
 * qualquer enum/lookup do Core nas próximas SPECs.
 */
function InputMultiSelect<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  disabled,
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

          const toggle = (optValue: string | number, checked: boolean) => {
            const current = (field.value as Array<string | number> | undefined) ?? [];
            const next = checked
              ? [...current, optValue]
              : current.filter((v) => String(v) !== String(optValue));
            field.onChange(next);
          };

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              <Form.Label>{label || config.label || "Selecione"}</Form.Label>
              <div
                className={`d-flex flex-wrap gap-3${fieldState.error ? " is-invalid" : ""} ${config.className ?? ""}`}
              >
                {options.map((opt) => (
                  <Form.Check
                    key={opt.value}
                    inline
                    type="checkbox"
                    id={`${fieldName}-${opt.value}`}
                    label={opt.label}
                    checked={selected.includes(String(opt.value))}
                    disabled={disabled}
                    onChange={(e) => toggle(opt.value, e.target.checked)}
                    className="m-0"
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

export default InputMultiSelect;

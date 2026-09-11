import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass, type FieldOption } from "layouts/Form/types/Input";
import type { EnumOptionDTO } from "@/api/generated/model";
import { useLocale } from "@/lib/ui-prefs";

interface SelectProps<T extends FieldValues> extends InputDTO<T> {
  /**
   * Snapshot estático de enum gerado (ex.: `operationStatusOptions`, de
   * `src/api/generated/static/*` — nome pelo enum C# real, SPEC-13),
   * resolvido pro idioma atual via
   * `useLocale()`. Alternativa a `config.options` quando as opções vêm
   * direto do snapshot do Core, sem o consumidor precisar pré-resolver o
   * rótulo por idioma.
   */
  enumOptions?: EnumOptionDTO[];
}

/**
 * Dropdown de opção única (`<Form.Select>`) pra enum estático gerado
 * (RF2 da SPEC-SHARE-01), sem fetch — implementa o stub vazio de
 * `Fields/make/Select.tsx`. Aceita `enumOptions` (snapshot bruto de
 * `src/api/generated/static/*`, resolvido pro idioma atual) ou
 * `config.options` já resolvido (mesmo contrato de `InputMultiSelect`,
 * mas valor único em vez de array).
 */
function Select<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  enumOptions,
  ...colProps
}: SelectProps<T>) {
  const locale = useLocale();

  // Bind por `key` (nome do membro C#, string) — não por `value` (int
  // legado). Desde SPEC-00/15 do Core, o binder do JsonStringEnumConverter
  // só aceita a string do enum; `Value` continua existindo no DTO só por
  // compatibilidade, não é mais o que se submete.
  const options: FieldOption[] =
    enumOptions?.map((opt) => ({
      value: opt.key,
      label: opt.name[locale] ?? opt.name["pt-BR"] ?? opt.key,
    })) ??
    config.options ??
    [];

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
              value={(field.value as string | number | undefined) ?? ""}
              isInvalid={!!fieldState.error}
              className={config.className ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  field.onChange(undefined);
                  return;
                }
                field.onChange(Number.isNaN(Number(raw)) ? raw : Number(raw));
              }}
            >
              <option value="">{config.placeholder || "Selecione..."}</option>
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

export default Select;

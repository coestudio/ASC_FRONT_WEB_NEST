import React from "react";
import { FieldValues } from "react-hook-form";
import { Form, InputGroup } from "react-bootstrap";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

function InputText<T extends FieldValues>({
  fieldName,
  methods,
  label,
  placeholder,
  config = {},
  minLength,
  maxLength,
  ...colProps
}: InputDTO<T>) {
  return (
    <Input
      label={label}
      methods={methods}
      config={config}
      {...colProps}
      fieldName={fieldName}
      element={(field) => {
        const control = (
          <Form.Control
            {...field}
            type="text"
            minLength={minLength}
            maxLength={maxLength}
            placeholder={placeholder || "Digite seu texto"}
            className={`form-control ${config?.className || ""}`}
          />
        );

        // Ícone opcional à esquerda do campo (bootstrap-icons) — SPEC-11 item 4.
        if (!config.icon) return control;

        return (
          <InputGroup>
            <InputGroup.Text>
              <i className={`bi ${config.icon}`} aria-hidden="true" />
            </InputGroup.Text>
            {control}
          </InputGroup>
        );
      }}
    />
  );
}

export default InputText;

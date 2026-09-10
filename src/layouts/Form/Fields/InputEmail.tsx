import React from "react";
import { FieldValues } from "react-hook-form";
import { Form } from "react-bootstrap";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

function InputEmail<T extends FieldValues>({
  fieldName,
  methods,
  label,
  placeholder,
  config = {},
  ...colProps
}: InputDTO<T>) {
  return (
    <Input
      label={label}
      methods={methods}
      config={config}
      {...colProps}
      fieldName={fieldName}
      element={(field) => (
        <Form.Control
          {...field}
          type="email"
          minLength={3}
          maxLength={100}
          placeholder={config.placeholder || "ex.: email@exemplo.com"}
          autoComplete="email"
          className={`form-control ${config.className}`}
        />
      )}
    />
  );
}

export default InputEmail;

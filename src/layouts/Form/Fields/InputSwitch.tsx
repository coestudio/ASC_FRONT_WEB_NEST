import React from "react";
import { FieldValues } from "react-hook-form";
import { Form } from "react-bootstrap";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

function InputSwitch<T extends FieldValues>({
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
        <Form.Check
          type="switch"
          checked={field.value}
          onChange={(e) => field.onChange(e.target.checked)}
        />
      )}
    />
  );
}

export default InputSwitch;

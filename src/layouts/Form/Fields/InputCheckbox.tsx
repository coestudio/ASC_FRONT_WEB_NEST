import React from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

function InputCheckbox<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  ...colProps
}: InputDTO<T>) {
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
            <Form.Check
              type="checkbox"
              id={fieldName}
              label={label || config.label}
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className={config.className ?? ""}
              isInvalid={!!fieldState.error}
            />
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

export default InputCheckbox;

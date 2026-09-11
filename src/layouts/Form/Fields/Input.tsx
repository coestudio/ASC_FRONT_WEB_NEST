import React from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputProps<T extends FieldValues> extends InputDTO<T> {
  element: (
    //errorClass: string,
    field: any,
    fieldState: any,
  ) => React.ReactNode;
}

function Input<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  placeholder,
  config = {},
  element,
  ...colProps
}: InputProps<T>) {
  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field, fieldState }) => (
          <Form.Group
            className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            // Gerenciadores de senha (LastPass, Bitwarden, 1Password) injetam
            // nó próprio (ex.: data-lastpass-icon-root) dentro do form antes
            // do hydrate do React → mismatch de hidratação (não é bug nosso,
            // acontece em qualquer framework SSR). suppressHydrationWarning
            // é o escape hatch oficial do React p/ esse caso: silencia o
            // mismatch de 1 nível de filhos deste Form.Group, sem afetar
            // validação nem re-render normal do campo.
            suppressHydrationWarning
          >
            <Form.Label>{label || config.label || "Texto"}</Form.Label>

            {element(
              //`form-control${fieldState.error ? " is-invalid" : ""}`,
              field,
              fieldState,
            )}

            {(fieldState.error?.message ?? !!fieldState.error) ? (
              <Form.Control.Feedback type="invalid" className="d-block">
                {fieldState.error?.message}
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

export default Input;

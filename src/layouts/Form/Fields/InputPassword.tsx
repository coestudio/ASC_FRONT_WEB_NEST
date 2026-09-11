import React from "react";
import { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
import { Form, InputGroup, Col } from "react-bootstrap";
import { Controller } from "react-hook-form";

import classNames from "classnames";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputPasswordProps<T extends FieldValues> extends InputDTO<T> {
  minLength?: number;
  maxLength?: number;
}

function InputPassword<T extends FieldValues>({
  fieldName,
  methods,
  label,
  placeholder,
  config = {},
  minLength,
  maxLength,
  ...colProps
}: InputPasswordProps<T>) {
  return (
    <Col {...colProps}>
      <Controller
        control={methods.control}
        name={fieldName}
        render={({ field, fieldState }) => (
          <Form.Group className={config.containerClass || default_containerClass}>
            <Form.Label className="mb-0">{label || config.label || "Senha"}</Form.Label>
            <Field
              field={field}
              config={config}
              minLength={minLength}
              maxLength={maxLength}
              placeholder={placeholder}
            />
            {fieldState.error?.message ? (
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

function Field<T extends FieldValues>({
  field,
  config = {},
  minLength,
  maxLength,
  placeholder,
}: {
  field: ControllerRenderProps<T, Path<T>>;
  config: InputDTO<T>["config"];
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = React.useState(false);

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <InputGroup>
      {/* Ícone decorativo (cadeado) opcional, à esquerda do campo — SPEC-11
          item 4. O toggle de mostrar/ocultar senha continua à direita. */}
      {config.icon ? (
        <InputGroup.Text>
          <i className={`bi ${config.icon}`} aria-hidden="true" />
        </InputGroup.Text>
      ) : null}
      <Form.Control
        {...field}
        id={field.name}
        type={showPassword ? "text" : "password"}
        name={field.name}
        className={config.className || ""}
        placeholder={placeholder || config.placeholder || "Digite sua senha"}
        as="input"
        minLength={minLength || 6}
        maxLength={maxLength || 32}
      />
      <div
        className={classNames("input-group-text", "input-group-password", {
          "show-password": showPassword,
        })}
        data-password={showPassword ? "true" : "false"}
        style={{ cursor: "pointer" }}
        onClick={togglePassword}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePassword();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={showPassword}
      >
        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
      </div>
    </InputGroup>
  );
}

export default InputPassword;

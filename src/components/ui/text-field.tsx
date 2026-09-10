"use client";

import {
  forwardRef,
  useId,
  type ChangeEventHandler,
  type ComponentType,
  type FocusEventHandler,
  type HTMLAttributes,
} from "react";
import { Form, InputGroup } from "react-bootstrap";

type TextFieldProps = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  labelClassName?: string;
  /** Ícone opcional exibido fixo à esquerda do campo. */
  icon?: ComponentType<{ className?: string }>;
  /** Marca o campo como inválido (borda/vermelho) — usado com validação por campo. */
  isInvalid?: boolean;
  /** Mensagem exibida abaixo do campo quando `isInvalid` é true. */
  feedback?: string;
  defaultValue?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      name,
      label,
      type = "text",
      autoComplete,
      placeholder,
      required,
      minLength,
      maxLength,
      className,
      labelClassName,
      icon: Icon,
      isInvalid,
      feedback,
      defaultValue,
      inputMode,
      onChange,
      onBlur,
    },
    ref
  ) {
    const controlId = useId();

    const control = (
      <Form.Control
        ref={ref}
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        isInvalid={isInvalid}
        defaultValue={defaultValue}
        inputMode={inputMode}
        onChange={onChange}
        onBlur={onBlur}
      />
    );

    return (
      <Form.Group className={className ?? "mb-3"} controlId={controlId}>
        <Form.Label className={labelClassName}>{label}</Form.Label>
        {Icon ? (
          <InputGroup hasValidation>
            <InputGroup.Text>
              <Icon />
            </InputGroup.Text>
            {control}
            {isInvalid && feedback && (
              <Form.Control.Feedback type="invalid">
                {feedback}
              </Form.Control.Feedback>
            )}
          </InputGroup>
        ) : (
          <>
            {control}
            {isInvalid && feedback && (
              <Form.Control.Feedback type="invalid">
                {feedback}
              </Form.Control.Feedback>
            )}
          </>
        )}
      </Form.Group>
    );
  }
);

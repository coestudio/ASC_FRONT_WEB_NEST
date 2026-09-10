"use client";

import {
  forwardRef,
  useId,
  useState,
  type ChangeEventHandler,
  type ComponentType,
  type FocusEventHandler,
  type ReactNode,
} from "react";
import { Form, InputGroup, Button } from "react-bootstrap";
import { Eye, EyeSlash } from "react-bootstrap-icons";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  labelClassName?: string;
  /** Elemento extra renderizado ao lado do label, alinhado à direita (ex.: link "Esqueceu a senha?"). */
  labelAction?: ReactNode;
  /** Ícone opcional exibido fixo à esquerda do campo (ex.: cadeado). */
  icon?: ComponentType<{ className?: string }>;
  /** Marca o campo como inválido (borda/vermelho) — usado com validação por campo. */
  isInvalid?: boolean;
  /** Mensagem exibida abaixo do campo quando `isInvalid` é true. */
  feedback?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    {
      name,
      label,
      autoComplete,
      placeholder,
      required,
      minLength,
      maxLength,
      className,
      labelClassName,
      labelAction,
      icon: Icon,
      isInvalid,
      feedback,
      onChange,
      onBlur,
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const controlId = useId();

    return (
      <Form.Group className={className ?? "mb-3"} controlId={controlId}>
        <div className="d-flex justify-content-between align-items-center">
          <Form.Label className={labelClassName}>{label}</Form.Label>
          {labelAction}
        </div>
        <InputGroup hasValidation>
          {Icon && (
            <InputGroup.Text>
              <Icon />
            </InputGroup.Text>
          )}
          <Form.Control
            ref={ref}
            type={visible ? "text" : "password"}
            name={name}
            autoComplete={autoComplete}
            placeholder={placeholder}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            isInvalid={isInvalid}
            onChange={onChange}
            onBlur={onBlur}
          />
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
          >
            {visible ? <EyeSlash /> : <Eye />}
          </Button>
          {isInvalid && feedback && (
            <Form.Control.Feedback type="invalid">{feedback}</Form.Control.Feedback>
          )}
        </InputGroup>
      </Form.Group>
    );
  },
);

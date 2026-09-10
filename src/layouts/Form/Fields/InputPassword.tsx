
import React from "react";
import { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
import { Form, InputGroup, Col } from "react-bootstrap";
import { Controller } from "react-hook-form";

import classNames from 'classnames';

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputPasswordProps<T extends FieldValues> extends InputDTO<T> {
    recurses?: {
        forgotPassword?: {
            show?: boolean;
            label?: string;
            email?: string;
        }
        minLength?: number;
        maxLength?: number;
    }
}

function InputPassword<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config = {},
    recurses,
    ...colProps
}: InputPasswordProps<T>) {
    return (
        <Col {...colProps}>
            <Controller
                control={methods.control}
                name={fieldName}
                render={({ field, fieldState }) => (
                    <Form.Group className={config.containerClass || default_containerClass}>
                        <div className="d-flex justify-content-between align-items-center">
                            <Form.Label className="mb-0">{label ||config.label || "Senha"}</Form.Label>
                            {recurses?.forgotPassword?.show ? (
                                <a
                                    className="text-muted"
                                    href={
                                        `/forget-password${recurses.forgotPassword.email
                                            ? `?email=${recurses.forgotPassword.email}`
                                            : ''
                                        }`
                                    }
                                >
                                    <small>{recurses.forgotPassword.label || "Esqueceu a senha?"}</small>
                                </a>
                            ) : null}
                        </div>
                        <Field
                            field={field}
                            config={config}
                            recurses={recurses}
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
    field, config = {}, recurses, placeholder
}: {
    field: ControllerRenderProps<T, Path<T>>;
    config: InputDTO<T>['config'];
    recurses: InputPasswordProps<T>['recurses'];
    placeholder?: string;
}) {

    const [showPassword, setShowPassword] = React.useState(false);

    const togglePassword = () => {
        setShowPassword(prev => !prev);
    }

    return (
        <InputGroup>
            <Form.Control
                {...field}
                id={field.name}
                type={showPassword ? "text" : "password"}
                name={field.name}
                className={config.className || ''}
                placeholder={placeholder ||config.placeholder || "Digite sua senha"}
                as="input"
                minLength={recurses?.minLength || 6}
                maxLength={recurses?.maxLength || 32}
            />
            <div
                className={classNames('input-group-text', 'input-group-password', {
                    'show-password': showPassword,
                })}
                data-password={showPassword ? 'true' : 'false'}
                style={{ cursor: 'pointer' }}
                onClick={togglePassword}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePassword();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
            >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
            </div>
        </InputGroup>
    );
}

export default InputPassword;


import React from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

interface InputProps<T extends FieldValues> extends InputDTO<T> {
    element: (
        //errorClass: string, 
        field: any, fieldState: any, 
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
                    >
                        <Form.Label>{label || config.label || "Texto"}</Form.Label>

                        {element(
                            //`form-control${fieldState.error ? " is-invalid" : ""}`, 
                            field, fieldState
                        )}

                        {fieldState.error?.message ?? !!fieldState.error ? (
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


import React from "react";
import { FieldValues } from "react-hook-form";
import { Form } from "react-bootstrap";

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

function InputText<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config,
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
            element={(field) => (
                <Form.Control
                    {...field}
                    type="text"
                    minLength={minLength}
                    maxLength={maxLength}
                    placeholder={placeholder || config.placeholder || "Digite seu texto"}
                    className={`form-control ${config.className}`}
                />
            )}
        />
    );
}

export default InputText;

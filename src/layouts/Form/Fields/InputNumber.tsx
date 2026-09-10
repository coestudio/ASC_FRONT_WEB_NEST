
import React from "react";
import { FieldValues } from "react-hook-form";
import { Form } from "react-bootstrap";

import { NumericFormat } from "react-number-format";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

function InputNumber<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config = {},
    ...colProps
}: InputDTO<T>) {

    const { formState: {errors} } = methods;

    return (
        <Input
            label={label}
            methods={methods}
            config={config}
            {...colProps}
            fieldName={fieldName}
            element={(field) => (
                <Form.Control
                    type="number"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        // Remove zeros à esquerda e converte para número
                        const numericValue = value === '' ? 1 : Math.max(1, parseInt(value, 10) || 1);
                        field.onChange(numericValue);
                    }}
                    isInvalid={!!errors.installmentsNumber}
                    placeholder="Ex: 12"
                    min="1"
                />
            )}
        />
    );
}

export default InputNumber;


import React from "react";
import { FieldValues } from "react-hook-form";
import { Form } from "react-bootstrap";

import { NumericFormat } from "react-number-format";

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

function InputPorcentage<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config,
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
                <NumericFormat
                    {...field}
                    allowNegative={false}
                    suffix={" %"}
                    placeholder={placeholder || config.placeholder || "Digite seu percentual"}
                    onValueChange={(values) => {
                        field.onChange(values.floatValue ?? "");
                    }}
                    value={field.value || ""}
                />
            )}
        />
    );
}

export default InputPorcentage;

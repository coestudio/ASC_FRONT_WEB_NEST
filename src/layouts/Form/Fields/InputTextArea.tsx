
import { FieldValues } from "react-hook-form";
import { Form } from "react-bootstrap";

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

function InputTextArea<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config,
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
                    as="textarea"
                    maxLength={maxLength}
                    placeholder={config.placeholder || "Digite seu texto"}
                    className={`form-control ${config.className}`}
                />
            )}
        />
    );
}

export default InputTextArea;

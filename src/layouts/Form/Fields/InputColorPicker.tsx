
import React from "react";
import { FieldValues } from "react-hook-form";
import { Form, InputGroup } from "react-bootstrap";

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR = "#000000";

function InputColorPicker<T extends FieldValues>({
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
            element={(field, fieldState) => {
                const swatchValue = HEX_COLOR_REGEX.test(field.value) ? field.value : DEFAULT_COLOR;

                return (
                    <InputGroup hasValidation>
                        <Form.Control
                            type="color"
                            value={swatchValue}
                            onChange={(e) => field.onChange(e.target.value)}
                            title="Selecione uma cor"
                            className="form-control-color"
                            style={{ maxWidth: "3rem" }}
                        />
                        <Form.Control
                            type="text"
                            name={field.name}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            placeholder={placeholder || config.placeholder || "#000000"}
                            maxLength={7}
                            isInvalid={!!fieldState.error}
                            className={config.className ?? ""}
                        />
                    </InputGroup>
                );
            }}
        />
    );
}

export default InputColorPicker;

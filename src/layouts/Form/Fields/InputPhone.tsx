
import { FieldValues } from "react-hook-form";

import { IMaskInput } from 'react-imask';

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

function InputPhone<T extends FieldValues>({
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
                <IMaskInput
                    {...field}
                    mask="(00) 00000-0000"
                    unmask={true}
                    minLength={8}
                    maxLength={15}
                    placeholder={config.placeholder || "Digite seu telefone"}
                    onAccept={(value: any) => field.onChange(value)}
                    className={`form-control ${config.className}`}
                />
            )}
        />
    );
}

export default InputPhone;

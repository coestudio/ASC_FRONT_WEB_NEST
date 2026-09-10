
import { FieldValues } from "react-hook-form";
import { IMaskInput } from 'react-imask';

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

import { isValidCPF } from "Layouts/Form/Helpers/Validate";

function InputCPF<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config,
    ...colProps
}: InputDTO<T>) {
    // Adiciona validação customizada
    config.rules = {
        ...(config.rules || {}),
        validate: (value: string) =>
            isValidCPF(value) || 'CPF inválido',
    };
    return (
        <Input
            label={label || "Cpf"}
            methods={methods}
            config={config}
            {...colProps}
            fieldName={fieldName}
            element={(field) => (
                <IMaskInput
                    {...field}
                    mask="000.000.000-00"
                    unmask={true}
                    placeholder={config.placeholder || "Digite seu CPF"}
                    onAccept={(value: any) => field.onChange(value)}
                    className={`form-control ${config.className}`}
                />
            )}
        />
    );
}

export default InputCPF;

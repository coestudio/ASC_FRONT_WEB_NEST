
import { FieldValues } from "react-hook-form";
import { IMaskInput } from 'react-imask';

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

import { isValidRG } from "layouts/Form/Helpers/Validate";

function InputRG<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config = {},
    ...colProps
}: InputDTO<T>) {
    // Adiciona validação customizada
    config.rules = {
        ...(config.rules || {}),
        validate: (value: string) =>
            isValidRG(value) || 'RG inválido',
    };
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
                    mask="00.000.000-0"
                    unmask={true}
                    placeholder={config.placeholder || "Digite seu RG"}
                    onAccept={(value: any) => field.onChange(value)}
                    className={`form-control ${config.className}`}
                />
            )}
        />
    );
}

export default InputRG;

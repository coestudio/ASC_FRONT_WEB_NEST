
import { FieldValues } from "react-hook-form";
import { NumericFormat } from "react-number-format";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

type CurrencyType = 'BRL' | 'USD' | 'EUR';

const currencyConfig: Record<CurrencyType, {
    prefix: string;
    thousandSeparator: string;
    decimalSeparator: string;
    placeholder: string;
}> = {
    BRL: {
        prefix: 'R$ ',
        thousandSeparator: '.',
        decimalSeparator: ',',
        placeholder: 'Ex: R$ 1.000,00',
    },
    USD: {
        prefix: '$ ',
        thousandSeparator: ',',
        decimalSeparator: '.',
        placeholder: 'Ex: $ 1,000.00',
    },
    EUR: {
        prefix: '€ ',
        thousandSeparator: '.',
        decimalSeparator: ',',
        placeholder: 'Ex: € 1.000,00',
    },
};

interface InputMoneyProps<T extends FieldValues> extends InputDTO<T> {
    currency?: CurrencyType;
}

function InputMoney<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config = {},
    currency = 'BRL',
    ...colProps
}: InputMoneyProps<T>) {
    const currConfig = currencyConfig[currency];

    return (
        <Input
            label={label}
            methods={methods}
            config={config}
            {...colProps}
            fieldName={fieldName}
            element={(field, fieldState) => (
                <NumericFormat
                    name={field.name}
                    getInputRef={field.ref}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onValueChange={(values) => {
                        field.onChange(values.floatValue ?? "");
                    }}
                    thousandSeparator={currConfig.thousandSeparator}
                    decimalSeparator={currConfig.decimalSeparator}
                    prefix={currConfig.prefix}
                    decimalScale={2}
                    fixedDecimalScale
                    allowNegative={false}
                    placeholder={config.placeholder || currConfig.placeholder}
                    className={`form-control${fieldState.error ? " is-invalid" : ""}`}
                />
            )}
        />
    );
}

export default InputMoney;

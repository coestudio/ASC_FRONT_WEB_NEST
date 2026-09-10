import React, { useEffect } from "react";
import { FieldValues } from "react-hook-form";
import Select from "react-select";

import Dropdown, {type DrodownPops, DropdownOption} from "./Dropdown";

function DropdownSelect<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config = {},
    withAllOption = false,
    options = [{ label: "Opção 1", value: 1 }, { label: "Opção 2", value: 2 }],
    defaultSelected = undefined,
    ...colProps
}: DrodownPops<T>) {

    useEffect(() => {
        const fetchData = async () => {
            const valor = await methods.getValues(fieldName);
            methods.setValue(fieldName, (valor ?? defaultSelected) as any);
        };
        fetchData();
    }, [])

    return (
        <Dropdown
            label={label || "Selecione"}
            methods={methods}
            config={config}
            {...colProps}
            fieldName={fieldName}
            element={(field) => { 
                return(
                    <Select
                        {...field}
                        classNamePrefix="rs"
                        value={options.find(opt => opt.value === (field.value)) ?? undefined}
                        options={options}
                        onChange={(change: DropdownOption) => field.onChange(change?.value ?? undefined)}
                        placeholder={placeholder || config.placeholder || "Selecione um estado"}
                    />
            )}}
        />
    );
}

export default DropdownSelect;
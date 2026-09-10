/*
import React from "react";
import { FieldValues } from "react-hook-form";
import Select from "react-select";

import Dropdown, {type DrodownPops} from "./Dropdown";

//* Importe a lista de estados do Brasil
import { STATES_BRASIL } from 'data/geo/states'; 
const OPTIONS = STATES_BRASIL.map(state => ({
    value: state.sigla,
    label: state.nome
}));

function DropdownGender<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config,
    defaultSelected = null,
    ...colProps
}: DrodownPops<T>) {
    return (
        <Dropdown
            label={label || "Estado"}
            methods={methods}
            config={config}
            {...colProps}
            fieldName={fieldName}
            element={(field) => (
                <Select 
                    {...field}
                    value={field.value || defaultSelected || null}
                    options={OPTIONS}
                    placeholder={placeholder || config.placeholder || "Selecione um estado"}
                />    
            )}
        />
    );
}

export default DropdownGender;
*/


import React from "react";
import { FieldValues } from "react-hook-form";
import { ColProps } from "react-bootstrap";

import Input from "Layouts/Form/Fields/Input";

import DropdownBaseDTO from "Layouts/Form/types/Select";

export interface DrodownPops<T extends FieldValues = FieldValues> extends DropdownBaseDTO<T>, ColProps {
    withAllOption?: boolean;
    options?: {
        label: string;
        value: number | string | null; 
    }[];
    defaultSelected?: number | null;
}

export type DropdownOptionValue = number | string | null;

export interface DropdownOption {
    label: string;
    value: DropdownOptionValue;
    icon?: React.ReactNode | string;
}

interface DropdownProps<T extends FieldValues> extends DropdownBaseDTO<T> {
    element: (field: any, fieldState: any) => React.ReactNode;
}

function Dropdown<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config,
    element,
    ...colProps
}: DropdownProps<T>) {
    return (
        <Input
            label={label}
            methods={methods}
            config={config || {}}
            {...colProps}
            fieldName={fieldName}
            element={element}
        />
    );
}

export default Dropdown;



import { ColProps } from "react-bootstrap";
import { FieldValues, Path, RegisterOptions, UseFormReturn } from "react-hook-form";

export const default_containerClass = "mb-1";

interface InputBaseDTO<T extends FieldValues = FieldValues> {
    methods: UseFormReturn<T, any, any>;
    fieldName: Path<T>;
    label?: string;
    placeholder?: string;
    rules?: RegisterOptions<T, Path<T>>;
    config: {
        label?: string;
        placeholder?: string;
        containerClass?: string;
        className?: string;
        rules?: RegisterOptions<T, Path<T>>;
    };
}

interface InputDTO<T extends FieldValues = FieldValues> extends InputBaseDTO<T>, ColProps {}

export default InputDTO;

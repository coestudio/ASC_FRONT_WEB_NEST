
import { FieldValues } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import InputDTO from "Layouts/Form/types/Input";
import Input from "Layouts/Form/Fields/Input";

const toDateTimeObj = (value: string | Date | null): Date | null => {
    if (value instanceof Date) return value;
    if (typeof value === "string" && value) {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
};

function InputDateTime<T extends FieldValues>({
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
                <div className="position-relative w-100">
                    <DatePicker
                        selected={toDateTimeObj(field.value)}
                        onChange={(date: Date | null) => {
                            field.onChange(date ? date.toISOString() : "");
                        }}
                        showTimeSelect
                        timeIntervals={5}
                        timeCaption="Hora"
                        timeFormat="HH:mm"
                        dateFormat="dd/MM/yyyy HH:mm"
                        placeholderText={config.placeholder || "DD/MM/AAAA HH:MM"}
                        autoComplete="off"
                        locale="pt-BR"
                        className="form-control w-100"
                        wrapperClassName="w-100"
                        dropdownMode="select"
                    />
                    <i
                        className="fa-regular fa-calendar"
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6c757d',
                            fontSize: '18px'
                        }}
                    />
                </div>
            )}
        />
    );
}

export default InputDateTime;

import { FieldValues } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

const toTimeObj = (value: string | Date | null): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  return null;
};

const toTimeString = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

function InputTime<T extends FieldValues>({
  fieldName,
  methods,
  label,
  placeholder,
  config = {},
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
            selected={toTimeObj(field.value)}
            onChange={(date: Date | null) => {
              field.onChange(date ? toTimeString(date) : "");
            }}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={5}
            timeCaption="Hora"
            dateFormat="HH:mm"
            placeholderText={placeholder || "HH:MM"}
            autoComplete="off"
            locale="pt-BR"
            className={`form-control w-100 ${config?.className}`}
            wrapperClassName="w-100"
          />
          <i
            className="fa-regular fa-clock"
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#6c757d",
              fontSize: "18px",
            }}
          />
        </div>
      )}
    />
  );
}

export default InputTime;

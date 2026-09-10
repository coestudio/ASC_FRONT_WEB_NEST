import { useRef, useState } from "react";
import { FieldValues } from "react-hook-form";
import { IMaskInput } from "react-imask";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

const isoToDisplay = (iso: unknown): string => {
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
};

/** Converte "dd/mm/aaaa" pra ISO só se for uma data real (rejeita 31/02 etc). */
const displayToIso = (display: string): string | null => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
    if (!match) return null;
    const [, d, m, y] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const valid =
        date.getFullYear() === Number(y) &&
        date.getMonth() === Number(m) - 1 &&
        date.getDate() === Number(d);
    return valid ? `${y}-${m}-${d}` : null;
};

/**
 * Input mascarado (dd/mm/aaaa), no mesmo padrão de InputPhone/InputDocument
 * (IMaskInput). Substitui o react-datepicker anterior: ele resetava o valor
 * digitado a cada tecla porque `selected` (controlado por `field.value`, só
 * atualizado quando a data ficava completa/válida) sobrescrevia o texto que
 * o usuário ainda estava digitando.
 *
 * Aqui o texto exibido é estado local (`display`), sincronizado com
 * `field.value` só quando ele muda "por fora" (reset do form, dado
 * recarregado) — nunca durante a digitação.
 */
function DateMaskField({
    field,
    placeholder,
    className,
}: {
    field: { value: unknown; onChange: (v: string) => void; onBlur: () => void; name: string };
    placeholder?: string;
    className?: string;
}) {
    const [display, setDisplay] = useState(() => isoToDisplay(field.value));
    const lastExternalValue = useRef(field.value);

    if (field.value !== lastExternalValue.current) {
        lastExternalValue.current = field.value;
        setDisplay(isoToDisplay(field.value));
    }

    return (
        <IMaskInput
            mask="00/00/0000"
            value={display}
            unmask={false}
            placeholder={placeholder || "DD/MM/AAAA"}
            onAccept={(value: string) => {
                setDisplay(value);
                if (value === "") {
                    lastExternalValue.current = "";
                    field.onChange("");
                    return;
                }
                const iso = displayToIso(value);
                if (iso) {
                    lastExternalValue.current = iso;
                    field.onChange(iso);
                }
                // Data incompleta ou inválida (ex.: "31/02/2020"): mantém o
                // texto digitado na tela (pro usuário corrigir) sem commitar
                // no form até virar uma data real.
            }}
            onBlur={field.onBlur}
            name={field.name}
            className={`form-control ${className || ""}`}
        />
    );
}

function InputDate<T extends FieldValues>({
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
                    <DateMaskField
                        field={field}
                        placeholder={config.placeholder || placeholder}
                        className={config.className}
                    />
                    <i
                        className="fa-regular fa-calendar"
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

export default InputDate;

import { forwardRef, useRef, useState } from "react";
import { FieldValues } from "react-hook-form";
import { IMaskInput } from "react-imask";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

// Sem registrar, o react-datepicker avisa "A locale object was not found for
// the provided string [\"pt-BR\"]" e cai no locale padrão.
registerLocale("pt-BR", ptBR);

const isoToDisplay = (iso: unknown): string => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Só pra alimentar o `selected` do calendário — nunca controla o texto digitado. */
const isoToDateObj = (iso: unknown): Date | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
};

const dateObjToIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
 * (IMaskInput). Aqui o texto exibido é estado local (`display`), sincronizado
 * com `field.value` só quando ele muda "por fora" (reset do form, dado
 * recarregado, ou seleção via calendário — ver `CalendarToggle` abaixo)
 * — nunca durante a digitação.
 *
 * SPEC-34 reviveu o `react-datepicker` (ver `CalendarToggle`) só como popup
 * de calendário, desacoplado deste input de texto: o popup nunca controla
 * `display` diretamente, só chama `field.onChange(iso)`, e é esta sync (o
 * `if` abaixo, comparando com `lastExternalValue`) que atualiza o texto
 * depois — o mesmo caminho já usado pra reset de form/dado recarregado.
 * É assim que se evita o bug antigo (`selected` sobrescrevendo a digitação
 * a cada tecla): a digitação nunca passa pelo `DatePicker`.
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
      style={{ paddingRight: "34px" }}
    />
  );
}

/**
 * Botão-gatilho do popup do `DatePicker` (`customInput` do react-datepicker
 * — precisa aceitar `ref`/`onClick`, que a lib injeta automaticamente). Não
 * é um `<input>` de verdade — não tem `value` nem participa da digitação,
 * só abre/fecha o calendário. `forwardRef` é obrigatório aqui: o
 * `DatePicker` usa a ref pra medir a posição do popup.
 *
 * Sem posicionamento próprio de propósito — o `react-datepicker` embrulha
 * este botão em `.react-datepicker-wrapper` > `.react-datepicker__input-
 * container`, e esse segundo já vem com `position: relative` fixo no CSS
 * da própria lib. Um `position: absolute` aqui dentro se ancoraria nesse
 * wrapper interno (que fica logo abaixo do campo de texto, quase sem
 * largura), não no campo — por isso o posicionamento fica no `<div>` que
 * embrulha o `<DatePicker>` inteiro em `InputDate`, não neste botão.
 */
const CalendarToggle = forwardRef<HTMLButtonElement, { onClick?: () => void }>(
  function CalendarToggle({ onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label="Abrir calendário"
        className="btn btn-link p-0 border-0 d-flex align-items-center justify-content-center"
        style={{ width: "28px", height: "28px", lineHeight: 1 }}
      >
        <i
          className="bi bi-calendar3"
          style={{ color: "var(--bs-secondary-color)", fontSize: "18px" }}
        />
      </button>
    );
  },
);

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
          <div
            style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <DatePicker
              selected={isoToDateObj(field.value)}
              onChange={(date: Date | null) => {
                field.onChange(date ? dateObjToIso(date) : "");
              }}
              dateFormat="dd/MM/yyyy"
              locale="pt-BR"
              customInput={<CalendarToggle />}
              popperPlacement="bottom-end"
            />
          </div>
        </div>
      )}
    />
  );
}

export default InputDate;

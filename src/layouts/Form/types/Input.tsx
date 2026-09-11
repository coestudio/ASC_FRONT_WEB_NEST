import { ColProps } from "react-bootstrap";
import { FieldValues, Path, RegisterOptions, UseFormReturn } from "react-hook-form";

export const default_containerClass = "mb-1";

/** Opção de `InputMultiSelect` (e qualquer futuro Field de seleção) — label já resolvido, valor bate com o enum do Core. */
export type FieldOption = { value: string | number; label: string };

interface InputBaseDTO<T extends FieldValues = FieldValues> {
  methods: UseFormReturn<T>;
  fieldName: Path<T>;
  label?: string;
  placeholder?: string;
  rules?: RegisterOptions<T, Path<T>>;
  config?: {
    containerClass?: string;
    className?: string;
    label?: string;
    placeholder?: string;
    rules?: RegisterOptions<T, Path<T>>;
    /** Opções de campo de seleção (ex.: `InputMultiSelect`) — SPEC-03 D3. */
    options?: FieldOption[];
  };
}

interface InputDTO<T extends FieldValues = FieldValues> extends InputBaseDTO<T>, ColProps {}

export default InputDTO;

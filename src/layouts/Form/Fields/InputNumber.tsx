import { FieldValues } from "react-hook-form";
import { NumericFormat } from "react-number-format";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";

/**
 * Campo numérico decimal genérico, sem prefixo de moeda (ver `InputMoney`
 * pra valor monetário) e sem piso artificial — aceita vazio (o
 * `emptyStringsToNull` do `crud-record-modal` converte pra `null` antes da
 * validação Zod, então serve pra campo opcional como
 * `ContainerCreate.tara`, SPEC-04). Reescrito porque a versão anterior
 * forçava um piso de 1 e nunca deixava o campo ficar vazio — inviável pra
 * qualquer número opcional/decimal.
 */
function InputNumber<T extends FieldValues>({
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
      element={(field, fieldState) => (
        <NumericFormat
          name={field.name}
          getInputRef={field.ref}
          value={field.value ?? ""}
          onBlur={field.onBlur}
          onValueChange={(values) => field.onChange(values.floatValue ?? "")}
          allowNegative={false}
          placeholder={placeholder || config.placeholder || "0"}
          className={`form-control${fieldState.error ? " is-invalid" : ""}`}
        />
      )}
    />
  );
}

export default InputNumber;

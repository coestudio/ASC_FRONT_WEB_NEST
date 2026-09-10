import { FieldValues } from "react-hook-form";
import { IMaskInput } from "react-imask";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";
import { isValidDocument } from "layouts/Form/Helpers/Validate";

const masks = [{ mask: "000.000.000-00" }, { mask: "00.000.000/0000-00" }];

function InputDocument<T extends FieldValues>({
  fieldName,
  methods,
  label,
  placeholder,
  config = {},
  ...colProps
}: InputDTO<T>) {
  // Adiciona validação customizada
  config.rules = {
    ...(config.rules || {}),
    required: "Documento é obrigatório",
    validate: (value: string) => {
      if (!value || value.trim() === "") return "Documento é obrigatório";
      return isValidDocument(value) || "CPF ou CNPJ inválido";
    },
  };
  return (
    <Input
      label={label || "Documento"}
      methods={methods}
      config={config}
      {...colProps}
      fieldName={fieldName}
      element={(field) => (
        <IMaskInput
          {...field}
          mask={masks as any}
          dispatch={(appended, dynamicMasked) => {
            const digits = (dynamicMasked.value + appended).replace(/\D/g, "");
            return dynamicMasked.compiledMasks[digits.length > 11 ? 1 : 0];
          }}
          unmask={true}
          placeholder={config.placeholder || "CPF ou CNPJ"}
          onAccept={(value: any) => field.onChange(value)}
          className={`form-control input-document${config.className}`}
        />
      )}
    />
  );
}

export default InputDocument;

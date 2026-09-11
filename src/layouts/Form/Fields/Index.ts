import React from "react";

//* Text
export { default as InputText } from "./InputText";
export { default as InputTextArea } from "./InputTextArea";

//* Date & Time
export { default as InputDate } from "./InputDate";
export { default as InputDateTime } from "./InputDateTime";
export { default as InputTime } from "./InputTime";

//* Numbers
export { default as InputNumber } from "./InputNumber";
export { default as InputMoney } from "./InputMoney";
export { default as InputPorcentage } from "./InputPorcentage";

//* Boleans
export { default as InputSwitch } from "./InputSwitch";
export { default as InputSwitchTri } from "./InputSwitchTri";
export { default as InputCheckbox } from "./InputCheckbox";

//* Contact
export { default as InputEmail } from "./InputEmail";
export { default as InputPhone } from "./InputPhone";
export { default as InputRG } from "./InputRG";
export { default as InputCPF } from "./InputCPF";
export { default as InputCNPJ } from "./InputCNPJ";
export { default as InputDocument } from "./InputDocument";

//* Address
export { default as InputCEP } from "./InputCEP";

//* Auth
export { default as InputPassword } from "./InputPassword";

//* Extras
export { default as InputColorPicker } from "./InputColorPicker";
//export { default as InputKeywords } from './InputKeywords';

//* Seleção
export { default as InputMultiSelect } from "./InputMultiSelect";
export { default as Select } from "./Select";
export { default as SelectAsync } from "./SelectAsync";

//* Endereço
export { default as AddressGroup } from "./AddressGroup";

//* Files
export { default as InputAvatar } from "./InputAvatar";
export { default as InputFileSingle } from "./InputFileSingle";
export { default as InputPhotoSingle } from "./InputPhotoSingle";
export { default as InputFileMulti } from "./InputFileMulti";
export { default as InputPhotoMulti } from "./InputPhotoMulti";

type FieldExports = typeof import("./Index");
export type FieldName = {
  [K in keyof FieldExports]: K extends `Input${string}` | "Select" | "SelectAsync" | "AddressGroup"
    ? FieldExports[K] extends React.ComponentType<any>
      ? K
      : never
    : never;
}[keyof FieldExports];

export type LayoutField = {
  type: FieldName;
  fieldName: string;
  label?: string;
  placeholder?: string;
  col?: { md?: number; xl?: number; xs?: number; lg?: number };
  config?: {
    containerClass?: string;
    className?: string;
    placeholder?: string;
    /** Opções de campo de seleção (ex.: `InputMultiSelect`, `Select`) — SPEC-03 D3. */
    options?: { value: string | number; label: string }[];
    /** Snapshot bruto de enum gerado, pro `Select` resolver pelo idioma atual — SPEC-SHARE-01 RF2. */
    enumOptions?: { value: string | number; name: Record<string, string> }[];
    /** Fonte de busca do `SelectAsync` (debounce) — SPEC-SHARE-01 RF3. */
    fetchOptions?: (search: string) => Promise<{ value: string | number; label: string }[]>;
    /** Rótulo já resolvido do valor atual do `SelectAsync`, antes de qualquer busca. */
    selectedLabel?: string;
    /** Whitelist de MIME/extensão dos campos de upload (`InputFileSingle`/`InputFileMulti`) — SPEC-SHARE-01 RF5. */
    accept?: string;
    /** URL já salva no servidor pros campos de foto única (`InputPhotoSingle`), até o usuário trocar o arquivo. */
    previewUrl?: string | null;
  };
};

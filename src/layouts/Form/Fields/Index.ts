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
export { default as InputSelect } from "./InputSelect";
export { default as InputMultiSelect } from "./InputMultiSelect";
export { default as InputCheckboxGroup } from "./InputCheckboxGroup";

//* Files
export { default as InputAvatar } from "./InputAvatar";

//* Grupo (bloco composto, não é um `Input*` flat) — renderiza um objeto
// aninhado do DTO como um bloco dentro do form (ex.: `HarborCreate.address`,
// SPEC-04 §9/§10). Fica fora do padrão `Input*` de propósito, pra não entrar
// no mapeamento de `FieldName` abaixo (que é só pra campo atômico).
export { default as GroupAddress } from "../Group/Adress";

type FieldExports = typeof import("./Index");
export type FieldName = {
  [K in keyof FieldExports]: K extends `Input${string}`
    ? FieldExports[K] extends React.ComponentType<any>
      ? K
      : never
    : never;
}[keyof FieldExports];

/** Tipo de campo "grupo" — bloco composto que renderiza um objeto aninhado do DTO (SPEC-04). */
export type GroupFieldName = "GroupAddress";

export type LayoutField = {
  type: FieldName | GroupFieldName;
  fieldName: string;
  label?: string;
  placeholder?: string;
  col?: { md?: number; xl?: number; xs?: number; lg?: number };
  config?: {
    containerClass?: string;
    className?: string;
    /** Opções de campo de seleção (ex.: `InputMultiSelect`/`InputSelect`) — SPEC-03 D3. */
    options?: { value: string | number; label: string }[];
  };
};

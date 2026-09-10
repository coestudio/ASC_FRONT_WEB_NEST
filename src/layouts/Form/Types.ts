import { Control, UseFormClearErrors, UseFormSetValue, UseFormWatch } from "react-hook-form";

export interface InputNeed {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  clearErrors: UseFormClearErrors<any>;
} //

export interface fieldConfig extends onEventObject {
  //title
  title?: string;

  //Basico
  fieldName: string;
  label?: string;
  placeholder?: string;
  disable?: boolean;

  // Padrão
  isInvalid?: boolean;
  rules?: {
    required?: string;
  };

  // Variaveis
  value?: string | number;

  //Styles
  className?: string;
  containerClass?: string;
}

export interface InputBase extends InputNeed {
  fieldConfig: fieldConfig;
}

export interface DropdownItem extends onEventObject {
  label: string;
  value: string | number;
  key?: string | number;

  icon?: React.ReactNode;
  className?: string;
}

export interface DefualtItem extends Omit<DropdownItem, "label" | "value"> {
  selecionavel?: boolean;
  label?: string;
  value?: string | number;
}

export interface DropdownBase extends InputBase {
  dropdownConfig?: {
    title?: string;
    icon?: React.ReactNode;
    className?: string;

    onSelect?: (item: DropdownItem | null) => void;
  };
  defaultOption?: DefualtItem;
  options: Array<DropdownItem>;
}

interface onEventObject {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;

  onMouseEnter?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;

  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

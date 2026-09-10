import React, { useLayoutEffect } from "react";
import { FieldValues } from "react-hook-form";

import InputDTO from "layouts/Form/types/Input";
import Input from "layouts/Form/Fields/Input";
import TriSwitch, { TriSwitchEdge } from "layouts/Form/Fields/TriSwitch";

export type { TriSwitchEdge };

interface InputSwitchTriProps<T extends FieldValues, V = unknown> extends InputDTO<T> {
  left: TriSwitchEdge<V>;
  right: TriSwitchEdge<V>;
  centerLabel?: string;
  onCenterClick?: () => void;
  initialValue?: V | null;
}

function InputSwitchTri<T extends FieldValues, V = unknown>({
  fieldName,
  methods,
  label,
  placeholder,
  config = {},
  left,
  right,
  centerLabel,
  onCenterClick,
  initialValue,
  ...colProps
}: InputSwitchTriProps<T, V>) {
  useLayoutEffect(() => {
    if (initialValue !== undefined && methods.getValues(fieldName) === undefined) {
      methods.setValue(fieldName, initialValue as any, { shouldDirty: false });
    }
  }, []);

  return (
    <Input
      label={label}
      methods={methods}
      config={config}
      {...colProps}
      fieldName={fieldName}
      element={(field) => (
        <TriSwitch
          value={field.value ?? initialValue ?? null}
          onChange={field.onChange}
          left={left}
          right={right}
          centerLabel={centerLabel}
          onCenterClick={onCenterClick}
          className={config.className}
        />
      )}
    />
  );
}

export default InputSwitchTri;

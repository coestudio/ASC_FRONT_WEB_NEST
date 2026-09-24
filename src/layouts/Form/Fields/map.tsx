import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Row } from "react-bootstrap";

import * as Layout from "./Index";
import { LayoutField } from "./Index";

const RenderFields: React.FC<{
  fields: LayoutField[];
  methods: UseFormReturn<any>;
}> = ({ fields, methods }) => (
  <Row>
    {fields.map((field, i) => {
      const FieldComponent = Layout[field.type] as React.ComponentType<any>;
      return (
        <FieldComponent
          key={i}
          methods={methods}
          fieldName={field.fieldName}
          label={field.label}
          placeholder={field.placeholder}
          // `Select` (layouts/Form/Fields/Select.tsx) lê `enumOptions` como
          // prop irmã de `config`, não de dentro dela — sem repassar aqui,
          // `config.enumOptions` nunca chegava no componente e o dropdown
          // ficava só com o placeholder. Só o `Select` recebe essa prop —
          // outros tipos espalham `...rest`/`...colProps` direto num
          // elemento DOM/Bootstrap, e repassar `enumOptions` pra eles gerava
          // o warning do React ("does not recognize enumOptions prop").
          {...(field.type === "Select" ? { enumOptions: field.config?.enumOptions } : {})}
          config={{
            // Repassa toda a config declarativa (inclui `enumOptions`,
            // `fetchOptions`, `accept`, `previewUrl`, `selectedLabel` — SPEC-SHARE-01)
            // e mantém o `placeholder` do topo como fallback, como antes.
            ...field.config,
            placeholder: field.config?.placeholder ?? field.placeholder,
          }}
          {...field.col}
          // Só repassa `disabled` quando ligado — alguns Fields espalham
          // props restantes num elemento DOM/Bootstrap.
          {...(field.disabled ? { disabled: true } : {})}
        />
      );
    })}
  </Row>
);

export default RenderFields;

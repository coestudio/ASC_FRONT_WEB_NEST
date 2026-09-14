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
          config={{
            // Repassa toda a config declarativa (inclui `enumOptions`,
            // `fetchOptions`, `accept`, `previewUrl`, `selectedLabel` — SPEC-SHARE-01)
            // e mantém o `placeholder` do topo como fallback, como antes.
            ...field.config,
            placeholder: field.config?.placeholder ?? field.placeholder,
          }}
          {...field.col}
        />
      );
    })}
  </Row>
);

export default RenderFields;

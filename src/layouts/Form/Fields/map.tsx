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
            placeholder: field.placeholder,
            containerClass: field.config?.containerClass,
            className: field.config?.className,
          }}
          {...field.col}
        />
      );
    })}
  </Row>
);

export default RenderFields;

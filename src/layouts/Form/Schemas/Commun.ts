import { z } from "zod";

export const ShapeText = (required: boolean = false, minLength?: number, maxLength?: number) => {
  let schema = z.string();
  if (required) {
    schema = schema.nonempty("Campo obrigatório");
  }
  if (minLength !== undefined) {
    schema = schema.min(minLength, `Campo deve conter no mínimo ${minLength} caracteres`);
  }
  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `Campo deve conter no máximo ${maxLength} caracteres`);
  }
  return schema;
};

import { z } from "zod";

export const birthDateShape = z
  .string()
  .min(1, "Data de nascimento é obrigatória")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida");

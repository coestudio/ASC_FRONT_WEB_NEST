
import { z } from "zod";

import { isValidDocument } from "../Helpers/Validate";

//#region Shapes

//? CPF
export const ShapeCpf = z.string()
    .nonempty("CPF é obrigatório")
    .min(11, "CPF deve conter no mínimo 11 caracteres")
    .max(14, "CPF deve conter no máximo 14 caracteres")
    .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });
export const ShapeCpfFormat = z.string()
    .nonempty("CPF é obrigatório")
    .min(14, "CPF deve conter 14 caracteres")
    .max(14, "CPF deve conter14 caracteres")
    .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });

//? CNPJ
export const ShapeCnpj = z.string()
    .nonempty("CNPJ é obrigatório")
    .min(14, "CNPJ deve conter no mínimo 14 caracteres")
    .max(18, "CNPJ deve conter no máximo 18 caracteres")
    .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });
export const ShapeCnpjFormat = z.string()
    .nonempty("CNPJ é obrigatório")
    .min(18, "CNPJ deve conter 18 caracteres")
    .max(18, "CNPJ deve conter 18 caracteres")
    .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });

//? Documento
export const ShapeDocument = z.string()
    .nonempty("Documento é obrigatório")
    .min(11, "Documento deve conter no mínimo 11 caracteres")
    .max(18, "Documento deve conter no máximo 18 caracteres")
    .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });
export const ShapeDocumentFormat = z.string()
    .nonempty("Documento é obrigatório")
    .min(14, "Documento deve conter no mínimo 14 caracteres")
    .max(18, "Documento deve conter no máximo 18 caracteres")
    .refine(isValidDocument, { message: "CPF ou CNPJ inválido" });
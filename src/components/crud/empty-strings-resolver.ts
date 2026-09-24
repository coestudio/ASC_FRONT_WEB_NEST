import type { FieldValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

/**
 * Normaliza `""` pra `null` (raso, entra em objeto plano/array) antes da
 * validação Zod. Causa raiz de "cadastro não acontece" em campo opcional
 * vazio: os schemas gerados pelo Orval marcam campo opcional como
 * `.nullish()`/`.nullable()` (aceita `null`/`undefined`, não string vazia —
 * ex.: `country`/`postalCode` de `AddressCreate`, `tara` de `ContainerCreate`),
 * mas todo Field de `layouts/Form/Fields` deixa o campo vazio como `""`
 * quando o usuário não preenche (nenhum Field converte pra `null` sozinho).
 * Sem essa normalização, um campo opcional em branco falha a validação
 * (regex/formato) e trava o submit silenciosamente.
 *
 * Isso NÃO edita nenhum schema Zod (regra 2 do AGENTS.md) — só reescreve o
 * valor bruto que chega no `resolver` do react-hook-form, antes de passar
 * pro `zodResolver(schema)` de verdade.
 */
function emptyStringsToNull<V>(value: V): V {
  if (value === "") return null as unknown as V;
  if (Array.isArray(value)) {
    return value.map((item) => emptyStringsToNull(item)) as unknown as V;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        emptyStringsToNull(val),
      ]),
    ) as V;
  }
  return value;
}

/** Envolve `zodResolver` aplicando `emptyStringsToNull` nos valores brutos do form antes de validar. */
export function withEmptyStringsAsNull<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  const resolver = zodResolver(schema as never) as unknown as Resolver<T>;
  return (values, context, options) => resolver(emptyStringsToNull(values), context, options);
}

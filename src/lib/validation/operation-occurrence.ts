import { z } from "zod";

import { PostApiOperationOperationIdOccurrenceBody } from "@/api/generated/zod/operation-occurrence/operation-occurrence.zod";

/**
 * Schema do formulário de criação de ocorrência manual (aba Ocorrências,
 * SPEC-43) — reusa `PostApiOperationOperationIdOccurrenceBody` (gerado, regra
 * 2 do AGENTS.md), só "desembrulhando" `Title`/`Note` do `.optional()`: no
 * Core os dois são obrigatórios (`specs/32-operation-occurrences` §7), mas o
 * DTO `[FromForm]` os marca opcionais no schema porque o multipart em si não
 * distingue campo ausente de string vazia. `.unwrap()` só remove o wrapper de
 * opcionalidade — a regra em si (`maxLength`) já vem do gerado, mesmo
 * precedente de `operation-container.ts`. `Photos` continua opcional
 * (0..N, só entra no `Create`).
 */
export const operationOccurrenceCreateFormSchema = PostApiOperationOperationIdOccurrenceBody.extend(
  {
    Title: PostApiOperationOperationIdOccurrenceBody.shape.Title.unwrap(),
    Note: PostApiOperationOperationIdOccurrenceBody.shape.Note.unwrap(),
  },
);

export type OperationOccurrenceCreateFormValues = z.infer<
  typeof operationOccurrenceCreateFormSchema
>;

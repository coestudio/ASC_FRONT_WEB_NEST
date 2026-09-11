import { useEffect, useRef, useState } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col, Form, Spinner } from "react-bootstrap";

import InputDTO, { default_containerClass, type FieldOption } from "layouts/Form/types/Input";

/**
 * Assinatura da função de busca de `SelectAsync` (RF3 da SPEC-SHARE-01) —
 * cada consumidor decide a "fonte" chamando o hook/endpoint Orval de
 * listagem do módulo configurado (ex.: `getApiHarbor`/`getApiClient` com
 * `Search`) e devolvendo já como `{ value, label }[]`. O componente não
 * conhece nenhum módulo do Core, só chama essa função com o texto digitado.
 */
export type SelectAsyncFetcher = (search: string) => Promise<FieldOption[]>;

interface SelectAsyncConfig<T extends FieldValues> extends NonNullable<InputDTO<T>["config"]> {
  /** Fonte de dados — ver `SelectAsyncFetcher`. */
  fetchOptions?: SelectAsyncFetcher;
  /** Rótulo já resolvido do valor selecionado atualmente (edição de um
   * registro existente, antes de qualquer busca ter rodado). */
  selectedLabel?: string;
}

interface SelectAsyncProps<T extends FieldValues> extends Omit<InputDTO<T>, "config"> {
  config?: SelectAsyncConfig<T>;
  fetchOptions?: SelectAsyncFetcher;
  selectedLabel?: string;
  /** Debounce da digitação em ms (padrão 300ms). */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Autocomplete assíncrono pra FK de lista grande — busca por digitação com
 * debounce, sem recarregar a lista inteira a cada tecla (RF3/CA2 da
 * SPEC-SHARE-01). Substitui `<select>` populado de uma vez, que não escala
 * com o crescimento da base (ex.: Harbor, Cliente).
 */
function SelectAsync<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  fetchOptions,
  selectedLabel,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  ...colProps
}: SelectAsyncProps<T>) {
  const fetcher = fetchOptions ?? config.fetchOptions;
  const initialLabel = selectedLabel ?? config.selectedLabel;

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !fetcher) return undefined;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetcher(query)
        .then((result) => setOptions(result))
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fetcher` é redefinido a cada render pelo consumidor, disparar só por `query`/`open` evita loop.
  }, [query, open, debounceMs]);

  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field, fieldState }) => {
          const currentOption = options.find((opt) => String(opt.value) === String(field.value));
          const displayLabel = currentOption?.label ?? initialLabel ?? "";

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              <Form.Label>{label || config.label || "Selecione"}</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type="text"
                  autoComplete="off"
                  isInvalid={!!fieldState.error}
                  className={config.className ?? ""}
                  placeholder={config.placeholder || "Digite para buscar..."}
                  value={open ? query : displayLabel}
                  onFocus={() => {
                    setOpen(true);
                    setQuery("");
                  }}
                  onBlur={() => {
                    // Atraso curto pra permitir o clique numa opção antes da lista fechar.
                    setTimeout(() => setOpen(false), 150);
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {loading ? (
                  <Spinner
                    animation="border"
                    size="sm"
                    className="position-absolute top-50 end-0 translate-middle-y me-2"
                  />
                ) : null}
                {open && !loading && options.length > 0 ? (
                  <ul
                    className="list-group position-absolute w-100 shadow-sm"
                    style={{ zIndex: 1050, maxHeight: 240, overflowY: "auto" }}
                  >
                    {options.map((opt) => (
                      <li
                        key={opt.value}
                        className="list-group-item list-group-item-action"
                        role="button"
                        onMouseDown={(e) => {
                          // `onMouseDown` (não `onClick`) roda antes do `onBlur` fechar a lista.
                          e.preventDefault();
                          field.onChange(opt.value);
                          setOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {fieldState.error?.message ? (
                <Form.Control.Feedback type="invalid" className="d-block">
                  {fieldState.error.message}
                </Form.Control.Feedback>
              ) : (
                <Form.Text className="text-muted">&nbsp;</Form.Text>
              )}
            </Form.Group>
          );
        }}
      />
    </Col>
  );
}

export default SelectAsync;

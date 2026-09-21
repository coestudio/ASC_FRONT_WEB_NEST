import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";

import { useT } from "@/lib/ui-prefs";
import FilterText from "./FilterText";

export type FilterSearchProps = {
  /** Busca aplicada no momento (a do pai) — o campo só a reflete, não a dispara. */
  value: string;
  /** Chamado só ao clicar em "Pesquisar" ou apertar Enter, com o texto já sem espaços nas pontas. */
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Campo de busca de listagem com botão **Pesquisar**: o texto digitado fica
 * num rascunho local e só vira busca no clique/Enter (não filtra a cada
 * tecla). Padrão único de todas as pesquisas do portal — usa `FilterText`
 * (não é campo de formulário, regra 10 do AGENTS.md).
 */
function FilterSearch({ value, onSearch, placeholder, className }: FilterSearchProps) {
  const t = useT();
  const [draft, setDraft] = useState(value);

  // Mantém o rascunho alinhado se o pai mudar a busca por fora.
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      className={`d-flex gap-2 ${className ?? ""}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <div className="flex-grow-1">
        <FilterText value={draft} onChange={setDraft} placeholder={placeholder} />
      </div>
      <Button type="submit" variant="outline-primary" className="text-nowrap">
        <i className="bi bi-search me-1" aria-hidden />
        {t("crud.list.searchButton")}
      </Button>
    </form>
  );
}

export default FilterSearch;

import { Form, InputGroup } from "react-bootstrap";

export type FilterTextProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Rótulo pra leitor de tela — sem `<label>` visível (filtro não é campo
   * de formulário). Sem valor, usa o próprio `placeholder`. */
  ariaLabel?: string;
  /** Ícone `bootstrap-icons` opcional à esquerda do campo (ex. `"bi-search"`). */
  icon?: string;
  className?: string;
};

/**
 * Campo de texto pra filtro/busca de listagem — não é campo de
 * formulário (não valida, não faz parte de um submit), então não usa
 * `layouts/Form/Fields` (regra 10 do AGENTS.md é sobre input de
 * formulário de verdade, com `react-hook-form`). Controlado direto
 * (`value`/`onChange`), sem `Controller` nem `useForm` por trás.
 *
 * Substitui 4 implementações duplicadas que existiam antes
 * (`ListSearchInput` em `crud-list-page.tsx`, `OperationsSearchInput` em
 * `operations-list.tsx`, `ContainerSearchInput` em `Containers.tsx`, e o
 * uso direto em `Responsible.tsx`) — todas usavam `useForm` só como ponte
 * pra reaproveitar `InputText` (que exige `methods` de um form de
 * verdade), herdando de brinde um `<Form.Label>` e uma linha reservada
 * pra mensagem de erro (`<Form.Text>`) que não fazem sentido nenhum pra
 * um filtro, que nunca valida nada.
 */
function FilterText({ value, onChange, placeholder, ariaLabel, icon, className }: FilterTextProps) {
  const control = (
    <Form.Control
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className={className}
    />
  );

  if (!icon) return control;

  return (
    <InputGroup>
      <InputGroup.Text>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </InputGroup.Text>
      {control}
    </InputGroup>
  );
}

export default FilterText;

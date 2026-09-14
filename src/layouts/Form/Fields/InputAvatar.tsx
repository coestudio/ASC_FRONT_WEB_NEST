import { useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col } from "react-bootstrap";
import { toast } from "react-toastify";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";
import { useObjectUrl } from "@/hooks";
import styles from "./InputAvatar.module.css";

interface InputAvatarProps<T extends FieldValues> extends InputDTO<T> {
  /** URL do avatar atual (já salvo no servidor), usada até o usuário trocar o arquivo. */
  previewUrl?: string | null;
  /** Iniciais mostradas quando não há avatar nem arquivo selecionado. */
  initials?: string;
  /** Rótulo do overlay quando já existe imagem (padrão: "Trocar"). */
  changeLabel?: string;
  /** Rótulo do overlay quando ainda não há imagem (padrão: "Selecionar"). */
  selectLabel?: string;
  /** Chamado com o arquivo assim que selecionado — antes de ir pro `field.onChange`, útil pra disparar upload automático (ver profile-modal). */
  onFileSelected?: (file: File) => void;
  /** Quando definido, mostra o botão de remover (arquivo pendente ou avatar já salvo). */
  onRemove?: () => void;
  /** Tamanho máximo em bytes — acima disso o arquivo é rejeitado com toast. */
  maxSizeBytes?: number;
  /** Mensagem exibida quando `maxSizeBytes` é excedido. */
  maxSizeMessage?: string;
}

/**
 * Campo de upload de avatar — único lugar do projeto com `<input type="file">`
 * cru, por dentro de `layouts/Form/Fields` (regra 10: campo de formulário
 * novo entra aqui, nunca improvisado na tela). `field.value` vira o `File`
 * selecionado (ou `null`); quem envia decide o multipart (ver profile-modal).
 */
function InputAvatar<T extends FieldValues>({
  fieldName,
  methods,
  config = {},
  previewUrl,
  initials,
  changeLabel = "Trocar",
  selectLabel = "Selecionar",
  onFileSelected,
  onRemove,
  maxSizeBytes,
  maxSizeMessage = "Arquivo muito grande.",
  ...colProps
}: InputAvatarProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Hook precisa ficar no nível do componente (não dentro do `render` do
  // Controller) pra respeitar as regras de hooks — `watch` acompanha o
  // valor do campo pra manter a URL sincronizada com o `File` atual.
  const watchedValue: unknown = methods.watch(fieldName);
  const watchedFile = watchedValue instanceof File ? watchedValue : null;
  const localUrl = useObjectUrl(watchedFile);

  return (
    <Col {...colProps}>
      <Controller
        control={methods.control}
        name={fieldName}
        render={({ field: { onChange, value, name } }) => {
          const src = localUrl || previewUrl || null;
          const hasValue = Boolean(value) || Boolean(previewUrl);

          const handleSelect = (file: File | null) => {
            if (!file) return;
            if (maxSizeBytes && file.size > maxSizeBytes) {
              toast.error(maxSizeMessage);
              if (inputRef.current) inputRef.current.value = "";
              return;
            }
            onChange(file);
            onFileSelected?.(file);
          };

          return (
            <div className={config.containerClass || default_containerClass}>
              <div
                className={`position-relative d-inline-block ${styles.wrapper}`}
                style={{ width: 96, height: 96 }}
              >
                <div className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center bg-secondary-subtle text-secondary-emphasis fs-4 w-100 h-100">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span>{initials || "?"}</span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={config.label || "Trocar avatar"}
                  className={`position-absolute top-0 start-0 w-100 h-100 rounded-circle border-0 d-flex flex-column align-items-center justify-content-center text-white p-0 ${styles.overlay}`}
                  onClick={() => inputRef.current?.click()}
                >
                  <i className="bi bi-camera" />
                  <span className="small">{src ? changeLabel : selectLabel}</span>
                </button>
                {hasValue && onRemove ? (
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    className="position-absolute top-0 start-100 translate-middle rounded-circle btn btn-sm btn-danger p-0 d-flex align-items-center justify-content-center"
                    style={{ width: 24, height: 24 }}
                    onClick={onRemove}
                  >
                    <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
                  </button>
                ) : null}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="d-none"
                name={name}
                onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
              />
            </div>
          );
        }}
      />
    </Col>
  );
}

export default InputAvatar;

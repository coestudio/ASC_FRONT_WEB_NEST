import { useState } from "react";
import { Button, Modal } from "react-bootstrap";

export type ConfirmationModalProps = {
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para ação destrutiva (excluir); `primary` (default) pra confirmação neutra. */
  variant?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Modal de confirmação genérico — consumido por toda tela CRUD a partir da
 * SPEC-03 (excluir registro, etc.). `onConfirm` pode ser assíncrono; o botão
 * de confirmação mostra loading e fica desabilitado enquanto aguarda.
 */
export function ConfirmationModal({
  show,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onCancel} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        <p className="mb-0 text-break">{message}</p>
      </Modal.Body>
      <Modal.Footer className="justify-content-center gap-2 border-top-0 pt-0">
        <Button variant="outline-secondary" size="sm" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          size="sm"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm" aria-hidden />
          ) : (
            confirmLabel
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

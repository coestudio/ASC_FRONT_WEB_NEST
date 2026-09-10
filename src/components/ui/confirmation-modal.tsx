"use client";

import { Modal, Button } from "react-bootstrap";

type ConfirmationModalProps = {
  show: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  show,
  message,
  title = "Confirmação",
  confirmText = "Sim",
  cancelText = "Não",
  confirmVariant = "success",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Modal show={show} onHide={onCancel} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        <p className="mb-0 text-break">{message}</p>
      </Modal.Body>
      <Modal.Footer className="justify-content-center gap-2 border-top-0 pt-0">
        <Button variant="outline-secondary" size="sm" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

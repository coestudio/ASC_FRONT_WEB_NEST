"use client";

import { type ReactNode } from "react";
import { Form, Modal, Spinner } from "react-bootstrap";

type FormModalProps = {
  show: boolean;
  onHide: () => void;
  title: string;
  children: ReactNode;
  loading?: boolean;
  size?: "sm" | "lg" | "xl";
  footer?: ReactNode;
  onSubmit?: () => void;
};

export function FormModal({
  show,
  onHide,
  title,
  children,
  loading = false,
  size = "lg",
  footer,
  onSubmit,
}: FormModalProps) {
  return (
    <Modal show={show} onHide={onHide} size={size} centered scrollable>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title className="h5 mb-0">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="secondary" />
            </div>
          ) : (
            children
          )}
        </Modal.Body>
        {footer && <Modal.Footer>{footer}</Modal.Footer>}
      </Form>
    </Modal>
  );
}

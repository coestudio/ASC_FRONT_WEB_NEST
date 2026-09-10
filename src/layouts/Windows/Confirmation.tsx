import React from "react";
import { Modal, Button } from "react-bootstrap";

export type ConfirmationResult = "yes" | "no" | "close";

interface WindowsConfirmationProps {
  show: boolean;
  message: string;
  size?: "sm" | "lg" | "xl";
  onResult: (result: ConfirmationResult) => void;
}

const WindowsConfirmation: React.FC<WindowsConfirmationProps> = ({
  show,
  message,
  size,
  onResult,
}) => {
  const handleClose = () => onResult("close");
  const handleYes = () => onResult("yes");
  const handleNo = () => onResult("no");

  return (
    <Modal 
      show={show} 
      size={size || "sm"} 
      onHide={handleClose} 
      centered 
      keyboard
    >
      <Modal.Body className="d-flex flex-column justify-content-center align-items-center text-center p-4">
        <p className="mb-4" style={{ maxWidth: '500px', wordWrap: 'break-word', lineHeight: '1.5' }}>
          {message}
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Button variant="danger" onClick={handleNo}>
            Não
          </Button>
          <Button variant="primary" onClick={handleYes}>
            Sim
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default WindowsConfirmation;
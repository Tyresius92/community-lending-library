import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  content: ReactNode;
  closeLabel: string;
}

export const Modal = ({
  isOpen,
  setIsOpen,
  title,
  content,
  closeLabel,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleClose = () => {
      setIsOpen(false);
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [setIsOpen]);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId}>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => {
          setIsOpen(false);
        }}
      >
        &times;
      </button>
      <h2 id={titleId}>{title}</h2>
      {content}
    </dialog>
  );
};

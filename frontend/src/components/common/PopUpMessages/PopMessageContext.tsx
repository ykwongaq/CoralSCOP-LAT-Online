import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import PopMessager, {
  type ModalButton,
  type PopMessagerProps,
} from "./PopMessager";
import ErrorMessager, { type ErrorMessagerProps } from "./ErrorMessager";
import LoadingMessager, { type LoadingMessagerProps } from "./LoadingMessager";
import TextInputMessager, { type TextInputMessagerProps } from "./TextInputMessager";
import ProjectNameMessager, { type ProjectNameMessagerProps } from "./ProjectNameMessager";

type ModalState =
  | { type: "none" }
  | { type: "message"; title: string; content: string; buttons?: ModalButton[] }
  | {
      type: "error";
      title: string;
      content: string;
      errorMessage: string;
      buttons?: ModalButton[];
    }
  | {
      type: "loading";
      title: string;
      content: string;
      progress: number | null;
      buttons?: ModalButton[];
    }
  | {
      type: "textInput";
      title: string;
      content: string;
      defaultValue?: string;
      placeholder?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      onConfirm?: (value: string) => void;
      onCancel?: () => void;
      buttons?: ModalButton[];
    }
  | {
      type: "projectNameInput";
      title: string;
      content: string;
      defaultValue?: string;
      placeholder?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      onConfirm?: (value: string) => void;
      onCancel?: () => void;
      buttons?: ModalButton[];
    };

interface PopMessageContextValue {
  showMessage: (params: PopMessagerProps) => void;
  showError: (params: ErrorMessagerProps) => void;
  showLoading: (params: LoadingMessagerProps) => void;
  showTextInput: (params: TextInputMessagerProps) => void;
  showProjectNameInput: (params: ProjectNameMessagerProps) => void;
  updateLoadingProgress: (progress: number | null) => void;
  closeMessage: () => void;
}

const PopMessageContext = createContext<PopMessageContextValue | null>(null);

export function PopMessageProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const closeMessage = useCallback(() => setModal({ type: "none" }), []);

  const showMessage = useCallback(
    ({ title, content, buttons }: PopMessagerProps) =>
      setModal({ type: "message", title, content, buttons }),
    [],
  );

  const showError = useCallback(
    ({ title, content, errorMessage, buttons }: ErrorMessagerProps) =>
      setModal({ type: "error", title, content, errorMessage, buttons }),
    [],
  );

  const showLoading = useCallback(
    ({ title, content, progress, buttons }: LoadingMessagerProps) =>
      setModal({ type: "loading", title, content, progress, buttons }),
    [],
  );

  const showTextInput = useCallback(
    ({ title, content, defaultValue, placeholder, confirmLabel, cancelLabel, onConfirm, onCancel, buttons }: TextInputMessagerProps) =>
      setModal({
        type: "textInput",
        title,
        content,
        defaultValue,
        placeholder,
        confirmLabel,
        cancelLabel,
        onConfirm,
        onCancel: onCancel ?? (buttons ? undefined : closeMessage),
        buttons,
      }),
    [closeMessage],
  );

  const showProjectNameInput = useCallback(
    ({ title, content, defaultValue, placeholder, confirmLabel, cancelLabel, onConfirm, onCancel, buttons }: ProjectNameMessagerProps) =>
      setModal({
        type: "projectNameInput",
        title,
        content,
        defaultValue,
        placeholder,
        confirmLabel,
        cancelLabel,
        onConfirm,
        onCancel: onCancel ?? (buttons ? undefined : closeMessage),
        buttons,
      }),
    [closeMessage],
  );

  const updateLoadingProgress = useCallback((progress: number | null) => {
    setModal((current) => {
      if (current.type === "loading") {
        return { ...current, progress };
      }
      return current;
    });
  }, []);

  return (
    <PopMessageContext.Provider
      value={{ showMessage, showError, showLoading, showTextInput, showProjectNameInput, updateLoadingProgress, closeMessage }}
    >
      {children}
      {modal.type !== "none" &&
        createPortal(
          <>
            {modal.type === "message" && (
              <PopMessager
                title={modal.title}
                content={modal.content}
                buttons={modal.buttons}
              />
            )}
            {modal.type === "error" && (
              <ErrorMessager
                title={modal.title}
                content={modal.content}
                errorMessage={modal.errorMessage}
                buttons={modal.buttons}
              />
            )}
            {modal.type === "loading" && (
              <LoadingMessager
                title={modal.title}
                content={modal.content}
                progress={modal.progress}
                buttons={modal.buttons}
              />
            )}
            {modal.type === "textInput" && (
              <TextInputMessager
                title={modal.title}
                content={modal.content}
                defaultValue={modal.defaultValue}
                placeholder={modal.placeholder}
                confirmLabel={modal.confirmLabel}
                cancelLabel={modal.cancelLabel}
                onConfirm={modal.onConfirm}
                onCancel={modal.onCancel}
                buttons={modal.buttons}
              />
            )}
            {modal.type === "projectNameInput" && (
              <ProjectNameMessager
                title={modal.title}
                content={modal.content}
                defaultValue={modal.defaultValue}
                placeholder={modal.placeholder}
                confirmLabel={modal.confirmLabel}
                cancelLabel={modal.cancelLabel}
                onConfirm={modal.onConfirm}
                onCancel={modal.onCancel}
                buttons={modal.buttons}
              />
            )}
            <div className="modal-pop-backdrop" />
          </>,
          document.body,
        )}
    </PopMessageContext.Provider>
  );
}

export function usePopMessage(): PopMessageContextValue {
  const ctx = useContext(PopMessageContext);
  if (!ctx)
    throw new Error("usePopMessage must be used within PopMessageProvider");
  return ctx;
}

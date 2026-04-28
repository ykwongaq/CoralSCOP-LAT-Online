import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./Messager.module.css";
import PopMessager, {
  type PopMessagerProps,
} from "./PopMessager";
import ErrorMessager, { type ErrorMessagerProps } from "./ErrorMessager";
import LoadingMessager, { type LoadingMessagerProps } from "./LoadingMessager";
import TextInputMessager, { type TextInputMessagerProps } from "./TextInputMessager";
import ProjectNameMessager, { type ProjectNameMessagerProps } from "./ProjectNameMessager";

type ModalState =
  | { type: "none" }
  | { type: "message"; props: PopMessagerProps }
  | { type: "error"; props: ErrorMessagerProps }
  | { type: "loading"; props: LoadingMessagerProps }
  | { type: "textInput"; props: TextInputMessagerProps }
  | { type: "projectNameInput"; props: ProjectNameMessagerProps };

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
    (props: PopMessagerProps) => setModal({ type: "message", props }),
    [],
  );

  const showError = useCallback(
    (props: ErrorMessagerProps) => setModal({ type: "error", props }),
    [],
  );

  const showLoading = useCallback(
    (props: LoadingMessagerProps) => setModal({ type: "loading", props }),
    [],
  );

  const showTextInput = useCallback(
    (props: TextInputMessagerProps) =>
      setModal({
        type: "textInput",
        props: {
          ...props,
          onCancel: props.onCancel ?? (props.buttons ? undefined : closeMessage),
        },
      }),
    [closeMessage],
  );

  const showProjectNameInput = useCallback(
    (props: ProjectNameMessagerProps) =>
      setModal({
        type: "projectNameInput",
        props: {
          ...props,
          onCancel: props.onCancel ?? (props.buttons ? undefined : closeMessage),
        },
      }),
    [closeMessage],
  );

  const updateLoadingProgress = useCallback((progress: number | null) => {
    setModal((current) => {
      if (current.type === "loading") {
        return { ...current, props: { ...current.props, progress } };
      }
      return current;
    });
  }, []);

  const renderModal = (state: ModalState): ReactNode => {
    switch (state.type) {
      case "message":
        return <PopMessager {...state.props} />;
      case "error":
        return <ErrorMessager {...state.props} />;
      case "loading":
        return <LoadingMessager {...state.props} />;
      case "textInput":
        return <TextInputMessager {...state.props} />;
      case "projectNameInput":
        return <ProjectNameMessager {...state.props} />;
      default:
        return null;
    }
  };

  return (
    <PopMessageContext.Provider
      value={{
        showMessage,
        showError,
        showLoading,
        showTextInput,
        showProjectNameInput,
        updateLoadingProgress,
        closeMessage,
      }}
    >
      {children}
      {modal.type !== "none" &&
        createPortal(
          <>
            {renderModal(modal)}
            <div className={styles.modalPopBackdrop} />
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

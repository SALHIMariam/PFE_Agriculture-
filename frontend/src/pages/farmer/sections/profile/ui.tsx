import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import styles from "./profile.module.css";

/* ---------------------------------------------------------------- Toggle */

export function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className={styles.switchKnob} />
    </button>
  );
}

/* ---------------------------------------------------------------- Checkbox */

export function CheckRow({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={styles.checkRow}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !disabled) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <span className={`${styles.checkbox} ${checked ? styles.checkboxOn : ""}`}>{checked ? "✓" : ""}</span>
      {label}
    </div>
  );
}

/* ---------------------------------------------------------------- Toast */

type ToastKind = "ok" | "err";
type ToastCtx = { notify: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, kind: ToastKind = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          className={`${styles.toast} ${toast.kind === "ok" ? styles.toastOk : styles.toastErr}`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/* ---------------------------------------------------------------- Modal */

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalTitle}>{title}</div>
        {children}
      </div>
    </div>
  );
}

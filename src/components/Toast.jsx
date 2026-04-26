import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

const ICONS = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
};

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message, duration = 4000 }) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, type, title, message, exiting: false }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (title, message, opts) => addToast({ type: "success", title, message, ...opts }),
    error:   (title, message, opts) => addToast({ type: "error",   title, message, ...opts }),
    info:    (title, message, opts) => addToast({ type: "info",    title, message, ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`toast ${t.type}${t.exiting ? " exiting" : ""}`}
          >
            <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
            <div className="toast-body">
              {t.title && <div className="toast-title">{t.title}</div>}
              {t.message && <div className="toast-message">{t.message}</div>}
            </div>
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

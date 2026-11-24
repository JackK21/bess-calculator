import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { id, type = 'info', title, message, duration = 5000 } = toast;

  useEffect(() => {
    if (!duration || duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const icons = {
    success: <CheckCircle2 size={18} className="toast-icon success" />,
    error: <AlertCircle size={18} className="toast-icon error" />,
    warning: <AlertTriangle size={18} className="toast-icon warning" />,
    info: <Info size={18} className="toast-icon info" />
  };

  return (
    <div className={`toast-card toast-${type}`} role="status">
      <div className="toast-header-row">
        <div className="toast-title-wrap">
          {icons[type] || icons.info}
          {title && <strong className="toast-title">{title}</strong>}
        </div>
        <button
          className="toast-close-btn"
          onClick={() => onDismiss(id)}
          aria-label="Zamknij powiadomienie"
        >
          <X size={14} />
        </button>
      </div>
      {message && <div className="toast-message">{message}</div>}
    </div>
  );
}

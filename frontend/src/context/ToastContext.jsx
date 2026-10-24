import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = ({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '380px'
        }}
        aria-live="polite"
      >
        {toasts.map(toast => {
          let bg = '#FFFFFF';
          let border = 'var(--border-color)';
          let Icon = Info;
          let iconColor = 'var(--accent-primary)';

          if (toast.type === 'success') {
            border = '#86EFAC';
            Icon = CheckCircle2;
            iconColor = '#16A34A';
          } else if (toast.type === 'error') {
            border = '#FCA5A5';
            Icon = AlertCircle;
            iconColor = '#DC2626';
          } else if (toast.type === 'warning') {
            border = '#FDE047';
            Icon = AlertTriangle;
            iconColor = '#D97706';
          }

          return (
            <div
              key={toast.id}
              style={{
                backgroundColor: bg,
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animation: 'fadeInSlideUp 200ms ease-out'
              }}
            >
              <Icon size={20} color={iconColor} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                style={{ padding: '0.2rem', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

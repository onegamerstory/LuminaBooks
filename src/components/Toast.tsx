import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ messages, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 space-y-3 pointer-events-none">
      {messages.map(message => (
        <ToastItem
          key={message.id}
          message={message}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  message: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ message, onRemove }) => {
  useEffect(() => {
    const duration = message.duration || 4000;
    const timer = setTimeout(() => {
      onRemove(message.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, onRemove]);

  const getBgColor = () => {
    switch (message.type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div 
      className={`rounded-lg border px-4 py-3 shadow-lg pointer-events-auto flex items-start gap-3 animate-in fade-in slide-in-from-right-4 ${getBgColor()}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-bold flex-shrink-0 mt-0.5">{getIcon()}</span>
      <p className="flex-1 text-sm font-medium">{message.message}</p>
      <button
        onClick={() => onRemove(message.id)}
        className="flex-shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;

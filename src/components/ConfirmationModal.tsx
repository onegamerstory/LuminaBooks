import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'color-mix(in oklab, var(--fg), transparent 50%)', backdropFilter: 'blur(4px)'}}>
      <div className="bg-surface rounded-xl shadow-overlay max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-default">
          {isDangerous && (
            <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-fg">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-muted hover:text-fg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-muted text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-default bg-page">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-surface border border-default text-fg rounded-lg hover:bg-page transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 font-medium text-sm rounded-lg transition-colors text-white inline-flex items-center justify-center gap-2 ${
              isDangerous
                ? 'bg-danger hover:bg-danger/80 disabled:bg-danger/50'
                : 'bg-accent hover:bg-accent-hover disabled:bg-accent/50'
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-slate-100">
          {isDangerous && (
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1E2920]">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-slate-700 hover:text-slate-900 font-medium text-sm rounded-lg hover:bg-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 font-medium text-sm rounded-lg transition-colors text-white ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#6B9071] hover:bg-[#5A7A60]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

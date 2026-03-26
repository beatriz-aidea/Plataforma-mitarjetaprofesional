import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = true
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button
              onClick={onCancel}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-zinc-900 mb-2">
            {title}
          </h3>
          <p className="text-zinc-600">
            {message}
          </p>
        </div>
        
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-700 font-medium hover:bg-zinc-200 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

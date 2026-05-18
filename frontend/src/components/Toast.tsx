import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

// Global toast state management
let _toastSetter: React.Dispatch<React.SetStateAction<ToastData[]>> | null = null;

export function showToast(type: ToastType, message: string) {
  const id = Math.random().toString(36).substring(2);
  _toastSetter?.((prev) => [...prev, { id, type, message }]);
  // Auto dismiss after 4s
  setTimeout(() => {
    _toastSetter?.((prev) => prev.filter((t) => t.id !== id));
  }, 4000);
}

const iconMap = {
  success: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  error: <AlertTriangle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

const bgMap = {
  success: 'bg-green-500/10 border-green-500/30',
  error: 'bg-red-500/10 border-red-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    _toastSetter = setToasts;
    return () => {
      _toastSetter = null;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${bgMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <span className="text-sm text-slate-200 font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 hover:bg-dark-700 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "info" | "success";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
  }>({
    isOpen: false,
    options: null,
  });

  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    setModalState({ isOpen: true, options });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  };

  const handleClose = (value: boolean) => {
    setModalState({ isOpen: false, options: null });
    if (resolver.current) {
      resolver.current(value);
      resolver.current = null;
    }
  };

  const options = modalState.options;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {modalState.isOpen && options && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => handleClose(false)}
              className="absolute inset-0 bg-black"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-card border border-border-subtle p-6 rounded-3xl shadow-premium z-10 overflow-hidden"
            >
              <button
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-secondary rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-4 items-start mt-2">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    options.variant === "danger"
                      ? "bg-brand-danger/10 text-brand-danger"
                      : options.variant === "success"
                      ? "bg-brand-success/10 text-brand-success"
                      : "bg-brand-info/10 text-brand-info"
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-bold text-foreground leading-snug">{options.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {options.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => handleClose(false)}
                  className="px-4 py-2.5 rounded-xl border border-border-subtle hover:bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  {options.cancelText || "Cancel"}
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                    options.variant === "danger"
                      ? "bg-brand-danger text-white hover:bg-brand-danger/90 shadow-brand-danger/20"
                      : options.variant === "success"
                      ? "bg-brand-success text-white hover:bg-brand-success/90 shadow-brand-success/20"
                      : "bg-brand-primary text-primary-foreground hover:bg-brand-primary/90 shadow-brand-primary/20"
                  }`}
                >
                  {options.confirmText || "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}


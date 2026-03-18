"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  className?: string;
}

export function ConfirmModal({
  open,
  onClose,
  onCancel,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  loading = false,
  destructive = true,
  className,
}: ConfirmModalProps) {
  const handleClose = onCancel ?? onClose ?? (() => { });
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "glass fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl p-6",
              className
            )}
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className={cn(
              "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
              destructive ? "bg-danger/10" : "bg-accent/10"
            )}>
              <AlertTriangle className={cn("h-6 w-6", destructive ? "text-danger" : "text-accent")} />
            </div>

            <h2 className="text-center text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <p className="mt-1 text-center text-sm text-text-muted">
              {description}
            </p>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-bg-elevated text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className={cn(
                  "flex-1 text-text-primary",
                  destructive
                    ? "bg-danger hover:bg-danger/90"
                    : "bg-accent hover:bg-accent/90"
                )}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Processing…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

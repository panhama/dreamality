import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog content will be rendered by DialogContent */}
      {children}
    </div>
  );
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  return <>{children}</>;
}

export function DialogContent({ className = "", children }: DialogContentProps) {
  return (
    <div className={`relative z-50 bg-white rounded-lg shadow-lg max-h-[90vh] overflow-auto ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b">
      {children}
      <button
        onClick={() => {
          // This will be handled by the parent Dialog's onOpenChange
          const dialog = document.querySelector('[data-dialog-close]');
          if (dialog) {
            (dialog as HTMLElement).click();
          }
        }}
        className="p-1 rounded-full hover:bg-gray-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DialogTitle({ children }: DialogTitleProps) {
  return (
    <h2 className="text-lg font-semibold text-gray-900">
      {children}
    </h2>
  );
}

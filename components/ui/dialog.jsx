import * as React from "react";

export function Dialog({ children, open, onOpenChange }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className = "", ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = "", ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "", ...props }) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className = "", ...props }) {
  return (
    <p className={`text-sm text-gray-600 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ children, className = "", ...props }) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogTrigger({ children, asChild = false, onClick, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        onClick?.(e);
      },
      ...props
    });
  }
  
  return (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  );
}
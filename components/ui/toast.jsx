import { useState, useEffect } from 'react';

// Simple toast function that can be used globally
export const showToast = (message, type = 'success') => {
  const event = new CustomEvent('show-toast', { 
    detail: { message, type } 
  });
  window.dispatchEvent(event);
};

// Toast component to be used in layout
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleShowToast = (event) => {
      const { message, type } = event.detail;
      const id = Math.random().toString(36).substr(2, 9);
      
      setToasts(prev => [...prev, { id, message, type }]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, 3000);
    };

    window.addEventListener('show-toast', handleShowToast);
    
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-2 rounded-md shadow-lg ${getToastStyles(toast.type)} animate-in slide-in-from-top-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="ml-2 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
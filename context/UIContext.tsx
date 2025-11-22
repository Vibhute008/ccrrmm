
import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';

interface UIContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Modal States
  const [modal, setModal] = useState<{
    type: 'alert' | 'confirm' | 'prompt';
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue?: string;
    resolve: (value: any) => void;
  } | null>(null);

  // Prompt Input Value
  const [promptValue, setPromptValue] = useState('');

  // Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Focus management
  const promptInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (message: string, title: string = 'Alert') => {
    return new Promise<void>((resolve) => {
      setModal({ type: 'alert', isOpen: true, title, message, resolve });
    });
  };

  const showConfirm = (message: string, title: string = 'Confirm') => {
    return new Promise<boolean>((resolve) => {
      setModal({ type: 'confirm', isOpen: true, title, message, resolve });
    });
  };

  const showPrompt = (message: string, defaultValue: string = '', title: string = 'Input Required') => {
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setModal({ type: 'prompt', isOpen: true, title, message, defaultValue, resolve });
      // Focus hack
      setTimeout(() => promptInputRef.current?.focus(), 50);
    });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleClose = (result: any) => {
    if (modal) {
      modal.resolve(result);
      setModal(null);
    }
  };

  return (
    <UIContext.Provider value={{ showAlert, showConfirm, showPrompt, showToast }}>
      {children}

      {/* MODAL OVERLAY */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 transform transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleClose(modal.type === 'confirm' || modal.type === 'prompt' ? null : undefined);
              if (e.key === 'Enter' && modal.type !== 'alert') handleClose(modal.type === 'prompt' ? promptValue : true);
              if (e.key === 'Enter' && modal.type === 'alert') handleClose(undefined);
            }}
          >
            <div className="p-5">
              <div className="flex items-start mb-4">
                <div className={`p-2 rounded-full mr-3 shrink-0 
                  ${modal.type === 'alert' ? 'bg-red-100 text-red-600' : 
                    modal.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 
                    'bg-indigo-100 text-indigo-600'}`}
                >
                  {modal.type === 'alert' && <AlertTriangle size={24} />}
                  {modal.type === 'confirm' && <HelpCircle size={24} />}
                  {modal.type === 'prompt' && <Info size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{modal.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{modal.message}</p>
                </div>
              </div>

              {modal.type === 'prompt' && (
                <div className="mb-4">
                  <input
                    ref={promptInputRef}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                {(modal.type === 'confirm' || modal.type === 'prompt') && (
                  <button
                    onClick={() => handleClose(modal.type === 'confirm' ? false : null)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (modal.type === 'alert') handleClose(undefined);
                    else if (modal.type === 'confirm') handleClose(true);
                    else if (modal.type === 'prompt') handleClose(promptValue);
                  }}
                  className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-transform active:scale-95
                    ${modal.type === 'alert' ? 'bg-red-600 hover:bg-red-700' : 
                      modal.type === 'confirm' ? 'bg-amber-500 hover:bg-amber-600' : 
                      'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {modal.type === 'alert' ? 'Okay' : modal.type === 'confirm' ? 'Confirm' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST CONTAINER */}
      <div className="fixed bottom-4 right-4 z-[110] flex flex-col space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`flex items-center p-4 rounded-xl shadow-lg border max-w-sm w-80 animate-in slide-in-from-right-10 duration-300 pointer-events-auto bg-white
              ${t.type === 'success' ? 'border-green-100' : t.type === 'error' ? 'border-red-100' : 'border-indigo-100'}
            `}
          >
            <div className={`mr-3 p-1.5 rounded-full shrink-0
              ${t.type === 'success' ? 'bg-green-100 text-green-600' : t.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}
            `}>
              {t.type === 'success' && <CheckCircle size={16} />}
              {t.type === 'error' && <AlertTriangle size={16} />}
              {t.type === 'info' && <Info size={16} />}
            </div>
            <p className="text-sm font-medium text-gray-700">{t.message}</p>
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
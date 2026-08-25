import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Check, AlertTriangle, Info } from 'lucide-react';
import FilePreviewModal from '../components/preview/FilePreviewModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { backdropVariants, modalTransition, panelVariants, springSnappy, toastVariants } from '../lib/motionPresets';
import type { Toast, ToastType, UIContextType } from '../types/ui';

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

    const [previewFile, setPreviewFile] = useState<File | Blob | string | null>(null);
    const [previewName, setPreviewName] = useState<string>('');
    const [previewType, setPreviewType] = useState<string | undefined>(undefined);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const notify = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts(prev => [...prev, { id, message, type }]);
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 6000);
    }, []);

    const confirm = useCallback((msg: string, onConfirm: () => void) => {
        setConfirmMessage(msg);
        setConfirmCallback(() => onConfirm);
    }, []);

    const handleConfirm = () => {
        if (confirmCallback) confirmCallback();
        setConfirmMessage(null);
        setConfirmCallback(null);
    };

    const preview = useCallback((file: File | Blob | string, name: string, type?: string) => {
        setPreviewFile(file);
        setPreviewName(name);
        setPreviewType(type);
    }, []);

    const closePreview = useCallback(() => {
        setPreviewFile(null);
        setPreviewName('');
        setPreviewType(undefined);
    }, []);

    const cancelConfirm = useCallback(() => {
        setConfirmMessage(null);
        setConfirmCallback(null);
    }, []);

    useEscapeKey(cancelConfirm, !!confirmMessage);

    return (
        <UIContext.Provider value={{ notify, confirm, preview, isConfirming: !!confirmMessage, isPreviewing: !!previewFile }}>
            {children}
            <div className="pointer-events-none fixed bottom-4 right-4 z-[10003] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
                <AnimatePresence mode="popLayout">
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            layout
                            variants={toastVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={springSnappy}
                            className={`pointer-events-auto flex items-start gap-3 rounded-xl p-4 text-sm font-medium text-white shadow-lg ${toast.type === 'error' ? 'bg-red-500' :
                                toast.type === 'success' ? 'bg-green-500' :
                                    'border border-neutral-700 bg-neutral-800'
                                }`}
                        >
                            <span className="mt-0.5 shrink-0">
                                {toast.type === 'error' ? <AlertTriangle className="h-5 w-5" /> :
                                    toast.type === 'success' ? <Check className="h-5 w-5" /> :
                                        <Info className="h-5 w-5 text-primary-300" />}
                            </span>
                            <span className="min-w-0 flex-1 break-words leading-snug">{toast.message}</span>
                            <button type="button" onClick={() => removeToast(toast.id)} className="ml-1 shrink-0 rounded p-1 hover:bg-black/20"><X className="h-3 w-3" /></button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {confirmMessage && (
                    <motion.div
                        key="confirm-modal"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={modalTransition}
                        className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60"
                        onClick={cancelConfirm}
                    >
                        <motion.div
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={springSnappy}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
                        >
                            <h3 className="heading-panel mb-2">Confirm</h3>
                            <p className="text-neutral-400 mb-6">{confirmMessage}</p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setConfirmMessage(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-lg font-bold transition">Cancel</button>
                                <button type="button" onClick={handleConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg font-bold transition shadow-lg shadow-red-900/20">Confirm</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewFile && (
                    <FilePreviewModal
                        file={previewFile}
                        name={previewName}
                        type={previewType}
                        onClose={closePreview}
                    />
                )}
            </AnimatePresence>
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within UIProvider');
    return context;
}

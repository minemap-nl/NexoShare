import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropVariants, modalTransition, panelVariants, springSnappy } from '../../lib/motionPresets';
import type { IosPickerNoticeIntent } from '../../hooks/useIosPickerNotice';

type IosPickerNoticeProps = {
    open: boolean;
    intent?: IosPickerNoticeIntent;
    onConfirm: () => void;
    onDismiss: () => void;
};

/**
 * Compact, non-alarming notice shown once per session on iOS before the
 * system file picker (or before upload if the user bypassed pick somehow).
 * App UI is English-only — no i18n layer exists yet.
 */
export function IosPickerNotice({
    open,
    intent = 'pick',
    onConfirm,
    onDismiss,
}: IosPickerNoticeProps) {
    const titleId = useId();
    const descId = useId();
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEscapeKey(onDismiss, open);

    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const t = window.setTimeout(() => confirmRef.current?.focus(), 0);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.clearTimeout(t);
        };
    }, [open]);

    const confirmLabel = intent === 'upload' ? 'Got it' : 'Got it, choose files';

    return (
        <AnimatePresence>
            {open && (
                <ModalPortal>
                    <motion.div
                        key="ios-picker-notice"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={modalTransition}
                        className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/60"
                        onClick={onDismiss}
                        role="presentation"
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            aria-describedby={descId}
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={springSnappy}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl outline-none"
                        >
                            <div className="flex gap-3">
                                <div
                                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-300"
                                    aria-hidden="true"
                                >
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 id={titleId} className="heading-panel text-base leading-snug">
                                        Selecting on iPhone
                                    </h2>
                                    <p id={descId} className="mt-2 text-sm leading-relaxed text-neutral-400">
                                        Large videos can take a while before the Photos screen closes.
                                        You won&apos;t see progress during that time. Please wait — don&apos;t
                                        tap the checkmark again.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-col gap-2">
                                <button
                                    ref={confirmRef}
                                    type="button"
                                    onClick={onConfirm}
                                    className="btn-press min-h-11 w-full rounded-xl bg-gradient-brand px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-950/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                                >
                                    {confirmLabel}
                                </button>
                                <button
                                    type="button"
                                    onClick={onDismiss}
                                    className="min-h-11 w-full rounded-xl px-4 py-3 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </ModalPortal>
            )}
        </AnimatePresence>
    );
}

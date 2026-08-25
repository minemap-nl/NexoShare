import type { Transition, Variants } from 'motion/react';

/** Snappy spring for panels / toasts — transform disabled under reducedMotion via MotionConfig. */
export const springSnappy: Transition = {
    type: 'spring',
    stiffness: 420,
    damping: 32,
    mass: 0.8,
};

export const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

export const panelVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 12 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
};

export const toastVariants: Variants = {
    hidden: { opacity: 0, x: 24, scale: 0.98 },
    visible: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 16, scale: 0.98 },
};

export const listContainerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.045, delayChildren: 0.04 },
    },
};

export const listItemVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalTransition: Transition = {
    duration: 0.2,
    ease: [0.22, 1, 0.36, 1],
};

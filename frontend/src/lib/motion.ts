import type { Transition } from 'framer-motion';

/** Shared motion tokens — ShortestPath-style page/card transitions. */
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
export const EASE_MODAL = [0.16, 1, 0.3, 1] as const;

export const pageEnterExit = (reduce: boolean) => ({
  initial: { opacity: 0, x: reduce ? 0 : 36 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: reduce ? 0 : -36 },
  transition: { duration: reduce ? 0 : 0.32, ease: EASE_OUT } as Transition,
});

/** Staggered fade-up for list/card children (45ms * index). */
export const fadeItem = (index: number, reduce: boolean) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: {
          delay: index * 0.045,
          duration: 0.4,
          ease: EASE_OUT,
        } as Transition,
      };

export const modalShell = (reduce: boolean) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: reduce ? 0 : 0.18, ease: EASE_MODAL } as Transition,
});

export const modalCard = (reduce: boolean) => ({
  initial: { opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 8 },
  transition: { duration: reduce ? 0 : 0.28, ease: EASE_MODAL } as Transition,
});

/** Content-region crossfade when switching ActivityBar tabs. */
export const tabFade = (reduce: boolean) => ({
  initial: { opacity: 0, y: reduce ? 0 : 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: reduce ? 0 : -4 },
  transition: { duration: reduce ? 0 : 0.22, ease: EASE_OUT } as Transition,
});

export const cardHover = (reduce: boolean) =>
  reduce ? {} : { whileHover: { y: -3 }, whileTap: { scale: 0.98 } };

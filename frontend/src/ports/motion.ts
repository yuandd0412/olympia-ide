/**
 * Port: motion tokens & primitives.
 *
 * All registered easings/presets live here (currently backed by lib/motion.ts).
 * New UI must reuse these tokens — unregistered easing curves scattered in
 * components are not allowed.
 */
export {
  tabFade,
  modalShell,
  modalCard,
  fadeItem,
  pageEnterExit,
  cardHover,
  EASE_OUT,
  EASE_MODAL,
} from '../lib/motion';

export { createStagger } from '../adapters/motion/stagger';

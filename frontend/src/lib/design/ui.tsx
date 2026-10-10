import type { ButtonHTMLAttributes, FC, HTMLAttributes, ReactNode } from 'react';
import { borders, buttons, radius, states } from './tokens';

/**
 * Thin design-system primitives over plain DOM + Tailwind. They standardize
 * radius, border, hover and focus treatment; no third-party imports and no
 * motion logic — wrap with `motion.*` + `ports/motion` presets where needed.
 */

/** Card frame classes without the surface tone — reuse on motion.div where a component won't fit. */
export const O_CARD_FRAME = `${radius.card} ${borders.default}`;

const CARD_TONE = {
  surface: 'bg-[var(--bg-surface)]',
  elevated: 'bg-[var(--bg-elevated)]',
  base: 'bg-[var(--bg-base)]',
} as const;

export type OCardTone = keyof typeof CARD_TONE;

export interface OCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: OCardTone;
}

/** Card primitive: uniform radius + border + surface tone. Padding stays with the caller. */
export const OCard: FC<OCardProps> = ({ tone = 'surface', className = '', children, ...rest }) => (
  <div className={`${O_CARD_FRAME} ${CARD_TONE[tone]} ${className}`} {...rest}>
    {children}
  </div>
);

export interface OSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  action?: ReactNode;
  tone?: OCardTone;
  bodyClassName?: string;
}

/** Titled card section matching the app's uppercase header idiom. */
export const OSection: FC<OSectionProps> = ({
  title,
  action,
  tone,
  bodyClassName = '',
  className = '',
  children,
  ...rest
}) => (
  <section className={`space-y-2 ${className}`} {...rest}>
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] select-none">
        {title}
      </h3>
      {action}
    </div>
    <OCard tone={tone} className={bodyClassName}>
      {children}
    </OCard>
  </section>
);

export type OButtonVariant =
  | 'primary'
  | 'ghost'
  | 'outline'
  | 'accent'
  | 'accentSoft'
  | 'onAccent'
  | 'danger'
  | 'dangerOutline';
export type OButtonSize = 'xs' | 'sm' | 'md' | 'icon';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30';

// Variants are mutually exclusive class sets — switch variants for state
// instead of overriding one property via className (same-property conflicts
// resolve unpredictably in the generated stylesheet).
const BUTTON_VARIANT: Record<OButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-white shadow-xs hover:bg-[var(--accent-hover)]',
  ghost: `text-[var(--text-secondary)] ${states.hoverSurface} ${states.hoverText}`,
  outline: `border border-[var(--border)] text-[var(--text-secondary)] ${states.hoverSurface} ${states.hoverText}`,
  accent: 'border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
  accentSoft: 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  /** Foreground over an accent fill (e.g. the ActivityBar pill), no fill of its own. */
  onAccent: 'text-white',
  danger: 'bg-[var(--color-wa)] text-white shadow-xs hover:brightness-110',
  dangerOutline: buttons.dangerOutline,
};

const BUTTON_SIZE: Record<OButtonSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] rounded',
  sm: 'px-2.5 py-1 text-xs rounded-md',
  md: 'px-3.5 py-1.5 text-xs rounded-lg',
  icon: 'p-2.5 rounded-xl',
};

export interface OButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OButtonVariant;
  size?: OButtonSize;
}

export const OButton: FC<OButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`}
    {...rest}
  />
);

export interface OEmptyProps {
  icon?: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Empty-state placeholder: dashed card frame + centered icon/copy/action. */
export const OEmpty: FC<OEmptyProps> = ({ icon, title, hint, action, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border)] p-8 text-center ${radius.card} ${className}`}
  >
    {icon && <div className="text-[var(--text-tertiary)]">{icon}</div>}
    <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
    {hint && <p className="max-w-xs text-xs text-[var(--text-tertiary)]">{hint}</p>}
    {action && <div className="pt-1">{action}</div>}
  </div>
);

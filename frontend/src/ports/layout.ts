/**
 * Port: resizable split layout.
 *
 * `components/**` must not import `react-resizable-panels` directly — compose
 * splits from SplitGroup/SplitPanel/SplitSeparator here. The binding is
 * React-shaped because every current consumer is a React component; a
 * DOM-imperative `createSplitLayout` variant is deferred until a non-React
 * caller actually exists.
 */
import type { CSSProperties, ReactNode } from 'react';

export type SplitOrientation = 'horizontal' | 'vertical';

/** Size snapshot in pixels and as a percentage of the group (0..100). */
export interface SplitPanelSize {
  pixels: number;
  percentage: number;
}

/** Imperative handle for collapse/expand, delivered via SplitPanel `handle`. */
export interface SplitPanelHandle {
  collapse(): void;
  expand(): void;
}

/** Mutable ref target that receives a SplitPanelHandle once the panel mounts. */
export interface SplitPanelHandleRef {
  current: SplitPanelHandle | null;
}

/**
 * Opaque layout-persistence binding produced by `useSplitLayout(id)` —
 * hand it to the matching SplitGroup and treat its fields as sealed.
 */
export interface SplitLayoutBinding {
  /** @internal Opaque persisted layout payload — do not read or mutate. */
  readonly defaultLayout: Record<string, number> | undefined;
  /** @internal Opaque change listener — do not call directly. */
  readonly onLayoutChanged: (
    layout: Record<string, number>,
    meta: { isUserInteraction: boolean },
  ) => void;
}

export interface SplitGroupProps {
  /** Stable id; keys layout persistence together with useSplitLayout(id). */
  id: string;
  orientation: SplitOrientation;
  layoutBinding?: SplitLayoutBinding;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface SplitPanelProps {
  id: string;
  /** e.g. "35%" — bare strings are percentages, suffixed "px" are pixels. */
  defaultSize?: string;
  minSize?: string;
  maxSize?: string;
  collapsible?: boolean;
  collapsedSize?: string;
  className?: string;
  style?: CSSProperties;
  onResize?(size: SplitPanelSize): void;
  /** Ref target that receives a SplitPanelHandle once mounted. */
  handle?: SplitPanelHandleRef;
  children?: ReactNode;
}

export interface SplitSeparatorProps {
  className?: string;
  children?: ReactNode;
}

export { SplitGroup, SplitPanel, SplitSeparator } from '../adapters/layout/ReactPanelsAdapter';
export { useSplitLayout } from '../adapters/layout/useSplitLayout';

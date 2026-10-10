import { useEffect, useMemo, useRef } from 'react';
import type { FC } from 'react';
import {
  Group as LibGroup,
  Panel as LibPanel,
  Separator as LibSeparator,
  type PanelImperativeHandle,
  type PanelSize,
} from 'react-resizable-panels';
import type {
  SplitGroupProps,
  SplitPanelHandle,
  SplitPanelHandleRef,
  SplitPanelProps,
  SplitPanelSize,
  SplitSeparatorProps,
} from '../../ports/layout';

/** react-resizable-panels v4 implementation of `ports/layout`. */

const toPortSize = (size: PanelSize): SplitPanelSize => ({
  pixels: size.inPixels,
  percentage: size.asPercentage,
});

/** Deliver (or clear) the imperative handle on the consumer's ref target. */
const setHandleTarget = (target: SplitPanelHandleRef | undefined, value: SplitPanelHandle | null) => {
  if (target) target.current = value;
};

export const SplitGroup: FC<SplitGroupProps> = ({ id, orientation, layoutBinding, className, style, children }) => (
  <LibGroup
    id={id}
    orientation={orientation}
    defaultLayout={layoutBinding?.defaultLayout}
    onLayoutChanged={layoutBinding?.onLayoutChanged}
    className={className}
    style={style}
  >
    {children}
  </LibGroup>
);

export const SplitPanel: FC<SplitPanelProps> = ({
  id,
  defaultSize,
  minSize,
  maxSize,
  collapsible,
  collapsedSize,
  className,
  style,
  onResize,
  handle,
  children,
}) => {
  const libRef = useRef<PanelImperativeHandle | null>(null);
  // Stable bridge so consumer refs survive re-renders of this panel.
  const bridge = useMemo<SplitPanelHandle>(
    () => ({
      collapse: () => libRef.current?.collapse(),
      expand: () => libRef.current?.expand(),
    }),
    [],
  );

  useEffect(() => {
    if (!handle) return;
    setHandleTarget(handle, bridge);
    return () => {
      setHandleTarget(handle, null);
    };
  }, [handle, bridge]);

  return (
    <LibPanel
      id={id}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      panelRef={libRef}
      onResize={onResize ? (size) => onResize(toPortSize(size)) : undefined}
      className={className}
      style={style}
    >
      {children}
    </LibPanel>
  );
};

export const SplitSeparator: FC<SplitSeparatorProps> = ({ className, children }) => (
  <LibSeparator className={className}>{children}</LibSeparator>
);

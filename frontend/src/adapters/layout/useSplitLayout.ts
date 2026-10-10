import { useDefaultLayout } from 'react-resizable-panels';
import type { SplitLayoutBinding } from '../../ports/layout';

/**
 * react-resizable-panels v4 implementation of the layout-persistence hook.
 * Kept in its own module so the component file stays fast-refresh friendly.
 */
export function useSplitLayout(id: string, storage?: Storage): SplitLayoutBinding {
  return useDefaultLayout({ id, storage });
}

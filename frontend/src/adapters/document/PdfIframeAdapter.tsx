import type { FC } from 'react';
import type { PdfViewerProps } from '../../ports/document';
import { O_CARD_FRAME } from '../../lib/design';

/**
 * Browser-native PDF viewer (WebView built-in) implementing `ports/document`.
 * `#page=N` jumps the embedded viewer; a remount per page keeps the fragment
 * change effective across engines. The iframe sits inside the shared OCard
 * frame (rounded + themed border + clipped corners) so the raw viewer never
 * shows hard black edges.
 */
export const PdfViewer: FC<PdfViewerProps> = ({
  path,
  page,
  className = '',
  title = 'PDF Viewer',
}) => {
  const target = page && page > 0 ? `${path}#page=${page}` : path;
  return (
    <div
      key={`${path}#p${page ?? 0}`}
      className={`overflow-hidden ${O_CARD_FRAME} bg-white ${className}`}
    >
      <iframe
        src={target}
        title={title}
        className="block h-full w-full"
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default PdfViewer;

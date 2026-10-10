/**
 * @deprecated Markdown+KaTeX rendering moved behind `ports/document` —
 * import { Markdown } from '../../ports/document' instead. This shim only
 * keeps stale imports compiling during the migration window.
 */
import { Markdown as PortMarkdown } from '../../ports/document';

export const MathMarkdown = PortMarkdown;
export default MathMarkdown;

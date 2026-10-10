import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { FC } from 'react';
import type { MarkdownProps } from '../../ports/document';
import { KATEX_MACROS, prepareMath } from './ojMath';

/**
 * react-markdown + KaTeX implementation of the Markdown half of
 * `ports/document`. KaTeX CSS and OJ macro handling are owned here so callers
 * never touch the markdown/KaTeX stack directly.
 */

export const Markdown: FC<MarkdownProps> = ({ children, className, components }) => {
  const prepared = prepareMath(children);
  // Drop the engine-specific `node` prop before handing over to port renderers.
  const portComponents: Components | undefined = components?.code
    ? {
        code: ({ node: _node, ...rest }) => components.code!(rest),
      }
    : undefined;
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[[remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              macros: KATEX_MACROS,
              throwOnError: false,
              strict: false,
              errorColor: '#ff453a',
            },
          ],
        ]}
        components={portComponents}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;

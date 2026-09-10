import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { hydroContentUrl } from '../lib/endpoint';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: ({ node: _node, className, children, ...props }) => {
            const language = className?.match(/language-([\w+-]+)/)?.[1];
            const source = String(children).replace(/\n$/, '');
            let html = '';
            try {
              html = language && hljs.getLanguage(language)
                ? hljs.highlight(source, { language }).value
                : hljs.highlightAuto(source).value;
            } catch {
              html = source;
            }
            return <code {...props} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
          },
          a: ({ node: _node, href, ...props }) => {
            const resolvedHref = hydroContentUrl(href);
            return (
              <a
                {...props}
                href={resolvedHref}
                target={resolvedHref?.startsWith('http') ? '_blank' : undefined}
                rel={resolvedHref?.startsWith('http') ? 'noreferrer' : undefined}
              />
            );
          },
          img: ({ node: _node, ...props }) => (
            <img {...props} src={hydroContentUrl(props.src)} alt={props.alt ?? ''} loading="lazy" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { type EmojiRecord } from "./emoji";

import { Marked, type TokenizerAndRendererExtension } from "marked";
import { emojiExtension, type EmojiRecord } from "./emoji";
import { katexExtension } from "./katex";

export type ParseMarkdownOption = Partial<{
    allowLatex: boolean,
    emojis: Record<string, EmojiRecord>
}>;

export const parseMarkdown = async (content: string, options: ParseMarkdownOption = {}) => {
    const marked = new Marked();
    marked.use({
        async: true,
        pedantic: false,
        gfm: true,
        renderer: {
            heading(code) {
                return code.raw.startsWith('#') ? `<h${code.depth} class="md-heading">${code.text}</h${code.depth}>` :  `<h${code.depth} class="md-heading md-h-underline">${code.text}</h${code.depth}>`;
            },
            hr(_) {
                return `<hr class="md-line" />`;
            },
            code(code) {
                return `<pre class="md-ticcode"><code class="md-ticcode">${code.text}</code></pre>`;
            },
            codespan(code) {
                return `<code class="md-codespan">${code.text}</code>`;
            },
            list(code) {
                const ordered = code.ordered;
                let body = '';
                for (let j = 0; j < code.items.length; j++) {
                    const item = code.items[j];
                    body += this.listitem(item);
                }
                const type = ordered ? 'ol' : 'ul';
                return '<' + type + ' class="md-'+type+'list">\n' + body + '</' + type + '>\n';
            },
            listitem(item) {
                let itemBody = '';
                if (item.task) {
                    const checkbox = this.checkbox({ checked: !!item.checked });
                    if (item.loose) {
                        if (item.tokens[0]?.type === 'paragraph') {
                            item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                            if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                                item.tokens[0].tokens[0].text = checkbox + ' ' + escape(item.tokens[0].tokens[0].text);
                                item.tokens[0].tokens[0].escaped = true;
                            }
                        } else {
                            item.tokens.unshift({
                                type: 'text',
                                raw: checkbox + ' ',
                                text: checkbox + ' ',
                                escaped: true,
                            });
                        }
                    } else {
                        itemBody += checkbox + ' ';
                    }
                }
            
                itemBody += this.parser.parse(item.tokens, !!item.loose);
            
                return `<li class="md-item-list">${itemBody}</li>\n`;
            }
        },
    });

    let extensions: TokenizerAndRendererExtension[] = [];
    if(options.emojis) {
        extensions.push(emojiExtension(options.emojis));
    }
    if(options.allowLatex??true) {
        extensions.push(...katexExtension());
    }
    marked.use({
        extensions,
    });
    return await marked.parse(content);
};
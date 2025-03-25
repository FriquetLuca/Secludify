import katex from "katex";
import { type TokenizerAndRendererExtension } from "marked";

export function katexExtension(): TokenizerAndRendererExtension[] {
    const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
    const blockRule = /^\$\$((?:\\[^]|[^\\])+?)\$\$/s;
    return [
        {
            name: "inlineTex",
            level: "inline",
            start(src) {
                let index;
                let indexSrc = src;
          
                while (indexSrc) {
                  index = indexSrc.indexOf('$');
                  if (index === -1) {
                    return;
                  }
                  const f = index === 0 || indexSrc.charAt(index - 1) === ' ';
                  if (f) {
                    const possibleKatex = indexSrc.substring(index);
          
                    if (possibleKatex.match(inlineRule)) {
                      return index;
                    }
                  }
          
                  indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
                }
            },
            tokenizer(src) {
              const match = src.match(inlineRule);
              if (match) {
                return {
                  type: 'inlineTex',
                  raw: match[0],
                  text: match[2].trim(),
                  displayMode: match[1].length === 2,
                };
              }
            },
            renderer(token) {
                return katex.renderToString(token.text, {
                    throwOnError: false,
                    output: "mathml",
                    displayMode: token.displayMode,
                });
            }
        },
        {
            name: "blockTex",
            level: "block",
            tokenizer(src, _) {
                const match = src.match(blockRule);
                if (match) {
                    console.log(match[1])
                    return {
                        type: 'blockTex',
                        raw: match[0],
                        text: match[1].trim(),
                        displayMode: true,
                    };
                }
            },
            renderer(token) {
                return katex.renderToString(token.text, {
                    throwOnError: false,
                    output: "mathml",
                    displayMode: token.displayMode,
                });
            }
        }
    ];
}

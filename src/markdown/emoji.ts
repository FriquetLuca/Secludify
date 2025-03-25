import { type TokenizerAndRendererExtension } from "marked";

export type EmojiRecord = { type: "char", char: string }|{ type: "img", url: string, alt?: string }|{ type: "i", className: string };
export function emojiExtension(emojis: Record<string, EmojiRecord>): TokenizerAndRendererExtension {
    const emojiNames = Object.keys(emojis).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const emojiRegex = new RegExp(`:(${emojiNames}):`);
    const tokenizerRule = new RegExp(`^${emojiRegex.source}`);
    return {
        name: "emoji",
        level: "inline",
        start(src) {
            return src.match(emojiRegex)?.index;
        },
        tokenizer(src, _) {
            const match = tokenizerRule.exec(src);
            if (!match) {
                return;
            }
            const name = match[1];
            const emoji = emojis[name as keyof typeof emojis];
            if (!emoji) {
                return;
            }
            return {
                type: 'emoji',
                raw: match[0],
                name,
                emoji,
            };
        },
        renderer(token) {
            const emoji: EmojiRecord = token.emoji;
            switch(emoji.type) {
                case "img":
                    return `<img alt="${emoji.alt??token.name}" src="${emoji.url}" class="md-emoji-img">`;
                case "i":
                    return `<i class="${emoji.className}"></i>`;
                default:
                    return emoji.char;
            }
        }
    };
}

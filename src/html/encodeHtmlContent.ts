import { glyphToHTMLEntities } from "./htmlCharacterEntities";

export function encodeHtmlContent(content: string) {
    let result = "";
    for(const char of content) {
      result = `${result}${glyphToHTMLEntities[char] ?? char}`;
    }
    return result;
}

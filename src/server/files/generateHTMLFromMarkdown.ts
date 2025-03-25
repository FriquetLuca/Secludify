import fs from 'fs';
import { parseMarkdown } from '../../markdown';
import { type DynamicFileOption } from './dynamicFiles';

export async function generateHTMLFromMarkdown(mdContent: string, template: string, title: string, options: DynamicFileOption) {
    const md = await parseMarkdown(mdContent, {
        emojis: options.emojis,
        allowLatex: options.allowLatex,
    });
    const injectedTemplate = template
        .replace(/%PAGE_TITLE%/g, title)
        .replace(/%PAGE_CONTENT%/g, () => md);
    return injectedTemplate;
}

export async function generateHTMLFromMarkdownFile(mdLocation: string, title: string, options: DynamicFileOption) {
    const mdContent = fs.readFileSync(mdLocation, { encoding: "utf-8" });
    const template = fs.readFileSync(options.templateLocation, { encoding: "utf-8" });
    return await generateHTMLFromMarkdown(mdContent, template, title, options);
}

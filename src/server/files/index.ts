import { type ContentType } from '../../http';

export type FileData = {
    contentType: ContentType,
    location: string,
    route: string,
    skip?: boolean,
    disposition?: "attachment"|"inline",
    filename?: string,
};

export { generateHTMLFromMarkdownFile as generateHTMLFromMarkdown } from "./generateHTMLFromMarkdown";
export { type DynamicFileOption, dynamicFiles } from './dynamicFiles';
export { dynamicHtmlLocationHandler } from './dynamicHtmlLocationHandler';
export { loadMetadata } from "./loadMetadata";
export { type StaticFileOption, staticFiles, createStaticFileRoute } from './staticFiles';
export * from "./locationTree";

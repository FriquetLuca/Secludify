import path from 'path';
import fs from 'fs';
import type { FastifyInstance } from 'fastify';
import { patchPrefix } from './patchPrefix';
import { CONTENT_TYPE, type ContentTypeExtension } from '../../http';
import { loadMetadata, type LocationDirectory, locationTree, type FileData } from '.';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Transform } from 'stream';
import { type MaybePromise } from '../../functional';
import { type EmojiRecord } from '../../markdown';
import { generateHTMLFromMarkdown, generateHTMLFromMarkdownFile } from './generateHTMLFromMarkdown';
import { findLocationInTreeRoute } from './findRelativeInTree';

export type DynamicFileOption = {
    location: string,
    templateLocation: string,
    allowLatex?: boolean,
    emojis?: Record<string, EmojiRecord>,
    prefix?: string,
    metaext?: string,
    disableDefaultIndexing?: string,
    locationHandler?: (file: FileData) => FileData,
    fileHandler?: (file: FileData) => MaybePromise<fs.ReadStream | ServerResponse<IncomingMessage> | Transform | string | Buffer>,
};

export function dynamicFiles(fastify: FastifyInstance, options: DynamicFileOption) {
    if(fs.existsSync(options.location)) {
        const prefix = patchPrefix(options.prefix ?? "");
        fastify.get(`${prefix}*`, async (req, rep) => {
            const requestUrl = req.originalUrl.substring(prefix.length - 1, req.originalUrl.length);
            const ext = path.extname(requestUrl) as ContentTypeExtension;
            if(ext === (options.metaext ?? ".livify")) {
                return rep.code(404).send({ message: `Route GET:${req.originalUrl} not found`, error: "Not Found" });
            }
            const file = {
                contentType: CONTENT_TYPE[ext] ?? "application/octet-stream",
                location: path.join(options.location, requestUrl),
                route: requestUrl,
            };
            const currentFile: FileData = (options.locationHandler && options.locationHandler(file)) ?? file;
            const unknownMetas = loadMetadata<{ hidden: boolean }>(currentFile.location, { hidden: false }, options.metaext);
            if(unknownMetas.hidden) {
                return rep.code(404).send({ message: `Route GET:${req.originalUrl} not found`, error: "Not Found" });
            }
            if(fs.existsSync(currentFile.location)) {
                const stats = fs.statSync(currentFile.location);
                if(stats.isFile()) {
                    const fileMeta: LocationFileMeta = unknownMetas;
                    if(fileMeta.file?.disposition) {
                        if(fileMeta.file.disposition === "attachment" && fileMeta.file.filename) {
                            rep.header('Content-Disposition', `attachment; filename="${fileMeta.file.filename}"`);
                        } else {
                            rep.header('Content-Disposition', fileMeta.file.disposition);
                        }
                    }
                    if(options.fileHandler) {
                        return rep.code(200).type(currentFile.contentType).send(await options.fileHandler(currentFile));
                    }
                    if(path.extname(currentFile.location) === ".md") {
                        return rep.code(200).type("text/html").send(await generateHTMLFromMarkdownFile(file.location, fileMeta.title ?? path.basename(currentFile.location), options));
                    }
                    return rep.code(200).type(currentFile.contentType).send(fs.createReadStream(currentFile.location));
                } else if (stats.isDirectory()) {
                    const directoryMeta: LocationDirectoryMeta = unknownMetas;
                    const possibleIndexHTML = path.join(currentFile.location, "index.html");
                    const possibleIndexMD = path.join(currentFile.location, "index.md");
                    if(fs.existsSync(possibleIndexHTML)) {
                        const fileMeta = loadMetadata<LocationFileMeta>(possibleIndexMD, { hidden: false, }, options.metaext);
                        if(fileMeta.file?.disposition) {
                            if(fileMeta.file.disposition === "attachment" && fileMeta.file.filename) {
                                rep.header('Content-Disposition', `attachment; filename="${fileMeta.file.filename}"`);
                            } else {
                                rep.header('Content-Disposition', fileMeta.file.disposition);
                            }
                        }
                        return rep.code(200).type("text/html").send(fs.createReadStream(possibleIndexHTML));
                    } else if(fs.existsSync(possibleIndexMD)) {
                        const fileMeta = loadMetadata<LocationFileMeta>(possibleIndexMD, { hidden: false, }, options.metaext);
                        if(fileMeta.file?.disposition) {
                            if(fileMeta.file.disposition === "attachment" && fileMeta.file.filename) {
                                rep.header('Content-Disposition', `attachment; filename="${fileMeta.file.filename}"`);
                            } else {
                                rep.header('Content-Disposition', fileMeta.file.disposition);
                            }
                        }
                        return rep.code(200).type("text/html").send(await generateHTMLFromMarkdownFile(possibleIndexMD, fileMeta.title ?? "Index", options));
                    } else {
                        if(directoryMeta.indexed ?? !(options.disableDefaultIndexing ?? false)) {
                            // Create an index for the directory since it's indexed
                            const tree = locationTree(options.location, { prefix });
                            if(tree) {
                                const currentLocation = findLocationInTreeRoute(currentFile.location, tree);
                                if(currentLocation) {
                                    const indexContent = `# ${currentLocation.name}\r\n\r\n## Index\r\n\r\n`;
                                    const host = req.headers.host;
                                    const protocol = req.protocol || 'http';
                                    const dirname = path.dirname(currentFile.route);
                                    const pageLinks: string[] = [];
                                    if(!currentLocation.isRoot) {
                                        pageLinks.push(`- [..](${protocol}://${host}${dirname})`);
                                    }
                                    for(const item of (currentLocation as LocationDirectory).content) {
                                        pageLinks.push(`- [${path.basename(item.path)}](${protocol}://${host}${item.relativePath})`);
                                    }
                                    return rep.code(200).type("text/html").send(await generateHTMLFromMarkdown(`${indexContent}${pageLinks.join("\r\n")}`, fs.readFileSync(options.templateLocation, { encoding: "utf-8" }), "Index", options));
                                }
                            }
                            return rep.code(500).send({ message: `Error 500 - Internal Server Error`, error: "Internal Server Error" });
                        }
                        return rep.code(404).send({ message: `Route GET:${req.originalUrl} not found`, error: "Not Found" });
                    }
                } else {
                    return rep.code(404).send({ message: `Route GET:${req.originalUrl} not found`, error: "Not Found" });
                }
            } else {
                return rep.code(404).send({ message: `Route GET:${req.originalUrl} not found`, error: "Not Found" });
            }
        })
    }
}

type LocationMetaFileAttachment = Partial<{
    disposition: "attachment"|"inline",
    filename: string,
}>;
type LocationFileMeta = Partial<{
    title: string,
    file: LocationMetaFileAttachment,
    hidden: boolean,
}>;

type LocationDirectoryMeta = Partial<{
    title: string,
    indexed: boolean,
    hidden: boolean,
}>

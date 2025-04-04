import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { CONTENT_TYPE, type ContentTypeExtension } from "../../http";
import { directoryAllFiles } from "../../fs";
import { patchPrefix } from "./patchPrefix";
import { type FileData } from ".";
import type { IncomingMessage, ServerResponse } from 'http';

export type StaticFileOption = {
    location: string,
    prefix?: string,
    locationHandler?: (file: FileData) => FileData | FileData[],
    fileHandler?: (file: FileData) => fs.ReadStream | ServerResponse<IncomingMessage> | string | Buffer,
};

export function staticFiles(fastify: FastifyInstance, options: StaticFileOption) {
    if(fs.existsSync(options.location)) {
        const prefix = patchPrefix(options.prefix ?? "");
        const files = directoryAllFiles(options.location);
        for(const location of files) {
            const contentType = CONTENT_TYPE[path.extname(location) as ContentTypeExtension] ?? "application/octet-stream";
            const route = `${prefix}${path.relative(options.location, location).replaceAll("\\", "/")}`;
            const allLocations = options.locationHandler
                ? options.locationHandler({ contentType, location, route, })
                : { contentType, location, route, };
            if(Array.isArray(allLocations)) {
                for(const file of allLocations) {
                    createStaticFileRoute(fastify, file, options);
                }
            } else {
                createStaticFileRoute(fastify, allLocations, options);
            }
        }
    }
}

export function createStaticFileRoute(fastify: FastifyInstance, file: FileData, options: StaticFileOption) {
    if(file.skip) {
        return;
    }
    if(fs.existsSync(file.location) && fs.statSync(file.location).isFile()) {
        fastify.get(file.route, async (_, rep) => {
            if(file.disposition) {
                if(file.disposition === "attachment" && file.filename) {
                    rep.header('Content-Disposition', `attachment; filename="${file.filename}"`);
                } else {
                    rep.header('Content-Disposition', file.disposition);
                }
            }
            if(options.fileHandler) {
                return rep.code(200).type(file.contentType).send(options.fileHandler(file));
            }
            return rep.code(200).type(file.contentType).send(fs.createReadStream(file.location));
        });
    }
}

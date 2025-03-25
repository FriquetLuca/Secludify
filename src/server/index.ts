export * from "./files";
import Fastify, { type FastifyListenOptions, type Session } from 'fastify';
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import { post } from "./post";
import { send } from "./send";
import { getKeys } from "../security";
import { dynamicFiles, loadMetadata, staticFiles, type DynamicFileOption, type StaticFileOption } from './files';
import { keyExchange } from './keyExchange';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import chokidar from 'chokidar';
import path from 'path';
import { patchPrefix } from './files/patchPrefix';

declare module "fastify" {
    interface Session {
        aesKey: string,
    }
}

type CommonRequest<Params = {}, Querystring = {}> = {
    params: Params,
    query: Querystring,
    reply: (code: number, data: unknown) => ReturnType<typeof send>,
};

type SessionRequest = {
    session: Session,
};

export type GetRequest<Params = {}, Querystring = {}> = CommonRequest<Params, Querystring>;
export type HeadRequest<Params = {}, Querystring = {}> = CommonRequest<Params, Querystring>;
export type PostRequest<Body = {}, Params = {}, Querystring = {}> = CommonRequest<Params, Querystring> & { body: Body };
export type PutRequest<Body = {}, Params = {}> = { params: Params, reply: (code: number, data: unknown) => ReturnType<typeof send>, } & { body: Body };
export type DeleteRequest<Params = {}, Querystring = {}> = CommonRequest<Params, Querystring>;
export type PatchRequest<Body = {}, Params = {}> = { params: Params, reply: (code: number, data: unknown) => ReturnType<typeof send>, } & { body: Body };

export type SecureGetRequest<Params = {}, Querystring = {}> = GetRequest<Params, Querystring> & SessionRequest;
export type SecurePostRequest<Body = {}, Params = {}, Querystring = {}> = PostRequest<Body, Params, Querystring> & SessionRequest;

export async function securify() {
    // Generate RSA key pair at startup
    const { publicKey, privateKey, secret } = getKeys('keys.json');

    const fastify = Fastify();

    await fastify.register(fastifyCookie);
    await fastify.register(fastifySession, {
        secret, // Change this to a secure key
        cookie: {
            secure: false, // Set to true in production with HTTPS
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
        saveUninitialized: false
    }); // expiration: 3 jours

    fastify.register(fastifyWebsocket);
    
    // Track connected WebSockets directly
    const clients: WebSocket[] = [];
    
    await fastify.register(async function (fastify) {
        // WebSocket endpoint
        fastify.get<{ Params: {  } }>('/_internal/relog', { websocket: true }, (socket, req) => {
            // Add to the clients list
            clients.push(socket);
            socket.on('close', () => {
                const index = clients.indexOf(socket);
                if (index !== -1) {
                    clients.splice(index, 1);
                }
            });
        });
    });

    return {
        getFastify: () => fastify,
        keyRoute: (route: string) => fastify.get(route, async () => ({ publicKey })),
        keyExchange: (route: string) => keyExchange(fastify, route, privateKey),
        close: () => fastify.close(),
        get: <Params = {}, Querystring = {}>(route: string, handler: (request: GetRequest<Params, Querystring>) => Promise<unknown>) => {
            fastify.get<{ Params: Params, Querystring: Querystring }>(route, async (req, rep) => await handler({
                params: req.params as Params,
                query: req.query as Querystring,
                reply: (code: number, data: unknown) => rep.status(code).send(data),
            }));
        },
        head: <Params = {}, Querystring = {}>(route: string, handler: (request: HeadRequest<Params, Querystring>) => Promise<unknown>) => {
            fastify.head<{ Params: Params, Querystring: Querystring }>(route, async (req, rep) => await handler({
                params: req.params as Params,
                query: req.query as Querystring,
                reply: (code: number, data: unknown) => rep.status(code).send(data),
            }));
        },
        post: <Body = {}, Params = {}, Querystring = {}>(route: string, handler: (request: PostRequest<Body, Params, Querystring>) => Promise<unknown>) => {
            fastify.post<{ Body: Body, Params: Params, Querystring: Querystring }>(route, async (req, rep) => await handler({
                params: req.params as Params,
                query: req.query as Querystring,
                body: req.body as Body,
                reply: (code: number, data: unknown) => rep.status(code).send(data),
            }));
        },
        put: <Body = {}, Params = {}>(route: string, handler: (request: PutRequest<Body, Params>) => Promise<unknown>) => {
            fastify.put<{ Body: Body, Params: Params }>(route, async (req, rep) => await handler({
                params: req.params as Params,
                body: req.body as Body,
                reply: (code: number, data: unknown) => rep.status(code).send(data),
            }));
        },
        delete: <Params = {}, Querystring = {}>(route: string, handler: (request: DeleteRequest<Params, Querystring>) => Promise<unknown>) => {
            fastify.delete<{ Params: Params, Querystring: Querystring }>(route, async (req, rep) => await handler({
                params: req.params as Params,
                query: req.query as Querystring,
                reply: (code: number, data: unknown) => rep.status(code).send(data),
            }));
        },
        patch: <Body = {}, Params = {}>(route: string, handler: (request: PatchRequest<Body, Params>) => Promise<unknown>) => {
            fastify.patch<{ Body: Body, Params: Params }>(route, async (req, rep) => await handler({
                params: req.params as Params,
                body: req.body as Body,
                reply: (code: number, data: unknown) => rep.status(code).send(data),
            }));
        },
        secureGet: <Params = {}, Querystring = {}>(route: string, handler: (request: SecureGetRequest<Params, Querystring>) => Promise<unknown>) => {
            fastify.get(route, async (req, rep) => await handler({
                params: req.params as Params,
                query: req.query as Querystring,
                session: req.session,
                reply: (code: number, data: unknown) => send(rep, Buffer.from(req.session.aesKey, 'base64'), data, code),
            }));
        },
        securePost: <Body = {}, Params = {}, Querystring = {}>(route: string, handler: (request: SecurePostRequest<Body, Params, Querystring>) => Promise<unknown>) => {
            post<Body>(fastify, route, async (body, req, rep) => await handler({
                params: req.params as Params,
                query: req.query as Querystring,
                body,
                session: req.session,
                reply: (code: number, data: unknown) => send(rep, Buffer.from(req.session.aesKey, 'base64'), data, code),
            }));
        },
        socketLiveWatch: (options: { location: string, templateLocation: string, prefix?: string, }) => {
            const watcher = chokidar.watch([options.location, options.templateLocation]);
            watcher.on('change', (file) => {
                if(file === options.templateLocation) {
                    clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send("*");
                        }
                    });
                } else {
                    const prefix = patchPrefix(options.prefix ?? "");
                    const currentPath = path.join(prefix, path.relative(options.location, file)).replaceAll("\\", "/");
                    const metaFile = loadMetadata<{ hidden: boolean, }>(file, { hidden: false, });
                    if(!metaFile.hidden) {
                        clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(currentPath);
                            }
                        });
                    }
                }
            });
        },
        staticFiles: (options: StaticFileOption) => staticFiles(fastify, options),
        dynamicFiles: (options: DynamicFileOption) => dynamicFiles(fastify, options),
        start: (listenOtps: FastifyListenOptions) => {
            fastify.listen(listenOtps, (err, address) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                console.log(`Server running at ${address}`);
            });
        },
    }
}

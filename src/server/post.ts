import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { decryptBody } from '../security';
import { mapSuccess } from '../functional';

export function post<T>(fastify: FastifyInstance, route: string, callback: (body: T, request: FastifyRequest, reply: FastifyReply) => Promise<unknown>) {
    fastify.post<{ Body: { iv: string; cipher: string; authTag: string } }>(route, async (request, reply) => {
        if (!request.session.aesKey) {
            return reply.status(400).send({ error: 'Session key not established' });
        }
        const aesKey = Buffer.from(request.session.aesKey, 'base64');
        const decryptedResult = decryptBody<Error>(request.body, aesKey);
        if(!decryptedResult.success) {
            console.error('Decryption error:', decryptedResult.error);
            return reply.status(400).send({ error: 'Invalid encrypted data' });
        }
        const body = mapSuccess(decryptedResult, JSON.parse);
        if(!body.success) {
            console.error('Parse error:', body.error);
            return reply.status(400).send({ error: 'Invalid data format' });
        }
        return await callback(body.data, request, reply);
    });
}

import type { FastifyReply } from 'fastify';
import { encryptResponse } from '../security';

export function send<T>(reply: FastifyReply, aesKey: Buffer<ArrayBufferLike>, data: T, code: number) {
    const encryptedResponse = encryptResponse(JSON.stringify(data), aesKey);
    if(!encryptedResponse.success) {
        console.error('Encryption error:', encryptedResponse.error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
    return reply.status(code).send(encryptedResponse.data);
}

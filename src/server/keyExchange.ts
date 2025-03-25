import { constants, privateDecrypt } from "crypto";
import type { FastifyInstance } from "fastify";

export function keyExchange(fastify: FastifyInstance, route: string, privateKey: string) {
    fastify.post<{ Body: { encryptedKey: string } }>(route, async (req, reply) => {
        const { encryptedKey } = req.body;
        const encryptedDatas = Buffer.from(encryptedKey, 'base64');
    
        try {
            const decryptedKey = privateDecrypt({
                key: privateKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            }, encryptedDatas);
            req.session.aesKey = decryptedKey.toString('base64');
            reply.send({ success: true });
        } catch (err) {
            console.error("Decryption error:", err);
            reply.status(500).send({ error: "Decryption failed" });
        }
    });
}

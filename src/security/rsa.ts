import { generateKeyPairSync, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateApiKey } from 'generate-api-key';

export const getKeys = (keypath: string) => {
    // Check if the keys exists...
    const keyPath = path.join(process.env.PWD ?? __dirname, keypath);
    if(fs.existsSync(keyPath)) {
        const content = fs.readFileSync(keyPath, { encoding: "utf-8" });
        const json = JSON.parse(content);
        if(typeof json.publicKey === "string" && typeof json.privateKey === "string") {
            return {
                publicKey: json.publicKey as string,
                privateKey: json.privateKey as string,
                secret: json.secret as string,
            };
        }
        fs.rmSync(keyPath);
    }

    // Generate RSA key pair otherwise
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    const secret = generateApiKey({ method: 'string', length: 32 }) as string;

    const keys = {
        publicKey,
        privateKey,
        secret,
    };

    fs.writeFileSync(keyPath, JSON.stringify(keys))

    return keys;
};

export const encryptData = (plaintext: string, sessionKey: Buffer) => {
    if (!sessionKey) throw new Error('Session key not set');

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', sessionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        iv: iv.toString('base64'),
        cipher: encrypted.toString('base64'),
        authTag: authTag.toString('base64'),
    };
};

export const decryptData = (
    ciphertextBase64: string, 
    ivBase64: string,
    authTagBase64: string,
    sessionKey: Buffer
): string => {
    // Decode the Base64 strings to binary (Buffer)
    const iv = Buffer.from(ivBase64, 'base64');
    const cipherText = Buffer.from(ciphertextBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Ensure the IV length is 12 bytes (AES-GCM standard)
    if (iv.length !== 12) {
        throw new Error('Invalid IV length, must be 12 bytes for AES-GCM');
    }

    // Create the decipher instance using AES-GCM
    const decipher = createDecipheriv('aes-256-gcm', sessionKey, iv);
    decipher.setAuthTag(authTag); // This is required for AES-GCM decryption

    // Decrypt the ciphertext and return the plaintext
    try {
        return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString(); // Assuming the original data is a UTF-8 string
    } catch (err: unknown) {
        throw err;
    }
}

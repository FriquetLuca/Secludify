import { type Result } from "../functional";
import { decryptData, encryptData } from "./rsa";

export { getKeys } from "./rsa";

export function decryptBody<Err = Error>({ iv, cipher, authTag }: { iv: string; cipher: string; authTag: string }, sessionKey: Buffer): Result<string, Err> {
    try {
        return {
            success: true,
            data: decryptData(
                cipher,
                iv,
                authTag,
                sessionKey
            ),
        };
    } catch (err) {
        return {
            success: false,
            error: err as Err
        };
    }
}

export function encryptResponse<Err = Error>(responseText: string, sessionKey: Buffer): Result<{
    iv: string;
    cipher: string;
    authTag: string;
}, Err> {
    try {
        return {
            success: true,
            data: encryptData(responseText, sessionKey),
        }
    } catch (err) {
        return {
            success: false,
            error: err as Err
        }
    }
}

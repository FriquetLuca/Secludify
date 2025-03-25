import { type Result } from "./types";

export function mapSuccess<OldT, Err, NewT, NewErr = Error>(content: Result<OldT, Err>, fn: (data: OldT) => NewT): Result<NewT, NewErr|Err> {
    if(content.success) {
        try {
            return {
                success: true,
                data: fn(content.data),
            };
        } catch(err) {
            return {
                success: false,
                error: err as NewErr,
            };
        }
    } else {
        return content;
    }
}

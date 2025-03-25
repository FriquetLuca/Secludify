export type SuccessResult<DataType> = { success: true, data: DataType };
export type ErrorResult<ErrorType> = { success: false, error: ErrorType };
export type Result<DataType, ErrorType> = SuccessResult<DataType> | ErrorResult<ErrorType>;
export type MaybePromise<T> = T | Promise<T>;
export type ExtractPromise<T> = T extends Promise<infer U> ? U : T;

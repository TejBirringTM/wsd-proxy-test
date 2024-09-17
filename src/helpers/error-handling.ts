import { debug } from "./logging.js";

/**
 * Produce an error to throw. Takes same arguments as logging module's debug(...) function.
 */
export function fatalError(...args: Parameters<typeof debug>) {
    let [msg, ...data] = args;
    msg = `FATAL ERROR: ${msg}`;
    debug(msg, ...data);
    return new Error(msg);
}

/**
 * Given an unknown error argument, returns a human-readable format (string or number) if it can be extracted.
 * 
 * @param error - an error, either caught or returned.
 * @returns 
 */
export function readableError(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === "bigint" || typeof error === "number" || typeof error === "string") {
        return error;
    } else {
        return "<UNKNOWN>";
    }
}
import { WriteStream } from "node:fs";
import config from "../../config.js";
import { fatalError, readableError } from "../../helpers/error-handling.js";
import { debug } from "../../helpers/logging.js";
import { ProxyContext } from "../types.js";

export type RequestHandler = (context: ProxyContext, input: string, outputStream: WriteStream) => Promise<void>;

export const defaultRequestHandler : RequestHandler = async (context: ProxyContext, input: string, outputStream: WriteStream) => {
    const url = `${context.address}/api/data?input=${input}`;
    let nRetries = 0;
    
    async function getResponse() {
        debug(`Request information for: ${input} (from Proxy Worker ${context.id})`);
        // get response
        let response;
        try {
            response = await fetch(url);
        } catch (error) {
            throw fatalError(`Default request handler failed to fetch response: GET ${url}`, {
                error: readableError(error)
            });
        }
        // determine state
        const state = (response.status === 200) ? "OK" : (response.status === 503) ? "RETRY REQUIRED" : "ERROR";
        // if OK: return result
        if (state === "OK") {
            try {
                const information = (await response.json()).information as string;
                debug(`Default request handler received response for input: ${input} ${information}`);
                return {
                    state,
                    information
                } as const;
            } catch {
                throw fatalError("Default request handler failed to parse response.");
            }
        // if ERROR: exit
        } else if (state === "ERROR") {
            throw fatalError("Default request handler received erroneous or unexpected response.");
        // if RETRY REQUIRED: try again, unless MAX_N_RETRIES reached
        } else {
            if (nRetries > config.MAX_N_RETRIES) {
                debug(`Default request handler could not get response for input (# of retries exceeded): ${input}`);
                return {
                    state: "# OF RETRIES EXCEEDED",
                } as const;
            }
            nRetries++;
            return getResponse();
        }
    }
    
    // increment pending requests counter
    context.requests.pending++;

    // recursively fetch response (until # of retries reached)
    const response = await getResponse();

    // if information received, output to file;
    // if # of retries exceeded, skip
    if (response.state === "OK") {
        const content = `${input} ${response.information}`;
        const line = content + "\n";
        outputStream.write(line, (error)=>{
            if (error) {
                debug(`Default request handler failed to write response: ${content}`, {
                    error: readableError(error)
                });
            }
        });
    }

    // decrement pending requests counter
    context.requests.pending--;
};

import { ProxyContext } from "../types";
import { defaultRequestHandler, RequestHandler } from "./request-handler.js";

export abstract class ProxyWorker {
    protected readonly requestHandler;
    readonly context: ProxyContext;
    readonly ownThread: boolean; // indicates if the proxy work is being handled by a separate thread
    
    constructor(context: ProxyContext, ownThread: boolean, requestHandler: RequestHandler = defaultRequestHandler) {
        this.requestHandler = requestHandler;
        this.context = context;
        this.ownThread = ownThread;
    }

    abstract handleInput(input: string): void
    
    abstract cleanUp(): void
}

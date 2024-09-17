import { ProxyContext } from "../types";

export abstract class ProxyWorker {
    readonly context: ProxyContext;
    readonly ownThread: boolean; // indicates if the proxy work is being handled by a separate thread

    constructor(context: ProxyContext, ownThread: boolean) {
        this.context = context;
        this.ownThread = ownThread;
    }

    abstract handleInput(input: string): void
    
    abstract cleanUp(): void
}

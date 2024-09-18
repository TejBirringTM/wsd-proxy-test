import { createWriteStream } from "node:fs";
import { ProxyWorker } from "../index.js";
import { ProxyContext } from "../../types.js";
import { fatalError } from "../../../helpers/error-handling.js";
import config from "../../../config.js";
import { sleep } from "../../../helpers/waiting.js";

export class ConcurrentProxyWorker extends ProxyWorker {
    private readonly outputFilePath;
    private readonly outputFileStream;

    constructor(context: ProxyContext) {
        super(context, false);
        this.outputFilePath = `./tmp/proxy-n-${context.id}.out`;
        this.outputFileStream = createWriteStream(this.outputFilePath, {flags: "w"});
    }

    async handleInput(input: string) {
        const context = this.context;
        const requestHandler = this.requestHandler;
        const outputFileStream = this.outputFileStream;

        setImmediate(async ()=>{
            while(context.requests.pending >= config.MAX_N_CONCURRENT_REQUESTS) {
                await sleep(1);
            }
            await requestHandler(context, input, outputFileStream);
        })
    }

    cleanUp(): void {
        this.outputFileStream.close((err)=>{
            if (err) {
                throw fatalError(`Failed to close proxy worker output file: ${this.outputFilePath}`);
            }
        });
    }
}

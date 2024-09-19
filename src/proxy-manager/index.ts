import { debug } from "../helpers/logging.js";
import { readFile } from "node:fs/promises"
import ProxyBalancer, { defaultProxyBalancer } from "./proxy-balancer.js";
import { ProxyContext } from "./types.js";
import { ProxyWorker } from "./proxy-worker/index.js";
import { ConcurrentProxyWorker } from "./proxy-worker/single-threaded/index.js";
import { fatalError } from "../helpers/error-handling.js";
import { defaultRequestHandler, RequestHandler } from "./proxy-worker/request-handler.js";

export type ProxyManagerMode = "concurrent" | "parallel";
export type WithProxyFunction = (proxyWorker: ProxyWorker)=>void;
export type WithProxyAsyncFunction = (proxyWorker: ProxyWorker)=>Promise<void>;

/**
 * Manages a list of proxies
 */
export default class ProxyManager {
    private readonly proxies;
    private readonly nProxies;
    private readonly proxyBalancer;

    constructor(proxyAddresses: string[], proxyBalancer: ProxyBalancer = defaultProxyBalancer, requestHandler: RequestHandler = defaultRequestHandler, mode: ProxyManagerMode = "concurrent") {
        // set proxy balancer algorithm
        this.proxyBalancer = proxyBalancer;

        // initialise context for each proxy
        this.proxies = new Map<string, ProxyWorker>();
        this.nProxies = proxyAddresses.length;

        let _proxyId = 0;
        proxyAddresses.forEach((proxyAddress)=>{
            // create proxy context 
            const proxyContext = {
                id: _proxyId,
                address: proxyAddress,
                requests: {
                    pending: 0
                }
            } satisfies ProxyContext;
            if (mode === "concurrent") {
                this.proxies.set(proxyAddress, new ConcurrentProxyWorker(proxyContext, requestHandler));
            } else {
                throw fatalError("Proxy Manager does not implement parallel mode yet.")
            }
            _proxyId++;
        });

        debug(`Proxy Balancer initialised with ${this.nProxies} proxies.`)
    }

    /**
     * Get the best proxy to send a request to - as determined by the proxy balancer algorithm
     */
    getProxy() {
        return this.proxyBalancer.getProxy(this.proxies);
    }

    /**
     * Execute a function for every proxy as the argument
     */
    forAllProxies(fn: WithProxyFunction) {
        this.proxies.forEach((proxy)=>fn(proxy));
    }

    /**
     * Execute an asynchronous function for every proxy as the argument.
     * Promise resolves when function has executed (resolved or rejected) for every proxy.
     */    
    async forAllProxiesAsync(fn: WithProxyAsyncFunction) {
        return await Promise.allSettled([...this.proxies.values()].map((proxy)=>fn(proxy)));
    }

    get numberOfProxies() {
        return this.nProxies;
    }

    get proxyAddresses() {
        return [...this.proxies.values()];
    }
}

export async function createProxyManagerFromFile(proxiesFilePath: string) {
    // parse file for proxy addresses
    const fileContent = (await readFile(proxiesFilePath)).toString();
    const proxyAddresses = fileContent.split("\n").filter((line)=>line.length > 0);
    // create proxy manager for the read proxy addresses
    return new ProxyManager(proxyAddresses);
}

import { debug } from "../helpers/logging.js";
import { readFile } from "node:fs/promises"
import { defaultProxyBalancerAlgorithm, ProxyBalancerAlgorithm } from "./proxy-balancer.js";
import { ProxyContext } from "./types.js";
import { ProxyWorker } from "./proxy-worker/index.js";
import { ConcurrentProxyWorker } from "./proxy-worker/single-threaded/index.js";

export type ProxyManagerMode = "concurrent" | "parallel";
export type WithProxyFunction = (proxyWorker: ProxyWorker)=>void;
export type WithProxyAsyncFunction = (proxyWorker: ProxyWorker)=>Promise<void>;

/**
 * Manages a list of proxies
 */
export default class ProxyManager {
    private readonly proxies;
    private readonly nProxies;
    private readonly proxyBalancerAlgorithm;

    constructor(proxyAddresses: string[], proxyBalancerAlgorithm: ProxyBalancerAlgorithm = defaultProxyBalancerAlgorithm, mode: ProxyManagerMode = "concurrent") {
        // set proxy balancer algorithm
        this.proxyBalancerAlgorithm = proxyBalancerAlgorithm;

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
            this.proxies.set(proxyAddress, new ConcurrentProxyWorker(proxyContext));
            _proxyId++;
        });

        debug(`Proxy Balancer initialised with ${this.nProxies} proxies.`)
    }

    /**
     * Get the best proxy to send a request to - as determined by the proxy balancer algorithm
     */
    getProxy() {
        return this.proxyBalancerAlgorithm(this.proxies);
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
}

export async function createProxyManagerFromFile(proxiesFilePath: string) {
    // parse file for proxy addresses
    const fileContent = (await readFile(proxiesFilePath)).toString();
    const proxyAddresses = fileContent.split("\n").filter((line)=>line.length > 0);
    // create proxy manager for the read proxy addresses
    return new ProxyManager(proxyAddresses);
}

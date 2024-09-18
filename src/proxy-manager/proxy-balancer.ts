import { fatalError } from "../helpers/error-handling.js";
import { ProxyWorker } from "./proxy-worker/index.js";

export type ProxyBalancerAlgorithm = (proxies: Map<string, ProxyWorker>) => ProxyWorker;

export default class ProxyBalancer {
    private readonly algorithm;
    constructor(algorithm: ProxyBalancerAlgorithm) {
        this.algorithm = algorithm;
    }
    getProxy(proxies: Map<string, ProxyWorker>) {
        return this.algorithm(proxies);
    }
}

const defaultProxyBalancerAlgorithm : ProxyBalancerAlgorithm = (proxies) => {
    // iterate over and select the proxy with the minimum number of *pending* requests;
    // queued requests don't matter because we are only concerned with allocating work to the fastest proxies first
    // (engineered bias towards higher-performance proxies to maximise data throughput)
    let nQueuedRequestsMin = Infinity;
    let selectedProxy : ProxyWorker | undefined = undefined;

    for (const proxy of proxies.values()) {
        if (proxy.context.requests.pending < nQueuedRequestsMin) {
            selectedProxy = proxy;
            nQueuedRequestsMin = proxy.context.requests.pending;
        }
    }

    if (selectedProxy === undefined) {
        throw fatalError("Default proxy balancer algorithm failed to get proxy.");
    } else {
        return selectedProxy;
    }
}

export const defaultProxyBalancer = new ProxyBalancer(defaultProxyBalancerAlgorithm);
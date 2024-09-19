import { killProxies, startProxies } from "./helpers/input-files/proxies-input-file";
import randomiser from "./helpers/randomiser";
import ProxyManager from "./../src/proxy-manager"
import { readFile } from "fs/promises";

let proxies : string[];

beforeAll(async ()=>{
    // kill any existing proxy containers
    await killProxies();
    // start new proxy containers
    const n = randomiser.integer({min: 1, max: 20});
    await startProxies(n);
    // load file
    const proxiesFileContent = await readFile("proxies.txt", {encoding: "utf-8"});
    proxies = proxiesFileContent.split("\n").filter((val)=>!!val);
});

afterAll(async ()=>{
    await killProxies();
});

test('Instantiate a Proxy Manager with a list of proxy addresses.', () => { 
    const proxyManager = new ProxyManager(proxies);
    expect(proxyManager.numberOfProxies).toBe(proxies.length);
    let index = 0;
    proxyManager.forAllProxies((proxy)=>{
        expect(proxy.context.address).toBe(proxies[index]);
        index++;
    })
});

test('Ensure Default Proxy Balancer chooses the proxy with the minimum number of pending requests.', () => { 
    const proxyManager = new ProxyManager(proxies);
    // manually set the number of pending requests for each proxy
    let index = 0;
    let min = Infinity;
    function generateRandomNumberOfPendingRequests() {
        const num = randomiser.integer({min: 0, max: 1_000_000});
        if (num < min) {
            min = num;
        }
        return num;
    }
    proxyManager.forAllProxies((proxy)=>{
        proxy.context.requests.pending = generateRandomNumberOfPendingRequests();
        index++;
    });
    // ensure the proxy returned by the Default Proxy Balancer is the one with the minimum # of requests
    const proxy = proxyManager.getProxy();
    expect(proxy.context.requests.pending).toBe(min);
});




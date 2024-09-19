import { execFile } from "node:child_process";

export function startProxies(nProxies: number) {
    return new Promise<void>((resolve, reject)=>{
        execFile("./scripts/start-proxies.sh", [nProxies.toString()], (error, stdout, stderr)=>{
            if (error) {
                console.error(error);
                reject(error)
            } else {
                resolve();
            }
        });
    });
}

export async function killProxies() {
    return new Promise<void>((resolve, reject)=>{
        execFile("./scripts/kill-proxies.sh", (error, stdout, stderr)=>{
            if (error) {
                console.error(error);
                reject(error)
            } else {
                resolve();
            }
        });
    });
}

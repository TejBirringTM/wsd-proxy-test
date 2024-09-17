/**
 * Add a promise to the microtask queue which will resolve when the # of milliseconds have expired.
 * 
 * @param ms - the number of milliseconds to wait
 * @returns 
 */
export async function sleep(ms: number) {
    return new Promise<void>((resolve)=>{
        setTimeout(resolve, ms);
    });
}

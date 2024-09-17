export interface ProxyContext {
    id: number,
    address: string,
    requests: {
        pending: number
    }
};

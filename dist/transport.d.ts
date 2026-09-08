export interface JsonRequest {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
}
export type RequestJson = (url: string, options?: JsonRequest) => Promise<unknown>;
export declare function createTransport(fetcher?: typeof fetch, timeoutMs?: number, maxBytes?: number): RequestJson;

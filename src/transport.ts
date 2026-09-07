import { UsageError } from './errors.js';

export interface JsonRequest {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}
export type RequestJson = (url: string, options?: JsonRequest) => Promise<unknown>;

export function createTransport(fetcher: typeof fetch = fetch, timeoutMs = 8_000, maxBytes = 1_048_576): RequestJson {
  return async (url, options = {}) => {
    if (new URL(url).protocol !== 'https:') throw new UsageError('provider_error');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
    try {
      const response = await fetcher(url, {
        method: options.method ?? 'GET',
        headers: { Accept: 'application/json', 'User-Agent': 'asu/0.1.0',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        redirect: 'error', signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new UsageError(response.status === 401 || response.status === 403 ? 'unauthorized'
          : response.status === 429 ? 'rate_limited' : 'http_error');
      }
      if (!response.body) throw new UsageError('invalid_response');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { await reader.cancel(); throw new UsageError('invalid_response'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
      catch { throw new UsageError('invalid_response'); }
    } catch (error) {
      if (signal.aborted) throw new UsageError('timeout');
      if (error instanceof UsageError) throw error;
      throw new UsageError('http_error');
    } finally { clearTimeout(timer); }
  };
}

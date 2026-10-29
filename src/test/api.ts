import { vi } from 'vitest';

export interface MockResponse {
  status?: number;
  body?: unknown;
}

type Handler = MockResponse | ((request: { body: unknown; url: URL }) => MockResponse);

export interface RecordedCall {
  method: string;
  path: string;
  /** Parâmetros da URL sem o "?" (ex.: "status=COMPLETED"). */
  query?: string;
  body: unknown;
}

/**
 * Substitui o fetch por respostas fixas, indexadas por "MÉTODO /api/caminho".
 * Devolve as chamadas feitas para o teste conferir o que foi enviado.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: RecordedCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: url.pathname, ...(url.search && { query: url.search.slice(1) }), body });
    const handler = handlers[`${method} ${url.pathname}`];
    if (!handler) {
      return new Response(JSON.stringify({ code: 'NOT_MOCKED', message: `${method} ${url.pathname}` }), { status: 500 });
    }
    const { status = 200, body: responseBody } = typeof handler === 'function' ? handler({ body, url }) : handler;
    return new Response(responseBody === undefined ? null : JSON.stringify(responseBody), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

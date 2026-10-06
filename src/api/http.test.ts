import { sessionStore } from '@/auth/session';
import { fakeToken } from '@/test/jwt';
import { ApiError, http } from './http';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('http', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStore.clear();
  });

  it('envia o token e repete parâmetros de lista', async () => {
    const token = fakeToken('MANAGER');
    sessionStore.start(token, 'manager.dev');
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await http.get('/stock-items', { query: { type: ['PART', 'SUPPLY'], search: '', active: true } });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/stock-items?type=PART&type=SUPPLY&active=true');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
  });

  it('converte o erro do backend em ApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { code: 'USERNAME_ALREADY_EXISTS', message: 'Já existe' }));
    await expect(http.post('/auth/users', {})).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
      message: 'Já existe',
    });
  });

  it('encerra a sessão quando o backend responde 401', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(http.get('/customers')).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.get()).toBeNull();
  });
});

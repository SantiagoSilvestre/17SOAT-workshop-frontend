import { screen } from '@testing-library/react';
import { sessionStore } from '@/auth/session';
import { mockApi } from '@/test/api';
import { fakeToken } from '@/test/jwt';
import { renderApp } from '@/test/render';

describe('aviso de sessão perto de expirar', () => {
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('avisa quando faltam poucos minutos', async () => {
    sessionStore.start(fakeToken('ADMIN', { expiresInSeconds: 120 }), 'admin');
    mockApi({});
    renderApp('/');
    expect(await screen.findByText('Sua sessão está perto de expirar')).toBeInTheDocument();
  });

  it('não avisa no começo da sessão', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    mockApi({});
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Olá, admin' })).toBeInTheDocument();
    expect(screen.queryByText('Sua sessão está perto de expirar')).not.toBeInTheDocument();
  });
});

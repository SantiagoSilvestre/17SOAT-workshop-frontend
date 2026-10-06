import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionStore } from '@/auth/session';
import { fakeToken } from '@/test/jwt';
import { renderApp } from '@/test/render';

describe('rotas protegidas', () => {
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('manda para o login quem não está autenticado', async () => {
    const { router } = renderApp('/clientes');
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('bloqueia módulos fora do papel do usuário', async () => {
    sessionStore.start(fakeToken('CUSTOMER'), 'customer.dev');
    const { router } = renderApp('/clientes');
    expect(await screen.findByText('Acesso negado')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/acesso-negado');
  });

  it('mostra no menu só os módulos do papel', async () => {
    sessionStore.start(fakeToken('TECHNICIAN'), 'technician.dev');
    renderApp('/');
    const nav = await screen.findByRole('navigation');
    expect(nav).toHaveTextContent('Ordens de serviço');
    expect(nav).not.toHaveTextContent('Clientes');
    expect(nav).not.toHaveTextContent('Usuários');
  });

  it('faz login e volta para a página pedida', async () => {
    const token = fakeToken('MANAGER');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token, role: 'MANAGER', expiresAt: new Date().toISOString() }), { status: 200 }),
      ),
    );
    const { router } = renderApp('/clientes');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Usuário'), 'manager.dev');
    await user.type(screen.getByLabelText('Senha'), 'changeme123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/clientes'));
    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
  });

  it('mostra erro com credenciais inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }), { status: 401 }),
      ),
    );
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Usuário'), 'admin');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos.');
  });
});

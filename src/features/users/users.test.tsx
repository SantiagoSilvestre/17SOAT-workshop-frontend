import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '@/api/customers';
import type { Technician } from '@/api/technicians';
import { sessionStore } from '@/auth/session';
import { mockApi, type RecordedCall } from '@/test/api';
import { fakeToken } from '@/test/jwt';
import { renderApp } from '@/test/render';

const maria: Customer = {
  id: 'c0000000-0000-4000-8000-000000000001',
  name: 'Maria Souza',
  document: '52998224725',
  contactInfo: { email: 'maria@example.com', phone: '+5511912345678', address: null },
  active: true,
};
const joao: Technician = { id: 't0000000-0000-4000-8000-000000000001', name: 'João Lima', specialties: ['MECHANICAL'], status: 'AVAILABLE' };

const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

const lists = {
  'GET /api/customers': { body: [maria] },
  'GET /api/technicians': { body: [joao] },
};

describe('usuários', () => {
  beforeEach(() => sessionStore.start(fakeToken('ADMIN'), 'admin'));
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('cria conta de gerente sem vínculo', async () => {
    const { calls } = mockApi({
      ...lists,
      'POST /api/auth/users': { status: 201, body: { id: 'u1', username: 'gerente2', role: 'MANAGER', linkedDomainId: null } },
    });
    renderApp('/usuarios');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Papel' }));
    await user.click(await screen.findByRole('option', { name: 'Gerente', hidden: true }));
    expect(screen.queryByRole('combobox', { name: 'Técnico' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Usuário'), 'gerente2');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.type(screen.getByLabelText('Confirmar senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Conta gerente2 criada.')).toBeInTheDocument();
    expect(writes(calls)[0]?.body).toEqual({ username: 'gerente2', password: 'segredo123', role: 'MANAGER' });
    expect(screen.getByLabelText('Usuário')).toHaveValue('');
  });

  it('vem do técnico com papel e vínculo escolhidos e exige senhas iguais', async () => {
    const { calls } = mockApi({
      ...lists,
      'POST /api/auth/users': { status: 201, body: { id: 'u2', username: 'joao', role: 'TECHNICIAN', linkedDomainId: joao.id } },
    });
    renderApp(`/usuarios?papel=TECHNICIAN&vinculo=${joao.id}`);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Técnico' })).toHaveValue('João Lima'));
    await user.type(screen.getByLabelText('Usuário'), 'joao');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.type(screen.getByLabelText('Confirmar senha'), 'outra');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('As senhas não conferem')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);

    await user.clear(screen.getByLabelText('Confirmar senha'));
    await user.type(screen.getByLabelText('Confirmar senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Vinculada a: João Lima')).toBeInTheDocument();
    expect(writes(calls)[0]?.body).toEqual({
      username: 'joao',
      password: 'segredo123',
      role: 'TECHNICIAN',
      linkedDomainId: joao.id,
    });
  });

  it('exige o cliente para conta de cliente e mostra usuário repetido no campo', async () => {
    mockApi({
      ...lists,
      'POST /api/auth/users': { status: 409, body: { code: 'USERNAME_ALREADY_EXISTS', message: 'Username already exists' } },
    });
    renderApp('/usuarios?papel=CUSTOMER');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Usuário'), 'maria');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.type(screen.getByLabelText('Confirmar senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Escolha o cliente')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Cliente' }));
    await user.click(await screen.findByRole('option', { name: /Maria Souza/, hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Este usuário já existe.')).toBeInTheDocument();
  });

  it('gerente não acessa a tela de usuários', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    mockApi(lists);
    renderApp('/usuarios');
    expect(await screen.findByText(/Acesso negado/)).toBeInTheDocument();
  });
});

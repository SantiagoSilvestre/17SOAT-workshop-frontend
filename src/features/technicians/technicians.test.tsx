import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Technician } from '@/api/technicians';
import { sessionStore } from '@/auth/session';
import { mockApi, type RecordedCall } from '@/test/api';
import { fakeToken } from '@/test/jwt';
import { renderApp } from '@/test/render';

const joao: Technician = {
  id: 't0000000-0000-4000-8000-000000000001',
  name: 'João Lima',
  specialties: ['MECHANICAL', 'DIAGNOSTICS'],
  status: 'AVAILABLE',
};
const ana: Technician = { id: 't0000000-0000-4000-8000-000000000002', name: 'Ana Reis', specialties: ['PAINTING'], status: 'BUSY' };
const carlos: Technician = {
  id: 't0000000-0000-4000-8000-000000000003',
  name: 'Carlos Melo',
  specialties: ['ELECTRICAL'],
  status: 'INACTIVE',
};

const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

describe('técnicos', () => {
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('lista os ativos com especialidades e situação em português; inativos só sob demanda', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    mockApi({ 'GET /api/technicians': { body: [joao, ana, carlos] } });
    renderApp('/tecnicos');
    const user = userEvent.setup();

    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('Mecânica');
    expect(table).toHaveTextContent('Diagnóstico');
    expect(table).toHaveTextContent('Disponível');
    expect(table).toHaveTextContent('Ocupado');
    expect(table).not.toHaveTextContent('Carlos Melo');
    // Só o administrador vê o atalho para criar acesso.
    expect(screen.queryByRole('link', { name: /Criar acesso/ })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Mostrar inativos'));
    expect(screen.getByRole('table')).toHaveTextContent('Carlos Melo');
    expect(screen.queryByRole('button', { name: 'Mudar situação de Carlos Melo' })).not.toBeInTheDocument();
  });

  it('cadastra com ao menos uma especialidade', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({
      'GET /api/technicians': { body: [] },
      'POST /api/technicians': ({ body }) => ({ status: 201, body: { id: 'novo', status: 'AVAILABLE', ...(body as object) } }),
    });
    renderApp('/tecnicos');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Novo técnico' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nome'), 'João Lima');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));
    expect(await within(dialog).findByText('Escolha ao menos uma especialidade')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);

    await user.click(within(dialog).getByLabelText('Mecânica'));
    await user.click(within(dialog).getByLabelText('Elétrica'));
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(writes(calls)[0]?.body).toEqual({ name: 'João Lima', specialties: ['MECHANICAL', 'ELECTRICAL'] }),
    );
  });

  it('renomeia sem mexer nas especialidades', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({
      'GET /api/technicians': { body: [joao] },
      [`PATCH /api/technicians/${joao.id}`]: { body: { ...joao, name: 'João P. Lima' } },
    });
    renderApp('/tecnicos');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Renomear João Lima' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('Especialidades')).not.toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('Nome'));
    await user.type(within(dialog).getByLabelText('Nome'), 'João P. Lima');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(writes(calls)).toEqual([
      { method: 'PATCH', path: `/api/technicians/${joao.id}`, body: { name: 'João P. Lima' } },
    ]));
  });

  it('muda a situação e pede confirmação para desativar', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    const { calls } = mockApi({
      'GET /api/technicians': { body: [joao] },
      [`PATCH /api/technicians/${joao.id}/status`]: ({ body }) => ({ body: { ...joao, ...(body as object) } }),
    });
    renderApp('/tecnicos');
    const user = userEvent.setup();

    expect(await screen.findByRole('link', { name: 'Criar acesso para João Lima' })).toHaveAttribute(
      'href',
      `/usuarios?papel=TECHNICIAN&vinculo=${joao.id}`,
    );

    await user.click(screen.getByRole('button', { name: 'Mudar situação de João Lima' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Marcar como ocupado', hidden: true }));
    await waitFor(() => expect(writes(calls)[0]?.body).toEqual({ status: 'BUSY' }));

    await user.click(screen.getByRole('button', { name: 'Mudar situação de João Lima' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Desativar', hidden: true }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('não permite reativar');
    await user.click(within(dialog).getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(writes(calls)[1]?.body).toEqual({ status: 'INACTIVE' }));
  });
});

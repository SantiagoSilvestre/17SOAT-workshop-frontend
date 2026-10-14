import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '@/api/customers';
import { mockApi, type RecordedCall } from '@/test/api';
import { sessionStore } from '@/auth/session';
import { fakeToken } from '@/test/jwt';
import { renderApp } from '@/test/render';

const maria: Customer = {
  id: 'c0000000-0000-4000-8000-000000000001',
  name: 'Maria Souza',
  document: '52998224725',
  contactInfo: {
    email: 'maria@example.com',
    phone: '+5511912345678',
    address: {
      street: 'Av. Paulista',
      number: '1000',
      complement: 'ap 12',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310100',
    },
  },
  active: true,
};

const oficinaLtda: Customer = {
  id: 'c0000000-0000-4000-8000-000000000002',
  name: 'Auto Peças Ltda',
  document: '11222333000181',
  contactInfo: { email: 'contato@autopecas.com', phone: '+551132654321', address: null },
  active: true,
};

const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

describe('clientes', () => {
  beforeEach(() => sessionStore.start(fakeToken('MANAGER'), 'manager.dev'));
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('lista com documento e telefone formatados e busca pelo CPF com máscara', async () => {
    mockApi({ 'GET /api/customers': { body: [maria, oficinaLtda] } });
    renderApp('/clientes');
    const user = userEvent.setup();

    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('529.982.247-25');
    expect(table).toHaveTextContent('11.222.333/0001-81');
    expect(table).toHaveTextContent('(11) 91234-5678');
    expect(table).toHaveTextContent('São Paulo/SP');

    await user.type(screen.getByLabelText('Buscar por nome, CPF/CNPJ ou e-mail'), '529.982');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('table')).toHaveTextContent('Maria Souza');
  });

  it('cadastra cliente com endereço e abre o detalhe', async () => {
    const { calls } = mockApi({
      'GET /api/customers': { body: [] },
      'GET /api/customers/identify': { status: 404, body: { code: 'CUSTOMER_NOT_FOUND', message: 'não encontrado' } },
      'POST /api/customers': { status: 201, body: maria },
      [`GET /api/customers/${maria.id}`]: { body: maria },
    });
    const { router } = renderApp('/clientes/novo');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Nome'), 'Maria Souza');
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '52998224725');
    await user.type(screen.getByLabelText('E-mail'), 'maria@example.com');
    await user.type(screen.getByLabelText('Telefone'), '11912345678');
    await user.click(screen.getByLabelText('Informar endereço'));
    await user.type(screen.getByLabelText('CEP'), '01310100');
    await user.type(screen.getByLabelText('Logradouro'), 'Av. Paulista');
    await user.type(screen.getByLabelText('Número'), '1000');
    await user.type(screen.getByLabelText('Cidade'), 'São Paulo');
    await user.type(screen.getByRole('combobox', { name: 'UF' }), 'SP');
    await user.click(await screen.findByRole('option', { name: 'SP', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/clientes/${maria.id}`));
    expect(writes(calls)[0]?.body).toEqual({
      name: 'Maria Souza',
      document: '52998224725',
      contactInfo: {
        email: 'maria@example.com',
        phone: '11912345678',
        address: {
          street: 'Av. Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP',
          postalCode: '01310100',
        },
      },
    });
    expect(await screen.findByRole('heading', { name: 'Maria Souza' })).toBeInTheDocument();
  });

  it('valida CPF, telefone e endereço antes de enviar', async () => {
    const { calls } = mockApi({});
    renderApp('/clientes/novo');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Nome'), 'João');
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '52998224724');
    await user.type(screen.getByLabelText('E-mail'), 'joao@');
    await user.type(screen.getByLabelText('Telefone'), '9123');
    await user.click(screen.getByLabelText('Informar endereço'));
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('CPF ou CNPJ inválido')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
    expect(screen.getByText('Informe o DDD e o número (10 ou 11 dígitos)')).toBeInTheDocument();
    expect(screen.getByText('Informe os 8 dígitos do CEP')).toBeInTheDocument();
    expect(screen.getByText('Escolha a UF')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);
  });

  it('avisa quando o CPF já pertence a um cliente', async () => {
    mockApi({ 'GET /api/customers/identify': { body: maria } });
    renderApp('/clientes/novo');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('CPF ou CNPJ'), '52998224725');
    await user.tab();

    expect(await screen.findByText(/Este CPF\/CNPJ já pertence a/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Maria Souza' })).toHaveAttribute('href', `/clientes/${maria.id}`);
  });

  it('mostra no campo quando o documento já está cadastrado', async () => {
    mockApi({
      'GET /api/customers/identify': { status: 404, body: { code: 'CUSTOMER_NOT_FOUND', message: '' } },
      'POST /api/customers': {
        status: 409,
        body: { code: 'CUSTOMER_TAX_ID_ALREADY_EXISTS', message: 'Já existe' },
      },
    });
    renderApp('/clientes/novo');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Nome'), 'Outra Maria');
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '52998224725');
    await user.type(screen.getByLabelText('E-mail'), 'outra@example.com');
    await user.type(screen.getByLabelText('Telefone'), '11912345678');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Já existe um cliente com este CPF/CNPJ.')).toBeInTheDocument();
  });

  it('edita o contato enviando só o que mudou', async () => {
    const { calls } = mockApi({
      [`GET /api/customers/${maria.id}`]: { body: maria },
      [`PATCH /api/customers/${maria.id}/contact-info`]: { body: maria },
    });
    renderApp(`/clientes/${maria.id}`);
    const user = userEvent.setup();

    expect(await screen.findByText('CPF 529.982.247-25')).toBeInTheDocument();
    expect(screen.getByText('Av. Paulista, 1000, ap 12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Editar contato' }));
    const dialog = await screen.findByRole('dialog');
    // Endereço já salvo não pode ser removido pela API: não há opção de desmarcar.
    expect(within(dialog).queryByLabelText('Informar endereço')).not.toBeInTheDocument();
    const phone = within(dialog).getByLabelText('Telefone');
    expect(phone).toHaveValue('(11) 91234-5678');
    await user.clear(phone);
    await user.type(phone, '11988887777');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Contato atualizado.')).toBeInTheDocument();
    expect(writes(calls)).toEqual([
      {
        method: 'PATCH',
        path: `/api/customers/${maria.id}/contact-info`,
        body: { contactInfo: { phone: '11988887777' } },
      },
    ]);
  });

  it('renomeia pelo detalhe', async () => {
    const { calls } = mockApi({
      [`GET /api/customers/${maria.id}`]: { body: maria },
      [`PATCH /api/customers/${maria.id}`]: { body: { ...maria, name: 'Maria S. Lima' } },
    });
    renderApp(`/clientes/${maria.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Renomear' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Nome'));
    await user.type(within(dialog).getByLabelText('Nome'), 'Maria S. Lima');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Nome atualizado.')).toBeInTheDocument();
    expect(writes(calls)[0]?.body).toEqual({ name: 'Maria S. Lima' });
  });

  it('cliente arquivado fica só para consulta', async () => {
    mockApi({ [`GET /api/customers/${maria.id}`]: { body: { ...maria, active: false } } });
    renderApp(`/clientes/${maria.id}`);

    expect(await screen.findByText('Arquivado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renomear' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar contato' })).not.toBeInTheDocument();
  });

  it('arquiva pela lista depois de confirmar', async () => {
    const { calls } = mockApi({
      'GET /api/customers': { body: [maria] },
      [`DELETE /api/customers/${maria.id}`]: { status: 204 },
    });
    renderApp('/clientes');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Arquivar Maria Souza' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByText('Maria Souza foi arquivado.')).toBeInTheDocument();
    expect(writes(calls)).toEqual([{ method: 'DELETE', path: `/api/customers/${maria.id}`, body: undefined }]);
  });

  it('cliente inexistente mostra aviso', async () => {
    mockApi({
      'GET /api/customers/nao-existe': { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Requisição inválida' } },
    });
    renderApp('/clientes/nao-existe');
    expect(await screen.findByText('Cliente não encontrado.')).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CatalogService } from '@/api/catalogServices';
import { sessionStore } from '@/auth/session';
import { mockApi } from '@/test/api';
import { fakeToken } from '@/test/jwt';
import { renderApp } from '@/test/render';

const oilChange: CatalogService = {
  id: 'b7c1a6f0-0000-4000-8000-000000000001',
  name: 'Troca de óleo',
  basePrice: { value: 150, currency: 'BRL' },
  active: true,
};
const alignment: CatalogService = {
  id: 'b7c1a6f0-0000-4000-8000-000000000002',
  name: 'Alinhamento',
  basePrice: { value: 89.9, currency: 'BRL' },
  active: true,
};

const table = () => screen.findByRole('table');

describe('catálogo de serviços', () => {
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('lista os serviços em ordem alfabética com o preço em reais', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    mockApi({ 'GET /api/catalog-services': { body: [oilChange, alignment] } });
    renderApp('/catalogo');

    const rows = within(await table()).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Alinhamento');
    expect(rows[0]).toHaveTextContent(/R\$\s89,90/);
    expect(rows[1]).toHaveTextContent('Troca de óleo');
  });

  it('técnico consulta sem poder editar', async () => {
    sessionStore.start(fakeToken('TECHNICIAN'), 'technician.dev');
    mockApi({ 'GET /api/catalog-services': { body: [oilChange] } });
    renderApp('/catalogo');

    expect(await table()).toHaveTextContent('Troca de óleo');
    expect(screen.queryByRole('button', { name: 'Novo serviço' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
  });

  it('cadastra um serviço com o preço no formato da API', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    const { calls } = mockApi({
      'GET /api/catalog-services': { body: [] },
      'POST /api/catalog-services': ({ body }) => ({ status: 201, body: { ...(body as object), id: 'novo', active: true } }),
    });
    renderApp('/catalogo');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nome'), '  Revisão completa ');
    await user.type(within(dialog).getByLabelText('Preço base'), '1234,5');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      name: 'Revisão completa',
      basePrice: { value: 1234.5, currency: 'BRL' },
    });
    expect(await screen.findByText('Serviço cadastrado.')).toBeInTheDocument();
  });

  it('valida os campos antes de enviar', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    const { calls } = mockApi({ 'GET /api/catalog-services': { body: [] } });
    renderApp('/catalogo');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(await within(dialog).findByText('Informe o nome do serviço')).toBeInTheDocument();
    expect(within(dialog).getByText('Informe o preço base')).toBeInTheDocument();
    expect(calls.filter((call) => call.method !== 'GET')).toHaveLength(0);
  });

  it('mostra no campo quando o nome já existe', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    mockApi({
      'GET /api/catalog-services': { body: [oilChange] },
      'POST /api/catalog-services': {
        status: 409,
        body: { code: 'CATALOG_SERVICE_NAME_ALREADY_EXISTS', message: 'Já existe um serviço com esse nome' },
      },
    });
    renderApp('/catalogo');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nome'), 'Troca de óleo');
    await user.type(within(dialog).getByLabelText('Preço base'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(await within(dialog).findByText('Já existe um serviço com este nome.')).toBeInTheDocument();
  });

  it('ao editar só o preço chama apenas a rota de preço base', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({
      'GET /api/catalog-services': { body: [oilChange] },
      [`PATCH /api/catalog-services/${oilChange.id}/base-price`]: ({ body }) => ({
        body: { ...oilChange, ...(body as object) },
      }),
    });
    renderApp('/catalogo');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Editar Troca de óleo' }));
    const dialog = await screen.findByRole('dialog');
    const price = within(dialog).getByLabelText('Preço base');
    await user.clear(price);
    await user.type(price, '175');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Serviço atualizado.')).toBeInTheDocument();
    const writes = calls.filter((call) => call.method !== 'GET');
    expect(writes).toEqual([
      {
        method: 'PATCH',
        path: `/api/catalog-services/${oilChange.id}/base-price`,
        body: { basePrice: { value: 175, currency: 'BRL' } },
      },
    ]);
  });

  it('apagar o preço na edição não volta ao valor anterior', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({ 'GET /api/catalog-services': { body: [oilChange] } });
    renderApp('/catalogo');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Editar Troca de óleo' }));
    const dialog = await screen.findByRole('dialog');
    const price = within(dialog).getByLabelText('Preço base');
    await user.clear(price);
    await user.type(price, '9');
    await user.clear(price);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByText('Informe o preço base')).toBeInTheDocument();
    expect(price).toHaveValue('');
    expect(calls.filter((call) => call.method !== 'GET')).toHaveLength(0);
  });

  it('arquiva depois de confirmar', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    const { calls } = mockApi({
      'GET /api/catalog-services': { body: [oilChange] },
      [`DELETE /api/catalog-services/${oilChange.id}`]: { status: 204 },
    });
    renderApp('/catalogo');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Arquivar Troca de óleo' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByText('"Troca de óleo" foi arquivado.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'DELETE')).toBe(true);
  });
});

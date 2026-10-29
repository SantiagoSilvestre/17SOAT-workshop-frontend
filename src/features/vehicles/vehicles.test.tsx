import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '@/api/customers';
import type { Vehicle } from '@/api/vehicles';
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

const gol: Vehicle = {
  id: 'v0000000-0000-4000-8000-000000000001',
  customerId: maria.id,
  licensePlate: 'ABC1234',
  chassis: null,
  brand: 'Volkswagen',
  model: 'Gol',
  year: 2018,
  color: 'Prata',
  mileage: 42500,
  active: true,
};

const onix: Vehicle = {
  ...gol,
  id: 'v0000000-0000-4000-8000-000000000002',
  customerId: 'c0000000-0000-4000-8000-000000000099',
  licensePlate: 'BRA2E19',
  brand: 'Chevrolet',
  model: 'Onix',
  mileage: null,
};

const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

describe('veículos', () => {
  beforeEach(() => sessionStore.start(fakeToken('MANAGER'), 'manager.dev'));
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('lista com placa formatada, nome do cliente e busca pela placa com hífen', async () => {
    mockApi({ 'GET /api/vehicles': { body: [gol, onix] }, 'GET /api/customers': { body: [maria] } });
    renderApp('/veiculos');
    const user = userEvent.setup();

    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('ABC-1234');
    expect(table).toHaveTextContent('BRA2E19');
    expect(table).toHaveTextContent('42.500 km');
    await waitFor(() => expect(table).toHaveTextContent('Maria Souza'));

    await user.type(screen.getByLabelText('Buscar por placa, modelo ou cliente'), 'abc-12');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('table')).toHaveTextContent('Gol');
  });

  it('cadastra a partir do cliente com placa e chassi normalizados', async () => {
    const created: Vehicle = { ...gol, chassis: '9BWZZZ377VT004251' };
    const { calls } = mockApi({
      'GET /api/customers': { body: [maria] },
      'POST /api/vehicles': { status: 201, body: created },
      [`GET /api/vehicles/${gol.id}`]: { body: created },
      [`GET /api/customers/${maria.id}`]: { body: maria },
    });
    const { router } = renderApp(`/veiculos/novo?cliente=${maria.id}`);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Placa'), 'abc-1234');
    await user.type(screen.getByLabelText('Marca'), 'Volkswagen');
    await user.type(screen.getByLabelText('Modelo'), 'Gol');
    await user.type(screen.getByLabelText('Ano'), '2018');
    await user.type(screen.getByLabelText('Cor'), 'Prata');
    await user.type(screen.getByLabelText('Chassi (opcional)'), '9bwzzz377vt004251');
    await user.type(screen.getByLabelText('Quilometragem atual (opcional)'), '42500');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/veiculos/${gol.id}`));
    expect(writes(calls)[0]?.body).toEqual({
      customerId: maria.id,
      licensePlate: 'ABC1234',
      chassis: '9BWZZZ377VT004251',
      brand: 'Volkswagen',
      model: 'Gol',
      year: 2018,
      color: 'Prata',
      mileage: 42500,
    });
    expect(await screen.findByRole('heading', { name: 'ABC-1234' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Maria Souza' })).toBeInTheDocument();
  });

  it('valida placa e ano antes de enviar e mostra placa duplicada no campo', async () => {
    const { calls } = mockApi({
      'GET /api/customers': { body: [maria] },
      'POST /api/vehicles': {
        status: 409,
        body: { code: 'VEHICLE_LICENSE_PLATE_ALREADY_EXISTS', message: 'Placa já cadastrada' },
      },
    });
    renderApp(`/veiculos/novo?cliente=${maria.id}`);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Placa'), 'AB12');
    await user.type(screen.getByLabelText('Marca'), 'Volkswagen');
    await user.type(screen.getByLabelText('Modelo'), 'Gol');
    await user.type(screen.getByLabelText('Ano'), '1800');
    await user.type(screen.getByLabelText('Cor'), 'Prata');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Use o formato ABC-1234 ou ABC1D23')).toBeInTheDocument();
    expect(screen.getByText('O ano deve ser 1886 ou posterior')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);

    await user.clear(screen.getByLabelText('Placa'));
    await user.type(screen.getByLabelText('Placa'), 'ABC1234');
    await user.clear(screen.getByLabelText('Ano'));
    await user.type(screen.getByLabelText('Ano'), '2018');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Já existe um veículo com esta placa.')).toBeInTheDocument();
  });

  it('não deixa a quilometragem diminuir e registra a nova leitura', async () => {
    const { calls } = mockApi({
      [`GET /api/vehicles/${gol.id}`]: { body: gol },
      [`GET /api/customers/${maria.id}`]: { body: maria },
      [`PATCH /api/vehicles/${gol.id}/mileage`]: ({ body }) => ({
        body: { ...gol, mileage: (body as { mileage: number }).mileage },
      }),
    });
    renderApp(`/veiculos/${gol.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Registrar' }));
    const input = await screen.findByLabelText('Quilometragem');
    await user.clear(input);
    await user.type(input, '40000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe 42.500 km ou mais')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);
    await user.clear(input);
    await user.type(input, '43120');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(writes(calls)[0]?.body).toEqual({ mileage: 43120 }));
  });

  it('edição mantém o chassi quando o campo fica vazio', async () => {
    const withChassis: Vehicle = { ...gol, chassis: '9BWZZZ377VT004251' };
    const { calls } = mockApi({
      [`GET /api/vehicles/${gol.id}`]: { body: withChassis },
      [`GET /api/customers/${maria.id}`]: { body: maria },
      [`PATCH /api/vehicles/${gol.id}`]: { body: { ...withChassis, color: 'Preto' } },
    });
    renderApp(`/veiculos/${gol.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Cor'));
    await user.type(within(dialog).getByLabelText('Cor'), 'Preto');
    await user.clear(within(dialog).getByLabelText(/Chassi/));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(writes(calls)[0]?.body).toEqual({ brand: 'Volkswagen', model: 'Gol', year: 2018, color: 'Preto' }),
    );
  });

  it('detalhe do cliente mostra só os veículos dele', async () => {
    mockApi({
      [`GET /api/customers/${maria.id}`]: { body: maria },
      'GET /api/vehicles': { body: [gol, onix] },
    });
    renderApp(`/clientes/${maria.id}`);

    const table = await screen.findByRole('table', { name: 'Veículos do cliente' });
    expect(table).toHaveTextContent('ABC-1234');
    expect(table).not.toHaveTextContent('BRA2E19');
    expect(screen.getByRole('link', { name: 'Novo veículo' })).toHaveAttribute('href', `/veiculos/novo?cliente=${maria.id}`);
  });
});

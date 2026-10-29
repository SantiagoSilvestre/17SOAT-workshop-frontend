import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CatalogService } from '@/api/catalogServices';
import type { Customer } from '@/api/customers';
import type { ServiceOrder } from '@/api/serviceOrders';
import type { StockItem } from '@/api/stockItems';
import type { Technician } from '@/api/technicians';
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
const joao: Technician = { id: 't0000000-0000-4000-8000-000000000001', name: 'João Lima', specialties: ['MECHANICAL'], status: 'AVAILABLE' };
const oilChange: CatalogService = { id: 's0000000-0000-4000-8000-000000000001', name: 'Troca de óleo', basePrice: { value: 150, currency: 'BRL' }, active: true };
const oil: StockItem = {
  id: 'i0000000-0000-4000-8000-000000000001',
  sku: 'OLEO-5W30',
  name: 'Óleo 5W30',
  type: 'SUPPLY',
  price: { value: 45.5, currency: 'BRL' },
  availableQuantity: 20,
  active: true,
};

const order: ServiceOrder = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  customerId: maria.id,
  vehicleId: gol.id,
  vehicleSnapshot: { licensePlate: 'ABC1234', brand: 'Volkswagen', model: 'Gol', year: 2018 },
  priority: 'URGENT',
  initialAssessment: 'Barulho no motor',
  diagnosisAssigneeId: joao.id,
  statusSnapshot: 'AWAITING_APPROVAL',
  approvedEstimateIds: [],
  executions: [
    {
      id: 'e1',
      diagnosisId: 'd1',
      catalogServiceId: oilChange.id,
      name: 'Troca de óleo',
      price: { value: 150, currency: 'BRL' },
      status: 'PENDING',
      authorizedByEstimateId: null,
      assignedTechnicianId: null,
      diagnosedByTechnicianId: joao.id,
      diagnosedAt: null,
      stockReservationId: null,
      stockRequirements: [
        { stockItemId: oil.id, type: 'SUPPLY', quantity: 4, nameSnapshot: 'Óleo 5W30', priceSnapshot: { value: 45.5, currency: 'BRL' }, reserved: false },
      ],
    },
  ],
};

const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

const registrations = {
  'GET /api/customers': { body: [maria] },
  'GET /api/vehicles': { body: [gol] },
  'GET /api/technicians': { body: [joao] },
  'GET /api/catalog-services': { body: [oilChange] },
  'GET /api/stock-items': { body: [oil] },
};

describe('ordens de serviço', () => {
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('painel mostra situação, prioridade, total e nomes, e filtra pela API', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({ ...registrations, 'GET /api/service-orders': { body: [order] } });
    renderApp('/ordens-de-servico');
    const user = userEvent.setup();

    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('#A1B2C3D4');
    expect(table).toHaveTextContent('ABC-1234');
    expect(table).toHaveTextContent('Aguardando aprovação');
    expect(table).toHaveTextContent('Urgente');
    // 150 + 4 × 45,50
    expect(table).toHaveTextContent('R$ 332,00');
    await waitFor(() => expect(table).toHaveTextContent('Maria Souza'));
    expect(table).toHaveTextContent('João Lima');

    await user.click(screen.getByRole('combobox', { name: 'Situação' }));
    await user.click(await screen.findByRole('option', { name: 'Finalizada', hidden: true }));
    await waitFor(() =>
      expect(calls.some((call) => call.path === '/api/service-orders' && call.query === 'status=COMPLETED')).toBe(true),
    );
  });

  it('técnico vê o painel sem nomes de cliente e sem abrir OS', async () => {
    sessionStore.start(fakeToken('TECHNICIAN'), 'technician.dev');
    const { calls } = mockApi({ 'GET /api/service-orders': { body: [order] } });
    renderApp('/ordens-de-servico');

    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('ABC-1234');
    expect(within(table).queryByText('Cliente')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nova OS' })).not.toBeInTheDocument();
    expect(calls.map((call) => call.path)).toEqual(['/api/service-orders']);
  });

  it('abre OS com cliente e veículo novos, sem serviços', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({
      ...registrations,
      'GET /api/customers/identify': { status: 404, body: { code: 'CUSTOMER_NOT_FOUND', message: 'não encontrado' } },
      'POST /api/service-orders/intake': {
        status: 201,
        body: {
          serviceOrder: { ...order, statusSnapshot: 'RECEIVED', executions: [], vehicleSnapshot: { ...order.vehicleSnapshot, licensePlate: 'BRA2E19' } },
          customer: { id: 'novo-cliente', created: true },
          vehicle: { id: 'novo-veiculo', created: true },
          estimateId: null,
        },
      },
    });
    renderApp('/ordens-de-servico/nova');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('CPF ou CNPJ'), '39053344705');
    await user.tab();
    expect(await screen.findByText('Cliente novo: preencha os dados para cadastrar.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome'), 'Ana Teste');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Telefone'), '11987654321');
    await user.type(screen.getByLabelText('Placa'), 'bra2e19');
    await user.tab();
    expect(await screen.findByText('Veículo novo: preencha os dados para cadastrar.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Marca'), 'Chevrolet');
    await user.type(screen.getByLabelText('Modelo'), 'Onix');
    await user.type(screen.getByLabelText('Ano'), '2022');
    await user.type(screen.getByLabelText('Cor'), 'Branco');
    await user.type(screen.getByLabelText('Avaliação inicial'), 'Revisão dos 30 mil');
    await user.click(screen.getByRole('button', { name: 'Abrir OS' }));

    expect(await screen.findByText(/OS #A1B2C3D4 aberta/)).toBeInTheDocument();
    expect(screen.getByText('Sem serviços: o diagnóstico fica para depois.')).toBeInTheDocument();
    expect(writes(calls)[0]?.body).toEqual({
      customer: { document: '39053344705', name: 'Ana Teste', contactInfo: { email: 'ana@example.com', phone: '11987654321' } },
      vehicle: { licensePlate: 'BRA2E19', brand: 'Chevrolet', model: 'Onix', year: 2022, color: 'Branco' },
      priority: 'NORMAL',
      initialAssessment: 'Revisão dos 30 mil',
    });
  });

  it('abre OS de cliente e veículo existentes com serviço, peça e orçamento', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const { calls } = mockApi({
      ...registrations,
      'GET /api/customers/identify': { body: maria },
      'POST /api/service-orders/intake': {
        status: 201,
        body: {
          serviceOrder: order,
          customer: { id: maria.id, created: false },
          vehicle: { id: gol.id, created: false },
          estimateId: 'f0e0d0c0-0000-4000-8000-000000000001',
        },
      },
    });
    renderApp('/ordens-de-servico/nova');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('CPF ou CNPJ'), '52998224725');
    await user.tab();
    expect(await screen.findByRole('link', { name: 'Maria Souza' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Placa'), 'ABC1234');
    await user.tab();
    expect(await screen.findByText(/Volkswagen Gol 2018 · Prata já tem/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Marca')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Avaliação inicial'), 'Troca de óleo');
    await user.click(screen.getByRole('button', { name: 'Adicionar serviço' }));
    await user.click(screen.getByRole('combobox', { name: 'Serviço 1' }));
    await user.click(await screen.findByRole('option', { name: /Troca de óleo/, hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Adicionar peça ou insumo' }));
    await user.click(screen.getByRole('combobox', { name: 'Item 1 do serviço 1' }));
    await user.click(await screen.findByRole('option', { name: /Óleo 5W30/, hidden: true }));
    const quantity = screen.getByLabelText('Quantidade do item 1 do serviço 1');
    await user.clear(quantity);
    await user.type(quantity, '4');
    expect(screen.getByText('Prévia do orçamento: R$ 332,00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir OS' }));
    expect(await screen.findByText('Escolha quem fez o diagnóstico')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);

    await user.click(screen.getByRole('combobox', { name: 'Diagnóstico feito por' }));
    await user.click(await screen.findByRole('option', { name: 'João Lima', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Abrir OS' }));

    expect(await screen.findByText(/orçamento/)).toHaveTextContent('#F0E0D0C0');
    expect(writes(calls)[0]?.body).toEqual({
      customer: { document: '52998224725' },
      vehicle: { licensePlate: 'ABC1234' },
      priority: 'NORMAL',
      initialAssessment: 'Troca de óleo',
      diagnosisTechnicianId: joao.id,
      services: [{ catalogServiceId: oilChange.id, parts: [{ stockItemId: oil.id, quantity: 4 }] }],
    });
  });

  it('mostra no campo a placa que é de outro cliente', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    mockApi({
      ...registrations,
      'GET /api/customers/identify': { status: 404, body: { code: 'CUSTOMER_NOT_FOUND', message: 'não encontrado' } },
      'POST /api/service-orders/intake': {
        status: 409,
        body: { code: 'VEHICLE_OWNED_BY_ANOTHER_CUSTOMER', message: 'Placa de outro cliente' },
      },
    });
    renderApp('/ordens-de-servico/nova');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('CPF ou CNPJ'), '39053344705');
    await user.tab();
    await user.type(await screen.findByLabelText('Nome'), 'Ana Teste');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Telefone'), '11987654321');
    await user.type(screen.getByLabelText('Placa'), 'ABC1234');
    await user.tab();
    expect(await screen.findByText(/cadastrada para outro cliente/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Avaliação inicial'), 'Barulho');
    await user.click(screen.getByRole('button', { name: 'Abrir OS' }));

    expect(await screen.findByText('Esta placa é de outro cliente.')).toBeInTheDocument();
  });

  it('técnico não acessa a Nova OS', async () => {
    sessionStore.start(fakeToken('TECHNICIAN'), 'technician.dev');
    mockApi({});
    renderApp('/ordens-de-servico/nova');
    expect(await screen.findByText(/Acesso negado/)).toBeInTheDocument();
  });
});

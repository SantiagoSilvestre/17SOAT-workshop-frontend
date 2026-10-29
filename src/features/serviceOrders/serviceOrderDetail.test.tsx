import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CatalogService } from '@/api/catalogServices';
import type { Customer } from '@/api/customers';
import type { ServiceExecution, ServiceOrder } from '@/api/serviceOrders';
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
const ana: Technician = { id: 't0000000-0000-4000-8000-000000000002', name: 'Ana Reis', specialties: ['ELECTRICAL'], status: 'AVAILABLE' };
const inactive: Technician = { id: 't0000000-0000-4000-8000-000000000003', name: 'Pedro Antigo', specialties: ['PAINTING'], status: 'INACTIVE' };
const oilChange: CatalogService = { id: 's0000000-0000-4000-8000-000000000001', name: 'Troca de óleo', basePrice: { value: 150, currency: 'BRL' }, active: true };
const alignment: CatalogService = { id: 's0000000-0000-4000-8000-000000000002', name: 'Alinhamento', basePrice: { value: 90, currency: 'BRL' }, active: true };

const received: ServiceOrder = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  customerId: maria.id,
  vehicleId: 'v0000000-0000-4000-8000-000000000001',
  vehicleSnapshot: { licensePlate: 'ABC1234', brand: 'Volkswagen', model: 'Gol', year: 2018 },
  priority: 'NORMAL',
  initialAssessment: 'Barulho no motor',
  diagnosisAssigneeId: null,
  statusSnapshot: 'RECEIVED',
  approvedEstimateIds: [],
  executions: [],
};

const pending: ServiceExecution = {
  id: 'e1',
  diagnosisId: 'd1',
  catalogServiceId: oilChange.id,
  name: 'Troca de óleo',
  price: { value: 150, currency: 'BRL' },
  status: 'PENDING',
  authorizedByEstimateId: null,
  assignedTechnicianId: null,
  diagnosedByTechnicianId: joao.id,
  diagnosedAt: '2026-10-29T14:30:00Z',
  stockReservationId: null,
  stockRequirements: [],
};

const path = `/api/service-orders/${received.id}`;
const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

const staffApi = (order: ServiceOrder) => ({
  [`GET ${path}`]: { body: order },
  'GET /api/customers/c0000000-0000-4000-8000-000000000001': { body: maria },
  'GET /api/technicians': { body: [joao, ana, inactive] },
  'GET /api/catalog-services': { body: [oilChange, alignment] },
});

describe('detalhe da OS', () => {
  afterEach(() => {
    sessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('gerente define o técnico e registra o diagnóstico com serviços do catálogo', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const assigned = { ...received, diagnosisAssigneeId: joao.id };
    const { calls } = mockApi({
      ...staffApi(received),
      [`PUT ${path}/diagnosis-assignee`]: { body: assigned },
      [`POST ${path}/diagnosis`]: {
        body: { ...assigned, statusSnapshot: 'IN_DIAGNOSIS', executions: [pending] },
      },
    });
    renderApp(`/ordens-de-servico/${received.id}`);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: /#A1B2C3D4/ })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Maria Souza' })).toBeInTheDocument();
    expect(screen.getByText('Barulho no motor')).toBeInTheDocument();
    expect(screen.getByText('Etapa atual')).toBeInTheDocument();
    expect(screen.getByText('Defina o técnico do diagnóstico para poder registrar o diagnóstico.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar diagnóstico' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Definir' }));
    const dialog = await screen.findByRole('dialog', { name: 'Técnico do diagnóstico' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Técnico' }));
    expect(screen.queryByRole('option', { name: 'Pedro Antigo', hidden: true })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: 'João Lima', hidden: true }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await user.click(await screen.findByRole('button', { name: 'Registrar diagnóstico' }));
    const form = await screen.findByRole('dialog', { name: 'Registrar diagnóstico' });
    expect(within(form).getByRole('combobox', { name: 'Diagnosticado por' })).toHaveValue('João Lima');

    await user.click(within(form).getByRole('button', { name: 'Registrar diagnóstico' }));
    expect(await within(form).findByText('Escolha o serviço')).toBeInTheDocument();

    await user.click(within(form).getByRole('combobox', { name: 'Serviço 1' }));
    await user.click(await screen.findByRole('option', { name: /Troca de óleo/, hidden: true }));
    await user.click(within(form).getByRole('button', { name: 'Adicionar serviço' }));
    await user.click(within(form).getByRole('combobox', { name: 'Serviço 2' }));
    // A lista do serviço 1 continua no DOM: a do serviço 2 é a última.
    await user.click((await screen.findAllByRole('option', { name: /Alinhamento/, hidden: true })).at(-1)!);
    // O preço começa no de tabela e pode ser ajustado.
    const price = within(form).getByLabelText('Valor do serviço 2');
    expect(price).toHaveValue('R$ 90,00');
    await user.clear(price);
    await user.type(price, '120');
    expect(within(form).getByText('R$ 270,00')).toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Registrar diagnóstico' }));

    expect(await screen.findByText('Diagnóstico registrado. O próximo passo é gerar o orçamento para o cliente aprovar.')).toBeInTheDocument();
    expect(writes(calls).map(({ method, path: called, body }) => ({ method, called, body }))).toEqual([
      { method: 'PUT', called: `${path}/diagnosis-assignee`, body: { technicianId: joao.id } },
      {
        method: 'POST',
        called: `${path}/diagnosis`,
        body: {
          diagnosedByTechnicianId: joao.id,
          items: [
            { catalogServiceId: oilChange.id, name: 'Troca de óleo', price: { value: 150, currency: 'BRL' } },
            { catalogServiceId: alignment.id, name: 'Alinhamento', price: { value: 120, currency: 'BRL' } },
          ],
        },
      },
    ]);
    const services = screen.getByRole('table', { name: 'Serviços da OS' });
    expect(services).toHaveTextContent('Aguardando orçamento');
    expect(services).toHaveTextContent('João Lima');
    expect(screen.queryByRole('button', { name: 'Trocar' })).not.toBeInTheDocument();
  });

  it('altera a prioridade', async () => {
    sessionStore.start(fakeToken('ADMIN'), 'admin');
    const { calls } = mockApi({
      ...staffApi(received),
      [`PATCH ${path}/priority`]: { body: { ...received, priority: 'URGENT' } },
    });
    renderApp(`/ordens-de-servico/${received.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Alterar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Alterar prioridade' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Prioridade' }));
    await user.click(await screen.findByRole('option', { name: 'Urgente', hidden: true }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(writes(calls)[0]?.body).toEqual({ priority: 'URGENT' }));
    expect(await screen.findAllByText('Urgente')).not.toHaveLength(0);
  });

  it('técnico registra o diagnóstico no próprio nome, sem listar técnicos nem clientes', async () => {
    sessionStore.start(fakeToken('TECHNICIAN', { linkedDomainId: joao.id }), 'joao');
    const assigned = { ...received, diagnosisAssigneeId: joao.id };
    const { calls } = mockApi({
      [`GET ${path}`]: { body: assigned },
      'GET /api/catalog-services': { body: [oilChange] },
      [`POST ${path}/diagnosis`]: { body: { ...assigned, statusSnapshot: 'IN_DIAGNOSIS', executions: [pending] } },
    });
    renderApp(`/ordens-de-servico/${received.id}`);
    const user = userEvent.setup();

    expect(await screen.findByText('Você')).toBeInTheDocument();
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));
    const form = await screen.findByRole('dialog', { name: 'Registrar diagnóstico' });
    expect(within(form).getByText('O diagnóstico fica registrado no seu nome.')).toBeInTheDocument();
    await user.click(within(form).getByRole('combobox', { name: 'Serviço 1' }));
    await user.click(await screen.findByRole('option', { name: /Troca de óleo/, hidden: true }));
    await user.click(within(form).getByRole('button', { name: 'Registrar diagnóstico' }));

    await waitFor(() =>
      expect(writes(calls)[0]?.body).toEqual({
        diagnosedByTechnicianId: joao.id,
        items: [{ catalogServiceId: oilChange.id, name: 'Troca de óleo', price: { value: 150, currency: 'BRL' } }],
      }),
    );
    expect(calls.some((call) => call.path.startsWith('/api/technicians') || call.path.startsWith('/api/customers'))).toBe(false);
  });

  it('com orçamento pendente ou OS finalizada, esconde as ações que a API recusaria', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    const awaiting = { ...received, diagnosisAssigneeId: joao.id, statusSnapshot: 'AWAITING_APPROVAL' as const, executions: [pending] };
    mockApi(staffApi(awaiting));
    const { unmount } = renderApp(`/ordens-de-servico/${received.id}`);

    expect(await screen.findByText('O orçamento foi enviado e aguarda a decisão do cliente.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar diagnóstico' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alterar' })).toBeInTheDocument();
    unmount();

    const completed = { ...awaiting, statusSnapshot: 'COMPLETED' as const, executions: [{ ...pending, status: 'COMPLETED' as const }] };
    mockApi(staffApi(completed));
    renderApp(`/ordens-de-servico/${received.id}`);
    expect(await screen.findByRole('table', { name: 'Serviços da OS' })).toHaveTextContent('Concluído');
    expect(screen.queryByRole('button', { name: 'Alterar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar diagnóstico' })).not.toBeInTheDocument();
  });

  it('mostra quando a OS não existe', async () => {
    sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    mockApi({ [`GET ${path}`]: { status: 404, body: { code: 'NOT_FOUND', message: 'não encontrada' } }, 'GET /api/technicians': { body: [] } });
    renderApp(`/ordens-de-servico/${received.id}`);
    expect(await screen.findByText('Ordem de serviço não encontrada.')).toBeInTheDocument();
  });
});

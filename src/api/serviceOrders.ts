import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Money } from '@/lib/money';
import { http } from './http';

export const SERVICE_ORDER_STATUSES = [
  'RECEIVED',
  'IN_DIAGNOSIS',
  'AWAITING_APPROVAL',
  'AWAITING_ITEMS',
  'IN_PROGRESS',
  'COMPLETED',
  'DELIVERED',
] as const;
export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUSES)[number];

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  RECEIVED: 'Recebida',
  IN_DIAGNOSIS: 'Em diagnóstico',
  AWAITING_APPROVAL: 'Aguardando aprovação',
  AWAITING_ITEMS: 'Aguardando peças',
  IN_PROGRESS: 'Em execução',
  COMPLETED: 'Finalizada',
  DELIVERED: 'Entregue',
};

export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

/** Situação de cada serviço da OS (ServiceExecutionStatus). */
export const EXECUTION_STATUS_LABELS = {
  PENDING: 'Aguardando aprovação',
  AUTHORIZED: 'Aprovado',
  REJECTED: 'Recusado',
  AWAITING_ITEMS: 'Aguardando peças',
  READY: 'Pronto para executar',
  IN_PROGRESS: 'Em execução',
  COMPLETED: 'Concluído',
} as const;
export type ExecutionStatus = keyof typeof EXECUTION_STATUS_LABELS;

export interface StockRequirement {
  stockItemId: string;
  type: string;
  quantity: number;
  nameSnapshot: string;
  priceSnapshot: Money;
  reserved: boolean;
}

/** ServiceExecutionResponse: um serviço do diagnóstico, com as peças que ele usa. */
export interface ServiceExecution {
  id: string;
  diagnosisId: string;
  catalogServiceId: string;
  name: string;
  price: Money;
  status: ExecutionStatus;
  authorizedByEstimateId: string | null;
  assignedTechnicianId: string | null;
  diagnosedByTechnicianId: string | null;
  diagnosedAt: string | null;
  stockReservationId: string | null;
  stockRequirements: StockRequirement[];
}

/** ServiceOrderResponse do backend. Não traz data de abertura nem nomes: só ids e a foto do veículo. */
export interface ServiceOrder {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicleSnapshot: { licensePlate: string; brand: string; model: string; year: number };
  priority: Priority;
  initialAssessment: string | null;
  diagnosisAssigneeId: string | null;
  statusSnapshot: ServiceOrderStatus;
  approvedEstimateIds: string[];
  executions: ServiceExecution[];
}

export interface ServiceOrderFilters {
  status?: ServiceOrderStatus;
  priority?: Priority;
  customerId?: string;
  technicianId?: string;
}

/**
 * POST /service-orders/intake: identifica ou cadastra cliente (pelo CPF/CNPJ) e veículo (pela placa) e abre a OS.
 * Com serviços, já registra o diagnóstico e gera o orçamento.
 */
export interface IntakeInput {
  customer: {
    document: string;
    /** Só para cliente novo. */
    name?: string;
    contactInfo?: { email: string; phone: string };
  };
  vehicle: {
    licensePlate: string;
    /** Só para veículo novo. */
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    chassis?: string;
    mileage?: number;
  };
  priority: Priority;
  initialAssessment: string;
  diagnosisTechnicianId?: string;
  services?: { catalogServiceId: string; parts: { stockItemId: string; quantity: number }[] }[];
}

/** Um serviço do catálogo no diagnóstico. O preço pode ser ajustado para este veículo. */
export interface DiagnosisItemInput {
  catalogServiceId: string;
  name: string;
  price: Money;
}

export interface DiagnosisInput {
  diagnosedByTechnicianId: string;
  items: DiagnosisItemInput[];
}

export interface IntakeResult {
  serviceOrder: ServiceOrder;
  customer: { id: string; created: boolean };
  vehicle: { id: string; created: boolean };
  estimateId: string | null;
}

const BASE = '/service-orders';

export const serviceOrdersApi = {
  /** Sem filtro de situação, a API omite as finalizadas e entregues. */
  list: (filters: ServiceOrderFilters, signal?: AbortSignal) =>
    http.get<ServiceOrder[]>(BASE, { query: { ...filters }, signal }),
  get: (id: string, signal?: AbortSignal) => http.get<ServiceOrder>(`${BASE}/${id}`, { signal }),
  intake: (input: IntakeInput) => http.post<IntakeResult>(`${BASE}/intake`, input),
  changePriority: (id: string, priority: Priority) => http.patch<ServiceOrder>(`${BASE}/${id}/priority`, { priority }),
  assignDiagnosisAssignee: (id: string, technicianId: string) =>
    http.put<ServiceOrder>(`${BASE}/${id}/diagnosis-assignee`, { technicianId }),
  performDiagnosis: (id: string, input: DiagnosisInput) => http.post<ServiceOrder>(`${BASE}/${id}/diagnosis`, input),
};

export const serviceOrderKeys = {
  all: ['service-orders'] as const,
  list: (filters: ServiceOrderFilters) => ['service-orders', 'list', filters] as const,
  detail: (id: string) => ['service-orders', 'detail', id] as const,
};

export function useServiceOrders(filters: ServiceOrderFilters) {
  return useQuery({
    queryKey: serviceOrderKeys.list(filters),
    queryFn: ({ signal }) => serviceOrdersApi.list(filters, signal),
  });
}

export function useServiceOrder(id: string | undefined) {
  return useQuery({
    queryKey: serviceOrderKeys.detail(id ?? ''),
    queryFn: ({ signal }) => serviceOrdersApi.get(id!, signal),
    enabled: Boolean(id),
  });
}

/** As ações da OS devolvem a OS atualizada: grava no detalhe e recarrega o painel. */
function useServiceOrderAction<Variables>(action: (variables: Variables) => Promise<ServiceOrder>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (order) => {
      queryClient.setQueryData(serviceOrderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: ['service-orders', 'list'] });
    },
  });
}

export const useChangePriority = () =>
  useServiceOrderAction(({ id, priority }: { id: string; priority: Priority }) =>
    serviceOrdersApi.changePriority(id, priority),
  );

export const useAssignDiagnosisAssignee = () =>
  useServiceOrderAction(({ id, technicianId }: { id: string; technicianId: string }) =>
    serviceOrdersApi.assignDiagnosisAssignee(id, technicianId),
  );

export const usePerformDiagnosis = () =>
  useServiceOrderAction(({ id, input }: { id: string; input: DiagnosisInput }) =>
    serviceOrdersApi.performDiagnosis(id, input),
  );

export function useIntake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: serviceOrdersApi.intake,
    onSuccess: () => {
      // A abertura pode cadastrar cliente e veículo, além da OS.
      void queryClient.invalidateQueries({ queryKey: serviceOrderKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

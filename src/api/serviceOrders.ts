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
  status: string;
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
};

export const serviceOrderKeys = {
  all: ['service-orders'] as const,
  list: (filters: ServiceOrderFilters) => ['service-orders', 'list', filters] as const,
};

export function useServiceOrders(filters: ServiceOrderFilters) {
  return useQuery({
    queryKey: serviceOrderKeys.list(filters),
    queryFn: ({ signal }) => serviceOrdersApi.list(filters, signal),
  });
}

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

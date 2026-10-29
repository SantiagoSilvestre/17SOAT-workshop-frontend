import type { ServiceOrder } from '@/api/serviceOrders';

/**
 * Regras do domínio (ServiceOrder.java) repetidas aqui só para esconder as ações que a API recusaria.
 * Quem decide continua sendo o backend.
 */

/** Finalizada ou entregue: a OS não aceita mais prioridade nem diagnóstico. */
export const isClosed = (order: ServiceOrder) =>
  order.statusSnapshot === 'COMPLETED' || order.statusSnapshot === 'DELIVERED';

/**
 * A API não devolve o diagnóstico aberto, mas ele fica aberto enquanto algum serviço dele aguarda decisão
 * do orçamento (PENDING). Nesse período não dá para trocar o técnico nem registrar outro diagnóstico.
 */
export const hasOpenDiagnosis = (order: ServiceOrder) =>
  order.executions.some((execution) => execution.status === 'PENDING');

export const canChangePriority = (order: ServiceOrder) => !isClosed(order);

export const canAssignDiagnosis = (order: ServiceOrder) => !isClosed(order) && !hasOpenDiagnosis(order);

export const canDiagnose = (order: ServiceOrder) =>
  order.diagnosisAssigneeId !== null && !isClosed(order) && !hasOpenDiagnosis(order);

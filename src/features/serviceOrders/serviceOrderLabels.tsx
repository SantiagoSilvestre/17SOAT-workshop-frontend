import { Badge } from '@mantine/core';
import {
  PRIORITY_LABELS,
  SERVICE_ORDER_STATUS_LABELS,
  type Priority,
  type ServiceOrder,
  type ServiceOrderStatus,
} from '@/api/serviceOrders';
import { toMoney, type Money } from '@/lib/money';

const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  RECEIVED: 'gray',
  IN_DIAGNOSIS: 'cyan',
  AWAITING_APPROVAL: 'yellow',
  AWAITING_ITEMS: 'orange',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  DELIVERED: 'teal',
};

const PRIORITY_COLORS: Record<Priority, string> = { LOW: 'gray', NORMAL: 'blue', HIGH: 'orange', URGENT: 'red' };

export function StatusBadge({ status }: { status: ServiceOrderStatus }) {
  return <Badge color={STATUS_COLORS[status]}>{SERVICE_ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge color={PRIORITY_COLORS[priority]} variant={priority === 'URGENT' ? 'filled' : 'light'}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

/** Número curto para mostrar na tela: os 8 primeiros caracteres do id, em maiúsculas. */
export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

/** Soma dos serviços e peças do diagnóstico (o valor que vai para o orçamento). */
export function serviceOrderTotal(order: ServiceOrder): Money {
  const total = order.executions.reduce(
    (sum, execution) =>
      sum +
      execution.price.value +
      execution.stockRequirements.reduce((parts, part) => parts + part.priceSnapshot.value * part.quantity, 0),
    0,
  );
  return toMoney(total);
}

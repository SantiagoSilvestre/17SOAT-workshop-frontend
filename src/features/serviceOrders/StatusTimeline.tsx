import { Stepper } from '@mantine/core';
import type { ServiceOrderStatus } from '@/api/serviceOrders';

const STEPS: { label: string; statuses: ServiceOrderStatus[] }[] = [
  { label: 'Recebida', statuses: ['RECEIVED'] },
  { label: 'Diagnóstico', statuses: ['IN_DIAGNOSIS'] },
  { label: 'Aprovação', statuses: ['AWAITING_APPROVAL'] },
  { label: 'Execução', statuses: ['AWAITING_ITEMS', 'IN_PROGRESS'] },
  { label: 'Finalizada', statuses: ['COMPLETED'] },
  { label: 'Entregue', statuses: ['DELIVERED'] },
];

/**
 * Etapas da OS até a entrega, com a atual em destaque. A API não guarda o histórico nem as datas de cada
 * mudança, então a linha mostra onde a OS está, não quando passou por cada etapa.
 */
export function StatusTimeline({ status }: { status: ServiceOrderStatus }) {
  const active = STEPS.findIndex((step) => step.statuses.includes(status));
  const delivered = status === 'DELIVERED';

  return (
    <Stepper active={delivered ? STEPS.length : active} size="sm" allowNextStepsSelect={false} aria-label="Etapas da OS">
      {STEPS.map((step, index) => (
        <Stepper.Step
          key={step.label}
          label={step.label}
          description={
            index === active && !delivered
              ? status === 'AWAITING_ITEMS'
                ? 'Aguardando peças'
                : 'Etapa atual'
              : undefined
          }
          aria-current={index === active ? 'step' : undefined}
        />
      ))}
    </Stepper>
  );
}

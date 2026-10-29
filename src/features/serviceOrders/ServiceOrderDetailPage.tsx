import { Alert, Anchor, Badge, Button, Center, Group, Loader, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconClipboardCheck, IconInfoCircle } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCustomer } from '@/api/customers';
import { ApiError, errorMessage } from '@/api/http';
import {
  EXECUTION_STATUS_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  useAssignDiagnosisAssignee,
  useChangePriority,
  useServiceOrder,
  type ExecutionStatus,
  type Priority,
  type ServiceExecution,
  type ServiceOrder,
} from '@/api/serviceOrders';
import { useTechnicians } from '@/api/technicians';
import { useSession } from '@/auth/AuthContext';
import { hasAnyRole, STAFF_ROLES } from '@/auth/roles';
import { formatDocument } from '@/lib/br';
import { formatMoney, toMoney } from '@/lib/money';
import { notifyError, notifySuccess } from '@/lib/notify';
import { formatPlate } from '@/lib/vehicle';
import { DiagnosisModal } from './DiagnosisModal';
import { PriorityBadge, serviceOrderTotal, shortId, StatusBadge } from './serviceOrderLabels';
import { canAssignDiagnosis, canChangePriority, canDiagnose, hasOpenDiagnosis, isClosed } from './serviceOrderRules';
import { SelectModal } from './SelectModal';
import { StatusTimeline } from './StatusTimeline';

const EXECUTION_COLORS: Record<ExecutionStatus, string> = {
  PENDING: 'yellow',
  AUTHORIZED: 'blue',
  REJECTED: 'gray',
  AWAITING_ITEMS: 'orange',
  READY: 'cyan',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};

function Field({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          {label}
        </Text>
        {action}
      </Group>
      <div>{children}</div>
    </Stack>
  );
}

/** Antes de o orçamento ser enviado, o serviço pendente ainda não está com o cliente. */
const executionLabel = (execution: ServiceExecution, order: ServiceOrder) =>
  execution.status === 'PENDING' && order.statusSnapshot !== 'AWAITING_APPROVAL'
    ? 'Aguardando orçamento'
    : EXECUTION_STATUS_LABELS[execution.status];

const executionTotal = (execution: ServiceExecution) =>
  toMoney(
    execution.price.value +
      execution.stockRequirements.reduce((sum, part) => sum + part.priceSnapshot.value * part.quantity, 0),
  );

/** O que falta para a OS andar, quando não há ação disponível na tela. */
function nextStepHint(order: ServiceOrder, isStaff: boolean, selfTechnicianId: string | null): string | null {
  if (isClosed(order)) return null;
  if (hasOpenDiagnosis(order)) {
    return order.statusSnapshot === 'AWAITING_APPROVAL'
      ? 'O orçamento foi enviado e aguarda a decisão do cliente.'
      : 'Diagnóstico registrado. O próximo passo é gerar o orçamento para o cliente aprovar.';
  }
  if (!order.diagnosisAssigneeId) {
    return isStaff
      ? 'Defina o técnico do diagnóstico para poder registrar o diagnóstico.'
      : 'A gerência ainda não definiu o técnico do diagnóstico desta OS.';
  }
  if (!isStaff && !selfTechnicianId) {
    return 'Seu acesso não está vinculado a um cadastro de técnico, então não dá para registrar diagnóstico.';
  }
  return null;
}

type ModalState = 'priority' | 'assignee' | 'diagnosis' | null;

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  // Técnico não pode consultar clientes nem técnicos na API: para ele a tela não mostra esses nomes.
  const isStaff = hasAnyRole(session.role, STAFF_ROLES);
  const selfTechnicianId = session.role === 'TECHNICIAN' ? session.linkedDomainId : null;

  const { data: order, isLoading, error } = useServiceOrder(id);
  const { data: customer } = useCustomer(isStaff ? order?.customerId : undefined);
  const technicians = useTechnicians(isStaff);
  const changePriority = useChangePriority();
  const assignDiagnosis = useAssignDiagnosisAssignee();
  const [modal, setModal] = useState<ModalState>(null);

  const technicianNames = useMemo(
    () => new Map((technicians.data ?? []).map((technician) => [technician.id, technician.name])),
    [technicians.data],
  );
  // Inativos não recebem trabalho novo.
  const technicianOptions = useMemo(
    () =>
      (technicians.data ?? [])
        .filter((technician) => technician.status !== 'INACTIVE')
        .map((technician) => ({ value: technician.id, label: technician.name })),
    [technicians.data],
  );

  const technicianName = (technicianId: string | null) => {
    if (!technicianId) return '—';
    if (technicianId === selfTechnicianId) return 'Você';
    return isStaff ? (technicianNames.get(technicianId) ?? '—') : 'Outro técnico';
  };

  const back = (
    <Anchor component={Link} to="/ordens-de-servico" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} />
        Ordens de serviço
      </Group>
    </Anchor>
  );

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader aria-label="Carregando" />
      </Center>
    );
  }
  if (error || !order) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <Stack>
        {back}
        <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
          {notFound ? 'Ordem de serviço não encontrada.' : errorMessage(error)}
        </Alert>
      </Stack>
    );
  }

  const diagnosable = canDiagnose(order) && (isStaff || Boolean(selfTechnicianId));
  const hint = nextStepHint(order, isStaff, selfTechnicianId);

  const savePriority = (priority: string) =>
    changePriority.mutate(
      { id: order.id, priority: priority as Priority },
      {
        onSuccess: () => {
          notifySuccess('Prioridade alterada.');
          setModal(null);
        },
        onError: (caught) => notifyError(caught),
      },
    );

  const saveAssignee = (technicianId: string) =>
    assignDiagnosis.mutate(
      { id: order.id, technicianId },
      {
        onSuccess: () => {
          notifySuccess('Técnico do diagnóstico definido.');
          setModal(null);
        },
        onError: (caught) => notifyError(caught),
      },
    );

  return (
    <Stack>
      {back}
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={2}>
              OS{' '}
              <Text span inherit ff="monospace" title={order.id}>
                #{shortId(order.id)}
              </Text>
            </Title>
            <StatusBadge status={order.statusSnapshot} />
            <PriorityBadge priority={order.priority} />
          </Group>
          <Text c="dimmed">
            {formatPlate(order.vehicleSnapshot.licensePlate)} · {order.vehicleSnapshot.brand} {order.vehicleSnapshot.model}{' '}
            · {order.vehicleSnapshot.year}
          </Text>
        </Stack>
        {diagnosable && (
          <Button leftSection={<IconClipboardCheck size={16} />} onClick={() => setModal('diagnosis')}>
            Registrar diagnóstico
          </Button>
        )}
      </Group>

      <Paper withBorder p="lg" radius="md">
        <StatusTimeline status={order.statusSnapshot} />
      </Paper>

      {hint && (
        <Alert color="blue" icon={<IconInfoCircle size={18} />}>
          {hint}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: isStaff ? 3 : 2 }}>
        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="sm">
            Atendimento
          </Title>
          <Stack gap="sm">
            <Field
              label="Prioridade"
              action={
                canChangePriority(order) && (
                  <Button size="compact-xs" variant="subtle" onClick={() => setModal('priority')}>
                    Alterar
                  </Button>
                )
              }
            >
              <PriorityBadge priority={order.priority} />
            </Field>
            <Field
              label="Técnico do diagnóstico"
              action={
                isStaff &&
                canAssignDiagnosis(order) && (
                  <Button size="compact-xs" variant="subtle" onClick={() => setModal('assignee')}>
                    {order.diagnosisAssigneeId ? 'Trocar' : 'Definir'}
                  </Button>
                )
              }
            >
              <Text>{technicianName(order.diagnosisAssigneeId)}</Text>
            </Field>
            <Field label="Avaliação inicial">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{order.initialAssessment || '—'}</Text>
            </Field>
          </Stack>
        </Paper>

        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="sm">
            Veículo
          </Title>
          <Stack gap={2}>
            {isStaff ? (
              <Anchor component={Link} to={`/veiculos/${order.vehicleId}`} fw={500} ff="monospace">
                {formatPlate(order.vehicleSnapshot.licensePlate)}
              </Anchor>
            ) : (
              <Text fw={500} ff="monospace">
                {formatPlate(order.vehicleSnapshot.licensePlate)}
              </Text>
            )}
            <Text size="sm" c="dimmed">
              {order.vehicleSnapshot.brand} {order.vehicleSnapshot.model} · {order.vehicleSnapshot.year}
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              Dados do veículo no momento da abertura.
            </Text>
          </Stack>
        </Paper>

        {isStaff && (
          <Paper withBorder p="lg" radius="md">
            <Title order={4} mb="sm">
              Cliente
            </Title>
            {customer ? (
              <Stack gap={2}>
                <Group gap="xs">
                  <Anchor component={Link} to={`/clientes/${customer.id}`} fw={500}>
                    {customer.name}
                  </Anchor>
                  {!customer.active && (
                    <Badge color="gray" size="sm">
                      Arquivado
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  {formatDocument(customer.document)}
                </Text>
              </Stack>
            ) : (
              <Anchor component={Link} to={`/clientes/${order.customerId}`}>
                Ver cliente
              </Anchor>
            )}
          </Paper>
        )}
      </SimpleGrid>

      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Serviços</Title>
          {order.executions.length > 0 && (
            <Text size="sm">
              Total: <strong>{formatMoney(serviceOrderTotal(order))}</strong>
            </Text>
          )}
        </Group>
        {order.executions.length === 0 ? (
          <Text c="dimmed" size="sm">
            Nenhum diagnóstico registrado ainda.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="sm" aria-label="Serviços da OS">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Serviço</Table.Th>
                  <Table.Th>Situação</Table.Th>
                  <Table.Th>Diagnosticado por</Table.Th>
                  <Table.Th ta="right">Valor</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {order.executions.map((execution) => (
                  <Table.Tr key={execution.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {execution.name}
                      </Text>
                      {execution.stockRequirements.map((part) => (
                        <Text key={part.stockItemId} size="xs" c="dimmed">
                          {part.quantity} × {part.nameSnapshot} ({formatMoney(part.priceSnapshot)})
                        </Text>
                      ))}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={EXECUTION_COLORS[execution.status]}>
                        {executionLabel(execution, order)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{technicianName(execution.diagnosedByTechnicianId)}</Text>
                      {execution.diagnosedAt && (
                        <Text size="xs" c="dimmed">
                          {new Date(execution.diagnosedAt).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{formatMoney(executionTotal(execution))}</Text>
                      {execution.stockRequirements.length > 0 && (
                        <Text size="xs" c="dimmed">
                          serviço {formatMoney(execution.price)}
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      <SelectModal
        opened={modal === 'priority'}
        title="Alterar prioridade"
        label="Prioridade"
        data={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
        initialValue={order.priority}
        loading={changePriority.isPending}
        onSave={savePriority}
        onClose={() => setModal(null)}
      />
      {isStaff && (
        <SelectModal
          opened={modal === 'assignee'}
          title="Técnico do diagnóstico"
          label="Técnico"
          description="Quem vai avaliar o veículo e registrar os serviços necessários."
          data={technicianOptions}
          initialValue={order.diagnosisAssigneeId}
          loading={assignDiagnosis.isPending}
          onSave={saveAssignee}
          onClose={() => setModal(null)}
        />
      )}
      <DiagnosisModal
        opened={modal === 'diagnosis'}
        order={order}
        technicians={isStaff ? technicianOptions : null}
        selfTechnicianId={selfTechnicianId}
        onClose={() => setModal(null)}
      />
    </Stack>
  );
}

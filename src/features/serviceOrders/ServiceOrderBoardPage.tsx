import { Button, Group, Select, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomers } from '@/api/customers';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  SERVICE_ORDER_STATUSES,
  SERVICE_ORDER_STATUS_LABELS,
  useServiceOrders,
  type Priority,
  type ServiceOrder,
  type ServiceOrderFilters,
  type ServiceOrderStatus,
} from '@/api/serviceOrders';
import { useTechnicians } from '@/api/technicians';
import { useSession } from '@/auth/AuthContext';
import { hasAnyRole, STAFF_ROLES } from '@/auth/roles';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { formatMoney } from '@/lib/money';
import { formatPlate } from '@/lib/vehicle';
import { PriorityBadge, serviceOrderTotal, shortId, StatusBadge } from './serviceOrderLabels';

/** Painel de OS. A API filtra e ordena (situação operacional, depois a mais antiga primeiro). */
export function ServiceOrderBoardPage() {
  const session = useSession();
  // Técnico não pode listar clientes nem técnicos na API, então não há nomes nem esses filtros para ele.
  const isStaff = hasAnyRole(session.role, STAFF_ROLES);
  const [filters, setFilters] = useState<ServiceOrderFilters>({});
  const { data, isLoading, error } = useServiceOrders(filters);
  const customers = useCustomers(isStaff);
  const technicians = useTechnicians(isStaff);

  const customerNames = useMemo(
    () => new Map((customers.data ?? []).map((customer) => [customer.id, customer.name])),
    [customers.data],
  );
  const technicianNames = useMemo(
    () => new Map((technicians.data ?? []).map((technician) => [technician.id, technician.name])),
    [technicians.data],
  );

  const setFilter = <K extends keyof ServiceOrderFilters>(key: K, value: ServiceOrderFilters[K] | null) =>
    setFilters((current) => ({ ...current, [key]: value ?? undefined }));

  const columns: DataTableColumn<ServiceOrder>[] = [
    {
      key: 'id',
      header: 'OS',
      render: (row) => (
        <Text ff="monospace" size="sm" title={row.id}>
          #{shortId(row.id)}
        </Text>
      ),
    },
    {
      key: 'vehicle',
      header: 'Veículo',
      render: (row) => (
        <Stack gap={0}>
          <Text fw={500} ff="monospace" size="sm">
            {formatPlate(row.vehicleSnapshot.licensePlate)}
          </Text>
          <Text size="xs" c="dimmed">
            {row.vehicleSnapshot.brand} {row.vehicleSnapshot.model} · {row.vehicleSnapshot.year}
          </Text>
        </Stack>
      ),
      sortValue: (row) => row.vehicleSnapshot.licensePlate,
    },
    ...(isStaff
      ? [
          {
            key: 'customer',
            header: 'Cliente',
            render: (row: ServiceOrder) => customerNames.get(row.customerId) ?? '—',
            sortValue: (row: ServiceOrder) => customerNames.get(row.customerId) ?? '',
          },
        ]
      : []),
    { key: 'status', header: 'Situação', render: (row) => <StatusBadge status={row.statusSnapshot} /> },
    { key: 'priority', header: 'Prioridade', render: (row) => <PriorityBadge priority={row.priority} /> },
    {
      key: 'services',
      header: 'Serviços',
      align: 'right',
      render: (row) =>
        row.executions.length === 0 ? (
          <Text size="sm" c="dimmed">
            Sem diagnóstico
          </Text>
        ) : (
          <Stack gap={0} align="flex-end">
            <Text size="sm">{formatMoney(serviceOrderTotal(row))}</Text>
            <Text size="xs" c="dimmed">
              {row.executions.length} {row.executions.length === 1 ? 'serviço' : 'serviços'}
            </Text>
          </Stack>
        ),
      sortValue: (row) => serviceOrderTotal(row).value,
    },
    ...(isStaff
      ? [
          {
            key: 'assignee',
            header: 'Diagnóstico',
            render: (row: ServiceOrder) =>
              row.diagnosisAssigneeId ? (technicianNames.get(row.diagnosisAssigneeId) ?? '—') : '—',
          },
        ]
      : []),
  ];

  return (
    <Stack>
      <PageHeader
        title="Ordens de serviço"
        description="Por padrão aparecem as ordens em aberto, das mais urgentes na operação para as menos."
      />

      <SimpleGrid cols={{ base: 1, sm: 2, md: isStaff ? 4 : 2 }}>
        <Select
          label="Situação"
          placeholder="Em aberto"
          data={SERVICE_ORDER_STATUSES.map((value) => ({ value, label: SERVICE_ORDER_STATUS_LABELS[value] }))}
          value={filters.status ?? null}
          onChange={(value) => setFilter('status', value as ServiceOrderStatus | null)}
          clearable
        />
        <Select
          label="Prioridade"
          placeholder="Todas"
          data={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
          value={filters.priority ?? null}
          onChange={(value) => setFilter('priority', value as Priority | null)}
          clearable
        />
        {isStaff && (
          <Select
            label="Cliente"
            placeholder="Todos"
            data={(customers.data ?? []).map((customer) => ({ value: customer.id, label: customer.name }))}
            value={filters.customerId ?? null}
            onChange={(value) => setFilter('customerId', value)}
            searchable
            clearable
          />
        )}
        {isStaff && (
          <Select
            label="Técnico"
            placeholder="Todos"
            data={(technicians.data ?? []).map((technician) => ({ value: technician.id, label: technician.name }))}
            value={filters.technicianId ?? null}
            onChange={(value) => setFilter('technicianId', value)}
            searchable
            clearable
          />
        )}
      </SimpleGrid>

      <DataTable
        rows={data}
        columns={columns}
        getRowId={(row) => row.id}
        searchText={(row) =>
          `${shortId(row.id)} ${row.vehicleSnapshot.licensePlate} ${formatPlate(row.vehicleSnapshot.licensePlate)} ${row.vehicleSnapshot.brand} ${row.vehicleSnapshot.model} ${customerNames.get(row.customerId) ?? ''}`
        }
        searchPlaceholder={isStaff ? 'Buscar por OS, placa, modelo ou cliente' : 'Buscar por OS, placa ou modelo'}
        loading={isLoading}
        error={error}
        emptyMessage="Nenhuma ordem de serviço com estes filtros."
        actions={
          isStaff && (
            <Group>
              <Button component={Link} to="/ordens-de-servico/nova" leftSection={<IconPlus size={16} />}>
                Nova OS
              </Button>
            </Group>
          )
        }
      />
    </Stack>
  );
}

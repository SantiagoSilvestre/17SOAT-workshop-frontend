import { ActionIcon, Anchor, Button, Stack, Text, Tooltip } from '@mantine/core';
import { IconArchive, IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomers } from '@/api/customers';
import { useArchiveVehicle, useVehicles, type Vehicle } from '@/api/vehicles';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { notifyError, notifySuccess } from '@/lib/notify';
import { formatMileage, formatPlate } from '@/lib/vehicle';

export function VehicleListPage() {
  const { data, isLoading, error } = useVehicles();
  const customers = useCustomers();
  const archive = useArchiveVehicle();
  const [toArchive, setToArchive] = useState<Vehicle | null>(null);

  // A API devolve só o customerId; o nome vem da lista de clientes ativos.
  const customerNames = useMemo(
    () => new Map((customers.data ?? []).map((customer) => [customer.id, customer.name])),
    [customers.data],
  );
  const customerName = (vehicle: Vehicle) => customerNames.get(vehicle.customerId) ?? '';

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: 'plate',
      header: 'Placa',
      render: (row) => (
        <Anchor component={Link} to={`/veiculos/${row.id}`} fw={500} ff="monospace">
          {formatPlate(row.licensePlate)}
        </Anchor>
      ),
      sortValue: (row) => row.licensePlate,
    },
    { key: 'vehicle', header: 'Veículo', render: (row) => `${row.brand} ${row.model}`, sortValue: (row) => `${row.brand} ${row.model}` },
    { key: 'year', header: 'Ano', render: (row) => row.year, sortValue: (row) => row.year },
    { key: 'color', header: 'Cor', render: (row) => row.color },
    {
      key: 'customer',
      header: 'Cliente',
      render: (row) => (
        <Anchor component={Link} to={`/clientes/${row.customerId}`}>
          {customerName(row) || <Text span c="dimmed">Ver cliente</Text>}
        </Anchor>
      ),
      sortValue: customerName,
    },
    { key: 'mileage', header: 'Km', align: 'right', render: (row) => formatMileage(row.mileage), sortValue: (row) => row.mileage ?? -1 },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (row) => (
        <Tooltip label="Arquivar">
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Arquivar ${formatPlate(row.licensePlate)}`}
            onClick={() => setToArchive(row)}
          >
            <IconArchive size={18} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ];

  const confirmArchive = () => {
    if (!toArchive) return;
    archive.mutate(toArchive.id, {
      onSuccess: () => {
        notifySuccess(`${formatPlate(toArchive.licensePlate)} foi arquivado.`);
        setToArchive(null);
      },
      onError: (caught) => notifyError(caught),
    });
  };

  return (
    <Stack>
      <PageHeader title="Veículos" description="Veículos ativos dos clientes, identificados pela placa." />

      <DataTable
        rows={data}
        columns={columns}
        getRowId={(row) => row.id}
        // Busca pela placa com ou sem hífen, pelo modelo e pelo dono.
        searchText={(row) => `${row.licensePlate} ${formatPlate(row.licensePlate)} ${row.brand} ${row.model} ${customerName(row)}`}
        searchPlaceholder="Buscar por placa, modelo ou cliente"
        initialSort={{ key: 'plate', direction: 'asc' }}
        loading={isLoading}
        error={error}
        emptyMessage="Nenhum veículo cadastrado ainda."
        actions={
          <Button component={Link} to="/veiculos/novo" leftSection={<IconPlus size={16} />}>
            Novo veículo
          </Button>
        }
      />

      <ConfirmModal
        opened={toArchive !== null}
        title="Arquivar veículo"
        confirmLabel="Arquivar"
        danger
        loading={archive.isPending}
        onConfirm={confirmArchive}
        onClose={() => setToArchive(null)}
      >
        {toArchive && formatPlate(toArchive.licensePlate)} sai da lista de veículos e não poderá mais ser editado nem
        receber ordens de serviço. A API não permite desarquivar.
      </ConfirmModal>
    </Stack>
  );
}

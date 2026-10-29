import { Alert, Anchor, Badge, Button, Center, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconArchive, IconArrowLeft, IconGauge, IconPencil } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCustomer } from '@/api/customers';
import { ApiError, errorMessage } from '@/api/http';
import { useArchiveVehicle, useVehicle } from '@/api/vehicles';
import { ConfirmModal } from '@/components/ConfirmModal';
import { formatDocument } from '@/lib/br';
import { notifyError, notifySuccess } from '@/lib/notify';
import { formatMileage, formatPlate } from '@/lib/vehicle';
import { EditVehicleModal } from './EditVehicleModal';
import { MileageModal } from './MileageModal';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text>{children}</Text>
    </Stack>
  );
}

type ModalState = 'edit' | 'mileage' | 'archive' | null;

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading, error } = useVehicle(id);
  const { data: owner } = useCustomer(vehicle?.customerId);
  const archive = useArchiveVehicle();
  const [modal, setModal] = useState<ModalState>(null);

  const back = (
    <Anchor component={Link} to="/veiculos" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} />
        Veículos
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
  if (error || !vehicle) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <Stack>
        {back}
        <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
          {notFound ? 'Veículo não encontrado.' : errorMessage(error)}
        </Alert>
      </Stack>
    );
  }

  const editable = vehicle.active;
  const plate = formatPlate(vehicle.licensePlate);

  const confirmArchive = () => {
    archive.mutate(vehicle.id, {
      onSuccess: () => {
        notifySuccess(`${plate} foi arquivado.`);
        navigate('/veiculos');
      },
      onError: (caught) => notifyError(caught),
    });
  };

  return (
    <Stack>
      {back}
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={2} ff="monospace">
              {plate}
            </Title>
            {!vehicle.active && <Badge color="gray">Arquivado</Badge>}
          </Group>
          <Text c="dimmed">
            {vehicle.brand} {vehicle.model} · {vehicle.year} · {vehicle.color}
          </Text>
        </Stack>
        {editable && (
          <Group gap="xs">
            <Button variant="default" leftSection={<IconPencil size={16} />} onClick={() => setModal('edit')}>
              Editar
            </Button>
            <Button variant="light" color="red" leftSection={<IconArchive size={16} />} onClick={() => setModal('archive')}>
              Arquivar
            </Button>
          </Group>
        )}
      </Group>

      {!editable && (
        <Alert color="gray" icon={<IconArchive size={18} />}>
          Veículo arquivado: os dados ficam só para consulta.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="sm">
            Dados do veículo
          </Title>
          <SimpleGrid cols={2} spacing="sm">
            <Field label="Marca">{vehicle.brand}</Field>
            <Field label="Modelo">{vehicle.model}</Field>
            <Field label="Ano">{vehicle.year}</Field>
            <Field label="Cor">{vehicle.color}</Field>
          </SimpleGrid>
          <Stack mt="sm">
            <Field label="Chassi">{vehicle.chassis ?? '—'}</Field>
          </Stack>
        </Paper>

        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Quilometragem</Title>
            {editable && (
              <Button size="xs" variant="subtle" leftSection={<IconGauge size={14} />} onClick={() => setModal('mileage')}>
                Registrar
              </Button>
            )}
          </Group>
          <Text size="xl" fw={600}>
            {formatMileage(vehicle.mileage)}
          </Text>
          {vehicle.mileage === null && (
            <Text size="sm" c="dimmed">
              Nenhuma leitura registrada ainda.
            </Text>
          )}
        </Paper>

        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="sm">
            Cliente
          </Title>
          {owner ? (
            <Stack gap={2}>
              <Group gap="xs">
                <Anchor component={Link} to={`/clientes/${owner.id}`} fw={500}>
                  {owner.name}
                </Anchor>
                {!owner.active && <Badge color="gray" size="sm">Arquivado</Badge>}
              </Group>
              <Text size="sm" c="dimmed">
                {formatDocument(owner.document)}
              </Text>
            </Stack>
          ) : (
            <Anchor component={Link} to={`/clientes/${vehicle.customerId}`}>
              Ver cliente
            </Anchor>
          )}
        </Paper>
      </SimpleGrid>

      <EditVehicleModal vehicle={vehicle} opened={modal === 'edit'} onClose={() => setModal(null)} />
      <MileageModal vehicle={vehicle} opened={modal === 'mileage'} onClose={() => setModal(null)} />
      <ConfirmModal
        opened={modal === 'archive'}
        title="Arquivar veículo"
        confirmLabel="Arquivar"
        danger
        loading={archive.isPending}
        onConfirm={confirmArchive}
        onClose={() => setModal(null)}
      >
        {plate} sai da lista de veículos e não poderá mais ser editado nem receber ordens de serviço. A API não permite
        desarquivar.
      </ConfirmModal>
    </Stack>
  );
}

import { Alert, Anchor, Button, Group, Loader, Paper, Table, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/api/http';
import { useCustomerVehicles } from '@/api/vehicles';
import { formatMileage, formatPlate } from '@/lib/vehicle';

/** Veículos ativos do cliente, mostrados no detalhe dele. */
export function CustomerVehicles({ customerId, canAdd }: { customerId: string; canAdd: boolean }) {
  const { data: vehicles, isLoading, error } = useCustomerVehicles(customerId);

  let content;
  if (isLoading) {
    content = <Loader size="sm" aria-label="Carregando veículos" />;
  } else if (error) {
    content = (
      <Alert color="red" role="alert">
        {errorMessage(error)}
      </Alert>
    );
  } else if (!vehicles?.length) {
    content = <Text c="dimmed">Nenhum veículo ativo cadastrado para este cliente.</Text>;
  } else {
    content = (
      <Table.ScrollContainer minWidth={480}>
        <Table aria-label="Veículos do cliente">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Placa</Table.Th>
              <Table.Th>Veículo</Table.Th>
              <Table.Th>Ano</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Km</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {vehicles.map((vehicle) => (
              <Table.Tr key={vehicle.id}>
                <Table.Td>
                  <Anchor component={Link} to={`/veiculos/${vehicle.id}`} fw={500} ff="monospace">
                    {formatPlate(vehicle.licensePlate)}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  {vehicle.brand} {vehicle.model} · {vehicle.color}
                </Table.Td>
                <Table.Td>{vehicle.year}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{formatMileage(vehicle.mileage)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
  }

  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" mb="sm">
        <Title order={4}>Veículos</Title>
        {canAdd && (
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            component={Link}
            to={`/veiculos/novo?cliente=${customerId}`}
          >
            Novo veículo
          </Button>
        )}
      </Group>
      {content}
    </Paper>
  );
}

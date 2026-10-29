import { ActionIcon, Badge, Button, Checkbox, Group, Menu, Stack, Tooltip } from '@mantine/core';
import { IconDotsVertical, IconKey, IconPencil, IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SPECIALTY_LABELS,
  TECHNICIAN_STATUS_LABELS,
  useTechnicians,
  useUpdateTechnicianStatus,
  type Technician,
  type TechnicianStatus,
} from '@/api/technicians';
import { useSession } from '@/auth/AuthContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { notifyError, notifySuccess } from '@/lib/notify';
import { TechnicianFormModal } from './TechnicianFormModal';

const STATUS_COLORS: Record<TechnicianStatus, string> = { AVAILABLE: 'green', BUSY: 'orange', INACTIVE: 'gray' };

// Disponível primeiro na ordenação por status.
const STATUS_ORDER: Record<TechnicianStatus, number> = { AVAILABLE: 0, BUSY: 1, INACTIVE: 2 };

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'rename'; technician: Technician };

export function TechniciansPage() {
  const session = useSession();
  const { data, isLoading, error } = useTechnicians();
  const updateStatus = useUpdateTechnicianStatus();
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [toDeactivate, setToDeactivate] = useState<Technician | null>(null);

  const rows = useMemo(
    () => (showInactive ? data : data?.filter((technician) => technician.status !== 'INACTIVE')),
    [data, showInactive],
  );

  const changeStatus = (technician: Technician, status: TechnicianStatus, onDone?: () => void) => {
    updateStatus.mutate(
      { id: technician.id, status },
      {
        onSuccess: () => {
          notifySuccess(`${technician.name} agora está ${TECHNICIAN_STATUS_LABELS[status].toLowerCase()}.`);
          onDone?.();
        },
        onError: (caught) => notifyError(caught),
      },
    );
  };

  const columns: DataTableColumn<Technician>[] = [
    { key: 'name', header: 'Técnico', render: (row) => row.name, sortValue: (row) => row.name },
    {
      key: 'specialties',
      header: 'Especialidades',
      render: (row) => (
        <Group gap={4}>
          {row.specialties.map((specialty) => (
            <Badge key={specialty} variant="light" size="sm">
              {SPECIALTY_LABELS[specialty]}
            </Badge>
          ))}
        </Group>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (row) => <Badge color={STATUS_COLORS[row.status]}>{TECHNICIAN_STATUS_LABELS[row.status]}</Badge>,
      sortValue: (row) => STATUS_ORDER[row.status],
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (row) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          {session.role === 'ADMIN' && row.status !== 'INACTIVE' && (
            <Tooltip label="Criar acesso">
              <ActionIcon
                variant="subtle"
                component={Link}
                to={`/usuarios?papel=TECHNICIAN&vinculo=${row.id}`}
                aria-label={`Criar acesso para ${row.name}`}
              >
                <IconKey size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Renomear">
            <ActionIcon
              variant="subtle"
              aria-label={`Renomear ${row.name}`}
              onClick={() => setForm({ mode: 'rename', technician: row })}
            >
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
          {row.status !== 'INACTIVE' && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label={`Mudar situação de ${row.name}`}>
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {row.status === 'BUSY' ? (
                  <Menu.Item onClick={() => changeStatus(row, 'AVAILABLE')}>Marcar como disponível</Menu.Item>
                ) : (
                  <Menu.Item onClick={() => changeStatus(row, 'BUSY')}>Marcar como ocupado</Menu.Item>
                )}
                <Menu.Item color="red" onClick={() => setToDeactivate(row)}>
                  Desativar
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      ),
    },
  ];

  return (
    <Stack>
      <PageHeader title="Técnicos" description="Equipe técnica, especialidades e disponibilidade." />

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        searchText={(row) => `${row.name} ${row.specialties.map((specialty) => SPECIALTY_LABELS[specialty]).join(' ')}`}
        searchPlaceholder="Buscar por nome ou especialidade"
        initialSort={{ key: 'name', direction: 'asc' }}
        loading={isLoading}
        error={error}
        emptyMessage={showInactive ? 'Nenhum técnico cadastrado ainda.' : 'Nenhum técnico ativo.'}
        actions={
          <Group>
            <Checkbox
              label="Mostrar inativos"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.currentTarget.checked)}
            />
            <Button leftSection={<IconPlus size={16} />} onClick={() => setForm({ mode: 'create' })}>
              Novo técnico
            </Button>
          </Group>
        }
      />

      <TechnicianFormModal
        opened={form.mode !== 'closed'}
        technician={form.mode === 'rename' ? form.technician : null}
        onClose={() => setForm({ mode: 'closed' })}
      />
      <ConfirmModal
        opened={toDeactivate !== null}
        title="Desativar técnico"
        confirmLabel="Desativar"
        danger
        loading={updateStatus.isPending}
        onConfirm={() => toDeactivate && changeStatus(toDeactivate, 'INACTIVE', () => setToDeactivate(null))}
        onClose={() => setToDeactivate(null)}
      >
        {toDeactivate?.name} deixa de receber ordens de serviço. A API não permite reativar um técnico desativado.
      </ConfirmModal>
    </Stack>
  );
}

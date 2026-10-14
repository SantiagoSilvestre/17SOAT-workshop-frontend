import { ActionIcon, Button, Group, Stack, Tooltip } from '@mantine/core';
import { IconArchive, IconPencil, IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useArchiveCatalogService, useCatalogServices, type CatalogService } from '@/api/catalogServices';
import { useSession } from '@/auth/AuthContext';
import { hasAnyRole, STAFF_ROLES } from '@/auth/roles';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { formatMoney } from '@/lib/money';
import { notifyError, notifySuccess } from '@/lib/notify';
import { CatalogServiceFormModal } from './CatalogServiceFormModal';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; service: CatalogService };

export function CatalogPage() {
  const session = useSession();
  // A API aceita edição de qualquer usuário logado; a tela restringe à equipe administrativa.
  const canManage = hasAnyRole(session.role, STAFF_ROLES);

  const { data, isLoading, error } = useCatalogServices();
  const archive = useArchiveCatalogService();
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [toArchive, setToArchive] = useState<CatalogService | null>(null);

  const columns = useMemo(() => {
    const base: DataTableColumn<CatalogService>[] = [
      { key: 'name', header: 'Serviço', render: (row) => row.name, sortValue: (row) => row.name },
      {
        key: 'basePrice',
        header: 'Preço base',
        render: (row) => formatMoney(row.basePrice),
        sortValue: (row) => row.basePrice.value,
        align: 'right',
      },
    ];
    if (!canManage) return base;
    return [
      ...base,
      {
        key: 'actions',
        header: 'Ações',
        align: 'right',
        render: (row) => (
          <Group gap={4} justify="flex-end" wrap="nowrap">
            <Tooltip label="Editar">
              <ActionIcon variant="subtle" aria-label={`Editar ${row.name}`} onClick={() => setForm({ mode: 'edit', service: row })}>
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Arquivar">
              <ActionIcon variant="subtle" color="red" aria-label={`Arquivar ${row.name}`} onClick={() => setToArchive(row)}>
                <IconArchive size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ] satisfies DataTableColumn<CatalogService>[];
  }, [canManage]);

  const confirmArchive = () => {
    if (!toArchive) return;
    archive.mutate(toArchive.id, {
      onSuccess: () => {
        notifySuccess(`"${toArchive.name}" foi arquivado.`);
        setToArchive(null);
      },
      onError: (caught) => notifyError(caught),
    });
  };

  return (
    <Stack>
      <PageHeader
        title="Catálogo de serviços"
        description={
          canManage
            ? 'Serviços oferecidos pela oficina e o preço base usado nos orçamentos.'
            : 'Serviços oferecidos pela oficina e o preço base de cada um.'
        }
      />

      <DataTable
        rows={data}
        columns={columns}
        getRowId={(row) => row.id}
        searchText={(row) => row.name}
        searchPlaceholder="Buscar serviço"
        initialSort={{ key: 'name', direction: 'asc' }}
        loading={isLoading}
        error={error}
        emptyMessage="Nenhum serviço cadastrado ainda."
        actions={
          canManage && (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setForm({ mode: 'create' })}>
              Novo serviço
            </Button>
          )
        }
      />

      <CatalogServiceFormModal
        opened={form.mode !== 'closed'}
        service={form.mode === 'edit' ? form.service : null}
        onClose={() => setForm({ mode: 'closed' })}
      />

      <ConfirmModal
        opened={toArchive !== null}
        title="Arquivar serviço"
        confirmLabel="Arquivar"
        danger
        loading={archive.isPending}
        onConfirm={confirmArchive}
        onClose={() => setToArchive(null)}
      >
        "{toArchive?.name}" deixa de aparecer no catálogo. A API não permite desarquivar, então só confirme se o
        serviço não será mais oferecido.
      </ConfirmModal>
    </Stack>
  );
}

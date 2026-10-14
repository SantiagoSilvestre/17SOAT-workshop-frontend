import { ActionIcon, Anchor, Button, Stack, Tooltip } from '@mantine/core';
import { IconArchive, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useArchiveCustomer, useCustomers, type Customer } from '@/api/customers';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { formatDocument, formatPhone } from '@/lib/br';
import { notifyError, notifySuccess } from '@/lib/notify';

export function CustomerListPage() {
  const { data, isLoading, error } = useCustomers();
  const archive = useArchiveCustomer();
  const [toArchive, setToArchive] = useState<Customer | null>(null);

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (row) => (
        <Anchor component={Link} to={`/clientes/${row.id}`} fw={500}>
          {row.name}
        </Anchor>
      ),
      sortValue: (row) => row.name,
    },
    { key: 'document', header: 'CPF/CNPJ', render: (row) => formatDocument(row.document) },
    { key: 'email', header: 'E-mail', render: (row) => row.contactInfo.email, sortValue: (row) => row.contactInfo.email },
    { key: 'phone', header: 'Telefone', render: (row) => formatPhone(row.contactInfo.phone) },
    {
      key: 'city',
      header: 'Cidade',
      render: (row) => (row.contactInfo.address ? `${row.contactInfo.address.city}/${row.contactInfo.address.state}` : '—'),
      sortValue: (row) => row.contactInfo.address?.city ?? '',
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (row) => (
        <Tooltip label="Arquivar">
          <ActionIcon variant="subtle" color="red" aria-label={`Arquivar ${row.name}`} onClick={() => setToArchive(row)}>
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
        notifySuccess(`${toArchive.name} foi arquivado.`);
        setToArchive(null);
      },
      onError: (caught) => notifyError(caught),
    });
  };

  return (
    <Stack>
      <PageHeader title="Clientes" description="Clientes ativos da oficina, identificados por CPF ou CNPJ." />

      <DataTable
        rows={data}
        columns={columns}
        getRowId={(row) => row.id}
        // Busca pelo documento com ou sem máscara.
        searchText={(row) => `${row.name} ${row.document} ${formatDocument(row.document)} ${row.contactInfo.email}`}
        searchPlaceholder="Buscar por nome, CPF/CNPJ ou e-mail"
        initialSort={{ key: 'name', direction: 'asc' }}
        loading={isLoading}
        error={error}
        emptyMessage="Nenhum cliente cadastrado ainda."
        actions={
          <Button component={Link} to="/clientes/novo" leftSection={<IconPlus size={16} />}>
            Novo cliente
          </Button>
        }
      />

      <ConfirmModal
        opened={toArchive !== null}
        title="Arquivar cliente"
        confirmLabel="Arquivar"
        danger
        loading={archive.isPending}
        onConfirm={confirmArchive}
        onClose={() => setToArchive(null)}
      >
        {toArchive?.name} sai da lista de clientes e não poderá mais ser editado. A API não permite desarquivar.
      </ConfirmModal>
    </Stack>
  );
}

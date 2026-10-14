import { Alert, Anchor, Badge, Button, Center, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconArchive, IconArrowLeft, IconMail, IconPencil, IconPhone } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useArchiveCustomer, useCustomer, type Address } from '@/api/customers';
import { ApiError, errorMessage } from '@/api/http';
import { ConfirmModal } from '@/components/ConfirmModal';
import { formatDocument, formatPhone, formatPostalCode } from '@/lib/br';
import { notifyError, notifySuccess } from '@/lib/notify';
import { EditContactModal } from './EditContactModal';
import { RenameCustomerModal } from './RenameCustomerModal';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" mb="sm">
        <Title order={4}>{title}</Title>
        {action}
      </Group>
      {children}
    </Paper>
  );
}

function formatAddress(address: Address): string[] {
  const firstLine = [address.street, address.number, address.complement].filter(Boolean).join(', ');
  const secondLine = [address.neighborhood, `${address.city}/${address.state}`].filter(Boolean).join(' · ');
  return [firstLine, secondLine, `CEP ${formatPostalCode(address.postalCode)}`];
}

type ModalState = 'rename' | 'contact' | 'archive' | null;

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useCustomer(id);
  const archive = useArchiveCustomer();
  const [modal, setModal] = useState<ModalState>(null);

  const back = (
    <Anchor component={Link} to="/clientes" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} />
        Clientes
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
  if (error || !customer) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <Stack>
        {back}
        <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
          {notFound ? 'Cliente não encontrado.' : errorMessage(error)}
        </Alert>
      </Stack>
    );
  }

  const editable = customer.active;
  const { contactInfo } = customer;
  const documentType = customer.document.length === 14 ? 'CNPJ' : 'CPF';

  const confirmArchive = () => {
    archive.mutate(customer.id, {
      onSuccess: () => {
        notifySuccess(`${customer.name} foi arquivado.`);
        navigate('/clientes');
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
            <Title order={2}>{customer.name}</Title>
            {!customer.active && <Badge color="gray">Arquivado</Badge>}
          </Group>
          <Text c="dimmed">
            {documentType} {formatDocument(customer.document)}
          </Text>
        </Stack>
        {editable && (
          <Group gap="xs">
            <Button variant="default" leftSection={<IconPencil size={16} />} onClick={() => setModal('rename')}>
              Renomear
            </Button>
            <Button variant="light" color="red" leftSection={<IconArchive size={16} />} onClick={() => setModal('archive')}>
              Arquivar
            </Button>
          </Group>
        )}
      </Group>

      {!editable && (
        <Alert color="gray" icon={<IconArchive size={18} />}>
          Cliente arquivado: os dados ficam só para consulta.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Section
          title="Contato"
          action={
            editable && (
              <Button size="xs" variant="subtle" onClick={() => setModal('contact')}>
                Editar contato
              </Button>
            )
          }
        >
          <Stack gap="xs">
            <Group gap="xs">
              <IconMail size={16} />
              <Anchor href={`mailto:${contactInfo.email}`}>{contactInfo.email}</Anchor>
            </Group>
            <Group gap="xs">
              <IconPhone size={16} />
              <Text>{formatPhone(contactInfo.phone)}</Text>
            </Group>
          </Stack>
        </Section>

        <Section title="Endereço">
          {contactInfo.address ? (
            <Stack gap={2}>
              {formatAddress(contactInfo.address).map((line) => (
                <Text key={line}>{line}</Text>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">Sem endereço cadastrado.{editable && ' Use "Editar contato" para incluir.'}</Text>
          )}
        </Section>
      </SimpleGrid>

      <RenameCustomerModal customer={customer} opened={modal === 'rename'} onClose={() => setModal(null)} />
      <EditContactModal customer={customer} opened={modal === 'contact'} onClose={() => setModal(null)} />
      <ConfirmModal
        opened={modal === 'archive'}
        title="Arquivar cliente"
        confirmLabel="Arquivar"
        danger
        loading={archive.isPending}
        onConfirm={confirmArchive}
        onClose={() => setModal(null)}
      >
        {customer.name} sai da lista de clientes e não poderá mais ser editado. A API não permite desarquivar.
      </ConfirmModal>
    </Stack>
  );
}

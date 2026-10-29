import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Anchor, Button, Grid, Group, List, Paper, PasswordInput, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useCustomers } from '@/api/customers';
import { ApiError } from '@/api/http';
import { useTechnicians } from '@/api/technicians';
import { LINKED_ROLES, useCreateUser, type UserAccount } from '@/api/users';
import { isRole, ROLE_LABELS, ROLES, type Role } from '@/auth/roles';
import { PageHeader } from '@/components/PageHeader';
import { formatDocument } from '@/lib/br';
import { notifyError } from '@/lib/notify';

// CreateUserAccountRequest: usuário (até 255 caracteres) e senha obrigatórios; vínculo só para cliente e técnico.
const schema = z
  .object({
    username: z.string().trim().min(1, 'Informe o usuário').max(255, 'Use no máximo 255 caracteres'),
    password: z.string().min(1, 'Informe a senha'),
    confirmPassword: z.string(),
    role: z.enum(ROLES, { error: 'Escolha o papel' }),
    linkedDomainId: z.string(),
  })
  .superRefine((values, context) => {
    if (values.confirmPassword !== values.password) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não conferem' });
    }
    if (LINKED_ROLES.includes(values.role) && !values.linkedDomainId) {
      const message = values.role === 'CUSTOMER' ? 'Escolha o cliente' : 'Escolha o técnico';
      context.addIssue({ code: 'custom', path: ['linkedDomainId'], message });
    }
  });

type FormValues = z.input<typeof schema>;

const ROLE_HINTS: Record<Role, string> = {
  ADMIN: 'Acesso total, inclusive criar contas.',
  MANAGER: 'Cadastros, ordens de serviço, orçamentos, estoque e compras.',
  TECHNICIAN: 'Vê e executa as ordens de serviço. A conta fica ligada ao cadastro do técnico.',
  CUSTOMER: 'Acompanha ordens de serviço e decide orçamentos. A conta fica ligada ao cadastro do cliente.',
};

interface CreatedAccount {
  account: UserAccount;
  linkedName?: string;
}

/** /usuarios (só ADMIN). Aceita ?papel=TECHNICIAN&vinculo=<id>, usado pelos atalhos de técnicos e clientes. */
export function UsersPage() {
  const [params] = useSearchParams();
  const presetRole = params.get('papel');
  const create = useCreateUser();
  const customers = useCustomers();
  const technicians = useTechnicians();
  const [created, setCreated] = useState<CreatedAccount | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      role: isRole(presetRole) ? presetRole : undefined,
      linkedDomainId: params.get('vinculo') ?? '',
    },
  });

  const role = watch('role');
  const linkedOptions =
    role === 'CUSTOMER'
      ? (customers.data ?? []).map((customer) => ({
          value: customer.id,
          label: `${customer.name} · ${formatDocument(customer.document)}`,
        }))
      : (technicians.data ?? [])
          .filter((technician) => technician.status !== 'INACTIVE')
          .map((technician) => ({ value: technician.id, label: technician.name }));
  const needsLink = role !== undefined && LINKED_ROLES.includes(role);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const account = await create.mutateAsync({
        username: values.username.trim(),
        password: values.password,
        role: values.role,
        linkedDomainId: needsLink ? values.linkedDomainId : undefined,
      });
      const linkedName = linkedOptions.find((option) => option.value === account.linkedDomainId)?.label;
      setCreated({ account, linkedName });
      reset({ username: '', password: '', confirmPassword: '', role: values.role, linkedDomainId: '' });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'USERNAME_ALREADY_EXISTS') {
        setError('username', { message: 'Este usuário já existe.' });
        return;
      }
      notifyError(error);
    }
  });

  return (
    <Stack>
      <PageHeader title="Usuários" description="Crie contas de acesso ao sistema e defina o papel de cada uma." />

      <Alert color="blue" icon={<IconInfoCircle size={18} />} maw={760}>
        A API só permite criar contas: não há rota para listar, editar, trocar a senha ou remover. Anote o usuário e
        a senha ao criar.
      </Alert>

      {created && (
        <Alert color="green" icon={<IconCircleCheck size={18} />} maw={760} withCloseButton onClose={() => setCreated(null)}>
          <Text fw={500}>Conta {created.account.username} criada.</Text>
          <List size="sm" mt={4}>
            <List.Item>Papel: {ROLE_LABELS[created.account.role]}</List.Item>
            {created.linkedName && <List.Item>Vinculada a: {created.linkedName}</List.Item>}
          </List>
        </Alert>
      )}

      <Paper withBorder p="lg" radius="md" maw={760}>
        <form onSubmit={onSubmit} noValidate>
          <Stack>
            <Title order={4}>Nova conta</Title>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  label="Papel"
                  placeholder="Escolha o papel"
                  data={ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
                  value={field.value ?? null}
                  onChange={(value) => {
                    field.onChange(value ?? undefined);
                    setValue('linkedDomainId', '');
                  }}
                  description={field.value ? ROLE_HINTS[field.value] : undefined}
                  error={errors.role?.message}
                  allowDeselect={false}
                />
              )}
            />
            {needsLink && (
              <Controller
                control={control}
                name="linkedDomainId"
                render={({ field }) => (
                  <Select
                    label={role === 'CUSTOMER' ? 'Cliente' : 'Técnico'}
                    placeholder={role === 'CUSTOMER' ? 'Busque pelo nome ou CPF/CNPJ' : 'Busque pelo nome'}
                    data={linkedOptions}
                    searchable
                    nothingFoundMessage={role === 'CUSTOMER' ? 'Nenhum cliente ativo' : 'Nenhum técnico ativo'}
                    value={field.value || null}
                    onChange={(value) => field.onChange(value ?? '')}
                    error={errors.linkedDomainId?.message}
                    description={
                      role === 'CUSTOMER' ? (
                        <>
                          Não encontrou? <Anchor component={Link} to="/clientes/novo" size="xs">Cadastre o cliente</Anchor>.
                        </>
                      ) : (
                        <>
                          Não encontrou? <Anchor component={Link} to="/tecnicos" size="xs">Cadastre o técnico</Anchor>.
                        </>
                      )
                    }
                  />
                )}
              />
            )}
            <TextInput label="Usuário" autoComplete="off" error={errors.username?.message} {...register('username')} />
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <PasswordInput label="Senha" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <PasswordInput
                  label="Confirmar senha"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end">
              <Button type="submit" loading={isSubmitting}>
                Criar conta
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}

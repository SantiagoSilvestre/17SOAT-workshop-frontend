import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Anchor, Button, Grid, Group, Paper, Stack, TextInput, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi, useCreateCustomer, type Customer } from '@/api/customers';
import { ApiError } from '@/api/http';
import { PageHeader } from '@/components/PageHeader';
import { formatDocument, isValidDocument, onlyDigits } from '@/lib/br';
import { notifyError, notifySuccess } from '@/lib/notify';
import { ContactFields } from './ContactFields';
import { createCustomerSchema, emptyAddress, toAddressPayload, type CreateCustomerFormValues } from './customerForm';

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const create = useCreateCustomer();
  const [existing, setExisting] = useState<Customer | null>(null);

  const form = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { name: '', document: '', email: '', phone: '', hasAddress: false, address: emptyAddress },
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  // Avisa já no campo se o CPF/CNPJ pertence a um cliente ativo (GET /customers/identify).
  const checkExisting = async (document: string) => {
    setExisting(null);
    if (!isValidDocument(document)) return;
    try {
      setExisting(await customersApi.identify(onlyDigits(document)));
    } catch {
      // 404 = documento livre; outros erros aparecem no envio.
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const customer = await create.mutateAsync({
        name: values.name.trim(),
        document: onlyDigits(values.document),
        contactInfo: {
          email: values.email.trim(),
          phone: onlyDigits(values.phone),
          address: values.hasAddress ? toAddressPayload(values.address) : undefined,
        },
      });
      notifySuccess(`${customer.name} foi cadastrado.`);
      navigate(`/clientes/${customer.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CUSTOMER_TAX_ID_ALREADY_EXISTS') {
        setError('document', { message: 'Já existe um cliente com este CPF/CNPJ.' });
        return;
      }
      notifyError(error);
    }
  });

  return (
    <Stack>
      <PageHeader title="Novo cliente" description="Cadastre o cliente pelo CPF ou CNPJ e os dados de contato." />

      <Paper withBorder p="lg" radius="md" maw={760}>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate>
            <Stack>
              <Title order={4}>Identificação</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 7 }}>
                  <TextInput label="Nome" autoFocus error={errors.name?.message} {...register('name')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <Controller
                    control={control}
                    name="document"
                    render={({ field }) => (
                      <TextInput
                        label="CPF ou CNPJ"
                        inputMode="numeric"
                        value={formatDocument(field.value)}
                        onChange={(event) => field.onChange(formatDocument(event.currentTarget.value))}
                        onBlur={() => {
                          field.onBlur();
                          void checkExisting(field.value);
                        }}
                        error={errors.document?.message}
                      />
                    )}
                  />
                </Grid.Col>
              </Grid>

              {existing && (
                <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
                  Este CPF/CNPJ já pertence a{' '}
                  <Anchor component={Link} to={`/clientes/${existing.id}`}>
                    {existing.name}
                  </Anchor>
                  .
                </Alert>
              )}

              <Title order={4} mt="sm">
                Contato
              </Title>
              <ContactFields />

              <Group justify="flex-end" mt="md">
                <Button variant="default" component={Link} to="/clientes">
                  Cancelar
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Cadastrar
                </Button>
              </Group>
            </Stack>
          </form>
        </FormProvider>
      </Paper>
    </Stack>
  );
}

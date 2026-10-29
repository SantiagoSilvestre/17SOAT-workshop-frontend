import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Grid, Group, Paper, Select, Stack, TextInput, Title } from '@mantine/core';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomers } from '@/api/customers';
import { useCreateVehicle } from '@/api/vehicles';
import { IntegerInput } from '@/components/IntegerInput';
import { PageHeader } from '@/components/PageHeader';
import { formatDocument } from '@/lib/br';
import { notifyError, notifySuccess } from '@/lib/notify';
import { formatPlate, normalizePlate } from '@/lib/vehicle';
import { VehicleDescriptionFields } from './VehicleDescriptionFields';
import { setVehicleFieldError } from './vehicleErrors';
import { createVehicleSchema, toChassisPayload, type CreateVehicleFormValues } from './vehicleForm';

/** /veiculos/novo. Com ?cliente=<id> (vindo do detalhe do cliente), o cliente já vem escolhido. */
export function VehicleCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetCustomerId = params.get('cliente') ?? '';
  const customers = useCustomers();
  const create = useCreateVehicle();

  const form = useForm<CreateVehicleFormValues>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      customerId: presetCustomerId,
      licensePlate: '',
      brand: '',
      model: '',
      year: undefined,
      color: '',
      chassis: '',
      mileage: undefined,
    },
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const customerOptions = (customers.data ?? []).map((customer) => ({
    value: customer.id,
    label: `${customer.name} · ${formatDocument(customer.document)}`,
  }));
  const backTo = presetCustomerId ? `/clientes/${presetCustomerId}` : '/veiculos';

  const onSubmit = handleSubmit(async (values) => {
    try {
      const vehicle = await create.mutateAsync({
        customerId: values.customerId,
        licensePlate: normalizePlate(values.licensePlate),
        chassis: toChassisPayload(values.chassis),
        brand: values.brand.trim(),
        model: values.model.trim(),
        year: values.year,
        color: values.color.trim(),
        mileage: values.mileage ?? undefined,
      });
      notifySuccess(`Veículo ${formatPlate(vehicle.licensePlate)} cadastrado.`);
      navigate(`/veiculos/${vehicle.id}`);
    } catch (error) {
      if (!setVehicleFieldError(error, setError, ['licensePlate', 'chassis', 'customerId'])) notifyError(error);
    }
  });

  return (
    <Stack>
      <PageHeader title="Novo veículo" description="Cadastre o veículo de um cliente ativo pela placa." />

      <Paper withBorder p="lg" radius="md" maw={760}>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate>
            <Stack>
              <Title order={4}>Identificação</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 8 }}>
                  <Controller
                    control={control}
                    name="customerId"
                    render={({ field }) => (
                      <Select
                        label="Cliente"
                        placeholder={customers.isLoading ? 'Carregando clientes…' : 'Busque pelo nome ou CPF/CNPJ'}
                        data={customerOptions}
                        searchable
                        nothingFoundMessage="Nenhum cliente ativo encontrado"
                        value={field.value || null}
                        onChange={(value) => field.onChange(value ?? '')}
                        onBlur={field.onBlur}
                        error={errors.customerId?.message ?? (customers.error ? 'Não foi possível carregar os clientes' : undefined)}
                      />
                    )}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Controller
                    control={control}
                    name="licensePlate"
                    render={({ field }) => (
                      <TextInput
                        label="Placa"
                        placeholder="ABC-1234 ou ABC1D23"
                        autoFocus={Boolean(presetCustomerId)}
                        value={field.value}
                        onChange={(event) => field.onChange(normalizePlate(event.currentTarget.value))}
                        onBlur={() => {
                          field.onChange(formatPlate(field.value));
                          field.onBlur();
                        }}
                        error={errors.licensePlate?.message}
                      />
                    )}
                  />
                </Grid.Col>
              </Grid>

              <Title order={4} mt="sm">
                Dados do veículo
              </Title>
              <VehicleDescriptionFields />
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Controller
                    control={control}
                    name="mileage"
                    render={({ field }) => (
                      <IntegerInput
                        label="Quilometragem atual (opcional)"
                        thousandSeparator="."
                        suffix=" km"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.mileage?.message}
                      />
                    )}
                  />
                </Grid.Col>
              </Grid>

              <Group justify="flex-end" mt="md">
                <Button variant="default" component={Link} to={backTo}>
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

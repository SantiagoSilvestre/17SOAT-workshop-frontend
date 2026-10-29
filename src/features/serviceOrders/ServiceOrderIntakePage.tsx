import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Grid,
  Group,
  List,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconUserCheck } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useCatalogServices } from '@/api/catalogServices';
import { customersApi, type Customer } from '@/api/customers';
import { ApiError } from '@/api/http';
import { PRIORITIES, PRIORITY_LABELS, useIntake, type IntakeResult } from '@/api/serviceOrders';
import { useStockItems } from '@/api/stockItems';
import { useTechnicians } from '@/api/technicians';
import { useVehicles, type Vehicle } from '@/api/vehicles';
import { IntegerInput } from '@/components/IntegerInput';
import { PageHeader } from '@/components/PageHeader';
import { formatDocument, formatPhoneInput, isValidDocument, onlyDigits } from '@/lib/br';
import { notifyError } from '@/lib/notify';
import { formatPlate, isValidPlate, normalizePlate } from '@/lib/vehicle';
import { VehicleDescriptionFields } from '@/features/vehicles/VehicleDescriptionFields';
import { emptyIntake, intakeSchema, toIntakeInput, type IntakeFormValues } from './intakeForm';
import { IntakeServicesEditor } from './IntakeServicesEditor';
import { shortId } from './serviceOrderLabels';

/** Conflitos do intake que pertencem a um campo do formulário. */
const FIELD_ERRORS: Record<string, { field: keyof IntakeFormValues; message: string }> = {
  CUSTOMER_ARCHIVED: { field: 'document', message: 'Este cliente está arquivado.' },
  VEHICLE_ARCHIVED: { field: 'licensePlate', message: 'Este veículo está arquivado.' },
  VEHICLE_OWNED_BY_ANOTHER_CUSTOMER: { field: 'licensePlate', message: 'Esta placa é de outro cliente.' },
  VEHICLE_CHASSIS_ALREADY_EXISTS: { field: 'chassis', message: 'Já existe um veículo com este chassi.' },
};

type CustomerLookup = { state: 'idle' } | { state: 'found'; customer: Customer } | { state: 'new' };

function IntakeResultView({ result, onAgain }: { result: IntakeResult; onAgain: () => void }) {
  const order = result.serviceOrder;
  return (
    <Paper withBorder p="lg" radius="md" maw={760}>
      <Stack>
        <Group gap="sm">
          <IconCircleCheck size={28} color="var(--mantine-color-green-6)" />
          <Title order={3}>OS #{shortId(order.id)} aberta</Title>
        </Group>
        <List spacing={4}>
          <List.Item>
            Cliente {result.customer.created ? 'cadastrado nesta abertura' : 'já cadastrado'}:{' '}
            <Anchor component={Link} to={`/clientes/${result.customer.id}`}>
              ver cliente
            </Anchor>
          </List.Item>
          <List.Item>
            Veículo {formatPlate(order.vehicleSnapshot.licensePlate)}{' '}
            {result.vehicle.created ? 'cadastrado nesta abertura' : 'já cadastrado'}:{' '}
            <Anchor component={Link} to={`/veiculos/${result.vehicle.id}`}>
              ver veículo
            </Anchor>
          </List.Item>
          <List.Item>
            {result.estimateId ? (
              <>
                Diagnóstico com {order.executions.length} {order.executions.length === 1 ? 'serviço' : 'serviços'} e
                orçamento <Badge variant="light">#{shortId(result.estimateId)}</Badge> gerado, aguardando aprovação.
              </>
            ) : (
              'Sem serviços: o diagnóstico fica para depois.'
            )}
          </List.Item>
        </List>
        <Group justify="flex-end">
          <Button variant="default" onClick={onAgain}>
            Abrir outra OS
          </Button>
          <Button component={Link} to="/ordens-de-servico">
            Ir para o painel
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

/** /ordens-de-servico/nova: abre a OS numa chamada só, cadastrando cliente e veículo quando preciso. */
export function ServiceOrderIntakePage() {
  const intake = useIntake();
  const vehicles = useVehicles();
  const technicians = useTechnicians();
  const catalog = useCatalogServices();
  const stock = useStockItems();
  const [customerLookup, setCustomerLookup] = useState<CustomerLookup>({ state: 'idle' });
  const [result, setResult] = useState<IntakeResult | null>(null);

  const form = useForm<IntakeFormValues>({ resolver: zodResolver(intakeSchema), defaultValues: emptyIntake });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const customerIsNew = watch('customerIsNew');
  const vehicleIsNew = watch('vehicleIsNew');
  const plate = watch('licensePlate');

  // GET /customers/identify: com cadastro, a abertura reaproveita o cliente e ignora nome e contato.
  const lookupCustomer = async (): Promise<Customer | null> => {
    const document = getValues('document');
    if (!isValidDocument(document)) {
      setCustomerLookup({ state: 'idle' });
      setValue('customerIsNew', false);
      return null;
    }
    try {
      const customer = await customersApi.identify(onlyDigits(document));
      setCustomerLookup({ state: 'found', customer });
      setValue('customerIsNew', false);
      return customer;
    } catch {
      // 404 = sem cadastro; outros erros aparecem no envio.
      setCustomerLookup({ state: 'new' });
      setValue('customerIsNew', true);
      return null;
    }
  };

  // A API não busca veículo por placa; a lista de ativos já está em cache para isso.
  const findVehicle = (value: string): Vehicle | undefined =>
    isValidPlate(value) ? vehicles.data?.find((vehicle) => vehicle.licensePlate === normalizePlate(value)) : undefined;
  const knownVehicle = findVehicle(plate);
  const ownerId = customerLookup.state === 'found' ? customerLookup.customer.id : undefined;
  const vehicleOfAnotherCustomer = knownVehicle !== undefined && knownVehicle.customerId !== ownerId;

  const lookupVehicle = () => {
    const value = getValues('licensePlate');
    setValue('vehicleIsNew', isValidPlate(value) && !findVehicle(value));
  };

  const submit = handleSubmit(async (values) => {
    try {
      setResult(await intake.mutateAsync(toIntakeInput(values)));
    } catch (error) {
      const mapped = error instanceof ApiError ? FIELD_ERRORS[error.code] : undefined;
      if (mapped) {
        setError(mapped.field, { message: mapped.message });
        return;
      }
      notifyError(error, 'Não foi possível abrir a OS');
    }
  });

  // Garante a consulta do cliente e do veículo mesmo se o envio vier sem sair dos campos.
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (customerLookup.state === 'idle') await lookupCustomer();
    lookupVehicle();
    await submit();
  };

  const startOver = () => {
    reset(emptyIntake);
    setCustomerLookup({ state: 'idle' });
    setResult(null);
  };

  if (result) {
    return (
      <Stack>
        <PageHeader title="Nova ordem de serviço" />
        <IntakeResultView result={result} onAgain={startOver} />
      </Stack>
    );
  }

  const activeTechnicians = (technicians.data ?? []).filter((technician) => technician.status !== 'INACTIVE');

  return (
    <Stack>
      <PageHeader
        title="Nova ordem de serviço"
        description="Identifique o cliente e o veículo; quem ainda não tem cadastro é cadastrado na mesma hora."
      />

      <Paper withBorder p="lg" radius="md" maw={860}>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate>
            <Stack>
              <Title order={4}>Cliente</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <Controller
                    control={control}
                    name="document"
                    render={({ field }) => (
                      <TextInput
                        label="CPF ou CNPJ"
                        inputMode="numeric"
                        autoFocus
                        value={formatDocument(field.value)}
                        onChange={(event) => {
                          field.onChange(formatDocument(event.currentTarget.value));
                          setCustomerLookup({ state: 'idle' });
                        }}
                        onBlur={() => {
                          field.onBlur();
                          void lookupCustomer();
                        }}
                        error={errors.document?.message}
                      />
                    )}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 7 }}>
                  {customerLookup.state === 'found' && (
                    <Alert color="green" icon={<IconUserCheck size={18} />} mt={{ sm: 24 }} py="xs">
                      <Anchor component={Link} to={`/clientes/${customerLookup.customer.id}`} fw={500}>
                        {customerLookup.customer.name}
                      </Anchor>{' '}
                      já tem cadastro.
                    </Alert>
                  )}
                  {customerLookup.state === 'new' && (
                    <Text size="sm" c="dimmed" mt={{ sm: 32 }}>
                      Cliente novo: preencha os dados para cadastrar.
                    </Text>
                  )}
                </Grid.Col>
              </Grid>
              {customerIsNew && (
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput label="Nome" error={errors.name?.message} {...register('name')} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <TextInput
                          label="Telefone"
                          inputMode="tel"
                          value={formatPhoneInput(field.value)}
                          onChange={(event) => field.onChange(formatPhoneInput(event.currentTarget.value))}
                          onBlur={field.onBlur}
                          error={errors.phone?.message}
                        />
                      )}
                    />
                  </Grid.Col>
                </Grid>
              )}

              <Title order={4} mt="sm">
                Veículo
              </Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <Controller
                    control={control}
                    name="licensePlate"
                    render={({ field }) => (
                      <TextInput
                        label="Placa"
                        placeholder="ABC-1234 ou ABC1D23"
                        value={field.value}
                        onChange={(event) => field.onChange(normalizePlate(event.currentTarget.value))}
                        onBlur={() => {
                          field.onChange(formatPlate(field.value));
                          field.onBlur();
                          lookupVehicle();
                        }}
                        error={errors.licensePlate?.message}
                      />
                    )}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 7 }}>
                  {knownVehicle && !vehicleOfAnotherCustomer && (
                    <Alert color="green" icon={<IconCircleCheck size={18} />} mt={{ sm: 24 }} py="xs">
                      {knownVehicle.brand} {knownVehicle.model} {knownVehicle.year} · {knownVehicle.color} já tem
                      cadastro.
                    </Alert>
                  )}
                  {knownVehicle && vehicleOfAnotherCustomer && customerLookup.state !== 'idle' && (
                    <Alert color="yellow" icon={<IconAlertTriangle size={18} />} mt={{ sm: 24 }} py="xs">
                      Esta placa está cadastrada para outro cliente. A abertura será recusada.
                    </Alert>
                  )}
                  {vehicleIsNew && (
                    <Text size="sm" c="dimmed" mt={{ sm: 32 }}>
                      Veículo novo: preencha os dados para cadastrar.
                    </Text>
                  )}
                </Grid.Col>
              </Grid>
              {vehicleIsNew && (
                <>
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
                </>
              )}

              <Title order={4} mt="sm">
                Atendimento
              </Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Select
                        label="Prioridade"
                        data={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
                        value={field.value}
                        onChange={(value) => value && field.onChange(value)}
                        allowDeselect={false}
                      />
                    )}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea
                    label="Avaliação inicial"
                    description="O que o cliente relatou e o que foi observado na recepção."
                    autosize
                    minRows={3}
                    error={errors.initialAssessment?.message}
                    {...register('initialAssessment')}
                  />
                </Grid.Col>
              </Grid>

              <Title order={4} mt="sm">
                Serviços (opcional)
              </Title>
              <Text size="sm" c="dimmed" mt={-8}>
                Com serviços, a abertura já registra o diagnóstico e gera o orçamento para aprovação. Sem eles, a OS
                fica como recebida e o diagnóstico é feito depois.
              </Text>
              <IntakeServicesEditor catalogServices={catalog.data ?? []} stockItems={stock.data ?? []} />
              {watch('services').length > 0 && (
                <Controller
                  control={control}
                  name="diagnosisTechnicianId"
                  render={({ field }) => (
                    <Select
                      label="Diagnóstico feito por"
                      placeholder="Escolha o técnico"
                      data={activeTechnicians.map((technician) => ({ value: technician.id, label: technician.name }))}
                      searchable
                      nothingFoundMessage="Nenhum técnico ativo"
                      value={field.value || null}
                      onChange={(value) => field.onChange(value ?? '')}
                      error={errors.diagnosisTechnicianId?.message}
                      maw={400}
                    />
                  )}
                />
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="default" component={Link} to="/ordens-de-servico">
                  Cancelar
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Abrir OS
                </Button>
              </Group>
            </Stack>
          </form>
        </FormProvider>
      </Paper>
    </Stack>
  );
}

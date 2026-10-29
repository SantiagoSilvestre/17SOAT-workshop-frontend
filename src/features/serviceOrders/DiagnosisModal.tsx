import { zodResolver } from '@hookform/resolvers/zod';
import { ActionIcon, Alert, Button, Group, Modal, Select, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useCatalogServices } from '@/api/catalogServices';
import { errorMessage } from '@/api/http';
import { usePerformDiagnosis, type ServiceOrder } from '@/api/serviceOrders';
import { MoneyInput } from '@/components/MoneyInput';
import { formatMoney, toMoney } from '@/lib/money';
import { notifyError, notifySuccess } from '@/lib/notify';

// PerformDiagnosisRequest: quem diagnosticou e ao menos um serviço do catálogo, com preço >= 0.
const diagnosisSchema = z.object({
  technicianId: z.string().min(1, 'Escolha quem fez o diagnóstico'),
  items: z
    .array(
      z.object({
        catalogServiceId: z.string().min(1, 'Escolha o serviço'),
        // O campo vazio emite null (MoneyInput).
        price: z
          .number()
          .min(0, 'O valor não pode ser negativo')
          .nullable()
          .refine((value) => value !== null, 'Informe o valor'),
      }),
    )
    .min(1, 'Adicione ao menos um serviço')
    .max(20, 'No máximo 20 serviços'),
});

type FormValues = z.input<typeof diagnosisSchema>;

interface DiagnosisModalProps {
  opened: boolean;
  order: ServiceOrder;
  /**
   * Técnicos que podem assinar o diagnóstico (só a equipe administrativa consegue listar).
   * Sem lista, o diagnóstico sai no nome de `selfTechnicianId`, o técnico logado.
   */
  technicians: { value: string; label: string }[] | null;
  selfTechnicianId: string | null;
  onClose: () => void;
}

/** Registra o diagnóstico com serviços do catálogo. As peças entram numa etapa seguinte. */
export function DiagnosisModal({ opened, order, technicians, selfTechnicianId, onClose }: DiagnosisModalProps) {
  const catalog = useCatalogServices();
  const perform = usePerformDiagnosis();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(diagnosisSchema) });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });

  useEffect(() => {
    if (!opened) return;
    reset({
      technicianId: technicians ? (order.diagnosisAssigneeId ?? '') : (selfTechnicianId ?? ''),
      items: [{ catalogServiceId: '', price: null }],
    });
  }, [opened, order.diagnosisAssigneeId, technicians, selfTechnicianId, reset]);

  const services = catalog.data ?? [];
  const options = services.map((service) => ({ value: service.id, label: `${service.name} · ${formatMoney(service.basePrice)}` }));
  const total = (items ?? []).reduce((sum, item) => sum + (item.price ?? 0), 0);

  const onSubmit = handleSubmit(async ({ technicianId, items: chosen }) => {
    const input = {
      diagnosedByTechnicianId: technicianId,
      items: chosen.map((item) => ({
        catalogServiceId: item.catalogServiceId,
        name: services.find((service) => service.id === item.catalogServiceId)?.name ?? '',
        price: toMoney(item.price ?? 0),
      })),
    };
    try {
      await perform.mutateAsync({ id: order.id, input });
      notifySuccess('Diagnóstico registrado.');
      onClose();
    } catch (error) {
      notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Registrar diagnóstico" size="lg" centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          {technicians ? (
            <Controller
              control={control}
              name="technicianId"
              render={({ field }) => (
                <Select
                  label="Diagnosticado por"
                  data={technicians}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? '')}
                  searchable
                  error={errors.technicianId?.message}
                />
              )}
            />
          ) : (
            <Text size="sm" c="dimmed">
              O diagnóstico fica registrado no seu nome.
            </Text>
          )}

          {catalog.error ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
              Não foi possível carregar o catálogo: {errorMessage(catalog.error)}
            </Alert>
          ) : null}

          <Stack gap="xs">
            <Text fw={500} size="sm">
              Serviços
            </Text>
            {fields.map((field, index) => (
              <Group key={field.id} align="flex-start" gap="xs" wrap="nowrap">
                <Controller
                  control={control}
                  name={`items.${index}.catalogServiceId`}
                  render={({ field: service }) => (
                    <Select
                      aria-label={`Serviço ${index + 1}`}
                      placeholder="Serviço do catálogo"
                      data={options}
                      searchable
                      nothingFoundMessage="Nenhum serviço ativo"
                      value={service.value || null}
                      onChange={(value) => {
                        service.onChange(value ?? '');
                        // Começa com o preço de tabela; quem diagnostica pode ajustar para este veículo.
                        const chosen = services.find((candidate) => candidate.id === value);
                        if (chosen) setValue(`items.${index}.price`, chosen.basePrice.value, { shouldValidate: true });
                      }}
                      error={errors.items?.[index]?.catalogServiceId?.message}
                      style={{ flex: 1 }}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`items.${index}.price`}
                  render={({ field: price }) => (
                    <MoneyInput
                      aria-label={`Valor do serviço ${index + 1}`}
                      w={140}
                      value={price.value}
                      onChange={price.onChange}
                      error={errors.items?.[index]?.price?.message}
                    />
                  )}
                />
                <Tooltip label="Remover serviço">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    mt={6}
                    aria-label={`Remover serviço ${index + 1}`}
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ))}
            {errors.items?.root?.message || errors.items?.message ? (
              <Text size="sm" c="red">
                {errors.items?.root?.message ?? errors.items?.message}
              </Text>
            ) : null}
            <Group justify="space-between">
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconPlus size={14} />}
                onClick={() => append({ catalogServiceId: '', price: null })}
                disabled={fields.length >= 20}
              >
                Adicionar serviço
              </Button>
              <Text size="sm">
                Total: <strong>{formatMoney(toMoney(total))}</strong>
              </Text>
            </Group>
          </Stack>

          <Text size="xs" c="dimmed">
            Depois de registrado, o diagnóstico só muda pelo orçamento: os serviços ficam aguardando a aprovação do
            cliente.
          </Text>

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Registrar diagnóstico
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

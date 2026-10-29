import { ActionIcon, Button, Group, Paper, Select, Stack, Text, Tooltip } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { CatalogService } from '@/api/catalogServices';
import { STOCK_ITEM_TYPE_LABELS, type StockItem } from '@/api/stockItems';
import { IntegerInput } from '@/components/IntegerInput';
import { formatMoney, toMoney } from '@/lib/money';
import type { IntakeFormValues } from './intakeForm';

interface Catalogs {
  catalogServices: CatalogService[];
  stockItems: StockItem[];
}

function PartsEditor({ serviceIndex, stockItems }: { serviceIndex: number; stockItems: StockItem[] }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<IntakeFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: `services.${serviceIndex}.parts` });
  const options = stockItems.map((item) => ({
    value: item.id,
    label: `${item.name} · ${STOCK_ITEM_TYPE_LABELS[item.type]} · ${formatMoney(item.price)} · ${item.availableQuantity} em estoque`,
  }));
  const serviceErrors = errors.services?.[serviceIndex]?.parts;

  return (
    <Stack gap="xs" pl="md">
      {fields.map((field, partIndex) => (
        <Group key={field.id} align="flex-start" gap="xs" wrap="nowrap">
          <Controller
            control={control}
            name={`services.${serviceIndex}.parts.${partIndex}.stockItemId`}
            render={({ field: item }) => (
              <Select
                aria-label={`Item ${partIndex + 1} do serviço ${serviceIndex + 1}`}
                placeholder="Peça ou insumo"
                data={options}
                searchable
                nothingFoundMessage="Nenhum item ativo"
                value={item.value || null}
                onChange={(value) => item.onChange(value ?? '')}
                error={serviceErrors?.[partIndex]?.stockItemId?.message}
                style={{ flex: 1 }}
              />
            )}
          />
          <Controller
            control={control}
            name={`services.${serviceIndex}.parts.${partIndex}.quantity`}
            render={({ field: quantity }) => (
              <IntegerInput
                aria-label={`Quantidade do item ${partIndex + 1} do serviço ${serviceIndex + 1}`}
                w={90}
                value={quantity.value}
                onChange={quantity.onChange}
                error={serviceErrors?.[partIndex]?.quantity?.message}
              />
            )}
          />
          <Tooltip label="Remover item">
            <ActionIcon
              variant="subtle"
              color="gray"
              mt={6}
              aria-label={`Remover item ${partIndex + 1} do serviço ${serviceIndex + 1}`}
              onClick={() => remove(partIndex)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ))}
      <Group>
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={14} />}
          onClick={() => append({ stockItemId: '', quantity: 1 })}
          disabled={fields.length >= 20}
        >
          Adicionar peça ou insumo
        </Button>
      </Group>
    </Stack>
  );
}

/** Serviços do catálogo e peças de cada um. Com serviços, a abertura já gera o orçamento. */
export function IntakeServicesEditor({ catalogServices, stockItems }: Catalogs) {
  const {
    control,
    formState: { errors },
  } = useFormContext<IntakeFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'services' });
  const services = useWatch({ control, name: 'services' });

  const options = catalogServices.map((service) => ({
    value: service.id,
    label: `${service.name} · ${formatMoney(service.basePrice)}`,
  }));

  // Prévia com os preços atuais; o backend copia nome e preço do catálogo e do estoque no momento da abertura.
  const priceOf = (id: string) => catalogServices.find((service) => service.id === id)?.basePrice.value ?? 0;
  const partPrice = (id: string) => stockItems.find((item) => item.id === id)?.price.value ?? 0;
  const total = (services ?? []).reduce(
    (sum, service) =>
      sum +
      priceOf(service.catalogServiceId) +
      service.parts.reduce((parts, part) => parts + partPrice(part.stockItemId) * (part.quantity ?? 0), 0),
    0,
  );

  return (
    <Stack gap="sm">
      {fields.map((field, index) => (
        <Paper key={field.id} withBorder p="sm" radius="sm">
          <Stack gap="xs">
            <Group align="flex-start" gap="xs" wrap="nowrap">
              <Controller
                control={control}
                name={`services.${index}.catalogServiceId`}
                render={({ field: service }) => (
                  <Select
                    aria-label={`Serviço ${index + 1}`}
                    placeholder="Serviço do catálogo"
                    data={options}
                    searchable
                    nothingFoundMessage="Nenhum serviço ativo"
                    value={service.value || null}
                    onChange={(value) => service.onChange(value ?? '')}
                    error={errors.services?.[index]?.catalogServiceId?.message}
                    style={{ flex: 1 }}
                  />
                )}
              />
              <Tooltip label="Remover serviço">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  mt={6}
                  aria-label={`Remover serviço ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <PartsEditor serviceIndex={index} stockItems={stockItems} />
          </Stack>
        </Paper>
      ))}
      <Group justify="space-between">
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => append({ catalogServiceId: '', parts: [] })}
          disabled={fields.length >= 20}
        >
          Adicionar serviço
        </Button>
        {fields.length > 0 && (
          <Text fw={500}>
            Prévia do orçamento: {formatMoney(toMoney(total))}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

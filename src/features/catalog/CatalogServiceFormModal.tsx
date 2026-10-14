import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateCatalogService, useUpdateCatalogService, type CatalogService } from '@/api/catalogServices';
import { ApiError } from '@/api/http';
import { MoneyInput } from '@/components/MoneyInput';
import { toMoney } from '@/lib/money';
import { notifyError, notifySuccess } from '@/lib/notify';

// Mesmas regras do CreateCatalogServiceRequest: nome obrigatório até 255 caracteres, preço >= 0.
const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do serviço').max(255, 'Use no máximo 255 caracteres'),
  basePrice: z
    .number({ error: 'Informe o preço base' })
    .min(0, 'O preço não pode ser negativo')
    .max(99_999_999_999_999_999, 'Valor alto demais'),
});

type FormValues = z.infer<typeof schema>;

interface CatalogServiceFormModalProps {
  opened: boolean;
  /** Sem serviço, o formulário cadastra um novo. */
  service?: CatalogService | null;
  onClose: () => void;
}

export function CatalogServiceFormModal({ opened, service, onClose }: CatalogServiceFormModalProps) {
  const create = useCreateCatalogService();
  const update = useUpdateCatalogService();
  const editing = Boolean(service);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (opened) {
      reset(service ? { name: service.name, basePrice: service.basePrice.value } : { name: '', basePrice: undefined });
    }
  }, [opened, service, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const input = { name: values.name, basePrice: toMoney(values.basePrice) };
    try {
      if (service) {
        await update.mutateAsync({ current: service, next: input });
        notifySuccess('Serviço atualizado.');
      } else {
        await create.mutateAsync(input);
        notifySuccess('Serviço cadastrado.');
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CATALOG_SERVICE_NAME_ALREADY_EXISTS') {
        setError('name', { message: 'Já existe um serviço com este nome.' });
        return;
      }
      notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? 'Editar serviço' : 'Novo serviço'} centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          <TextInput label="Nome" placeholder="Ex.: Troca de óleo" data-autofocus error={errors.name?.message} {...register('name')} />
          <Controller
            control={control}
            name="basePrice"
            render={({ field }) => (
              <MoneyInput
                label="Preço base"
                placeholder="R$ 0,00"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.basePrice?.message}
              />
            )}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

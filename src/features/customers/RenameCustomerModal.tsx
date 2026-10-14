import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRenameCustomer, type Customer } from '@/api/customers';
import { notifyError, notifySuccess } from '@/lib/notify';
import { nameSchema } from './customerForm';

const schema = z.object({ name: nameSchema });
type FormValues = z.infer<typeof schema>;

export function RenameCustomerModal({ customer, opened, onClose }: { customer: Customer; opened: boolean; onClose: () => void }) {
  const rename = useRenameCustomer();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (opened) reset({ name: customer.name });
  }, [opened, customer.name, reset]);

  const onSubmit = handleSubmit(async ({ name }) => {
    if (name === customer.name) return onClose();
    try {
      await rename.mutateAsync({ id: customer.id, name });
      notifySuccess('Nome atualizado.');
      onClose();
    } catch (error) {
      notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Renomear cliente" centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          <TextInput label="Nome" data-autofocus error={errors.name?.message} {...register('name')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useUpdateCustomerContact, type ContactInfoUpdate, type Customer } from '@/api/customers';
import { onlyDigits, toLocalPhone } from '@/lib/br';
import { notifyError, notifySuccess } from '@/lib/notify';
import { ContactFields } from './ContactFields';
import { contactSchema, sameAddress, toAddressPayload, toContactFormValues, type ContactFormValues } from './customerForm';

/** Monta o PATCH só com o que mudou, como a API espera (atualização parcial). */
export function buildContactUpdate(customer: Customer, values: ContactFormValues): ContactInfoUpdate {
  const update: ContactInfoUpdate = {};
  const email = values.email.trim();
  if (email !== customer.contactInfo.email) update.email = email;
  const phone = onlyDigits(values.phone);
  if (phone !== toLocalPhone(customer.contactInfo.phone)) update.phone = phone;
  if (values.hasAddress) {
    const address = toAddressPayload(values.address);
    if (!sameAddress(customer.contactInfo.address, address)) update.address = address;
  }
  return update;
}

export function EditContactModal({ customer, opened, onClose }: { customer: Customer; opened: boolean; onClose: () => void }) {
  const updateContact = useUpdateCustomerContact();
  const form = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    if (opened) reset(toContactFormValues(customer));
  }, [opened, customer, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const contactInfo = buildContactUpdate(customer, values);
    if (Object.keys(contactInfo).length === 0) return onClose();
    try {
      await updateContact.mutateAsync({ id: customer.id, contactInfo });
      notifySuccess('Contato atualizado.');
      onClose();
    } catch (error) {
      notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Editar contato" size="lg" centered>
      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate>
          <Stack>
            <ContactFields addressLocked={Boolean(customer.contactInfo.address)} />
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
      </FormProvider>
    </Modal>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useUpdateVehicle, type Vehicle } from '@/api/vehicles';
import { notifyError, notifySuccess } from '@/lib/notify';
import { VehicleDescriptionFields } from './VehicleDescriptionFields';
import { setVehicleFieldError } from './vehicleErrors';
import { editVehicleSchema, toChassisPayload, toEditFormValues, type EditVehicleFormValues } from './vehicleForm';

export function EditVehicleModal({ vehicle, opened, onClose }: { vehicle: Vehicle; opened: boolean; onClose: () => void }) {
  const update = useUpdateVehicle();
  const form = useForm<EditVehicleFormValues>({ resolver: zodResolver(editVehicleSchema) });
  const {
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    if (opened) reset(toEditFormValues(vehicle));
  }, [opened, vehicle, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: vehicle.id,
        input: {
          brand: values.brand.trim(),
          model: values.model.trim(),
          year: values.year,
          color: values.color.trim(),
          chassis: toChassisPayload(values.chassis),
        },
      });
      notifySuccess('Veículo atualizado.');
      onClose();
    } catch (error) {
      if (!setVehicleFieldError(error, setError, ['chassis'])) notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Editar veículo" size="lg" centered>
      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate>
          <Stack>
            <VehicleDescriptionFields
              chassisHint={vehicle.chassis ? 'Deixe em branco para manter o chassi atual.' : undefined}
            />
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

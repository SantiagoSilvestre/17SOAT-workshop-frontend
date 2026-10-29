import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/http';
import { useUpdateVehicleMileage, type Vehicle } from '@/api/vehicles';
import { IntegerInput } from '@/components/IntegerInput';
import { notifyError, notifySuccess } from '@/lib/notify';
import { formatMileage } from '@/lib/vehicle';

/** O hodômetro só anda para frente: a API recusa leitura menor que a atual. */
function mileageSchema(current: number | null) {
  return z.object({
    mileage: z
      .number({ error: 'Informe a quilometragem' })
      .int()
      .min(current ?? 0, current === null ? 'A quilometragem não pode ser negativa' : `Informe ${formatMileage(current)} ou mais`),
  });
}

type FormValues = { mileage: number };

export function MileageModal({ vehicle, opened, onClose }: { vehicle: Vehicle; opened: boolean; onClose: () => void }) {
  const updateMileage = useUpdateVehicleMileage();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(mileageSchema(vehicle.mileage)) });

  useEffect(() => {
    if (opened) reset({ mileage: vehicle.mileage ?? undefined });
  }, [opened, vehicle.mileage, reset]);

  const onSubmit = handleSubmit(async ({ mileage }) => {
    try {
      await updateMileage.mutateAsync({ id: vehicle.id, mileage });
      notifySuccess('Quilometragem registrada.');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VEHICLE_MILEAGE_CANNOT_DECREASE') {
        setError('mileage', { message: 'A quilometragem não pode ser menor que a atual.' });
        return;
      }
      notifyError(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Registrar quilometragem" centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          <Text size="sm" c="dimmed">
            Leitura atual: {formatMileage(vehicle.mileage)}. Informe a leitura do hodômetro, igual ou maior que ela.
          </Text>
          <Controller
            control={control}
            name="mileage"
            render={({ field }) => (
              <IntegerInput
                label="Quilometragem"
                data-autofocus
                thousandSeparator="."
                suffix=" km"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.mileage?.message}
              />
            )}
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
    </Modal>
  );
}

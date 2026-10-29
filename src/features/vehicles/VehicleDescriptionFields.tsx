import { Grid, TextInput } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { IntegerInput } from '@/components/IntegerInput';
import { maxVehicleYear, normalizeChassis } from '@/lib/vehicle';
import type { EditVehicleFormValues } from './vehicleForm';

/** Marca, modelo, ano, cor e chassi: comuns ao cadastro e à edição. */
export function VehicleDescriptionFields({ chassisHint }: { chassisHint?: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<EditVehicleFormValues>();

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput label="Marca" placeholder="Ex.: Volkswagen" error={errors.brand?.message} {...register('brand')} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput label="Modelo" placeholder="Ex.: Gol 1.0" error={errors.model?.message} {...register('model')} />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 3 }}>
        <Controller
          control={control}
          name="year"
          render={({ field }) => (
            <IntegerInput
              label="Ano"
              placeholder={String(maxVehicleYear() - 1)}
              max={maxVehicleYear()}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.year?.message}
            />
          )}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 3 }}>
        <TextInput label="Cor" placeholder="Ex.: Prata" error={errors.color?.message} {...register('color')} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <Controller
          control={control}
          name="chassis"
          render={({ field }) => (
            <TextInput
              label="Chassi (opcional)"
              description={chassisHint}
              placeholder="17 letras ou números"
              value={field.value}
              onChange={(event) => field.onChange(normalizeChassis(event.currentTarget.value))}
              onBlur={field.onBlur}
              error={errors.chassis?.message}
            />
          )}
        />
      </Grid.Col>
    </Grid>
  );
}

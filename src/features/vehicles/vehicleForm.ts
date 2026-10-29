import { z } from 'zod';
import type { Vehicle } from '@/api/vehicles';
import { isValidChassis, isValidPlate, maxVehicleYear, MIN_VEHICLE_YEAR, normalizeChassis } from '@/lib/vehicle';

const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Use no máximo ${max} caracteres`);

// Regras do CreateVehicleRequest/UpdateVehicleRequest e dos objetos de valor do backend.
const descriptionShape = {
  brand: requiredText('Informe a marca', 100),
  model: requiredText('Informe o modelo', 100),
  year: z
    .number({ error: 'Informe o ano' })
    .int()
    .min(MIN_VEHICLE_YEAR, `O ano deve ser ${MIN_VEHICLE_YEAR} ou posterior`)
    .refine((year) => year <= maxVehicleYear(), `O ano deve ser no máximo ${maxVehicleYear()}`),
  color: requiredText('Informe a cor', 50),
  /** Opcional; quando informado, 17 letras ou números. */
  chassis: z.string().refine((value) => value.trim() === '' || isValidChassis(value), 'O chassi deve ter 17 letras ou números'),
};

export const createVehicleSchema = z.object({
  customerId: z.string({ error: 'Escolha o cliente' }).min(1, 'Escolha o cliente'),
  licensePlate: z.string().refine(isValidPlate, 'Use o formato ABC-1234 ou ABC1D23'),
  ...descriptionShape,
  mileage: z.number().int().min(0).nullish(),
});

export type CreateVehicleFormValues = z.input<typeof createVehicleSchema>;

export const editVehicleSchema = z.object(descriptionShape);

export type EditVehicleFormValues = z.input<typeof editVehicleSchema>;

/** Chassi vazio é omitido: no cadastro fica sem chassi; na edição mantém o atual. */
export const toChassisPayload = (value: string) => (value.trim() === '' ? undefined : normalizeChassis(value));

export function toEditFormValues(vehicle: Vehicle): EditVehicleFormValues {
  return {
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    chassis: vehicle.chassis ?? '',
  };
}

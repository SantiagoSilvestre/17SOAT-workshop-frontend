import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/http';

/** Conflitos do backend que pertencem a um campo do formulário. */
const FIELD_ERRORS: Record<string, { field: string; message: string }> = {
  VEHICLE_LICENSE_PLATE_ALREADY_EXISTS: { field: 'licensePlate', message: 'Já existe um veículo com esta placa.' },
  VEHICLE_CHASSIS_ALREADY_EXISTS: { field: 'chassis', message: 'Já existe um veículo com este chassi.' },
  CUSTOMER_ARCHIVED: { field: 'customerId', message: 'Este cliente está arquivado.' },
};

/** Mostra o erro no campo quando for o caso; devolve false para o chamador notificar. */
export function setVehicleFieldError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]) {
  if (!(error instanceof ApiError)) return false;
  const mapped = FIELD_ERRORS[error.code];
  if (!mapped || !fields.includes(mapped.field)) return false;
  setError(mapped.field as Path<T>, { message: mapped.message });
  return true;
}

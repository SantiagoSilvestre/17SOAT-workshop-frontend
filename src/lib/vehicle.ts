/** Placa, chassi, ano e quilometragem com as mesmas regras do backend (LicensePlate, ChassisNumber, VehicleYear). */

const LEGACY_PLATE = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL_PLATE = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

/** Maiúsculas, sem hífen nem espaços: "abc-1234" → "ABC1234". */
export const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

export function isValidPlate(value: string): boolean {
  const plate = normalizePlate(value);
  return LEGACY_PLATE.test(plate) || MERCOSUL_PLATE.test(plate);
}

/** Placa antiga com hífen (ABC-1234); Mercosul sem (ABC1D23). Enquanto digita, só normaliza. */
export function formatPlate(value: string): string {
  const plate = normalizePlate(value);
  return LEGACY_PLATE.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}

export const normalizeChassis = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);

export const isValidChassis = (value: string) => /^[A-Z0-9]{17}$/.test(normalizeChassis(value));

export const MIN_VEHICLE_YEAR = 1886;

/** O backend aceita até o ano seguinte ao atual (modelo do ano que vem). */
export const maxVehicleYear = (today = new Date()) => today.getFullYear() + 1;

export function formatMileage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('pt-BR').format(value)} km`;
}

import { formatMileage, formatPlate, isValidChassis, isValidPlate, maxVehicleYear, normalizePlate } from './vehicle';

describe('placa', () => {
  it('normaliza e valida os formatos antigo e Mercosul, como o LicensePlate do backend', () => {
    expect(normalizePlate('abc-1234')).toBe('ABC1234');
    expect(isValidPlate('ABC-1234')).toBe(true);
    expect(isValidPlate('abc1d23')).toBe(true);
    expect(isValidPlate('AB1234')).toBe(false);
    expect(isValidPlate('ABCD123')).toBe(false);
  });

  it('formata a placa antiga com hífen e deixa a Mercosul como está', () => {
    expect(formatPlate('ABC1234')).toBe('ABC-1234');
    expect(formatPlate('ABC1D23')).toBe('ABC1D23');
    expect(formatPlate('ab')).toBe('AB');
  });
});

it('chassi tem 17 letras ou números', () => {
  expect(isValidChassis('9bwzzz377vt004251')).toBe(true);
  expect(isValidChassis('9BWZZZ377VT00425')).toBe(false);
});

it('ano máximo é o seguinte ao atual', () => {
  expect(maxVehicleYear(new Date(2026, 9, 29))).toBe(2027);
});

it('quilometragem com separador de milhar', () => {
  expect(formatMileage(42500)).toBe('42.500 km');
  expect(formatMileage(null)).toBe('—');
});

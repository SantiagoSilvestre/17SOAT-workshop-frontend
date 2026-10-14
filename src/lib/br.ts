/** Formatos e validações brasileiras usados nos cadastros, iguais às regras do backend. */

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

function applyPattern(digits: string, pattern: string): string {
  let result = '';
  let index = 0;
  for (const char of pattern) {
    if (index >= digits.length) break;
    if (char === '#') {
      result += digits[index];
      index += 1;
    } else {
      result += char;
    }
  }
  return result;
}

/** CPF (000.000.000-00) até 11 dígitos; acima disso, CNPJ (00.000.000/0000-00). */
export function formatDocument(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits.length <= 11 ? applyPattern(digits, '###.###.###-##') : applyPattern(digits, '##.###.###/####-##');
}

function checkDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function hasValidCheckDigits(digits: string, first: readonly number[], second: readonly number[]): boolean {
  if (/^(\d)\1+$/.test(digits)) return false;
  const length = digits.length;
  return (
    checkDigit(digits, first) === Number(digits[length - 2]) && checkDigit(digits, second) === Number(digits[length - 1])
  );
}

const CPF_WEIGHTS = [[10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]] as const;
const CNPJ_WEIGHTS = [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as const;

export function isValidDocument(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return hasValidCheckDigits(digits, ...CPF_WEIGHTS);
  if (digits.length === 14) return hasValidCheckDigits(digits, ...CNPJ_WEIGHTS);
  return false;
}

/** Telefone digitado: (11) 1234-5678 ou (11) 91234-5678. */
export function formatPhoneInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  return digits.length <= 10 ? applyPattern(digits, '(##) ####-####') : applyPattern(digits, '(##) #####-####');
}

/**
 * O backend guarda o telefone em E.164 (+5511912345678). Números brasileiros voltam
 * no formato local; os demais ficam como estão.
 */
export function formatPhone(value: string): string {
  const local = toLocalPhone(value);
  return local === value ? value : formatPhoneInput(local);
}

/** "+5511912345678" → "11912345678"; outros formatos voltam sem mudança. */
export function toLocalPhone(value: string): string {
  const match = /^\+55(\d{10,11})$/.exec(value);
  return match ? match[1]! : value;
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPostalCode(value: string): string {
  return applyPattern(onlyDigits(value).slice(0, 8), '#####-###');
}

/** Mesma regra de e-mail do backend. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import { z } from 'zod';
import type { Address, Customer } from '@/api/customers';
import { EMAIL_PATTERN, isValidDocument, isValidPhone, onlyDigits, toLocalPhone, UFS } from '@/lib/br';

const requiredText = (message: string) =>
  z.string().trim().min(1, message).max(255, 'Use no máximo 255 caracteres');

const optionalText = z.string().trim().max(255, 'Use no máximo 255 caracteres');

// Regras do AddressDTO/Address do backend.
const addressSchema = z.object({
  postalCode: z.string().refine((value) => onlyDigits(value).length === 8, 'Informe os 8 dígitos do CEP'),
  street: requiredText('Informe o logradouro'),
  number: requiredText('Informe o número'),
  complement: optionalText,
  neighborhood: optionalText,
  city: requiredText('Informe a cidade'),
  state: z.enum(UFS, { error: 'Escolha a UF' }),
});

export type AddressFormValues = z.input<typeof addressSchema>;

export const emptyAddress: AddressFormValues = {
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '' as AddressFormValues['state'],
};

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail')
  .max(254, 'Use no máximo 254 caracteres')
  .regex(EMAIL_PATTERN, 'Informe um e-mail válido');

export const phoneSchema = z.string().refine(isValidPhone, 'Informe o DDD e o número (10 ou 11 dígitos)');

export const nameSchema = requiredText('Informe o nome');

const contactShape = {
  email: emailSchema,
  phone: phoneSchema,
  /** O endereço é opcional no cadastro; com a opção marcada, todos os campos obrigatórios valem. */
  hasAddress: z.boolean(),
  address: z.custom<AddressFormValues>(),
};

function validateAddress(values: { hasAddress: boolean; address: unknown }, context: z.RefinementCtx) {
  if (!values.hasAddress) return;
  const result = addressSchema.safeParse(values.address);
  if (result.success) return;
  for (const issue of result.error.issues) {
    context.addIssue({ code: 'custom', message: issue.message, path: ['address', ...issue.path] });
  }
}

export const createCustomerSchema = z
  .object({
    name: nameSchema,
    document: z.string().refine(isValidDocument, 'CPF ou CNPJ inválido'),
    ...contactShape,
  })
  .superRefine(validateAddress);

export type CreateCustomerFormValues = z.input<typeof createCustomerSchema>;

export const contactSchema = z.object(contactShape).superRefine(validateAddress);

export type ContactFormValues = z.input<typeof contactSchema>;

/** Converte o endereço do formulário no formato da API (CEP só com dígitos, opcionais vazios omitidos). */
export function toAddressPayload(values: AddressFormValues): Address {
  return {
    street: values.street.trim(),
    number: values.number.trim(),
    complement: values.complement.trim() || undefined,
    neighborhood: values.neighborhood.trim() || undefined,
    city: values.city.trim(),
    state: values.state,
    postalCode: onlyDigits(values.postalCode),
  };
}

export function toAddressFormValues(address: Address | null | undefined): AddressFormValues {
  if (!address) return emptyAddress;
  return {
    postalCode: address.postalCode,
    street: address.street,
    number: address.number,
    complement: address.complement ?? '',
    neighborhood: address.neighborhood ?? '',
    city: address.city,
    state: address.state as AddressFormValues['state'],
  };
}

export function toContactFormValues(customer: Customer): ContactFormValues {
  return {
    email: customer.contactInfo.email,
    phone: toLocalPhone(customer.contactInfo.phone),
    hasAddress: Boolean(customer.contactInfo.address),
    address: toAddressFormValues(customer.contactInfo.address),
  };
}

export function sameAddress(a: Address | null | undefined, b: Address): boolean {
  if (!a) return false;
  return (
    a.street === b.street &&
    a.number === b.number &&
    (a.complement ?? undefined) === b.complement &&
    (a.neighborhood ?? undefined) === b.neighborhood &&
    a.city === b.city &&
    a.state === b.state &&
    a.postalCode === b.postalCode
  );
}

import { z } from 'zod';
import { PRIORITIES, type IntakeInput } from '@/api/serviceOrders';
import { emailSchema, nameSchema, phoneSchema } from '@/features/customers/customerForm';
import { editVehicleSchema } from '@/features/vehicles/vehicleForm';
import { isValidDocument, onlyDigits } from '@/lib/br';
import { isValidPlate, normalizeChassis, normalizePlate } from '@/lib/vehicle';

const newCustomerSchema = z.object({ name: nameSchema, email: emailSchema, phone: phoneSchema });

const partSchema = z.object({
  stockItemId: z.string().min(1, 'Escolha o item'),
  quantity: z.number({ error: 'Informe a quantidade' }).int().min(1, 'Mínimo 1'),
});

const serviceSchema = z.object({
  catalogServiceId: z.string().min(1, 'Escolha o serviço'),
  parts: z.array(partSchema).max(20, 'No máximo 20 itens por serviço'),
});

/** Copia os erros de um sub-schema para o formulário, nos mesmos nomes de campo. */
function addIssues(schema: z.ZodType, value: unknown, context: z.RefinementCtx) {
  const result = schema.safeParse(value);
  if (result.success) return;
  for (const issue of result.error.issues) context.addIssue({ code: 'custom', message: issue.message, path: issue.path });
}

/**
 * Formulário da Nova OS (POST /service-orders/intake). Nome e contato só são exigidos quando o CPF/CNPJ não tem
 * cadastro; marca, modelo, ano e cor, quando a placa não tem. `customerIsNew` e `vehicleIsNew` vêm da consulta
 * feita ao sair desses campos.
 */
export const intakeSchema = z
  .object({
    document: z.string().refine(isValidDocument, 'CPF ou CNPJ inválido'),
    customerIsNew: z.boolean(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    licensePlate: z.string().refine(isValidPlate, 'Use o formato ABC-1234 ou ABC1D23'),
    vehicleIsNew: z.boolean(),
    brand: z.string(),
    model: z.string(),
    year: z.number().nullish(),
    color: z.string(),
    chassis: z.string(),
    mileage: z.number().int().min(0).nullish(),
    priority: z.enum(PRIORITIES),
    initialAssessment: z.string().trim().min(1, 'Descreva o que o cliente relatou').max(2000, 'Use no máximo 2000 caracteres'),
    diagnosisTechnicianId: z.string(),
    services: z.array(serviceSchema).max(20, 'No máximo 20 serviços'),
  })
  .superRefine((values, context) => {
    if (values.customerIsNew) addIssues(newCustomerSchema, values, context);
    if (values.vehicleIsNew) addIssues(editVehicleSchema, values, context);
    if (values.services.length > 0 && !values.diagnosisTechnicianId) {
      context.addIssue({ code: 'custom', path: ['diagnosisTechnicianId'], message: 'Escolha quem fez o diagnóstico' });
    }
  });

export type IntakeFormValues = z.input<typeof intakeSchema>;

export const emptyIntake: IntakeFormValues = {
  document: '',
  customerIsNew: false,
  name: '',
  email: '',
  phone: '',
  licensePlate: '',
  vehicleIsNew: false,
  brand: '',
  model: '',
  year: null,
  color: '',
  chassis: '',
  mileage: null,
  priority: 'NORMAL',
  initialAssessment: '',
  diagnosisTechnicianId: '',
  services: [],
};

/** Monta o corpo do intake: dados de cadastro só seguem quando o cliente ou o veículo é novo. */
export function toIntakeInput(values: IntakeFormValues): IntakeInput {
  return {
    customer: {
      document: onlyDigits(values.document),
      ...(values.customerIsNew && {
        name: values.name.trim(),
        contactInfo: { email: values.email.trim(), phone: onlyDigits(values.phone) },
      }),
    },
    vehicle: {
      licensePlate: normalizePlate(values.licensePlate),
      ...(values.vehicleIsNew && {
        brand: values.brand.trim(),
        model: values.model.trim(),
        year: values.year ?? undefined,
        color: values.color.trim(),
        chassis: values.chassis.trim() ? normalizeChassis(values.chassis) : undefined,
        mileage: values.mileage ?? undefined,
      }),
    },
    priority: values.priority,
    initialAssessment: values.initialAssessment.trim(),
    ...(values.services.length > 0 && {
      diagnosisTechnicianId: values.diagnosisTechnicianId,
      services: values.services,
    }),
  };
}

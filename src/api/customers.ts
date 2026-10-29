import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

/** AddressDTO do backend. CEP volta só com dígitos e UF em maiúsculas. */
export interface Address {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface ContactInfo {
  email: string;
  /** Guardado em E.164, ex.: +5511912345678. */
  phone: string;
  address?: Address | null;
}

/** CustomerResponse do backend. `document` volta só com dígitos. */
export interface Customer {
  id: string;
  name: string;
  document: string;
  contactInfo: ContactInfo;
  active: boolean;
}

export interface CreateCustomerInput {
  name: string;
  document: string;
  contactInfo: ContactInfo;
}

/** Atualização parcial: só os campos enviados mudam (ao menos um é obrigatório). */
export interface ContactInfoUpdate {
  email?: string;
  phone?: string;
  address?: Address;
}

const BASE = '/customers';

export const customersApi = {
  list: (signal?: AbortSignal) => http.get<Customer[]>(BASE, { signal }),
  get: (id: string, signal?: AbortSignal) => http.get<Customer>(`${BASE}/${id}`, { signal }),
  identify: (document: string, signal?: AbortSignal) =>
    http.get<Customer>(`${BASE}/identify`, { query: { document }, signal }),
  create: (input: CreateCustomerInput) => http.post<Customer>(BASE, input),
  rename: (id: string, name: string) => http.patch<Customer>(`${BASE}/${id}`, { name }),
  updateContactInfo: (id: string, contactInfo: ContactInfoUpdate) =>
    http.patch<Customer>(`${BASE}/${id}/contact-info`, { contactInfo }),
  archive: (id: string) => http.delete<void>(`${BASE}/${id}`),
};

export const customerKeys = {
  all: ['customers'] as const,
  detail: (id: string) => ['customers', id] as const,
};

/** `enabled` evita a chamada para papéis que a API recusaria (ex.: técnico no painel de OS). */
export function useCustomers(enabled = true) {
  return useQuery({ queryKey: customerKeys.all, queryFn: ({ signal }) => customersApi.list(signal), enabled });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: ({ signal }) => customersApi.get(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useRenameCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => customersApi.rename(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomerContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contactInfo }: { id: string; contactInfo: ContactInfoUpdate }) =>
      customersApi.updateContactInfo(id, contactInfo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useArchiveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.archive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

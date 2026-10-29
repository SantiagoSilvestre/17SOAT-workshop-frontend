import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export const SPECIALTIES = ['MECHANICAL', 'ELECTRICAL', 'BODYWORK', 'PAINTING', 'DIAGNOSTICS'] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  MECHANICAL: 'Mecânica',
  ELECTRICAL: 'Elétrica',
  BODYWORK: 'Funilaria',
  PAINTING: 'Pintura',
  DIAGNOSTICS: 'Diagnóstico',
};

/** INACTIVE é definitivo: a API não deixa um técnico desativado voltar a ficar disponível ou ocupado. */
export type TechnicianStatus = 'AVAILABLE' | 'BUSY' | 'INACTIVE';

export const TECHNICIAN_STATUS_LABELS: Record<TechnicianStatus, string> = {
  AVAILABLE: 'Disponível',
  BUSY: 'Ocupado',
  INACTIVE: 'Inativo',
};

/** TechnicianResponse do backend. A listagem traz todos, inclusive os inativos. */
export interface Technician {
  id: string;
  name: string;
  specialties: Specialty[];
  status: TechnicianStatus;
}

const BASE = '/technicians';

export const techniciansApi = {
  list: (signal?: AbortSignal) => http.get<Technician[]>(BASE, { signal }),
  get: (id: string, signal?: AbortSignal) => http.get<Technician>(`${BASE}/${id}`, { signal }),
  create: (input: { name: string; specialties: Specialty[] }) => http.post<Technician>(BASE, input),
  rename: (id: string, name: string) => http.patch<Technician>(`${BASE}/${id}`, { name }),
  updateStatus: (id: string, status: TechnicianStatus) => http.patch<Technician>(`${BASE}/${id}/status`, { status }),
};

export const technicianKeys = {
  all: ['technicians'] as const,
};

export function useTechnicians() {
  return useQuery({ queryKey: technicianKeys.all, queryFn: ({ signal }) => techniciansApi.list(signal) });
}

function useTechnicianMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: technicianKeys.all }),
  });
}

export const useCreateTechnician = () => useTechnicianMutation(techniciansApi.create);

export const useRenameTechnician = () =>
  useTechnicianMutation(({ id, name }: { id: string; name: string }) => techniciansApi.rename(id, name));

export const useUpdateTechnicianStatus = () =>
  useTechnicianMutation(({ id, status }: { id: string; status: TechnicianStatus }) =>
    techniciansApi.updateStatus(id, status),
  );

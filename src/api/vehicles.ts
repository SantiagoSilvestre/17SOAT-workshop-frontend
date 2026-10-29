import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

/** VehicleResponse do backend. A placa volta normalizada (ABC1234 ou ABC1D23). */
export interface Vehicle {
  id: string;
  customerId: string;
  licensePlate: string;
  chassis: string | null;
  brand: string;
  model: string;
  year: number;
  color: string;
  /** Quilometragem em km inteiros; nula até a primeira leitura. */
  mileage: number | null;
  active: boolean;
}

export interface CreateVehicleInput {
  customerId: string;
  licensePlate: string;
  chassis?: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  mileage?: number;
}

/** PATCH /vehicles/{id}: chassi omitido mantém o atual (a API não permite apagá-lo). */
export interface UpdateVehicleInput {
  brand: string;
  model: string;
  year: number;
  color: string;
  chassis?: string;
}

const BASE = '/vehicles';

export const vehiclesApi = {
  list: (signal?: AbortSignal) => http.get<Vehicle[]>(BASE, { signal }),
  get: (id: string, signal?: AbortSignal) => http.get<Vehicle>(`${BASE}/${id}`, { signal }),
  create: (input: CreateVehicleInput) => http.post<Vehicle>(BASE, input),
  update: (id: string, input: UpdateVehicleInput) => http.patch<Vehicle>(`${BASE}/${id}`, input),
  updateMileage: (id: string, mileage: number) => http.patch<Vehicle>(`${BASE}/${id}/mileage`, { mileage }),
  archive: (id: string) => http.delete<void>(`${BASE}/${id}`),
};

export const vehicleKeys = {
  all: ['vehicles'] as const,
  detail: (id: string) => ['vehicles', id] as const,
};

export function useVehicles() {
  return useQuery({ queryKey: vehicleKeys.all, queryFn: ({ signal }) => vehiclesApi.list(signal) });
}

/** A API não filtra por cliente; a lista de ativos é filtrada aqui. */
export function useCustomerVehicles(customerId: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: ({ signal }) => vehiclesApi.list(signal),
    select: (vehicles) => vehicles.filter((vehicle) => vehicle.customerId === customerId),
    enabled: Boolean(customerId),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ''),
    queryFn: ({ signal }) => vehiclesApi.get(id!, signal),
    enabled: Boolean(id),
  });
}

function useVehicleMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

export const useCreateVehicle = () => useVehicleMutation((input: CreateVehicleInput) => vehiclesApi.create(input));

export const useUpdateVehicle = () =>
  useVehicleMutation(({ id, input }: { id: string; input: UpdateVehicleInput }) => vehiclesApi.update(id, input));

export const useUpdateVehicleMileage = () =>
  useVehicleMutation(({ id, mileage }: { id: string; mileage: number }) => vehiclesApi.updateMileage(id, mileage));

export const useArchiveVehicle = () => useVehicleMutation((id: string) => vehiclesApi.archive(id));

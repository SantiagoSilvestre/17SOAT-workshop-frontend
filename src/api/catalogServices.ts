import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Money } from '@/lib/money';
import { http } from './http';

/** CatalogServiceResponse do backend. A listagem só devolve serviços ativos. */
export interface CatalogService {
  id: string;
  name: string;
  basePrice: Money;
  active: boolean;
}

export interface CatalogServiceInput {
  name: string;
  basePrice: Money;
}

const BASE = '/catalog-services';

export const catalogServicesApi = {
  list: (signal?: AbortSignal) => http.get<CatalogService[]>(BASE, { signal }),
  get: (id: string, signal?: AbortSignal) => http.get<CatalogService>(`${BASE}/${id}`, { signal }),
  create: (input: CatalogServiceInput) => http.post<CatalogService>(BASE, input),
  rename: (id: string, name: string) => http.patch<CatalogService>(`${BASE}/${id}`, { name }),
  updateBasePrice: (id: string, basePrice: Money) =>
    http.patch<CatalogService>(`${BASE}/${id}/base-price`, { basePrice }),
  archive: (id: string) => http.delete<void>(`${BASE}/${id}`),
};

export const catalogServiceKeys = {
  all: ['catalog-services'] as const,
  detail: (id: string) => ['catalog-services', id] as const,
};

export function useCatalogServices() {
  return useQuery({
    queryKey: catalogServiceKeys.all,
    queryFn: ({ signal }) => catalogServicesApi.list(signal),
  });
}

export function useCatalogService(id: string | undefined) {
  return useQuery({
    queryKey: catalogServiceKeys.detail(id ?? ''),
    queryFn: ({ signal }) => catalogServicesApi.get(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateCatalogService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogServicesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogServiceKeys.all }),
  });
}

/**
 * Edição em uma ação só para quem usa a tela. A API tem rotas separadas para nome e preço,
 * então só chama as que mudaram.
 */
export function useUpdateCatalogService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ current, next }: { current: CatalogService; next: CatalogServiceInput }) => {
      let result = current;
      if (next.name !== current.name) result = await catalogServicesApi.rename(current.id, next.name);
      if (next.basePrice.value !== current.basePrice.value) {
        result = await catalogServicesApi.updateBasePrice(current.id, next.basePrice);
      }
      return result;
    },
    // Mesmo se a segunda chamada falhar, a primeira pode ter gravado: recarrega sempre.
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogServiceKeys.all }),
  });
}

export function useArchiveCatalogService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogServicesApi.archive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogServiceKeys.all }),
  });
}

import { useQuery } from '@tanstack/react-query';
import type { Money } from '@/lib/money';
import { http } from './http';

export type StockItemType = 'PART' | 'CONSUMABLE' | 'SUPPLY';

export const STOCK_ITEM_TYPE_LABELS: Record<StockItemType, string> = {
  PART: 'Peça',
  CONSUMABLE: 'Consumível',
  SUPPLY: 'Insumo',
};

/** StockItemResponse do backend (os campos de estoque baixo ficam para a fase 6). */
export interface StockItem {
  id: string;
  sku: string;
  name: string;
  type: StockItemType;
  price: Money;
  availableQuantity: number;
  active: boolean;
}

export const stockItemsApi = {
  /** Por padrão a API lista só os itens ativos. */
  list: (signal?: AbortSignal) => http.get<StockItem[]>('/stock-items', { signal }),
};

export function useStockItems(enabled = true) {
  return useQuery({ queryKey: ['stock-items'], queryFn: ({ signal }) => stockItemsApi.list(signal), enabled });
}

import type { ComponentType } from 'react';
import {
  IconBuildingWarehouse,
  IconCar,
  IconChartBar,
  IconClipboardList,
  IconFileInvoice,
  IconLayoutDashboard,
  IconSearch,
  IconShoppingCart,
  IconTool,
  IconUserCog,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { Role } from '@/auth/roles';

export interface AppModule {
  path: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number | string; stroke?: number }>;
  /** Papéis que enxergam o módulo, espelhando o SecurityConfig do backend. */
  roles?: readonly Role[];
  /** Fase da entrega incremental em que o módulo ganha telas de verdade. */
  phase: number;
}

const STAFF: readonly Role[] = ['ADMIN', 'MANAGER'];

/**
 * Mapa dos módulos do sistema. A navegação lateral e o painel inicial são montados a
 * partir desta lista, filtrando pelo papel do usuário logado.
 */
export const MODULES: readonly AppModule[] = [
  {
    path: '/',
    label: 'Painel',
    description: 'Visão geral e atalhos para o seu dia.',
    icon: IconLayoutDashboard,
    phase: 1,
  },
  {
    path: '/clientes',
    label: 'Clientes',
    description: 'Cadastro de clientes por CPF/CNPJ e dados de contato.',
    icon: IconUsers,
    roles: STAFF,
    phase: 2,
  },
  {
    path: '/veiculos',
    label: 'Veículos',
    description: 'Veículos dos clientes, placa e quilometragem.',
    icon: IconCar,
    roles: STAFF,
    phase: 2,
  },
  {
    path: '/catalogo',
    label: 'Catálogo de serviços',
    description: 'Serviços oferecidos e preço base.',
    icon: IconTool,
    roles: STAFF,
    phase: 2,
  },
  {
    path: '/tecnicos',
    label: 'Técnicos',
    description: 'Equipe técnica e disponibilidade.',
    icon: IconUsersGroup,
    roles: STAFF,
    phase: 2,
  },
  {
    path: '/usuarios',
    label: 'Usuários',
    description: 'Contas de acesso ao sistema e seus papéis.',
    icon: IconUserCog,
    roles: ['ADMIN'],
    phase: 2,
  },
  {
    path: '/ordens-de-servico',
    label: 'Ordens de serviço',
    description: 'Abertura, diagnóstico, execução e entrega.',
    icon: IconClipboardList,
    roles: ['ADMIN', 'MANAGER', 'TECHNICIAN'],
    phase: 3,
  },
  {
    path: '/acompanhar',
    label: 'Acompanhar ordem',
    description: 'Situação atual de uma ordem de serviço.',
    icon: IconSearch,
    roles: ['CUSTOMER'],
    phase: 3,
  },
  {
    path: '/orcamentos',
    label: 'Orçamentos',
    description: 'Consulta e aprovação de orçamentos.',
    icon: IconFileInvoice,
    roles: ['ADMIN', 'MANAGER', 'CUSTOMER'],
    phase: 4,
  },
  {
    path: '/estoque',
    label: 'Estoque',
    description: 'Peças e insumos, reservas e alerta de estoque baixo.',
    icon: IconBuildingWarehouse,
    roles: STAFF,
    phase: 6,
  },
  {
    path: '/compras',
    label: 'Compras',
    description: 'Demandas de compra, pedidos e recebimento.',
    icon: IconShoppingCart,
    roles: STAFF,
    phase: 7,
  },
  {
    path: '/relatorios',
    label: 'Relatórios',
    description: 'Indicadores como tempo médio de execução.',
    icon: IconChartBar,
    roles: STAFF,
    phase: 7,
  },
];

import { useMutation } from '@tanstack/react-query';
import type { Role } from '@/auth/roles';
import { http } from './http';

/**
 * Conta de acesso (POST /api/auth/users, só ADMIN). CUSTOMER e TECHNICIAN exigem o id do
 * cadastro vinculado (cliente ou técnico); ADMIN e MANAGER não aceitam vínculo.
 * A API não tem rota para listar, editar ou remover contas.
 */
export interface CreateUserInput {
  username: string;
  password: string;
  role: Role;
  linkedDomainId?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: Role;
  linkedDomainId: string | null;
}

export const usersApi = {
  create: (input: CreateUserInput) => http.post<UserAccount>('/auth/users', input),
};

export const useCreateUser = () => useMutation({ mutationFn: usersApi.create });

/** Papéis cuja conta pertence a um cadastro (o login enxerga só os dados dele). */
export const LINKED_ROLES: readonly Role[] = ['CUSTOMER', 'TECHNICIAN'];

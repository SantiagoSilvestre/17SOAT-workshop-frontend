/** Papéis definidos pelo backend (identity.auth.domain.model.Role). */
export const ROLES = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'CUSTOMER'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  TECHNICIAN: 'Técnico',
  CUSTOMER: 'Cliente',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Lista vazia ou ausente significa "qualquer usuário autenticado". */
export function hasAnyRole(role: Role, allowed?: readonly Role[]): boolean {
  return !allowed || allowed.length === 0 || allowed.includes(role);
}

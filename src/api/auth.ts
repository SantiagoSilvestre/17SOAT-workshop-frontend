import type { Role } from '@/auth/roles';
import { http } from './http';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface IssuedTokenResponse {
  token: string;
  role: Role;
  expiresAt: string;
}

export function login(request: LoginRequest): Promise<IssuedTokenResponse> {
  return http.post<IssuedTokenResponse>('/auth/login', request, { anonymous: true });
}

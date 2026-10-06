import type { Role } from '@/auth/roles';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Gera um JWT não assinado com as mesmas claims que o backend emite. */
export function fakeToken(role: Role, { expiresInSeconds = 3600, linkedDomainId = null as string | null } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64Url({
    sub: '6f1c2b8e-0000-4000-8000-000000000001',
    role,
    linkedDomainId,
    iat: now,
    exp: now + expiresInSeconds,
  });
  return `${header}.${payload}.assinatura`;
}

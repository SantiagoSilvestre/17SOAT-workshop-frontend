import { isRole, type Role } from './roles';

/** Claims emitidas pelo backend (JwtTokenIssuer): sub, role, linkedDomainId, iat, exp. */
export interface TokenClaims {
  userId: string;
  role: Role;
  linkedDomainId: string | null;
  expiresAt: number;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Lê as claims do JWT sem validar a assinatura. A validação é responsabilidade do
 * backend; aqui só usamos as claims para montar a interface (papel, expiração).
 */
export function decodeToken(token: string): TokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
    if (typeof claims.sub !== 'string' || !isRole(claims.role) || typeof claims.exp !== 'number') {
      return null;
    }
    return {
      userId: claims.sub,
      role: claims.role,
      linkedDomainId: typeof claims.linkedDomainId === 'string' ? claims.linkedDomainId : null,
      expiresAt: claims.exp * 1000,
    };
  } catch {
    return null;
  }
}

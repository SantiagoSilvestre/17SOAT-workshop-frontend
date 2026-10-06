import { fakeToken } from '@/test/jwt';
import { decodeToken } from './token';

describe('decodeToken', () => {
  it('lê papel, usuário, vínculo e expiração', () => {
    const claims = decodeToken(fakeToken('TECHNICIAN', { linkedDomainId: 'tec-1' }));
    expect(claims).toMatchObject({ role: 'TECHNICIAN', linkedDomainId: 'tec-1' });
    expect(claims?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejeita tokens malformados ou com papel desconhecido', () => {
    expect(decodeToken('lixo')).toBeNull();
    expect(decodeToken('a.b.c')).toBeNull();
    const unknownRole = fakeToken('ADMIN').replace(/^[^.]+\.[^.]+/, (match) => {
      const [header] = match.split('.');
      const payload = btoa(JSON.stringify({ sub: 'x', role: 'ROOT', exp: 9999999999 }));
      return `${header}.${payload}`;
    });
    expect(decodeToken(unknownRole)).toBeNull();
  });
});

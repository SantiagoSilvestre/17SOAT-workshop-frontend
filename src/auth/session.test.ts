import { fakeToken } from '@/test/jwt';
import { sessionStore } from './session';

describe('sessionStore', () => {
  afterEach(() => sessionStore.clear());

  it('persiste a sessão e avisa os assinantes', () => {
    const listener = vi.fn();
    const unsubscribe = sessionStore.subscribe(listener);
    const session = sessionStore.start(fakeToken('MANAGER'), 'manager.dev');
    expect(session.role).toBe('MANAGER');
    expect(JSON.parse(localStorage.getItem('workshop.session')!)).toMatchObject({ username: 'manager.dev' });
    expect(listener).toHaveBeenCalledWith(session);
    unsubscribe();
  });

  it('descarta sessão expirada', () => {
    sessionStore.start(fakeToken('ADMIN', { expiresInSeconds: -10 }), 'admin');
    expect(sessionStore.get()).toBeNull();
    expect(localStorage.getItem('workshop.session')).toBeNull();
  });
});

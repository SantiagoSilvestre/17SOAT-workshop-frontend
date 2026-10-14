import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import type { Session } from './session';

/** Antecedência do aviso antes de o token expirar. */
export const EXPIRY_WARNING_MS = 5 * 60 * 1000;
const NOTIFICATION_ID = 'session-expiry';

/**
 * O token vale 1 hora e o backend não tem refresh: avisa alguns minutos antes para o
 * usuário salvar o que está fazendo. Quando expira, o AuthProvider encerra a sessão.
 */
export function useSessionExpiryWarning(session: Session) {
  useEffect(() => {
    const show = () =>
      notifications.show({
        id: NOTIFICATION_ID,
        color: 'yellow',
        title: 'Sua sessão está perto de expirar',
        message: `Ela termina às ${new Date(session.expiresAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}. Salve o que estiver fazendo; depois será preciso entrar de novo.`,
        autoClose: false,
      });

    const delay = session.expiresAt - EXPIRY_WARNING_MS - Date.now();
    const timer = window.setTimeout(show, Math.max(delay, 0));
    return () => {
      window.clearTimeout(timer);
      notifications.hide(NOTIFICATION_ID);
    };
  }, [session.expiresAt]);
}

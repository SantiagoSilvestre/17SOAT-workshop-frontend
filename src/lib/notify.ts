import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/api/http';

export function notifySuccess(message: string) {
  notifications.show({ color: 'green', message });
}

export function notifyError(error: unknown, title = 'Não foi possível concluir') {
  notifications.show({ color: 'red', title, message: errorMessage(error) });
}

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
  opened: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Vermelho para ações que tiram algo de uso (arquivar, desativar). */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  opened,
  title,
  children,
  confirmLabel,
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack>
        <Text size="sm">{children}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color={danger ? 'red' : undefined} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

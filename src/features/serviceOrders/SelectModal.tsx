import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useEffect, useState, type ReactNode } from 'react';

interface SelectModalProps {
  opened: boolean;
  title: string;
  label: string;
  data: { value: string; label: string }[];
  initialValue: string | null;
  description?: ReactNode;
  loading?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

/** Modal de uma escolha só, para as ações da OS que trocam um valor (prioridade, técnico do diagnóstico). */
export function SelectModal({
  opened,
  title,
  label,
  data,
  initialValue,
  description,
  loading = false,
  onSave,
  onClose,
}: SelectModalProps) {
  const [value, setValue] = useState<string | null>(initialValue);

  useEffect(() => {
    if (opened) setValue(initialValue);
  }, [opened, initialValue]);

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (value) onSave(value);
        }}
      >
        <Stack>
          {description && <Text size="sm">{description}</Text>}
          <Select label={label} data={data} value={value} onChange={setValue} searchable data-autofocus />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!value || value === initialValue}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

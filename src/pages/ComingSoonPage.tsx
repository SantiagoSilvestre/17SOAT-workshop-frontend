import { Alert, Stack, Text, Title } from '@mantine/core';
import { IconHourglass } from '@tabler/icons-react';
import type { AppModule } from '@/routes/modules';

/** Página provisória dos módulos que ainda serão entregues nas próximas fases. */
export function ComingSoonPage({ module }: { module: AppModule }) {
  return (
    <Stack>
      <Title order={2}>{module.label}</Title>
      <Text c="dimmed">{module.description}</Text>
      <Alert variant="light" icon={<IconHourglass size={18} />} title="Em construção">
        Este módulo será entregue na fase {module.phase} do plano incremental do frontend.
      </Alert>
    </Stack>
  );
}

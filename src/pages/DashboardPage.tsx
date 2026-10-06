import { Badge, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useSession } from '@/auth/AuthContext';
import { hasAnyRole, ROLE_LABELS } from '@/auth/roles';
import { MODULES } from '@/routes/modules';

export function DashboardPage() {
  const session = useSession();
  const modules = MODULES.filter((module) => module.path !== '/' && hasAnyRole(session.role, module.roles));

  return (
    <Stack>
      <div>
        <Title order={2}>Olá, {session.username}</Title>
        <Text c="dimmed">Você entrou como {ROLE_LABELS[session.role].toLowerCase()}. Escolha um módulo para começar.</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {modules.map((module) => (
          <Card key={module.path} component={Link} to={module.path} withBorder radius="md" padding="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <ThemeIcon variant="light" size="lg" radius="md">
                <module.icon size={20} />
              </ThemeIcon>
              {module.phase > 1 && (
                <Badge variant="outline" color="gray" size="sm">
                  Em breve
                </Badge>
              )}
            </Group>
            <Text fw={600} mt="md">
              {module.label}
            </Text>
            <Text size="sm" c="dimmed">
              {module.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

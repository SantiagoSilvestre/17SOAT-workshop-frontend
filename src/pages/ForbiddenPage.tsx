import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs">
        <Title order={2}>Acesso negado</Title>
        <Text c="dimmed">Seu perfil não tem permissão para acessar esta página.</Text>
        <Button component={Link} to="/" variant="light" mt="md">
          Voltar ao painel
        </Button>
      </Stack>
    </Center>
  );
}

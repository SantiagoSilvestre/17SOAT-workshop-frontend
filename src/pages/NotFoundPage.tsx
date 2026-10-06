import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs">
        <Title order={2}>Página não encontrada</Title>
        <Text c="dimmed">O endereço acessado não existe.</Text>
        <Button component={Link} to="/" variant="light" mt="md">
          Voltar ao painel
        </Button>
      </Stack>
    </Center>
  );
}

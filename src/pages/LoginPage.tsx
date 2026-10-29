import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconTool } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, errorMessage } from '@/api/http';
import { useAuth } from '@/auth/AuthContext';
import type { Role } from '@/auth/roles';
import { canAccessPath } from '@/routes/modules';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
});

type LoginForm = z.infer<typeof loginSchema>;

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Usuário ou senha inválidos.';
  return errorMessage(error);
}

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: Location } | null)?.from;
  // Volta para a página pedida só se o novo usuário puder abri-la: quem entra depois de
  // outra pessoa sair (ou da sessão dela expirar) pode ter outro papel.
  const redirectFor = (role: Role) => (from && canAccessPath(role, from.pathname) ? `${from.pathname}${from.search}` : '/');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } });

  if (session) return <Navigate to={redirectFor(session.role)} replace />;

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(null);
    try {
      const started = await login(username, password);
      navigate(redirectFor(started.role), { replace: true });
    } catch (caught) {
      setError(loginErrorMessage(caught));
    }
  });

  return (
    <Center mih="100vh" p="md" bg="var(--mantine-color-gray-light)">
      <Paper withBorder shadow="sm" radius="md" p="xl" w="100%" maw={400}>
        <form onSubmit={onSubmit} noValidate>
          <Stack>
            <Stack gap={4} align="center">
              <ThemeIcon size={48} radius="xl" variant="light">
                <IconTool size={28} />
              </ThemeIcon>
              <Title order={2}>Oficina 17SOAT</Title>
              <Text c="dimmed" size="sm">
                Entre com seu usuário para continuar
              </Text>
            </Stack>

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
                {error}
              </Alert>
            )}

            <TextInput
              label="Usuário"
              autoComplete="username"
              autoFocus
              error={errors.username?.message}
              {...register('username')}
            />
            <PasswordInput
              label="Senha"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" loading={isSubmitting} fullWidth>
              Entrar
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}

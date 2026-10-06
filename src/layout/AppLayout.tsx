import { AppShell, Badge, Burger, Group, Menu, NavLink, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconLogout, IconTool } from '@tabler/icons-react';
import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSession } from '@/auth/AuthContext';
import { hasAnyRole, ROLE_LABELS } from '@/auth/roles';
import { MODULES } from '@/routes/modules';

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const session = useSession();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Saída voluntária vai direto para o login, sem lembrar a página atual
  // (quem entrar depois pode ter outro papel).
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const modules = MODULES.filter((module) => hasAnyRole(session.role, module.roles));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Abrir menu" />
            <ThemeIcon variant="light" size="lg" radius="md">
              <IconTool size={20} />
            </ThemeIcon>
            <Text fw={700} visibleFrom="xs">
              Oficina 17SOAT
            </Text>
          </Group>

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <UnstyledButton aria-label="Menu do usuário">
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500} truncate maw={160}>
                    {session.username}
                  </Text>
                  <Badge variant="light" visibleFrom="xs">
                    {ROLE_LABELS[session.role]}
                  </Badge>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Sessão expira às {new Date(session.expiresAt).toLocaleTimeString('pt-BR')}</Menu.Label>
              <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {modules.map((module) => (
          <NavLink
            key={module.path}
            component={RouterNavLink}
            to={module.path}
            label={module.label}
            leftSection={<module.icon size={18} stroke={1.6} />}
            active={module.path === '/' ? location.pathname === '/' : location.pathname.startsWith(module.path)}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

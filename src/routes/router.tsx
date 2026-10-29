import { Center, Loader } from '@mantine/core';
import { Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/auth/RequireAuth';
import { AppLayout } from '@/layout/AppLayout';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MODULES } from './modules';

// Cada módulo ganha uma rota protegida pelo seu papel. Enquanto o módulo não tem tela
// (campo `page` em modules.ts), a rota mostra uma página provisória.
const moduleRoutes: RouteObject[] = MODULES.filter((module) => module.path !== '/').map((module) => {
  const Page = module.page;
  return {
    path: `${module.path.slice(1)}/*`,
    element: (
      <RequireAuth roles={module.roles}>
        {Page ? (
          <Suspense
            fallback={
              <Center py="xl">
                <Loader aria-label="Carregando" />
              </Center>
            }
          >
            <Page />
          </Suspense>
        ) : (
          <ComingSoonPage module={module} />
        )}
      </RequireAuth>
    ),
  };
});

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          ...moduleRoutes,
          { path: 'acesso-negado', element: <ForbiddenPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}

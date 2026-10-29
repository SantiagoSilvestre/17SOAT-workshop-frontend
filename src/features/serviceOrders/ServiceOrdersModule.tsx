import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/auth/RequireAuth';
import { STAFF_ROLES } from '@/auth/roles';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ServiceOrderBoardPage } from './ServiceOrderBoardPage';
import { ServiceOrderIntakePage } from './ServiceOrderIntakePage';

/** Rotas de /ordens-de-servico. O técnico vê o painel; abrir OS é só da equipe administrativa, como na API. */
export function ServiceOrdersModule() {
  return (
    <Routes>
      <Route index element={<ServiceOrderBoardPage />} />
      <Route
        path="nova"
        element={
          <RequireAuth roles={STAFF_ROLES}>
            <ServiceOrderIntakePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

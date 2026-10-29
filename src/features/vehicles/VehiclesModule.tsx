import { Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { VehicleCreatePage } from './VehicleCreatePage';
import { VehicleDetailPage } from './VehicleDetailPage';
import { VehicleListPage } from './VehicleListPage';

/** Rotas de /veiculos: lista, cadastro e detalhe. */
export function VehiclesModule() {
  return (
    <Routes>
      <Route index element={<VehicleListPage />} />
      <Route path="novo" element={<VehicleCreatePage />} />
      <Route path=":id" element={<VehicleDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

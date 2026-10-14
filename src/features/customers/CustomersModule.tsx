import { Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CustomerCreatePage } from './CustomerCreatePage';
import { CustomerDetailPage } from './CustomerDetailPage';
import { CustomerListPage } from './CustomerListPage';

/** Rotas de /clientes: lista, cadastro e detalhe. */
export function CustomersModule() {
  return (
    <Routes>
      <Route index element={<CustomerListPage />} />
      <Route path="novo" element={<CustomerCreatePage />} />
      <Route path=":id" element={<CustomerDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

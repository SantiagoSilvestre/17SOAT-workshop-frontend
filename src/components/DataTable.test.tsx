import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  id: string;
  name: string;
  price: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Nome', render: (row) => row.name, sortValue: (row) => row.name },
  { key: 'price', header: 'Preço', render: (row) => String(row.price), sortValue: (row) => row.price },
];

function renderTable(rows: Row[], pageSize = 10) {
  return render(
    <MantineProvider>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        searchText={(row) => row.name}
        initialSort={{ key: 'name', direction: 'asc' }}
        pageSize={pageSize}
      />
    </MantineProvider>,
  );
}

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent);

describe('DataTable', () => {
  const rows: Row[] = [
    { id: '1', name: 'Revisão', price: 300 },
    { id: '2', name: 'alinhamento', price: 80 },
    { id: '3', name: 'Balanceamento', price: 120 },
  ];

  it('ordena pela coluna inicial ignorando maiúsculas', () => {
    renderTable(rows);
    expect(names()).toEqual(['alinhamento', 'Balanceamento', 'Revisão']);
  });

  it('alterna a ordenação ao clicar no cabeçalho', async () => {
    const user = userEvent.setup();
    renderTable(rows);
    await user.click(screen.getByRole('button', { name: 'Preço' }));
    expect(names()).toEqual(['alinhamento', 'Balanceamento', 'Revisão']);
    await user.click(screen.getByRole('button', { name: 'Preço' }));
    expect(names()).toEqual(['Revisão', 'Balanceamento', 'alinhamento']);
  });

  it('busca sem diferenciar acentos', async () => {
    const user = userEvent.setup();
    renderTable(rows);
    await user.type(screen.getByLabelText('Buscar'), 'revisao');
    expect(names()).toEqual(['Revisão']);
    await user.clear(screen.getByLabelText('Buscar'));
    await user.type(screen.getByLabelText('Buscar'), 'pintura');
    expect(screen.getByText('Nenhum resultado para a busca.')).toBeInTheDocument();
  });

  it('pagina no cliente', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      name: `Serviço ${String(index + 1).padStart(2, '0')}`,
      price: index,
    }));
    renderTable(many, 5);
    expect(names()).toHaveLength(5);
    expect(screen.getByText('12 registros')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(names()).toEqual(['Serviço 11', 'Serviço 12']);
  });
});

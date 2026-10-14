import { Alert, Center, Group, Loader, Pagination, Stack, Table, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconAlertCircle, IconChevronDown, IconChevronUp, IconSearch, IconSelector } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';
import { errorMessage } from '@/api/http';
import { normalizeText } from '@/lib/text';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Com valor, a coluna pode ser ordenada clicando no cabeçalho. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

interface DataTableProps<T> {
  rows: readonly T[] | undefined;
  columns: readonly DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Texto em que a busca procura. Sem valor, a tabela não mostra o campo de busca. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  initialSort?: SortState;
  pageSize?: number;
  loading?: boolean;
  error?: unknown;
  emptyMessage?: string;
  /** Botões à direita da busca (ex.: "Novo"). */
  actions?: ReactNode;
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Tabela das listagens. A API não pagina nem filtra, então busca, ordenação e paginação
 * acontecem aqui, sobre a lista inteira que veio do servidor.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = 'Buscar',
  initialSort = null,
  pageSize = 10,
  loading = false,
  error,
  emptyMessage = 'Nenhum registro encontrado.',
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(initialSort);
  const [page, setPage] = useState(1);

  const visible = useMemo(() => {
    let result = [...(rows ?? [])];
    const term = normalizeText(search);
    if (term && searchText) result = result.filter((row) => normalizeText(searchText(row)).includes(term));
    const sortColumn = sort && columns.find((column) => column.key === sort.key);
    if (sort && sortColumn?.sortValue) {
      const value = sortColumn.sortValue;
      const factor = sort.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => factor * compare(value(a), value(b)));
    }
    return result;
  }, [rows, search, searchText, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    setSort((previous) =>
      previous?.key === key ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    );
  };

  const sortIcon = (key: string) => {
    if (sort?.key !== key) return <IconSelector size={14} />;
    return sort.direction === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
  };

  let body: ReactNode;
  if (loading) {
    body = (
      <Center py="xl">
        <Loader aria-label="Carregando" />
      </Center>
    );
  } else if (error) {
    body = (
      <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
        {errorMessage(error)}
      </Alert>
    );
  } else if (visible.length === 0) {
    body = (
      <Text c="dimmed" ta="center" py="xl">
        {search ? 'Nenhum resultado para a busca.' : emptyMessage}
      </Text>
    );
  } else {
    body = (
      <Table.ScrollContainer minWidth={560}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th
                  key={column.key}
                  ta={column.align}
                  aria-sort={
                    sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {column.sortValue ? (
                    <UnstyledButton onClick={() => toggleSort(column.key)} fw={600} fz="sm">
                      <Group gap={4} wrap="nowrap" justify={column.align === 'right' ? 'flex-end' : undefined}>
                        {column.header}
                        {sortIcon(column.key)}
                      </Group>
                    </UnstyledButton>
                  ) : (
                    column.header
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageRows.map((row) => (
              <Table.Tr key={getRowId(row)}>
                {columns.map((column) => (
                  <Table.Td key={column.key} ta={column.align}>
                    {column.render(row)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
  }

  return (
    <Stack gap="sm">
      {(searchText || actions) && (
        <Group justify="space-between" wrap="wrap">
          {searchText ? (
            <TextInput
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              w={{ base: '100%', xs: 320 }}
            />
          ) : (
            <span />
          )}
          {actions}
        </Group>
      )}
      {body}
      {!loading && !error && visible.length > pageSize && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {visible.length} registros
          </Text>
          <Pagination total={totalPages} value={currentPage} onChange={setPage} size="sm" />
        </Group>
      )}
    </Stack>
  );
}

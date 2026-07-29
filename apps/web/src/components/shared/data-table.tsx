'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Wrapper de TanStack Table reutilizado por todas las pantallas de
 * listado (ver 01-organizacion-y-estado.md §2): filtro de texto global
 * (conectado a la URL, ?search=, para que "Atrás" del navegador funcione
 * gratis), orden por columna, y una variante de lista de tarjetas en
 * móvil (02-navegacion-y-ux.md §6) — se define una vez acá, no en cada
 * pantalla.
 */
export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  renderMobileCard: (row: TData) => React.ReactNode;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  toolbar,
  emptyMessage,
  emptyAction,
  renderMobileCard,
  getRowId,
}: DataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);

  function setSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: search, sorting },
    onSortingChange: setSorting,
    getRowId: getRowId as ((row: TData) => string) | undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-xs"
        />
        {toolbar}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyAction && <div className="mt-3">{emptyAction}</div>}
        </div>
      ) : (
        <>
          {/* Escritorio/tablet: tabla completa (02-navegacion-y-ux.md §6) */}
          <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="size-3" />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil (<640px): lista de tarjetas, no tabla con scroll horizontal */}
          <div className="flex flex-col gap-2 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-card p-3">
                {renderMobileCard(row.original)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { IMPORT_MODE_LABELS, type ImportMode, type ImportSummary } from '@/lib/api/import';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const IMPORT_MODES = Object.keys(IMPORT_MODE_LABELS) as ImportMode[];

/**
 * Diálogo de importación CSV compartido por Clientes y Proveedores — la
 * lectura del archivo (client-side, `File.text()`) y la presentación del
 * `ImportSummary` son idénticas para ambos; solo cambia a qué mutación se
 * delega el POST (ver docs/frontend/05-sprint-f2-clientes-proveedores.md
 * §3.2/§3.4). El backend recibe `csvContent` como texto plano en JSON, no
 * `multipart/form-data` — no hay subida de archivo binario.
 */
export function ImportDialog({
  entityLabel,
  onImport,
}: {
  /** Plural en minúscula para los textos, ej. "clientes" | "proveedores". */
  entityLabel: string;
  onImport: (input: { csvContent: string; mode: ImportMode }) => Promise<ImportSummary>;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('skip-new-only');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFile(null);
      setMode('skip-new-only');
      setSummary(null);
    }
  }

  async function handleImport() {
    if (!file) return;
    setIsSubmitting(true);
    try {
      const csvContent = await file.text();
      const result = await onImport({ csvContent, mode });
      setSummary(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo importar el archivo');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Importar CSV
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar {entityLabel} desde CSV</DialogTitle>
        </DialogHeader>

        {summary ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Total de filas</span>
              <span className="font-medium">{summary.totalRows}</span>
              <span className="text-muted-foreground">Creados</span>
              <span className="font-medium">{summary.created}</span>
              <span className="text-muted-foreground">Actualizados</span>
              <span className="font-medium">{summary.updated}</span>
              <span className="text-muted-foreground">Omitidos (duplicado)</span>
              <span className="font-medium">{summary.skippedDuplicates}</span>
            </div>
            {summary.rejected.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">
                  Rechazados ({summary.rejected.length})
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {summary.rejected.map((r) => (
                    <li key={r.row}>
                      Fila {r.row}: {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="import-file">Archivo CSV</Label>
              <input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label>Modo</Label>
              <Select value={mode} onValueChange={(v) => v && setMode(v as ImportMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {IMPORT_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleImport} disabled={!file || isSubmitting}>
                {isSubmitting ? 'Importando…' : 'Importar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

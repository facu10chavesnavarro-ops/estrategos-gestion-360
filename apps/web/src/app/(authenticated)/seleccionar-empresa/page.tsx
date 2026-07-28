'use client';

import { useRouter } from 'next/navigation';
import { useMyCompanies } from '@/lib/api/companies';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/http-client';

export default function SeleccionarEmpresaPage() {
  const router = useRouter();
  const { data: companies, isLoading, error } = useMyCompanies();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Elegí una empresa</h1>
        <p className="text-sm text-muted-foreground">
          Vas a operar sobre esta empresa hasta que la cambies.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando empresas…</p>}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor.'}
        </p>
      )}

      {companies && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Todavía no tenés ninguna empresa asignada. Pedile a un administrador que te invite.
        </p>
      )}

      {companies && companies.length > 0 && (
        <div className="flex flex-col gap-3">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardContent>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start px-0 py-2 text-left"
                  onClick={() => router.push(`/${company.id}/inicio`)}
                >
                  <div>
                    <div className="font-medium">{company.legalName}</div>
                    {company.taxId && (
                      <div className="text-xs text-muted-foreground">{company.taxId}</div>
                    )}
                  </div>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

export default function InicioPage({ params }: { params: { companyId: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Inicio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Próximamente: accesos rápidos y resumen de caja/saldos.
      </p>
    </div>
  );
}

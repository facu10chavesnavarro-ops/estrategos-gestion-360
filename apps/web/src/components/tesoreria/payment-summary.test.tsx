import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentSummary } from './payment-summary';

describe('PaymentSummary', () => {
  it('cobro exacto: sin excedente ni advertencia, muestra los 4 totales', () => {
    render(
      <PaymentSummary direction="COLLECTION" totalSelected={1000} totalAllocated={1000} totalMethods={1000} />,
    );

    expect(screen.getByText('Deuda seleccionada')).toBeInTheDocument();
    expect(screen.getByText('Total a cobrar')).toBeInTheDocument();
    expect(screen.queryByText(/como saldo a favor/)).toBeNull();
    expect(screen.queryByText(/supera el total cargado/)).toBeNull();
  });

  it('pago con excedente: avisa que quedará a favor en la cuenta corriente', () => {
    render(
      <PaymentSummary direction="PAYMENT" totalSelected={500} totalAllocated={500} totalMethods={700} />,
    );

    expect(screen.getByText('Total a pagar')).toBeInTheDocument();
    expect(screen.getByText(/Quedará.*como saldo a favor en la cuenta corriente/)).toBeInTheDocument();
  });

  it('imputado por encima de lo cargado: muestra la advertencia destructiva', () => {
    render(
      <PaymentSummary direction="COLLECTION" totalSelected={1000} totalAllocated={800} totalMethods={500} />,
    );

    expect(
      screen.getByText('El importe imputado supera el total cargado en medios de pago — ajustá los montos antes de confirmar.'),
    ).toBeInTheDocument();
  });
});

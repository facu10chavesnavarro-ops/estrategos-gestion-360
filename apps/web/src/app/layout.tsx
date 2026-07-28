import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Estrategos Gestión 360',
  description: 'Plataforma de gestión administrativa multiempresa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="font-sans">
      <body>{children}</body>
    </html>
  );
}

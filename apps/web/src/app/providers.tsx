'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/http-client';
import { Toaster } from '@/components/ui/sonner';

function shouldRetry(failureCount: number, error: unknown) {
  // Un ApiError con status 4xx es un error de negocio/permisos, no algo que
  // reintentar (nunca va a cambiar de resultado); solo se reintenta una vez
  // ante fallas de red o del servidor (5xx / fetch roto).
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 1;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: shouldRetry,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

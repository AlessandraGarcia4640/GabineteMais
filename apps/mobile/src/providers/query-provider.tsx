import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => listener.remove();
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

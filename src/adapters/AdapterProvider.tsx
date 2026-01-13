import type { ReactNode } from 'react';
import { AdapterContext, type Adapters } from './context';

export function AdapterProvider({
  children,
  adapters,
}: {
  children: ReactNode;
  adapters: Adapters;
}) {
  return <AdapterContext.Provider value={adapters}>{children}</AdapterContext.Provider>;
}

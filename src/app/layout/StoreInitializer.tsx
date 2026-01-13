import type { ReactNode } from 'react';
import {
  useNoteAdapter,
  useConnectionAdapter,
  useClusterAdapter,
} from '@/adapters';
import { useInitializeStore } from '@/store';

interface StoreInitializerProps {
  children: ReactNode;
}

export function StoreInitializer({ children }: StoreInitializerProps) {
  const noteAdapter = useNoteAdapter();
  const connectionAdapter = useConnectionAdapter();
  const clusterAdapter = useClusterAdapter();
  const { isReady, error } = useInitializeStore({
    noteAdapter,
    connectionAdapter,
    clusterAdapter,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 p-8">
          <h2 className="text-xl font-bold mb-2">Initialization Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

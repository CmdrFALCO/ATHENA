import { GraphCanvas } from '@/modules/canvas';
import { EntityDetail, ResourceDetailPanel } from '@/modules/sophia';
import { useSelectedResourceId } from '@/store';

export function SophiaPage() {
  const selectedResourceId = useSelectedResourceId();

  return (
    <div className="flex h-full">
      {/* Graph Canvas - 60% */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <GraphCanvas />
      </div>

      {/* Detail Panel - 40% */}
      <div className="w-[400px] border-l border-neutral-700 flex-shrink-0 overflow-hidden">
        {selectedResourceId ? (
          <ResourceDetailPanel resourceId={selectedResourceId} />
        ) : (
          <EntityDetail />
        )}
      </div>
    </div>
  );
}

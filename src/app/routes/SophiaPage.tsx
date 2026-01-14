import { GraphCanvas } from '@/modules/canvas';
import { EntityDetail } from '@/modules/sophia';

export function SophiaPage() {
  return (
    <div className="flex h-full">
      {/* Graph Canvas - 60% */}
      <div className="flex-1 min-w-0">
        <GraphCanvas />
      </div>

      {/* Detail Panel - 40% */}
      <div className="w-[400px] border-l border-neutral-700 flex-shrink-0 overflow-hidden">
        <EntityDetail />
      </div>
    </div>
  );
}

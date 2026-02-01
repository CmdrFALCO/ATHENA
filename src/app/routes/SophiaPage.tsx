import { GraphCanvas } from '@/modules/canvas';
import { EntityDetail, ResourceDetailPanel } from '@/modules/sophia';
import { useSelectedResourceId, useSelectedEntityIds, useSelectedResourceIds } from '@/store';
import { SynthesisButton } from '@/modules/synthesis';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config/devSettings';

export function SophiaPage() {
  const selectedResourceId = useSelectedResourceId();
  const selectedEntityIds = useSelectedEntityIds();
  const selectedResourceIds = useSelectedResourceIds();
  const showSynthesisButton = useSelector(() => devSettings$.synthesis.showInCanvasToolbar.get());

  return (
    <div className="flex h-full">
      {/* Graph Canvas - 60% */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative">
        <GraphCanvas />

        {/* WP 8.7: Synthesis toolbar button (floating, top-right of canvas) */}
        {showSynthesisButton && (
          <div className="absolute top-3 right-3 z-10">
            <SynthesisButton
              selectedNoteCount={selectedEntityIds.length}
              selectedResourceCount={selectedResourceIds.length}
            />
          </div>
        )}
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

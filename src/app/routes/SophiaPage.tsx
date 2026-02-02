import { GraphCanvas } from '@/modules/canvas';
import { EntityDetail, ResourceDetailPanel } from '@/modules/sophia';
import { useSelectedResourceId, useSelectedEntityIds, useSelectedResourceIds } from '@/store';
import { SynthesisButton } from '@/modules/synthesis';
import { ExportDropdown, ExportDialog, useExportInit } from '@/modules/export';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config/devSettings';

export function SophiaPage() {
  const selectedResourceId = useSelectedResourceId();
  const selectedEntityIds = useSelectedEntityIds();
  const selectedResourceIds = useSelectedResourceIds();
  const showSynthesisButton = useSelector(() => devSettings$.synthesis.showInCanvasToolbar.get());
  const showExportButton = useSelector(() => devSettings$.export.showInCanvasToolbar.get());

  // WP 8.10: Initialize export service with adapters
  useExportInit();

  return (
    <div className="flex h-full">
      {/* Graph Canvas - 60% */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative">
        <GraphCanvas />

        {/* Floating toolbar buttons (top-right of canvas) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* WP 8.10: Export dropdown */}
          {showExportButton && (
            <ExportDropdown
              entityIds={selectedEntityIds}
              source={selectedEntityIds.length === 1 ? 'single' : 'selection'}
            />
          )}

          {/* WP 8.7: Synthesis toolbar button */}
          {showSynthesisButton && (
            <SynthesisButton
              selectedNoteCount={selectedEntityIds.length}
              selectedResourceCount={selectedResourceIds.length}
            />
          )}
        </div>
      </div>

      {/* Detail Panel - 40% */}
      <div className="w-[400px] border-l border-neutral-700 flex-shrink-0 overflow-hidden">
        {selectedResourceId ? (
          <ResourceDetailPanel resourceId={selectedResourceId} />
        ) : (
          <EntityDetail />
        )}
      </div>

      {/* WP 8.10: Export dialog (rendered at root level for z-index) */}
      <ExportDialog />
    </div>
  );
}

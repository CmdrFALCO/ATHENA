import { useState } from 'react';
import { useSelectedEntityIds, useNote } from '@/store';
import { EntityDetailEmpty } from './EntityDetailEmpty';
import { EntityDetailHeader } from './EntityDetailHeader';
import { EntityDetailContent } from './EntityDetailContent';
import { SimilarNotesPanel } from './SimilarNotesPanel';
import { SimilarNotesButton } from './SimilarNotesButton';

export function EntityDetail() {
  const selectedIds = useSelectedEntityIds();
  const selectedId = selectedIds[0]; // Single selection for now
  const note = useNote(selectedId ?? '');

  const [showSimilar, setShowSimilar] = useState(false);

  if (!selectedId || !note) {
    return <EntityDetailEmpty />;
  }

  return (
    <div className="h-full flex bg-athena-bg">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <EntityDetailHeader
          note={note}
          actions={
            <SimilarNotesButton
              onClick={() => setShowSimilar(!showSimilar)}
              isActive={showSimilar}
            />
          }
        />
        <EntityDetailContent note={note} />
      </div>

      {/* Similar notes sidebar */}
      {showSimilar && (
        <div className="w-72 border-l border-athena-border bg-athena-bg flex-shrink-0">
          <SimilarNotesPanel noteId={selectedId} onClose={() => setShowSimilar(false)} />
        </div>
      )}
    </div>
  );
}

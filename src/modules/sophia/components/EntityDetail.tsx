import { useSelectedEntityIds, useNote } from '@/store';
import { EntityDetailEmpty } from './EntityDetailEmpty';
import { EntityDetailHeader } from './EntityDetailHeader';
import { EntityDetailContent } from './EntityDetailContent';

export function EntityDetail() {
  const selectedIds = useSelectedEntityIds();
  const selectedId = selectedIds[0]; // Single selection for now
  const note = useNote(selectedId ?? '');

  if (!selectedId || !note) {
    return <EntityDetailEmpty />;
  }

  return (
    <div className="h-full flex flex-col bg-athena-bg">
      <EntityDetailHeader note={note} />
      <EntityDetailContent note={note} />
    </div>
  );
}

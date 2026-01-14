import type { Note } from '@/shared/types';
import { EditorContainer } from './EditorContainer';

interface EntityDetailContentProps {
  note: Note;
}

export function EntityDetailContent({ note }: EntityDetailContentProps) {
  return <EditorContainer note={note} />;
}

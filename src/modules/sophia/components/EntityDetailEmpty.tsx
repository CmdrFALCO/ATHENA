import { FileText } from 'lucide-react';

export function EntityDetailEmpty() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-athena-muted">
      <FileText size={48} className="mb-4 opacity-50" />
      <p className="text-lg">Select a note</p>
      <p className="text-sm mt-1">Choose a note from the sidebar to view its contents</p>
    </div>
  );
}

import { useState } from 'react';
import { File } from 'lucide-react';
import { ResourceUploadDialog } from './ResourceUploadDialog';

interface ResourceUploadButtonProps {
  onSuccess?: (resourceId: string) => void;
  initialPosition?: { x: number; y: number };
}

export function ResourceUploadButton({
  onSuccess,
  initialPosition,
}: ResourceUploadButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="p-1 rounded hover:bg-athena-bg text-athena-muted hover:text-athena-text transition-colors"
        title="Upload Resource"
      >
        <File className="w-4 h-4" />
      </button>

      <ResourceUploadDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onSuccess}
        initialPosition={initialPosition}
      />
    </>
  );
}

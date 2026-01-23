import { useState } from 'react';
import { Link } from 'lucide-react';
import { UrlResourceDialog } from './UrlResourceDialog';

interface UrlAddButtonProps {
  onSuccess?: (resourceId: string) => void;
  initialPosition?: { x: number; y: number };
}

export function UrlAddButton({ onSuccess, initialPosition }: UrlAddButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="p-1 rounded hover:bg-athena-bg text-athena-muted hover:text-athena-text transition-colors"
        title="Add URL"
      >
        <Link className="w-4 h-4" />
      </button>

      <UrlResourceDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onSuccess}
        initialPosition={initialPosition}
      />
    </>
  );
}

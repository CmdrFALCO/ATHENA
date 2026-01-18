import { useState } from 'react';
import {
  X,
  Download,
  Trash2,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Image,
  Link,
  File,
} from 'lucide-react';
import {
  useResource,
  updateResource,
  deleteResource,
  getResourceBlob,
  selectResource,
} from '@/store';
import { formatRelativeTime } from '@/shared/utils/formatTime';
import type { ResourceType, ExtractionStatus } from '@/shared/types/resources';

// Icon mapping for resource types
const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  md: FileText,
  image: Image,
  url: Link,
};

interface ResourceDetailPanelProps {
  resourceId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(status: ExtractionStatus): string {
  switch (status) {
    case 'complete':
      return 'text-green-400';
    case 'pending':
      return 'text-yellow-400';
    case 'failed':
      return 'text-red-400';
    default:
      return 'text-neutral-400';
  }
}

function getStatusLabel(status: ExtractionStatus): string {
  switch (status) {
    case 'complete':
      return 'Extracted';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return status;
  }
}

export function ResourceDetailPanel({ resourceId }: ResourceDetailPanelProps) {
  const resource = useResource(resourceId);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!resource) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-400">
        Resource not found
      </div>
    );
  }

  const Icon = RESOURCE_ICONS[resource.type] || File;

  const handleClose = () => {
    selectResource(null);
  };

  const handleDownload = async () => {
    const blob = await getResourceBlob(resourceId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${resource.name}"? This cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await deleteResource(resourceId);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleNotesChange = (notes: string) => {
    updateResource(resourceId, { userNotes: notes });
  };

  return (
    <div className="h-full flex flex-col bg-athena-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-5 h-5 text-athena-muted flex-shrink-0" />
          <h2 className="font-semibold text-athena-text truncate">{resource.name}</h2>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-athena-surface rounded text-athena-muted hover:text-athena-text transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metadata */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-athena-muted">Type</span>
            <span className="font-medium uppercase text-athena-text">{resource.type}</span>
          </div>
          {resource.mimeType && (
            <div className="flex justify-between">
              <span className="text-athena-muted">MIME Type</span>
              <span className="text-athena-text text-xs">{resource.mimeType}</span>
            </div>
          )}
          {resource.fileSize && (
            <div className="flex justify-between">
              <span className="text-athena-muted">Size</span>
              <span className="text-athena-text">{formatFileSize(resource.fileSize)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-athena-muted">Added</span>
            <span className="text-athena-text">{formatRelativeTime(resource.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-athena-muted">Extraction</span>
            <span className={getStatusColor(resource.extractionStatus)}>
              {getStatusLabel(resource.extractionStatus)}
            </span>
          </div>
        </div>

        {/* URL for url type */}
        {resource.type === 'url' && resource.url && (
          <div className="space-y-1">
            <label className="text-sm text-athena-muted">URL</label>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline text-sm break-all"
            >
              {resource.url}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* Extracted text preview */}
        {resource.extractedText && (
          <div className="space-y-1">
            <label className="text-sm text-athena-muted">Extracted Content</label>
            <div className="p-2 bg-athena-surface rounded text-sm text-athena-text max-h-40 overflow-y-auto">
              {resource.extractedText.slice(0, 500)}
              {resource.extractedText.length > 500 && '...'}
            </div>
          </div>
        )}

        {/* User notes */}
        <div className="space-y-1">
          <label className="text-sm text-athena-muted">Notes</label>
          <textarea
            value={resource.userNotes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add notes about this resource..."
            className="w-full p-2 bg-athena-surface border border-athena-border rounded text-sm text-athena-text h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-athena-muted"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 border-t border-athena-border">
        {resource.storageType === 'blob' && (
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-athena-surface hover:bg-neutral-700 rounded text-sm text-athena-text transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center justify-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded text-sm transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

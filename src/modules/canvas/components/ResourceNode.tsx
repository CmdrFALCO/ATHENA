import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  FileText,
  FileSpreadsheet,
  Image,
  Link,
  File,
  Clock,
  CheckCircle,
  AlertCircle,
  SkipForward,
} from 'lucide-react';
import type { Resource, ResourceType, ExtractionStatus } from '@/shared/types/resources';
import { getResourceColors } from '@/shared/theme/resourceColors';
import { useDevSettings, useSelectedResourceId } from '@/store';

// Icon mapping for resource types
const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  md: FileText,
  image: Image,
  url: Link,
};

// Extraction status badges
const STATUS_CONFIG: Record<
  ExtractionStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending extraction' },
  complete: { icon: CheckCircle, color: 'text-green-500', label: 'Extracted' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: 'Extraction failed' },
  skipped: { icon: SkipForward, color: 'text-gray-400', label: 'Skipped' },
};

export interface ResourceNodeData extends Record<string, unknown> {
  resource: Resource;
}

// Format file size for display
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ResourceNode = memo(function ResourceNode({
  data,
  selected,
}: NodeProps) {
  const { resource } = data as ResourceNodeData;
  const devSettings = useDevSettings();
  const selectedResourceId = useSelectedResourceId();
  const colorScheme = devSettings.resources?.nodeColorScheme ?? 'per-type';
  const colors = getResourceColors(resource.type, colorScheme);

  const [showTooltip, setShowTooltip] = useState(false);

  const Icon = RESOURCE_ICONS[resource.type] || File;
  const statusConfig = STATUS_CONFIG[resource.extractionStatus];
  const StatusIcon = statusConfig.icon;

  // Check if this resource is selected (from store or React Flow)
  const isStoreSelected = selectedResourceId === resource.id;
  const isHighlighted = selected || isStoreSelected;

  return (
    <div className="relative">
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-neutral-500 !w-2 !h-2"
      />

      <div
        className={`
          min-w-[180px] max-w-[240px] rounded-lg overflow-hidden
          transition-all duration-150
          ${isHighlighted
            ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20'
            : 'shadow-md'
          }
        `}
        style={{
          backgroundColor: colors.background,
          borderLeft: `4px solid ${colors.accent}`,
        }}
      >
        {/* Header with icon and type badge */}
        <div
          className="px-3 py-1.5 flex items-center gap-2 border-b"
          style={{
            borderColor: colors.border + '40', // 25% opacity
            color: colors.text,
          }}
        >
          <span style={{ color: colors.accent }}>
            <Icon className="w-4 h-4 flex-shrink-0" />
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded uppercase tracking-wide"
            style={{
              backgroundColor: colors.accent + '30', // 18% opacity
              color: colors.text,
            }}
          >
            {resource.type}
          </span>

          {/* Extraction status indicator */}
          <div
            className="ml-auto cursor-help relative"
            title={statusConfig.label}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs bg-neutral-800 text-white rounded shadow-lg whitespace-nowrap z-10">
                {statusConfig.label}
              </div>
            )}
          </div>
        </div>

        {/* Resource name */}
        <div className="px-3 py-2" style={{ color: colors.text }}>
          <p className="text-sm font-medium truncate" title={resource.name}>
            {resource.name}
          </p>

          {/* File size and URL indicator */}
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
            {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
            {resource.type === 'url' && resource.url && (
              <span className="truncate" title={resource.url}>
                {(() => {
                  try {
                    return new URL(resource.url).hostname;
                  } catch {
                    return resource.url;
                  }
                })()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-neutral-500 !w-2 !h-2"
      />
    </div>
  );
});

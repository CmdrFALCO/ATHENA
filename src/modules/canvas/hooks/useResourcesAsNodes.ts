import { useMemo, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { useResources, useSelectedResourceId, selectResource } from '@/store';
import { useDevSettings } from '@/store';
import type { ResourceNodeData } from '../components/ResourceNode';

/**
 * Convert resources from state to React Flow nodes
 * Resource nodes use the ID format `resource-{id}` to avoid collision with entity IDs
 */
export function useResourcesAsNodes() {
  const resources = useResources();
  const selectedResourceId = useSelectedResourceId();
  const devSettings = useDevSettings();

  // Check if resources are enabled in settings
  const resourcesEnabled = devSettings.resources?.enabled ?? true;

  // Get the selected resource node ID (prefixed format for React Flow)
  const selectedNodeId: string | null = selectedResourceId
    ? `resource-${selectedResourceId}`
    : null;

  const nodes = useMemo<Node<ResourceNodeData>[]>(() => {
    // Return empty if resources are disabled
    if (!resourcesEnabled) return [];

    return resources
      .filter((r) => !r.invalidAt) // Exclude soft-deleted
      .map((resource, index) => ({
        id: `resource-${resource.id}`, // Prefix to avoid collision with entity IDs
        type: 'resource',
        position: {
          x: resource.positionX ?? 400 + (index % 4) * 250, // Default grid position, offset from entities
          y: resource.positionY ?? 100 + Math.floor(index / 4) * 150,
        },
        data: { resource },
      }));
  }, [resources, resourcesEnabled]);

  const onNodeSelect = useCallback((resourceId: string) => {
    selectResource(resourceId);
  }, []);

  return { nodes, onNodeSelect, selectedNodeId };
}

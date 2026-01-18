import type { ResourceType } from '@/shared/types/resources';

/**
 * Resource color schemes
 * Toggle via DevSettings: resources.nodeColorScheme
 */

// Unified scheme — all resources use purple/violet
export const UNIFIED_RESOURCE_COLORS = {
  accent: '#8b5cf6', // violet-500
  border: '#a78bfa', // violet-400
  background: '#2d2640', // dark violet surface
  text: '#e5e5e5', // light text for dark theme
};

// Per-type scheme — each resource type has distinct color
export const PER_TYPE_RESOURCE_COLORS: Record<
  ResourceType,
  {
    accent: string;
    border: string;
    background: string;
    text: string;
  }
> = {
  pdf: {
    accent: '#dc2626', // red-600
    border: '#f87171', // red-400
    background: '#3d2525', // dark red surface
    text: '#e5e5e5',
  },
  docx: {
    accent: '#2563eb', // blue-600
    border: '#60a5fa', // blue-400
    background: '#252d3d', // dark blue surface
    text: '#e5e5e5',
  },
  xlsx: {
    accent: '#16a34a', // green-600
    border: '#4ade80', // green-400
    background: '#253d2b', // dark green surface
    text: '#e5e5e5',
  },
  md: {
    accent: '#6b7280', // gray-500
    border: '#9ca3af', // gray-400
    background: '#2d2d2d', // dark gray surface
    text: '#e5e5e5',
  },
  image: {
    accent: '#8b5cf6', // violet-500
    border: '#a78bfa', // violet-400
    background: '#2d2640', // dark violet surface
    text: '#e5e5e5',
  },
  url: {
    accent: '#06b6d4', // cyan-500
    border: '#22d3ee', // cyan-400
    background: '#25353d', // dark cyan surface
    text: '#e5e5e5',
  },
};

/**
 * Get colors for a resource based on current scheme
 */
export function getResourceColors(
  resourceType: ResourceType,
  scheme: 'unified' | 'per-type'
) {
  if (scheme === 'unified') {
    return UNIFIED_RESOURCE_COLORS;
  }
  return PER_TYPE_RESOURCE_COLORS[resourceType];
}

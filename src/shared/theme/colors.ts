// src/shared/theme/colors.ts
export const ATHENA_COLORS = {
  // Tri-color connection system
  connection: {
    explicit: '#3b82f6',    // Blue - user-created connections
    semantic: '#22c55e',    // Green - AI-suggested connections
    error: '#ef4444',       // Red - validation errors
    warning: '#f59e0b',     // Amber - validation warnings
  },

  // Node colors by entity type
  node: {
    note: '#3b82f6',        // Blue
    plan: '#f59e0b',        // Amber
    document: '#8b5cf6',    // Purple
  },

  // UI states
  ui: {
    selected: '#fbbf24',    // Amber for selection highlight
    hover: '#4b5563',       // Gray-600
    focus: '#3b82f6',       // Blue
  },

  // Surface colors (dark theme)
  surface: {
    canvas: '#1a1a1a',      // Main canvas background
    node: '#252525',        // Node background
    nodeBorder: '#3a3a3a',  // Node border
    panel: '#252525',       // Panel background
  },

  // Text
  text: {
    primary: '#e5e5e5',
    secondary: '#a3a3a3',
    muted: '#737373',
  },
} as const;

export type ConnectionColor = keyof typeof ATHENA_COLORS.connection;
export type NodeColor = keyof typeof ATHENA_COLORS.node;

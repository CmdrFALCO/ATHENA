/**
 * Autonomous Mode Presets — WP 9B.2
 *
 * Three recommended starting configurations: strict, balanced, permissive.
 * Users can customize from any preset → preset switches to 'custom'.
 */

import type { AutonomousConfig, AutonomousPreset } from './types';

export const AUTONOMOUS_PRESETS: Record<
  Exclude<AutonomousPreset, 'custom'>,
  AutonomousConfig
> = {
  strict: {
    enabled: true,
    thresholds: {
      autoAcceptEntity: 0.95,
      autoAcceptConnection: 0.92,
      autoRejectBelow: 0.40,
    },
    limits: {
      maxAutoCommitsPerHour: 50,
      maxAutoCommitsPerDay: 200,
      maxPendingReview: 20,
      cooldownMinutes: 30,
    },
    scope: {
      allowedEntityTypes: ['note'],
      blockedEntityTypes: ['person', 'organization'],
      requireValidation: true,
      requireCritique: true,
    },
    ui: {
      showNotifications: true,
      showAutoCommitsInChat: true,
      highlightCyan: true,
    },
  },

  balanced: {
    enabled: true,
    thresholds: {
      autoAcceptEntity: 0.90,
      autoAcceptConnection: 0.85,
      autoRejectBelow: 0.30,
    },
    limits: {
      maxAutoCommitsPerHour: 100,
      maxAutoCommitsPerDay: 500,
      maxPendingReview: 50,
      cooldownMinutes: 15,
    },
    scope: {
      allowedEntityTypes: ['*'],
      blockedEntityTypes: [],
      requireValidation: true,
      requireCritique: false,
    },
    ui: {
      showNotifications: true,
      showAutoCommitsInChat: true,
      highlightCyan: true,
    },
  },

  permissive: {
    enabled: true,
    thresholds: {
      autoAcceptEntity: 0.80,
      autoAcceptConnection: 0.75,
      autoRejectBelow: 0.20,
    },
    limits: {
      maxAutoCommitsPerHour: 200,
      maxAutoCommitsPerDay: 1000,
      maxPendingReview: 100,
      cooldownMinutes: 5,
    },
    scope: {
      allowedEntityTypes: ['*'],
      blockedEntityTypes: [],
      requireValidation: true,
      requireCritique: false,
    },
    ui: {
      showNotifications: true,
      showAutoCommitsInChat: false,
      highlightCyan: true,
    },
  },
};

/**
 * Get a config from a preset name. Returns balanced defaults for 'custom'.
 */
export function getPresetConfig(preset: AutonomousPreset): AutonomousConfig {
  if (preset === 'custom') {
    return { ...AUTONOMOUS_PRESETS.balanced };
  }
  return { ...AUTONOMOUS_PRESETS[preset] };
}

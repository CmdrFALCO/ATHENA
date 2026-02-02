// Validation Services Barrel Export

import type { IValidationService } from '../interfaces/IValidationService';
import { devSettings$ } from '@/config/devSettings';

export { SimpleValidationService, validationService } from './SimpleValidationService';

/**
 * Get the active validation service based on DevSettings.
 *
 * When axiom.enabled is true, returns the AXIOM-powered service
 * that uses the corrective feedback loop for proposal validation.
 * Otherwise returns the simple Phase 5A service.
 *
 * WP 9A.4 — AXIOM Integration
 */
export function getValidationService(): IValidationService {
  if (devSettings$.axiom.enabled.peek()) {
    // Lazy import to avoid circular dependency
    const { axiomValidationService } = require('@/modules/axiom/services/AXIOMValidationService');
    return axiomValidationService;
  }
  const { validationService } = require('./SimpleValidationService');
  return validationService;
}

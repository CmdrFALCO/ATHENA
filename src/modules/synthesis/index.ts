// src/modules/synthesis/index.ts — WP 8.7: Synthesis Reports (WP 8.7.1: Resource Support)

// Types
export type {
  SynthesisFormat,
  SynthesisRequest,
  SynthesisReport,
  SynthesisProgress,
  SynthesisConfig,
} from './types';
export { FORMAT_INFO } from './types';

// Service
export { SynthesisService, getSynthesisService } from './services/SynthesisService';

// Prompts
export { buildSynthesisPrompt, generateReportTitle } from './prompts/synthesisPrompts';

// State
export { synthesisState$ } from './store/synthesisState';
export {
  openSynthesisPanel,
  closeSynthesisPanel,
  toggleSynthesisPanel,
  setFormat,
  setMaxLength,
  setIncludeConnections,
  setIncludeResources,
  setResourceMaxChars,
  setCustomPrompt,
  generateSynthesis,
  saveReportAsNote,
  clearSynthesis,
  initSynthesisAdapters,
} from './store/synthesisActions';

// Components
export { SynthesisPanel, FormatSelector, ReportViewer, SynthesisButton } from './components';

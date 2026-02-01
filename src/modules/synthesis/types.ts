// src/modules/synthesis/types.ts — WP 8.7: Synthesis Reports (WP 8.7.1: Resource Support)

export type SynthesisFormat = 'summary' | 'outline' | 'report';

export interface SynthesisRequest {
  entityIds: string[];
  resourceIds: string[];
  format: SynthesisFormat;
  maxLength?: number;
  customPrompt?: string;
  includeConnections: boolean;
  includeResources: boolean;
  resourceMaxChars: number;
}

export interface SynthesisReport {
  id: string;
  title: string;
  content: string;
  format: SynthesisFormat;

  // Source tracking
  sourceEntityIds: string[];
  sourceResourceIds: string[];
  sourceConnectionIds: string[];

  // Generation metadata
  generatedAt: string;
  tokenCount?: number;
  model?: string;
}

export interface SynthesisProgress {
  status: 'idle' | 'gathering' | 'generating' | 'complete' | 'error';
  progress: number;
  partialContent: string;
  error?: string;
}

export interface SynthesisConfig {
  enabled: boolean;
  defaultFormat: SynthesisFormat;
  defaultMaxLength: number;
  includeConnectionsByDefault: boolean;
  includeResourcesByDefault: boolean;
  resourceMaxChars: number;
  showInCanvasToolbar: boolean;
  streamingEnabled: boolean;
}

export const FORMAT_INFO: Record<SynthesisFormat, { label: string; description: string; icon: string }> = {
  summary: {
    label: 'Summary',
    description: 'A concise overview of key points',
    icon: 'file-text',
  },
  outline: {
    label: 'Outline',
    description: 'Hierarchical structure with bullet points',
    icon: 'list',
  },
  report: {
    label: 'Report',
    description: 'Detailed narrative with sections',
    icon: 'book-open',
  },
};

// ============================================================
// EXPORT FORMATS
// ============================================================

export type ExportFormat = 'markdown' | 'json' | 'csv' | 'html';

export interface FormatInfo {
  id: ExportFormat;
  name: string;
  description: string;
  fileExtension: string;
  mimeType: string;
  icon: string; // Lucide icon name
}

export const FORMAT_INFO: Record<ExportFormat, FormatInfo> = {
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    description: 'Plain text with formatting, compatible with Obsidian',
    fileExtension: '.md',
    mimeType: 'text/markdown',
    icon: 'FileText',
  },
  json: {
    id: 'json',
    name: 'JSON',
    description: 'Structured data with entities and connections',
    fileExtension: '.json',
    mimeType: 'application/json',
    icon: 'Braces',
  },
  csv: {
    id: 'csv',
    name: 'CSV',
    description: 'Spreadsheet-compatible flat export',
    fileExtension: '.csv',
    mimeType: 'text/csv',
    icon: 'Table',
  },
  html: {
    id: 'html',
    name: 'HTML',
    description: 'Styled web page, ready to share or print',
    fileExtension: '.html',
    mimeType: 'text/html',
    icon: 'Globe',
  },
};

// ============================================================
// EXPORT DATA
// ============================================================

export type ExportSource =
  | 'single' // Single entity from detail panel
  | 'selection' // Multi-selection from canvas
  | 'view' // Smart View results
  | 'synthesis'; // Synthesis report

export interface ExportEntity {
  id: string;
  title: string;
  type: string;
  content: unknown; // Tiptap JSON
  contentText: string; // Extracted plain text
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExportConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
  label: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ExportData {
  source: ExportSource;
  entities: ExportEntity[];
  connections: ExportConnection[];
  metadata: {
    exportedAt: string;
    athenaVersion: string;
    entityCount: number;
    connectionCount: number;
    expandedHops?: number;
  };
}

// ============================================================
// EXPORT OPTIONS
// ============================================================

export interface BaseExportOptions {
  format: ExportFormat;
  includeConnections: boolean;
  expandHops: number; // 0 = no expansion, 1-3 = include neighbors
  filename?: string; // Custom filename (without extension)
}

export interface MarkdownExportOptions extends BaseExportOptions {
  format: 'markdown';
  includeFrontmatter: boolean;
  includeConnectionsSection: boolean;
  linkFormat: 'wiki' | 'markdown'; // [[title]] vs [title](id)
}

export interface JSONExportOptions extends BaseExportOptions {
  format: 'json';
  shape: 'objects' | 'graph'; // Flat vs nodes/edges
  includeContent: boolean;
  prettyPrint: boolean;
}

export interface CSVExportOptions extends BaseExportOptions {
  format: 'csv';
  includeContent: boolean;
  delimiter: ',' | '\t';
  columns: string[];
}

export interface HTMLExportOptions extends BaseExportOptions {
  format: 'html';
  includeStyles: boolean;
  theme: 'dark' | 'light';
  includeTableOfContents: boolean;
}

export type ExportOptions =
  | MarkdownExportOptions
  | JSONExportOptions
  | CSVExportOptions
  | HTMLExportOptions;

// ============================================================
// RENDERER INTERFACE
// ============================================================

export interface RenderContext {
  source: ExportSource;
  options: ExportOptions;
}

export interface RenderResult {
  content: string | Blob;
  filename: string;
  mimeType: string;
}

// ============================================================
// EXPORT STATE
// ============================================================

export interface ExportState {
  dialogOpen: boolean;
  dialogSource: ExportSource | null;
  entityIds: string[];
  resourceIds: string[];
  synthesisContent: string | null;
  isExporting: boolean;
  error: string | null;
  lastOptions: Partial<ExportOptions> | null;
}

// ============================================================
// EXPORT CONFIG (for devSettings)
// ============================================================

export interface ExportConfig {
  enabled: boolean;
  showInCanvasToolbar: boolean;
  defaultFormat: ExportFormat;
}

// ============================================================
// DEFAULT COLUMNS FOR CSV
// ============================================================

export const DEFAULT_CSV_COLUMNS = [
  'id',
  'title',
  'type',
  'created_at',
  'updated_at',
  'connection_count',
];

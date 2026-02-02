# ATHENA — WP 8.10: Export Renderers

## Overview

**Goal:** Export knowledge in multiple formats with a plugin-based renderer architecture.

**Source:** Datasette "Renderers as Plugins" pattern (ATHENA_Deferred_Patterns_v3.md §Renderers as Plugins)

**Scope:**
- Single entity export
- Multi-selection export (with connections between selected)
- Smart View results export
- Synthesis report download
- N-hop neighbor expansion for graph exports

**UI Pattern:** Quick dropdown for common exports + "More options..." dialog for full control

---

## New Module Structure

```
src/modules/export/
├── index.ts                      # Barrel export
├── types.ts                      # ExportFormat, ExportData, IRenderer, etc.
├── renderers/
│   ├── IRenderer.ts              # Renderer interface
│   ├── MarkdownRenderer.ts       # Export as .md
│   ├── JSONRenderer.ts           # Export as .json
│   ├── CSVRenderer.ts            # Export as .csv
│   └── HTMLRenderer.ts           # Export as .html
├── services/
│   ├── ExportService.ts          # Orchestrates renderers, handles N-hop
│   └── DownloadService.ts        # Triggers browser download
├── store/
│   ├── exportState.ts            # Legend-State slice
│   └── exportActions.ts          # Export, dialog toggle
├── components/
│   ├── ExportDropdown.tsx        # Quick export dropdown
│   ├── ExportDialog.tsx          # Full options dialog
│   ├── FormatOptions.tsx         # Per-format option panels
│   └── ExportButton.tsx          # Reusable trigger button
└── hooks/
    └── useExport.ts              # Hook for components
```

**Files to create:** 14 new files
**Files to modify:** 6 existing files

---

## Types (types.ts)

```typescript
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
  icon: string;  // Lucide icon name
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
  | 'single'           // Single entity from detail panel
  | 'selection'        // Multi-selection from canvas
  | 'view'             // Smart View results
  | 'synthesis';       // Synthesis report

export interface ExportEntity {
  id: string;
  title: string;
  type: string;
  content: any;              // Tiptap JSON
  contentText: string;       // Extracted plain text
  metadata: Record<string, any>;
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
  type: 'explicit' | 'ai_suggested' | 'cluster';
  metadata: Record<string, any>;
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
    expandedHops?: number;    // If N-hop expansion was used
  };
}

// ============================================================
// EXPORT OPTIONS
// ============================================================

export interface BaseExportOptions {
  format: ExportFormat;
  includeConnections: boolean;
  expandHops: number;         // 0 = no expansion, 1-3 = include neighbors
  filename?: string;          // Custom filename (without extension)
}

export interface MarkdownExportOptions extends BaseExportOptions {
  format: 'markdown';
  includeFrontmatter: boolean;
  includeConnectionsSection: boolean;
  linkFormat: 'wiki' | 'markdown';  // [[title]] vs [title](id)
}

export interface JSONExportOptions extends BaseExportOptions {
  format: 'json';
  shape: 'objects' | 'graph';       // Flat vs nodes/edges
  includeContent: boolean;
  prettyPrint: boolean;
}

export interface CSVExportOptions extends BaseExportOptions {
  format: 'csv';
  includeContent: boolean;
  delimiter: ',' | '\t';
  columns: string[];                // Which columns to include
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
  // Dialog state
  dialogOpen: boolean;
  dialogSource: ExportSource | null;
  
  // Pre-populated data for dialog
  entityIds: string[];
  resourceIds: string[];        // For future resource export
  synthesisContent: string | null;
  
  // Export progress
  isExporting: boolean;
  error: string | null;
  
  // Last used options (for quick repeat)
  lastOptions: Partial<ExportOptions> | null;
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
```

---

## Renderer Interface (renderers/IRenderer.ts)

```typescript
import type { ExportData, ExportOptions, RenderContext, RenderResult } from '../types';

/**
 * Interface for export renderers.
 * Following Datasette's plugin pattern for extensibility.
 */
export interface IRenderer {
  /** Unique identifier */
  readonly id: string;
  
  /** Display name */
  readonly name: string;
  
  /** File extension (with dot) */
  readonly fileExtension: string;
  
  /** MIME type for download */
  readonly mimeType: string;
  
  /**
   * Check if this renderer can handle the given data/context.
   * Allows renderers to decline certain exports.
   */
  canRender(data: ExportData, context: RenderContext): boolean;
  
  /**
   * Render the data to the output format.
   * Returns content as string or Blob, plus filename suggestion.
   */
  render(data: ExportData, context: RenderContext): Promise<RenderResult>;
}

/**
 * Registry of available renderers.
 * New renderers can be added here for extensibility.
 */
export class RendererRegistry {
  private renderers: Map<string, IRenderer> = new Map();
  
  register(renderer: IRenderer): void {
    this.renderers.set(renderer.id, renderer);
  }
  
  get(id: string): IRenderer | undefined {
    return this.renderers.get(id);
  }
  
  getAll(): IRenderer[] {
    return Array.from(this.renderers.values());
  }
  
  findFor(data: ExportData, context: RenderContext): IRenderer | undefined {
    return this.getAll().find(r => r.canRender(data, context));
  }
}

// Global registry instance
export const rendererRegistry = new RendererRegistry();
```

---

## Markdown Renderer (renderers/MarkdownRenderer.ts)

```typescript
import type { IRenderer } from './IRenderer';
import type { 
  ExportData, 
  ExportEntity, 
  RenderContext, 
  RenderResult,
  MarkdownExportOptions 
} from '../types';

export class MarkdownRenderer implements IRenderer {
  readonly id = 'markdown';
  readonly name = 'Markdown';
  readonly fileExtension = '.md';
  readonly mimeType = 'text/markdown';
  
  canRender(): boolean {
    return true; // Can always render to markdown
  }
  
  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as MarkdownExportOptions;
    const parts: string[] = [];
    
    // Single entity export
    if (data.entities.length === 1) {
      parts.push(this.renderEntity(data.entities[0], data, options));
    } else {
      // Multi-entity export
      parts.push(this.renderMultipleEntities(data, options));
    }
    
    const content = parts.join('\n\n');
    const filename = this.generateFilename(data, options);
    
    return { content, filename, mimeType: this.mimeType };
  }
  
  private renderEntity(
    entity: ExportEntity, 
    data: ExportData,
    options: MarkdownExportOptions
  ): string {
    const parts: string[] = [];
    
    // YAML frontmatter
    if (options.includeFrontmatter) {
      parts.push(this.renderFrontmatter(entity));
    }
    
    // Title as H1
    parts.push(`# ${entity.title}`);
    
    // Content
    parts.push(entity.contentText);
    
    // Connected notes section
    if (options.includeConnectionsSection && data.connections.length > 0) {
      parts.push(this.renderConnectionsSection(entity, data, options));
    }
    
    return parts.join('\n\n');
  }
  
  private renderFrontmatter(entity: ExportEntity): string {
    const frontmatter: Record<string, any> = {
      title: entity.title,
      type: entity.type,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
    
    // Add any custom metadata
    if (entity.metadata.tags) {
      frontmatter.tags = entity.metadata.tags;
    }
    
    const yaml = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.join(', ')}]`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');
    
    return `---\n${yaml}\n---`;
  }
  
  private renderConnectionsSection(
    entity: ExportEntity,
    data: ExportData,
    options: MarkdownExportOptions
  ): string {
    const connections = data.connections.filter(
      c => c.sourceId === entity.id || c.targetId === entity.id
    );
    
    if (connections.length === 0) return '';
    
    const lines = ['## Connected Notes', ''];
    
    for (const conn of connections) {
      const isSource = conn.sourceId === entity.id;
      const linkedTitle = isSource ? conn.targetTitle : conn.sourceTitle;
      const linkedId = isSource ? conn.targetId : conn.sourceId;
      const direction = isSource ? '→' : '←';
      
      const link = options.linkFormat === 'wiki'
        ? `[[${linkedTitle}]]`
        : `[${linkedTitle}](${linkedId})`;
      
      const label = conn.label ? ` (${conn.label})` : '';
      lines.push(`- ${direction} ${link}${label}`);
    }
    
    return lines.join('\n');
  }
  
  private renderMultipleEntities(
    data: ExportData, 
    options: MarkdownExportOptions
  ): string {
    const parts: string[] = [];
    
    // Header with export metadata
    parts.push(`# ATHENA Export`);
    parts.push(`*Exported ${data.entities.length} notes on ${new Date().toLocaleDateString()}*`);
    parts.push('---');
    
    // Table of contents
    parts.push('## Contents\n');
    for (const entity of data.entities) {
      const anchor = entity.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      parts.push(`- [${entity.title}](#${anchor})`);
    }
    
    // Each entity
    for (const entity of data.entities) {
      parts.push('---');
      parts.push(this.renderEntity(entity, data, options));
    }
    
    return parts.join('\n\n');
  }
  
  private generateFilename(data: ExportData, options: MarkdownExportOptions): string {
    if (options.filename) {
      return `${options.filename}${this.fileExtension}`;
    }
    
    if (data.entities.length === 1) {
      const title = data.entities[0].title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
      return `${title}${this.fileExtension}`;
    }
    
    const date = new Date().toISOString().split('T')[0];
    return `athena-export-${date}${this.fileExtension}`;
  }
}
```

---

## JSON Renderer (renderers/JSONRenderer.ts)

```typescript
import type { IRenderer } from './IRenderer';
import type { 
  ExportData, 
  RenderContext, 
  RenderResult,
  JSONExportOptions 
} from '../types';

export class JSONRenderer implements IRenderer {
  readonly id = 'json';
  readonly name = 'JSON';
  readonly fileExtension = '.json';
  readonly mimeType = 'application/json';
  
  canRender(): boolean {
    return true;
  }
  
  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as JSONExportOptions;
    
    let output: any;
    
    if (options.shape === 'graph') {
      output = this.renderAsGraph(data, options);
    } else {
      output = this.renderAsObjects(data, options);
    }
    
    const content = options.prettyPrint 
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
    
    const filename = this.generateFilename(data, options);
    
    return { content, filename, mimeType: this.mimeType };
  }
  
  private renderAsObjects(data: ExportData, options: JSONExportOptions): any {
    return {
      metadata: data.metadata,
      entities: data.entities.map(e => ({
        id: e.id,
        title: e.title,
        type: e.type,
        content: options.includeContent ? e.content : undefined,
        contentText: options.includeContent ? e.contentText : undefined,
        metadata: e.metadata,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      connections: options.includeConnections ? data.connections.map(c => ({
        id: c.id,
        sourceId: c.sourceId,
        targetId: c.targetId,
        label: c.label,
        type: c.type,
        metadata: c.metadata,
        createdAt: c.createdAt,
      })) : undefined,
    };
  }
  
  private renderAsGraph(data: ExportData, options: JSONExportOptions): any {
    // JSON-Graph format: https://github.com/jsongraph/json-graph-specification
    return {
      graph: {
        metadata: data.metadata,
        nodes: data.entities.map(e => ({
          id: e.id,
          label: e.title,
          metadata: {
            type: e.type,
            content: options.includeContent ? e.contentText : undefined,
            ...e.metadata,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          },
        })),
        edges: options.includeConnections ? data.connections.map(c => ({
          source: c.sourceId,
          target: c.targetId,
          label: c.label,
          metadata: {
            id: c.id,
            type: c.type,
            ...c.metadata,
          },
        })) : [],
      },
    };
  }
  
  private generateFilename(data: ExportData, options: JSONExportOptions): string {
    if (options.filename) {
      return `${options.filename}${this.fileExtension}`;
    }
    
    if (data.entities.length === 1) {
      const title = data.entities[0].title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
      return `${title}${this.fileExtension}`;
    }
    
    const date = new Date().toISOString().split('T')[0];
    const suffix = options.shape === 'graph' ? '-graph' : '';
    return `athena-export-${date}${suffix}${this.fileExtension}`;
  }
}
```

---

## CSV Renderer (renderers/CSVRenderer.ts)

```typescript
import type { IRenderer } from './IRenderer';
import type { 
  ExportData, 
  ExportEntity,
  RenderContext, 
  RenderResult,
  CSVExportOptions,
  DEFAULT_CSV_COLUMNS 
} from '../types';

export class CSVRenderer implements IRenderer {
  readonly id = 'csv';
  readonly name = 'CSV';
  readonly fileExtension = '.csv';
  readonly mimeType = 'text/csv';
  
  canRender(): boolean {
    return true;
  }
  
  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as CSVExportOptions;
    const delimiter = options.delimiter || ',';
    const columns = options.columns.length > 0 ? options.columns : DEFAULT_CSV_COLUMNS;
    
    const rows: string[] = [];
    
    // Header row
    rows.push(columns.join(delimiter));
    
    // Data rows
    for (const entity of data.entities) {
      const row = columns.map(col => this.getColumnValue(entity, col, data, options));
      rows.push(row.map(v => this.escapeCSV(v, delimiter)).join(delimiter));
    }
    
    const content = rows.join('\n');
    const filename = this.generateFilename(data, options);
    
    return { content, filename, mimeType: this.mimeType };
  }
  
  private getColumnValue(
    entity: ExportEntity, 
    column: string, 
    data: ExportData,
    options: CSVExportOptions
  ): string {
    switch (column) {
      case 'id':
        return entity.id;
      case 'title':
        return entity.title;
      case 'type':
        return entity.type;
      case 'created_at':
        return entity.createdAt;
      case 'updated_at':
        return entity.updatedAt;
      case 'content':
        return options.includeContent ? entity.contentText : '';
      case 'connection_count':
        return String(
          data.connections.filter(
            c => c.sourceId === entity.id || c.targetId === entity.id
          ).length
        );
      default:
        // Check metadata
        return entity.metadata[column] ?? '';
    }
  }
  
  private escapeCSV(value: string, delimiter: string): string {
    if (!value) return '';
    
    // Escape quotes and wrap in quotes if contains delimiter, newline, or quote
    const needsQuotes = 
      value.includes(delimiter) || 
      value.includes('\n') || 
      value.includes('"');
    
    if (needsQuotes) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
  
  private generateFilename(data: ExportData, options: CSVExportOptions): string {
    if (options.filename) {
      return `${options.filename}${this.fileExtension}`;
    }
    
    const date = new Date().toISOString().split('T')[0];
    return `athena-export-${date}${this.fileExtension}`;
  }
}
```

---

## HTML Renderer (renderers/HTMLRenderer.ts)

```typescript
import type { IRenderer } from './IRenderer';
import type { 
  ExportData, 
  ExportEntity,
  RenderContext, 
  RenderResult,
  HTMLExportOptions 
} from '../types';

export class HTMLRenderer implements IRenderer {
  readonly id = 'html';
  readonly name = 'HTML';
  readonly fileExtension = '.html';
  readonly mimeType = 'text/html';
  
  canRender(): boolean {
    return true;
  }
  
  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as HTMLExportOptions;
    
    const html = this.generateHTML(data, options);
    const filename = this.generateFilename(data, options);
    
    return { content: html, filename, mimeType: this.mimeType };
  }
  
  private generateHTML(data: ExportData, options: HTMLExportOptions): string {
    const title = data.entities.length === 1 
      ? data.entities[0].title 
      : 'ATHENA Export';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  ${options.includeStyles ? this.getStyles(options.theme) : ''}
</head>
<body>
  <main class="container">
    ${this.renderHeader(data)}
    ${options.includeTableOfContents && data.entities.length > 1 
      ? this.renderTableOfContents(data) 
      : ''}
    ${this.renderEntities(data, options)}
  </main>
  <footer>
    <p>Exported from ATHENA on ${new Date().toLocaleDateString()}</p>
  </footer>
</body>
</html>`;
  }
  
  private getStyles(theme: 'dark' | 'light'): string {
    const colors = theme === 'dark' 
      ? {
          bg: '#0f0f14',
          surface: '#1a1a24',
          border: '#2a2a3a',
          text: '#e0e0e8',
          muted: '#888898',
          accent: '#6366f1',
        }
      : {
          bg: '#ffffff',
          surface: '#f8f8fa',
          border: '#e0e0e8',
          text: '#1a1a24',
          muted: '#666680',
          accent: '#4f46e5',
        };
    
    return `<style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: ${colors.bg};
        color: ${colors.text};
        line-height: 1.6;
        padding: 2rem;
      }
      .container { max-width: 800px; margin: 0 auto; }
      header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid ${colors.border}; }
      header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      header .meta { color: ${colors.muted}; font-size: 0.875rem; }
      .toc { background: ${colors.surface}; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
      .toc h2 { font-size: 1rem; margin-bottom: 0.5rem; }
      .toc ul { list-style: none; }
      .toc li { margin: 0.25rem 0; }
      .toc a { color: ${colors.accent}; text-decoration: none; }
      .toc a:hover { text-decoration: underline; }
      article { margin-bottom: 2rem; padding: 1.5rem; background: ${colors.surface}; border-radius: 8px; }
      article h2 { font-size: 1.25rem; margin-bottom: 1rem; color: ${colors.accent}; }
      article .content { white-space: pre-wrap; }
      article .metadata { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid ${colors.border}; font-size: 0.875rem; color: ${colors.muted}; }
      .connections { margin-top: 1rem; }
      .connections h3 { font-size: 0.875rem; margin-bottom: 0.5rem; color: ${colors.muted}; }
      .connections ul { list-style: none; }
      .connections li { margin: 0.25rem 0; }
      .connections a { color: ${colors.accent}; text-decoration: none; }
      footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid ${colors.border}; text-align: center; color: ${colors.muted}; font-size: 0.75rem; }
    </style>`;
  }
  
  private renderHeader(data: ExportData): string {
    const title = data.entities.length === 1 
      ? data.entities[0].title 
      : 'ATHENA Knowledge Export';
    
    return `<header>
      <h1>${this.escapeHTML(title)}</h1>
      <p class="meta">${data.entities.length} note${data.entities.length !== 1 ? 's' : ''}${
        data.connections.length > 0 ? `, ${data.connections.length} connection${data.connections.length !== 1 ? 's' : ''}` : ''
      }</p>
    </header>`;
  }
  
  private renderTableOfContents(data: ExportData): string {
    const items = data.entities
      .map(e => {
        const anchor = this.toAnchor(e.title);
        return `<li><a href="#${anchor}">${this.escapeHTML(e.title)}</a></li>`;
      })
      .join('\n');
    
    return `<nav class="toc">
      <h2>Contents</h2>
      <ul>${items}</ul>
    </nav>`;
  }
  
  private renderEntities(data: ExportData, options: HTMLExportOptions): string {
    return data.entities
      .map(e => this.renderEntity(e, data, options))
      .join('\n');
  }
  
  private renderEntity(
    entity: ExportEntity, 
    data: ExportData, 
    options: HTMLExportOptions
  ): string {
    const anchor = this.toAnchor(entity.title);
    const connections = data.connections.filter(
      c => c.sourceId === entity.id || c.targetId === entity.id
    );
    
    return `<article id="${anchor}">
      <h2>${this.escapeHTML(entity.title)}</h2>
      <div class="content">${this.escapeHTML(entity.contentText)}</div>
      ${options.includeConnections && connections.length > 0 
        ? this.renderConnections(entity, connections, data) 
        : ''}
      <div class="metadata">
        <span>Type: ${entity.type}</span> · 
        <span>Created: ${new Date(entity.createdAt).toLocaleDateString()}</span> · 
        <span>Updated: ${new Date(entity.updatedAt).toLocaleDateString()}</span>
      </div>
    </article>`;
  }
  
  private renderConnections(
    entity: ExportEntity,
    connections: ExportData['connections'],
    data: ExportData
  ): string {
    const items = connections
      .map(c => {
        const isSource = c.sourceId === entity.id;
        const linkedTitle = isSource ? c.targetTitle : c.sourceTitle;
        const linkedId = isSource ? c.targetId : c.sourceId;
        const direction = isSource ? '→' : '←';
        const label = c.label ? ` (${c.label})` : '';
        
        // Link to anchor if entity is in export, otherwise just text
        const inExport = data.entities.some(e => e.id === linkedId);
        const anchor = this.toAnchor(linkedTitle);
        
        if (inExport) {
          return `<li>${direction} <a href="#${anchor}">${this.escapeHTML(linkedTitle)}</a>${label}</li>`;
        }
        return `<li>${direction} ${this.escapeHTML(linkedTitle)}${label}</li>`;
      })
      .join('\n');
    
    return `<div class="connections">
      <h3>Connected Notes</h3>
      <ul>${items}</ul>
    </div>`;
  }
  
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  private toAnchor(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  
  private generateFilename(data: ExportData, options: HTMLExportOptions): string {
    if (options.filename) {
      return `${options.filename}${this.fileExtension}`;
    }
    
    if (data.entities.length === 1) {
      const title = data.entities[0].title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
      return `${title}${this.fileExtension}`;
    }
    
    const date = new Date().toISOString().split('T')[0];
    return `athena-export-${date}${this.fileExtension}`;
  }
}
```

---

## Export Service (services/ExportService.ts)

```typescript
import type { 
  ExportData, 
  ExportEntity, 
  ExportConnection,
  ExportOptions,
  ExportSource,
  RenderResult 
} from '../types';
import { rendererRegistry, type IRenderer } from '../renderers/IRenderer';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';
import { JSONRenderer } from '../renderers/JSONRenderer';
import { CSVRenderer } from '../renderers/CSVRenderer';
import { HTMLRenderer } from '../renderers/HTMLRenderer';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import { extractTextFromTiptap } from '@/shared/utils/extractText';

// Register built-in renderers
rendererRegistry.register(new MarkdownRenderer());
rendererRegistry.register(new JSONRenderer());
rendererRegistry.register(new CSVRenderer());
rendererRegistry.register(new HTMLRenderer());

export interface ExportServiceDependencies {
  noteAdapter: INoteAdapter;
  connectionAdapter: IConnectionAdapter;
}

export class ExportService {
  private deps: ExportServiceDependencies;
  
  constructor(deps: ExportServiceDependencies) {
    this.deps = deps;
  }
  
  /**
   * Export entities with the given options.
   */
  async export(
    entityIds: string[],
    options: ExportOptions,
    source: ExportSource = 'selection'
  ): Promise<RenderResult> {
    // 1. Expand selection if N-hop requested
    const expandedIds = options.expandHops > 0
      ? await this.expandSelection(entityIds, options.expandHops)
      : entityIds;
    
    // 2. Load entities
    const entities = await this.loadEntities(expandedIds);
    
    // 3. Load connections (if requested)
    const connections = options.includeConnections
      ? await this.loadConnections(expandedIds)
      : [];
    
    // 4. Build export data
    const data: ExportData = {
      source,
      entities,
      connections,
      metadata: {
        exportedAt: new Date().toISOString(),
        athenaVersion: '1.0.0', // TODO: Get from config
        entityCount: entities.length,
        connectionCount: connections.length,
        expandedHops: options.expandHops > 0 ? options.expandHops : undefined,
      },
    };
    
    // 5. Get renderer and render
    const renderer = rendererRegistry.get(options.format);
    if (!renderer) {
      throw new Error(`No renderer found for format: ${options.format}`);
    }
    
    const context = { source, options };
    
    if (!renderer.canRender(data, context)) {
      throw new Error(`Renderer ${options.format} cannot render this data`);
    }
    
    return renderer.render(data, context);
  }
  
  /**
   * Export synthesis report content.
   */
  async exportSynthesis(
    content: string,
    title: string,
    options: ExportOptions
  ): Promise<RenderResult> {
    // Create a synthetic entity from the synthesis content
    const entity: ExportEntity = {
      id: 'synthesis-export',
      title,
      type: 'synthesis',
      content: null,
      contentText: content,
      metadata: { generated: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const data: ExportData = {
      source: 'synthesis',
      entities: [entity],
      connections: [],
      metadata: {
        exportedAt: new Date().toISOString(),
        athenaVersion: '1.0.0',
        entityCount: 1,
        connectionCount: 0,
      },
    };
    
    const renderer = rendererRegistry.get(options.format);
    if (!renderer) {
      throw new Error(`No renderer found for format: ${options.format}`);
    }
    
    return renderer.render(data, { source: 'synthesis', options });
  }
  
  /**
   * Expand selection by N hops using graph traversal.
   */
  private async expandSelection(
    seedIds: string[], 
    hops: number
  ): Promise<string[]> {
    const visited = new Set<string>(seedIds);
    let frontier = [...seedIds];
    
    for (let depth = 0; depth < hops; depth++) {
      const nextFrontier: string[] = [];
      
      for (const id of frontier) {
        const connections = await this.deps.connectionAdapter.getForEntity(id);
        
        for (const conn of connections) {
          const neighborId = conn.source_id === id ? conn.target_id : conn.source_id;
          
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextFrontier.push(neighborId);
          }
        }
      }
      
      frontier = nextFrontier;
      
      // Stop if no more neighbors found
      if (frontier.length === 0) break;
    }
    
    return Array.from(visited);
  }
  
  /**
   * Load entities and convert to export format.
   */
  private async loadEntities(ids: string[]): Promise<ExportEntity[]> {
    const entities: ExportEntity[] = [];
    
    for (const id of ids) {
      const note = await this.deps.noteAdapter.getById(id);
      if (!note) continue;
      
      entities.push({
        id: note.id,
        title: note.title,
        type: note.type,
        content: note.content,
        contentText: extractTextFromTiptap(note.content),
        metadata: note.metadata || {},
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
    }
    
    return entities;
  }
  
  /**
   * Load connections between the given entities.
   */
  private async loadConnections(entityIds: string[]): Promise<ExportConnection[]> {
    const idSet = new Set(entityIds);
    const connections: ExportConnection[] = [];
    const seenConnections = new Set<string>();
    
    for (const id of entityIds) {
      const conns = await this.deps.connectionAdapter.getForEntity(id);
      
      for (const conn of conns) {
        // Only include connections where BOTH ends are in the export
        if (!idSet.has(conn.source_id) || !idSet.has(conn.target_id)) continue;
        
        // Skip duplicates
        if (seenConnections.has(conn.id)) continue;
        seenConnections.add(conn.id);
        
        // Get titles for source and target
        const sourceNote = await this.deps.noteAdapter.getById(conn.source_id);
        const targetNote = await this.deps.noteAdapter.getById(conn.target_id);
        
        connections.push({
          id: conn.id,
          sourceId: conn.source_id,
          targetId: conn.target_id,
          sourceTitle: sourceNote?.title || conn.source_id,
          targetTitle: targetNote?.title || conn.target_id,
          label: conn.label || '',
          type: conn.type as ExportConnection['type'],
          metadata: conn.metadata || {},
          createdAt: conn.created_at,
        });
      }
    }
    
    return connections;
  }
  
  /**
   * Get available renderers.
   */
  getRenderers(): IRenderer[] {
    return rendererRegistry.getAll();
  }
}

// Singleton instance (initialized in App.tsx)
let exportService: ExportService | null = null;

export function initExportService(deps: ExportServiceDependencies): ExportService {
  exportService = new ExportService(deps);
  
  // Expose for debugging
  if (typeof window !== 'undefined') {
    (window as any).__ATHENA_EXPORT_SERVICE__ = () => exportService;
  }
  
  return exportService;
}

export function getExportService(): ExportService {
  if (!exportService) {
    throw new Error('ExportService not initialized. Call initExportService first.');
  }
  return exportService;
}
```

---

## Download Service (services/DownloadService.ts)

```typescript
import type { RenderResult } from '../types';

/**
 * Triggers browser download for export results.
 */
export function downloadResult(result: RenderResult): void {
  const blob = result.content instanceof Blob
    ? result.content
    : new Blob([result.content], { type: result.mimeType });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

---

## Export State (store/exportState.ts)

```typescript
import { observable } from '@legendapp/state';
import type { ExportState, ExportOptions, ExportSource } from '../types';

export const DEFAULT_EXPORT_STATE: ExportState = {
  dialogOpen: false,
  dialogSource: null,
  entityIds: [],
  resourceIds: [],
  synthesisContent: null,
  isExporting: false,
  error: null,
  lastOptions: null,
};

export const exportState$ = observable<ExportState>(DEFAULT_EXPORT_STATE);

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__ATHENA_EXPORT_STATE__ = exportState$;
}
```

---

## Export Actions (store/exportActions.ts)

```typescript
import { exportState$ } from './exportState';
import { getExportService } from '../services/ExportService';
import { downloadResult } from '../services/DownloadService';
import type { ExportOptions, ExportSource } from '../types';

export const exportActions = {
  /**
   * Open export dialog with pre-populated data.
   */
  openDialog(
    source: ExportSource,
    options: {
      entityIds?: string[];
      resourceIds?: string[];
      synthesisContent?: string;
    } = {}
  ): void {
    exportState$.dialogOpen.set(true);
    exportState$.dialogSource.set(source);
    exportState$.entityIds.set(options.entityIds || []);
    exportState$.resourceIds.set(options.resourceIds || []);
    exportState$.synthesisContent.set(options.synthesisContent || null);
    exportState$.error.set(null);
  },
  
  /**
   * Close export dialog.
   */
  closeDialog(): void {
    exportState$.dialogOpen.set(false);
    exportState$.dialogSource.set(null);
    exportState$.entityIds.set([]);
    exportState$.resourceIds.set([]);
    exportState$.synthesisContent.set(null);
  },
  
  /**
   * Execute export with given options.
   */
  async doExport(options: ExportOptions): Promise<void> {
    const state = exportState$.peek();
    
    try {
      exportState$.isExporting.set(true);
      exportState$.error.set(null);
      
      const service = getExportService();
      let result;
      
      if (state.dialogSource === 'synthesis' && state.synthesisContent) {
        result = await service.exportSynthesis(
          state.synthesisContent,
          'Synthesis Report',
          options
        );
      } else {
        result = await service.export(
          state.entityIds,
          options,
          state.dialogSource || 'selection'
        );
      }
      
      // Trigger download
      downloadResult(result);
      
      // Save last options for quick repeat
      exportState$.lastOptions.set(options);
      
      // Close dialog on success
      exportActions.closeDialog();
      
    } catch (error) {
      console.error('[Export] Error:', error);
      exportState$.error.set(
        error instanceof Error ? error.message : 'Export failed'
      );
    } finally {
      exportState$.isExporting.set(false);
    }
  },
  
  /**
   * Quick export with last used or default options.
   */
  async quickExport(
    entityIds: string[],
    format: ExportOptions['format'],
    source: ExportSource = 'selection'
  ): Promise<void> {
    const lastOptions = exportState$.lastOptions.peek();
    
    // Build options from last used or defaults
    const options = buildDefaultOptions(format, lastOptions);
    
    try {
      exportState$.isExporting.set(true);
      exportState$.error.set(null);
      
      const service = getExportService();
      const result = await service.export(entityIds, options, source);
      
      downloadResult(result);
      exportState$.lastOptions.set(options);
      
    } catch (error) {
      console.error('[Export] Quick export error:', error);
      exportState$.error.set(
        error instanceof Error ? error.message : 'Export failed'
      );
    } finally {
      exportState$.isExporting.set(false);
    }
  },
};

/**
 * Build default options for a format.
 */
function buildDefaultOptions(
  format: ExportOptions['format'],
  lastOptions?: Partial<ExportOptions> | null
): ExportOptions {
  const base = {
    includeConnections: lastOptions?.includeConnections ?? true,
    expandHops: lastOptions?.expandHops ?? 0,
  };
  
  switch (format) {
    case 'markdown':
      return {
        ...base,
        format: 'markdown',
        includeFrontmatter: true,
        includeConnectionsSection: true,
        linkFormat: 'wiki',
      };
    case 'json':
      return {
        ...base,
        format: 'json',
        shape: 'objects',
        includeContent: true,
        prettyPrint: true,
      };
    case 'csv':
      return {
        ...base,
        format: 'csv',
        includeContent: false,
        delimiter: ',',
        columns: [],
      };
    case 'html':
      return {
        ...base,
        format: 'html',
        includeStyles: true,
        theme: 'dark',
        includeTableOfContents: true,
      };
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__ATHENA_EXPORT__ = exportActions;
}
```

---

## Export Dropdown (components/ExportDropdown.tsx)

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Braces, 
  Table, 
  Globe,
  ChevronDown,
  Settings2
} from 'lucide-react';
import { exportActions } from '../store/exportActions';
import { FORMAT_INFO, type ExportFormat, type ExportSource } from '../types';

interface ExportDropdownProps {
  entityIds: string[];
  source?: ExportSource;
  disabled?: boolean;
  className?: string;
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  markdown: <FileText size={16} />,
  json: <Braces size={16} />,
  csv: <Table size={16} />,
  html: <Globe size={16} />,
};

export function ExportDropdown({ 
  entityIds, 
  source = 'selection',
  disabled = false,
  className = '' 
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleQuickExport = async (format: ExportFormat) => {
    setIsOpen(false);
    await exportActions.quickExport(entityIds, format, source);
  };
  
  const handleOpenDialog = () => {
    setIsOpen(false);
    exportActions.openDialog(source, { entityIds });
  };
  
  if (entityIds.length === 0) return null;
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-athena-surface 
                   border border-athena-border rounded-lg text-sm
                   hover:bg-athena-border/50 disabled:opacity-50 
                   disabled:cursor-not-allowed transition-colors"
        title="Export selected notes"
      >
        <Download size={16} />
        <span>Export</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-athena-surface 
                        border border-athena-border rounded-lg shadow-lg z-50 py-1">
          {/* Quick export options */}
          {(Object.keys(FORMAT_INFO) as ExportFormat[]).map(format => (
            <button
              key={format}
              onClick={() => handleQuickExport(format)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm
                         hover:bg-athena-border/50 transition-colors text-left"
            >
              {FORMAT_ICONS[format]}
              <span>{FORMAT_INFO[format].name}</span>
              <span className="ml-auto text-athena-muted text-xs">
                {FORMAT_INFO[format].fileExtension}
              </span>
            </button>
          ))}
          
          {/* Divider */}
          <div className="h-px bg-athena-border my-1" />
          
          {/* More options */}
          <button
            onClick={handleOpenDialog}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm
                       hover:bg-athena-border/50 transition-colors text-left"
          >
            <Settings2 size={16} />
            <span>More options...</span>
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Export Dialog (components/ExportDialog.tsx)

```typescript
import React, { useState } from 'react';
import { observer } from '@legendapp/state/react';
import { X, Download, FileText, Braces, Table, Globe, Loader2 } from 'lucide-react';
import { exportState$ } from '../store/exportState';
import { exportActions } from '../store/exportActions';
import { 
  FORMAT_INFO, 
  type ExportFormat, 
  type ExportOptions,
  type MarkdownExportOptions,
  type JSONExportOptions,
  type CSVExportOptions,
  type HTMLExportOptions,
  DEFAULT_CSV_COLUMNS
} from '../types';

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  markdown: <FileText size={20} />,
  json: <Braces size={20} />,
  csv: <Table size={20} />,
  html: <Globe size={20} />,
};

export const ExportDialog = observer(function ExportDialog() {
  const isOpen = exportState$.dialogOpen.get();
  const isExporting = exportState$.isExporting.get();
  const error = exportState$.error.get();
  const entityCount = exportState$.entityIds.get().length;
  const source = exportState$.dialogSource.get();
  
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeConnections, setIncludeConnections] = useState(true);
  const [expandHops, setExpandHops] = useState(0);
  
  // Format-specific options
  const [mdFrontmatter, setMdFrontmatter] = useState(true);
  const [mdConnectionsSection, setMdConnectionsSection] = useState(true);
  const [mdLinkFormat, setMdLinkFormat] = useState<'wiki' | 'markdown'>('wiki');
  
  const [jsonShape, setJsonShape] = useState<'objects' | 'graph'>('objects');
  const [jsonIncludeContent, setJsonIncludeContent] = useState(true);
  const [jsonPrettyPrint, setJsonPrettyPrint] = useState(true);
  
  const [csvIncludeContent, setCsvIncludeContent] = useState(false);
  const [csvDelimiter, setCsvDelimiter] = useState<',' | '\t'>(',');
  
  const [htmlIncludeStyles, setHtmlIncludeStyles] = useState(true);
  const [htmlTheme, setHtmlTheme] = useState<'dark' | 'light'>('dark');
  const [htmlToc, setHtmlToc] = useState(true);
  
  if (!isOpen) return null;
  
  const handleExport = () => {
    let options: ExportOptions;
    
    const base = { includeConnections, expandHops };
    
    switch (format) {
      case 'markdown':
        options = {
          ...base,
          format: 'markdown',
          includeFrontmatter: mdFrontmatter,
          includeConnectionsSection: mdConnectionsSection,
          linkFormat: mdLinkFormat,
        } as MarkdownExportOptions;
        break;
      case 'json':
        options = {
          ...base,
          format: 'json',
          shape: jsonShape,
          includeContent: jsonIncludeContent,
          prettyPrint: jsonPrettyPrint,
        } as JSONExportOptions;
        break;
      case 'csv':
        options = {
          ...base,
          format: 'csv',
          includeContent: csvIncludeContent,
          delimiter: csvDelimiter,
          columns: DEFAULT_CSV_COLUMNS,
        } as CSVExportOptions;
        break;
      case 'html':
        options = {
          ...base,
          format: 'html',
          includeStyles: htmlIncludeStyles,
          theme: htmlTheme,
          includeTableOfContents: htmlToc,
        } as HTMLExportOptions;
        break;
    }
    
    exportActions.doExport(options);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-athena-surface border border-athena-border rounded-xl 
                      shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
          <h2 className="text-lg font-medium">Export Notes</h2>
          <button
            onClick={() => exportActions.closeDialog()}
            className="p-1 hover:bg-athena-border rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary */}
          <p className="text-sm text-athena-muted">
            Exporting {entityCount} note{entityCount !== 1 ? 's' : ''}
            {source === 'synthesis' && ' (synthesis report)'}
          </p>
          
          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(FORMAT_INFO) as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border 
                              transition-colors ${
                    format === f
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-athena-border hover:border-athena-muted'
                  }`}
                >
                  {FORMAT_ICONS[f]}
                  <span className="text-xs">{FORMAT_INFO[f].name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Common options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeConnections}
                onChange={e => setIncludeConnections(e.target.checked)}
                className="rounded border-athena-border"
              />
              <span className="text-sm">Include connections between notes</span>
            </label>
            
            <div>
              <label className="block text-sm mb-1">Expand selection</label>
              <select
                value={expandHops}
                onChange={e => setExpandHops(Number(e.target.value))}
                className="w-full px-3 py-2 bg-athena-bg border border-athena-border 
                           rounded-lg text-sm"
              >
                <option value={0}>No expansion (selected only)</option>
                <option value={1}>Include 1-hop neighbors</option>
                <option value={2}>Include 2-hop neighbors</option>
                <option value={3}>Include 3-hop neighbors</option>
              </select>
            </div>
          </div>
          
          {/* Format-specific options */}
          <div className="pt-2 border-t border-athena-border">
            <h3 className="text-sm font-medium mb-3">
              {FORMAT_INFO[format].name} Options
            </h3>
            
            {format === 'markdown' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mdFrontmatter}
                    onChange={e => setMdFrontmatter(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Include YAML frontmatter</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mdConnectionsSection}
                    onChange={e => setMdConnectionsSection(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Include "Connected Notes" section</span>
                </label>
                <div>
                  <label className="block text-sm mb-1">Link format</label>
                  <select
                    value={mdLinkFormat}
                    onChange={e => setMdLinkFormat(e.target.value as 'wiki' | 'markdown')}
                    className="w-full px-3 py-2 bg-athena-bg border border-athena-border 
                               rounded-lg text-sm"
                  >
                    <option value="wiki">Wiki links [[title]]</option>
                    <option value="markdown">Markdown links [title](id)</option>
                  </select>
                </div>
              </div>
            )}
            
            {format === 'json' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm mb-1">Shape</label>
                  <select
                    value={jsonShape}
                    onChange={e => setJsonShape(e.target.value as 'objects' | 'graph')}
                    className="w-full px-3 py-2 bg-athena-bg border border-athena-border 
                               rounded-lg text-sm"
                  >
                    <option value="objects">Objects (entities + connections arrays)</option>
                    <option value="graph">Graph (nodes + edges)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jsonIncludeContent}
                    onChange={e => setJsonIncludeContent(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Include note content</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jsonPrettyPrint}
                    onChange={e => setJsonPrettyPrint(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Pretty print (indented)</span>
                </label>
              </div>
            )}
            
            {format === 'csv' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={csvIncludeContent}
                    onChange={e => setCsvIncludeContent(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Include content column</span>
                </label>
                <div>
                  <label className="block text-sm mb-1">Delimiter</label>
                  <select
                    value={csvDelimiter}
                    onChange={e => setCsvDelimiter(e.target.value as ',' | '\t')}
                    className="w-full px-3 py-2 bg-athena-bg border border-athena-border 
                               rounded-lg text-sm"
                  >
                    <option value=",">Comma (CSV)</option>
                    <option value="&#9;">Tab (TSV)</option>
                  </select>
                </div>
              </div>
            )}
            
            {format === 'html' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={htmlIncludeStyles}
                    onChange={e => setHtmlIncludeStyles(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Include CSS styles</span>
                </label>
                <div>
                  <label className="block text-sm mb-1">Theme</label>
                  <select
                    value={htmlTheme}
                    onChange={e => setHtmlTheme(e.target.value as 'dark' | 'light')}
                    className="w-full px-3 py-2 bg-athena-bg border border-athena-border 
                               rounded-lg text-sm"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light (print-friendly)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={htmlToc}
                    onChange={e => setHtmlToc(e.target.checked)}
                    className="rounded border-athena-border"
                  />
                  <span className="text-sm">Include table of contents</span>
                </label>
              </div>
            )}
          </div>
          
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-athena-border">
          <button
            onClick={() => exportActions.closeDialog()}
            className="px-4 py-2 text-sm hover:bg-athena-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white 
                       rounded-lg text-sm hover:bg-indigo-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
```

---

## Export Button (components/ExportButton.tsx)

```typescript
import React from 'react';
import { Download } from 'lucide-react';
import { exportActions } from '../store/exportActions';
import type { ExportSource } from '../types';

interface ExportButtonProps {
  entityIds: string[];
  source?: ExportSource;
  synthesisContent?: string;
  variant?: 'icon' | 'text' | 'full';
  className?: string;
}

/**
 * Simple export button that opens the dialog.
 * Use ExportDropdown for quick export + dialog option.
 */
export function ExportButton({
  entityIds,
  source = 'single',
  synthesisContent,
  variant = 'icon',
  className = '',
}: ExportButtonProps) {
  const handleClick = () => {
    exportActions.openDialog(source, { 
      entityIds,
      synthesisContent,
    });
  };
  
  if (entityIds.length === 0 && !synthesisContent) return null;
  
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-1.5 hover:bg-athena-border rounded transition-colors ${className}`}
        title="Export"
      >
        <Download size={16} />
      </button>
    );
  }
  
  if (variant === 'text') {
    return (
      <button
        onClick={handleClick}
        className={`text-sm text-athena-muted hover:text-athena-text transition-colors ${className}`}
      >
        Export
      </button>
    );
  }
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-athena-surface 
                  border border-athena-border rounded-lg text-sm
                  hover:bg-athena-border/50 transition-colors ${className}`}
    >
      <Download size={16} />
      <span>Export</span>
    </button>
  );
}
```

---

## useExport Hook (hooks/useExport.ts)

```typescript
import { useSelector } from '@legendapp/state/react';
import { exportState$ } from '../store/exportState';
import { exportActions } from '../store/exportActions';

export function useExport() {
  const isExporting = useSelector(() => exportState$.isExporting.get());
  const error = useSelector(() => exportState$.error.get());
  const dialogOpen = useSelector(() => exportState$.dialogOpen.get());
  
  return {
    isExporting,
    error,
    dialogOpen,
    ...exportActions,
  };
}
```

---

## Module Barrel (index.ts)

```typescript
// Types
export * from './types';

// Renderers
export { rendererRegistry, type IRenderer } from './renderers/IRenderer';
export { MarkdownRenderer } from './renderers/MarkdownRenderer';
export { JSONRenderer } from './renderers/JSONRenderer';
export { CSVRenderer } from './renderers/CSVRenderer';
export { HTMLRenderer } from './renderers/HTMLRenderer';

// Services
export { 
  ExportService, 
  initExportService, 
  getExportService 
} from './services/ExportService';
export { downloadResult } from './services/DownloadService';

// Store
export { exportState$ } from './store/exportState';
export { exportActions } from './store/exportActions';

// Components
export { ExportDropdown } from './components/ExportDropdown';
export { ExportDialog } from './components/ExportDialog';
export { ExportButton } from './components/ExportButton';

// Hooks
export { useExport } from './hooks/useExport';
```

---

## Integration Points

### 1. App.tsx — Initialize Service

```typescript
import { initExportService } from '@/modules/export';

// In initialization (after adapters are ready)
initExportService({
  noteAdapter,
  connectionAdapter,
});
```

### 2. AppLayout.tsx — Add Dialog

```typescript
import { ExportDialog } from '@/modules/export';

// In the layout JSX
<ExportDialog />
```

### 3. EntityDetail.tsx — Single Export Button

```typescript
import { ExportButton } from '@/modules/export';

// In the header
<ExportButton 
  entityIds={[entity.id]} 
  source="single" 
  variant="icon" 
/>
```

### 4. SophiaPage.tsx — Canvas Toolbar

```typescript
import { ExportDropdown } from '@/modules/export';

// Next to SynthesisButton
{selectedEntityIds.length > 0 && (
  <ExportDropdown 
    entityIds={selectedEntityIds} 
    source="selection" 
  />
)}
```

### 5. ViewResultsPanel.tsx — Export View Results

```typescript
import { ExportDropdown } from '@/modules/export';

// In panel header
<ExportDropdown 
  entityIds={results.map(r => r.id)} 
  source="view" 
/>
```

### 6. SynthesisPanel.tsx — Download Report (Optional Enhancement)

```typescript
import { ExportButton } from '@/modules/export';

// Add download button when report is ready
<ExportButton
  entityIds={[]}
  source="synthesis"
  synthesisContent={report.content}
  variant="text"
/>
```

---

## DevSettings Addition (config/devSettings.ts)

```typescript
export interface ExportConfig {
  enabled: boolean;
  showInDetailPanel: boolean;
  showInCanvasToolbar: boolean;
  defaultFormat: 'markdown' | 'json' | 'csv' | 'html';
  
  markdown: {
    includeFrontmatter: boolean;
    includeConnections: boolean;
    linkFormat: 'wiki' | 'markdown';
  };
  
  json: {
    includeConnections: boolean;
    shape: 'objects' | 'graph';
    prettyPrint: boolean;
  };
  
  csv: {
    includeContent: boolean;
    delimiter: ',' | '\t';
  };
  
  html: {
    includeStyles: boolean;
    theme: 'dark' | 'light';
  };
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  enabled: true,
  showInDetailPanel: true,
  showInCanvasToolbar: true,
  defaultFormat: 'markdown',
  
  markdown: {
    includeFrontmatter: true,
    includeConnections: true,
    linkFormat: 'wiki',
  },
  
  json: {
    includeConnections: true,
    shape: 'objects',
    prettyPrint: true,
  },
  
  csv: {
    includeContent: false,
    delimiter: ',',
  },
  
  html: {
    includeStyles: true,
    theme: 'dark',
  },
};

// Add to devSettings$ observable and actions
```

---

## Test Criteria

1. **Single Note Export**
   - [ ] Export single note to all 4 formats
   - [ ] Filename derived from note title
   - [ ] Markdown frontmatter includes metadata
   - [ ] JSON includes Tiptap content

2. **Multi-Selection Export**
   - [ ] Export 3+ selected notes
   - [ ] Connections between selected notes included
   - [ ] Markdown has table of contents
   - [ ] HTML has internal anchor links

3. **Smart View Export**
   - [ ] Export from ViewResultsPanel
   - [ ] All view results included
   - [ ] CSV export has correct columns

4. **N-Hop Expansion**
   - [ ] Select 1 note, expand 1 hop
   - [ ] Neighbors included in export
   - [ ] Connections between expanded set included

5. **Format Options**
   - [ ] Markdown wiki links vs standard links
   - [ ] JSON objects vs graph shape
   - [ ] CSV delimiter options
   - [ ] HTML light vs dark theme

6. **Quick Export**
   - [ ] Dropdown shows all formats
   - [ ] Click exports with defaults
   - [ ] "More options..." opens dialog

7. **Download**
   - [ ] Browser download triggers
   - [ ] Correct filename and extension
   - [ ] Correct MIME type

---

## Files Summary

**New Files (14):**
```
src/modules/export/
├── index.ts
├── types.ts
├── renderers/
│   ├── IRenderer.ts
│   ├── MarkdownRenderer.ts
│   ├── JSONRenderer.ts
│   ├── CSVRenderer.ts
│   └── HTMLRenderer.ts
├── services/
│   ├── ExportService.ts
│   └── DownloadService.ts
├── store/
│   ├── exportState.ts
│   └── exportActions.ts
├── components/
│   ├── ExportDropdown.tsx
│   ├── ExportDialog.tsx
│   └── ExportButton.tsx
└── hooks/
    └── useExport.ts
```

**Modified Files (6):**
```
src/App.tsx                           — Init ExportService
src/app/layout/AppLayout.tsx          — Add ExportDialog
src/modules/sophia/components/EntityDetail.tsx — Add ExportButton
src/app/routes/SophiaPage.tsx         — Add ExportDropdown to toolbar
src/modules/views/components/ViewResultsPanel.tsx — Add ExportDropdown
src/config/devSettings.ts             — Add ExportConfig
```

---

## Estimated Effort

- **Lines of code:** ~1,200-1,400
- **Time estimate:** 2-3 hours
- **Complexity:** Medium (follows established patterns)

---

## Post-Implementation

1. Update CODEBASE_MAP.md with export module
2. Update CHANGELOG.md with [8.10.0] entry
3. Mark Phase 8 complete in Implementation Plan
4. Create Session Summary 25

---

*This prompt completes Phase 8. After implementation, proceed to Phase 9A (CPN Engine) planning.*

import type {
  ExportFormat,
  MarkdownExportOptions,
  JSONExportOptions,
  CSVExportOptions,
  HTMLExportOptions,
} from '../types';

// ============================================================
// MARKDOWN OPTIONS
// ============================================================

interface MarkdownOptionsProps {
  includeFrontmatter: boolean;
  setIncludeFrontmatter: (v: boolean) => void;
  includeConnectionsSection: boolean;
  setIncludeConnectionsSection: (v: boolean) => void;
  linkFormat: MarkdownExportOptions['linkFormat'];
  setLinkFormat: (v: MarkdownExportOptions['linkFormat']) => void;
}

export function MarkdownOptions({
  includeFrontmatter,
  setIncludeFrontmatter,
  includeConnectionsSection,
  setIncludeConnectionsSection,
  linkFormat,
  setLinkFormat,
}: MarkdownOptionsProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeFrontmatter}
          onChange={(e) => setIncludeFrontmatter(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Include YAML frontmatter</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeConnectionsSection}
          onChange={(e) => setIncludeConnectionsSection(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Include connections section</span>
      </label>
      <div>
        <label className="block text-sm mb-1">Link format</label>
        <select
          value={linkFormat}
          onChange={(e) =>
            setLinkFormat(e.target.value as MarkdownExportOptions['linkFormat'])
          }
          className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm"
        >
          <option value="wiki">[[Wiki Links]]</option>
          <option value="markdown">[Markdown](links)</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================
// JSON OPTIONS
// ============================================================

interface JSONOptionsProps {
  shape: JSONExportOptions['shape'];
  setShape: (v: JSONExportOptions['shape']) => void;
  includeContent: boolean;
  setIncludeContent: (v: boolean) => void;
  prettyPrint: boolean;
  setPrettyPrint: (v: boolean) => void;
}

export function JSONOptions({
  shape,
  setShape,
  includeContent,
  setIncludeContent,
  prettyPrint,
  setPrettyPrint,
}: JSONOptionsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Shape</label>
        <select
          value={shape}
          onChange={(e) => setShape(e.target.value as JSONExportOptions['shape'])}
          className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm"
        >
          <option value="objects">Flat objects</option>
          <option value="graph">Graph (nodes + edges)</option>
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeContent}
          onChange={(e) => setIncludeContent(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Include note content</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={prettyPrint}
          onChange={(e) => setPrettyPrint(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Pretty print</span>
      </label>
    </div>
  );
}

// ============================================================
// CSV OPTIONS
// ============================================================

interface CSVOptionsProps {
  includeContent: boolean;
  setIncludeContent: (v: boolean) => void;
  delimiter: CSVExportOptions['delimiter'];
  setDelimiter: (v: CSVExportOptions['delimiter']) => void;
}

export function CSVOptions({
  includeContent,
  setIncludeContent,
  delimiter,
  setDelimiter,
}: CSVOptionsProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeContent}
          onChange={(e) => setIncludeContent(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Include note content</span>
      </label>
      <div>
        <label className="block text-sm mb-1">Delimiter</label>
        <select
          value={delimiter}
          onChange={(e) =>
            setDelimiter(e.target.value as CSVExportOptions['delimiter'])
          }
          className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm"
        >
          <option value=",">Comma (,)</option>
          <option value={'\t'}>Tab</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================
// HTML OPTIONS
// ============================================================

interface HTMLOptionsProps {
  includeStyles: boolean;
  setIncludeStyles: (v: boolean) => void;
  theme: HTMLExportOptions['theme'];
  setTheme: (v: HTMLExportOptions['theme']) => void;
  includeTableOfContents: boolean;
  setIncludeTableOfContents: (v: boolean) => void;
}

export function HTMLOptions({
  includeStyles,
  setIncludeStyles,
  theme,
  setTheme,
  includeTableOfContents,
  setIncludeTableOfContents,
}: HTMLOptionsProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeStyles}
          onChange={(e) => setIncludeStyles(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Include styles</span>
      </label>
      <div>
        <label className="block text-sm mb-1">Theme</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as HTMLExportOptions['theme'])}
          className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg text-sm"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeTableOfContents}
          onChange={(e) => setIncludeTableOfContents(e.target.checked)}
          className="rounded border-athena-border"
        />
        <span className="text-sm">Include table of contents</span>
      </label>
    </div>
  );
}

// ============================================================
// FORMAT-SPECIFIC OPTIONS DISPATCHER
// ============================================================

export interface FormatOptionsState {
  // Markdown
  mdFrontmatter: boolean;
  setMdFrontmatter: (v: boolean) => void;
  mdConnectionsSection: boolean;
  setMdConnectionsSection: (v: boolean) => void;
  mdLinkFormat: MarkdownExportOptions['linkFormat'];
  setMdLinkFormat: (v: MarkdownExportOptions['linkFormat']) => void;
  // JSON
  jsonShape: JSONExportOptions['shape'];
  setJsonShape: (v: JSONExportOptions['shape']) => void;
  jsonIncludeContent: boolean;
  setJsonIncludeContent: (v: boolean) => void;
  jsonPrettyPrint: boolean;
  setJsonPrettyPrint: (v: boolean) => void;
  // CSV
  csvIncludeContent: boolean;
  setCsvIncludeContent: (v: boolean) => void;
  csvDelimiter: CSVExportOptions['delimiter'];
  setCsvDelimiter: (v: CSVExportOptions['delimiter']) => void;
  // HTML
  htmlIncludeStyles: boolean;
  setHtmlIncludeStyles: (v: boolean) => void;
  htmlTheme: HTMLExportOptions['theme'];
  setHtmlTheme: (v: HTMLExportOptions['theme']) => void;
  htmlToc: boolean;
  setHtmlToc: (v: boolean) => void;
}

interface FormatOptionsPanelProps {
  format: ExportFormat;
  state: FormatOptionsState;
}

export function FormatOptionsPanel({ format, state }: FormatOptionsPanelProps) {
  switch (format) {
    case 'markdown':
      return (
        <MarkdownOptions
          includeFrontmatter={state.mdFrontmatter}
          setIncludeFrontmatter={state.setMdFrontmatter}
          includeConnectionsSection={state.mdConnectionsSection}
          setIncludeConnectionsSection={state.setMdConnectionsSection}
          linkFormat={state.mdLinkFormat}
          setLinkFormat={state.setMdLinkFormat}
        />
      );
    case 'json':
      return (
        <JSONOptions
          shape={state.jsonShape}
          setShape={state.setJsonShape}
          includeContent={state.jsonIncludeContent}
          setIncludeContent={state.setJsonIncludeContent}
          prettyPrint={state.jsonPrettyPrint}
          setPrettyPrint={state.setJsonPrettyPrint}
        />
      );
    case 'csv':
      return (
        <CSVOptions
          includeContent={state.csvIncludeContent}
          setIncludeContent={state.setCsvIncludeContent}
          delimiter={state.csvDelimiter}
          setDelimiter={state.setCsvDelimiter}
        />
      );
    case 'html':
      return (
        <HTMLOptions
          includeStyles={state.htmlIncludeStyles}
          setIncludeStyles={state.setHtmlIncludeStyles}
          theme={state.htmlTheme}
          setTheme={state.setHtmlTheme}
          includeTableOfContents={state.htmlToc}
          setIncludeTableOfContents={state.setHtmlToc}
        />
      );
  }
}

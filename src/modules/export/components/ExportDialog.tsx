import { useState } from 'react';
import { observer } from '@legendapp/state/react';
import { X, Download, FileText, Braces, Table, Globe, Loader2 } from 'lucide-react';
import { exportState$ } from '../store/exportState';
import { exportActions } from '../store/exportActions';
import {
  FORMAT_INFO,
  DEFAULT_CSV_COLUMNS,
  type ExportFormat,
  type ExportOptions,
  type MarkdownExportOptions,
  type JSONExportOptions,
  type CSVExportOptions,
  type HTMLExportOptions,
} from '../types';
import { FormatOptionsPanel, type FormatOptionsState } from './FormatOptions';

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

  // Markdown options
  const [mdFrontmatter, setMdFrontmatter] = useState(true);
  const [mdConnectionsSection, setMdConnectionsSection] = useState(true);
  const [mdLinkFormat, setMdLinkFormat] =
    useState<MarkdownExportOptions['linkFormat']>('wiki');

  // JSON options
  const [jsonShape, setJsonShape] = useState<JSONExportOptions['shape']>('objects');
  const [jsonIncludeContent, setJsonIncludeContent] = useState(true);
  const [jsonPrettyPrint, setJsonPrettyPrint] = useState(true);

  // CSV options
  const [csvIncludeContent, setCsvIncludeContent] = useState(false);
  const [csvDelimiter, setCsvDelimiter] =
    useState<CSVExportOptions['delimiter']>(',');

  // HTML options
  const [htmlIncludeStyles, setHtmlIncludeStyles] = useState(true);
  const [htmlTheme, setHtmlTheme] = useState<HTMLExportOptions['theme']>('dark');
  const [htmlToc, setHtmlToc] = useState(true);

  if (!isOpen) return null;

  const formatOptionsState: FormatOptionsState = {
    mdFrontmatter,
    setMdFrontmatter,
    mdConnectionsSection,
    setMdConnectionsSection,
    mdLinkFormat,
    setMdLinkFormat,
    jsonShape,
    setJsonShape,
    jsonIncludeContent,
    setJsonIncludeContent,
    jsonPrettyPrint,
    setJsonPrettyPrint,
    csvIncludeContent,
    setCsvIncludeContent,
    csvDelimiter,
    setCsvDelimiter,
    htmlIncludeStyles,
    setHtmlIncludeStyles,
    htmlTheme,
    setHtmlTheme,
    htmlToc,
    setHtmlToc,
  };

  const handleExport = () => {
    const base = { includeConnections, expandHops };
    let options: ExportOptions;

    switch (format) {
      case 'markdown':
        options = {
          ...base,
          format: 'markdown',
          includeFrontmatter: mdFrontmatter,
          includeConnectionsSection: mdConnectionsSection,
          linkFormat: mdLinkFormat,
        };
        break;
      case 'json':
        options = {
          ...base,
          format: 'json',
          shape: jsonShape,
          includeContent: jsonIncludeContent,
          prettyPrint: jsonPrettyPrint,
        };
        break;
      case 'csv':
        options = {
          ...base,
          format: 'csv',
          includeContent: csvIncludeContent,
          delimiter: csvDelimiter,
          columns: DEFAULT_CSV_COLUMNS,
        };
        break;
      case 'html':
        options = {
          ...base,
          format: 'html',
          includeStyles: htmlIncludeStyles,
          theme: htmlTheme,
          includeTableOfContents: htmlToc,
        };
        break;
    }

    exportActions.doExport(options);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-athena-surface border border-athena-border rounded-xl
                      shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
      >
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
              {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((f) => (
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
                onChange={(e) => setIncludeConnections(e.target.checked)}
                className="rounded border-athena-border"
              />
              <span className="text-sm">Include connections between notes</span>
            </label>

            <div>
              <label className="block text-sm mb-1">Expand selection</label>
              <select
                value={expandHops}
                onChange={(e) => setExpandHops(Number(e.target.value))}
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
            <FormatOptionsPanel format={format} state={formatOptionsState} />
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                       text-white text-sm rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
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

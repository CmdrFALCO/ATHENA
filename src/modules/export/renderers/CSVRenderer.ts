import type { IRenderer } from './IRenderer';
import type {
  ExportData,
  ExportEntity,
  RenderContext,
  RenderResult,
  CSVExportOptions,
} from '../types';
import { DEFAULT_CSV_COLUMNS } from '../types';

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
      const row = columns.map((col) => this.getColumnValue(entity, col, data, options));
      rows.push(row.map((v) => this.escapeCSV(v, delimiter)).join(delimiter));
    }

    const content = rows.join('\n');
    const filename = this.generateFilename(data, options);
    return { content, filename, mimeType: this.mimeType };
  }

  private getColumnValue(
    entity: ExportEntity,
    column: string,
    data: ExportData,
    options: CSVExportOptions,
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
            (c) => c.sourceId === entity.id || c.targetId === entity.id,
          ).length,
        );
      default:
        return String(entity.metadata[column] ?? '');
    }
  }

  private escapeCSV(value: string, delimiter: string): string {
    if (!value) return '';

    const needsQuotes =
      value.includes(delimiter) || value.includes('\n') || value.includes('"');

    if (needsQuotes) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private generateFilename(_data: ExportData, options: CSVExportOptions): string {
    if (options.filename) {
      return `${options.filename}${this.fileExtension}`;
    }

    const date = new Date().toISOString().split('T')[0];
    return `athena-export-${date}${this.fileExtension}`;
  }
}

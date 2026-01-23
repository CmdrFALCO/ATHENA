import * as XLSX from 'xlsx';
import type { IExtractor, ExtractionResult } from '../types';

interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export class XlsxExtractor implements IExtractor {
  canExtract(mimeType: string): boolean {
    return (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    );
  }

  async extract(blob: Blob, _fileName: string): Promise<ExtractionResult> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheets: SheetData[] = [];
      const textParts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1, // Use first row as headers
          defval: '', // Default empty cells to empty string
        });

        if (jsonData.length === 0) continue;

        // First row is headers
        const firstRow = jsonData[0];
        if (!Array.isArray(firstRow)) continue;

        const headers = firstRow.map((h) => String(h || ''));
        const rows = jsonData.slice(1).map((row) => {
          const obj: Record<string, unknown> = {};
          if (Array.isArray(row)) {
            row.forEach((cell, i) => {
              if (headers[i]) obj[headers[i]] = cell;
            });
          }
          return obj;
        });

        sheets.push({ name: sheetName, headers, rows });

        // Build text representation for FTS
        textParts.push(`Sheet: ${sheetName}`);
        textParts.push(headers.join(' | '));
        rows.forEach((row) => {
          textParts.push(
            Object.values(row)
              .map((v) => String(v || ''))
              .join(' ')
          );
        });
        textParts.push(''); // Blank line between sheets
      }

      return {
        text: textParts.join('\n').trim(),
        structured: { sheets },
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'XLSX extraction failed',
      };
    }
  }
}

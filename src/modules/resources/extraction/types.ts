export interface ExtractionResult {
  text: string; // Plain text for FTS
  structured?: Record<string, unknown>; // Optional structured data (e.g., spreadsheet cells)
  error?: string; // Error message if failed
}

export interface IExtractor {
  /**
   * Check if this extractor can handle the given MIME type
   */
  canExtract(mimeType: string): boolean;

  /**
   * Extract text content from a blob
   */
  extract(blob: Blob, fileName: string): Promise<ExtractionResult>;
}

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

/**
 * Hierarchical document structure for reasoning-based retrieval (WP 8.2)
 */
export interface DocumentTree {
  /** Section title */
  title: string;
  /** Unique identifier within document (e.g., "root", "1", "1.1") */
  node_id: string;
  /** Starting page number (1-indexed) */
  start_page: number;
  /** Ending page number (inclusive) */
  end_page: number;
  /** AI-generated section summary (1-2 sentences) */
  summary: string;
  /** Child sections */
  children: DocumentTree[];
}

/**
 * Result of document tree extraction
 */
export interface TreeExtractionResult {
  success: boolean;
  tree: DocumentTree | null;
  error?: string;
  /** Total sections in tree */
  sectionCount: number;
  /** Maximum depth reached */
  maxDepth: number;
  /** Model used for extraction */
  model: string;
}

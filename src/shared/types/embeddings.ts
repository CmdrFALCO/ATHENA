/**
 * Embedding record stored in the database
 */
export interface EmbeddingRecord {
  id: string;
  entity_id: string;
  vector: number[];
  model: string;
  created_at: string;
}

/**
 * Legacy Embedding type (includes chunk_index for chunked content)
 * @deprecated Use EmbeddingRecord for new code
 */
export interface Embedding {
  id: string;
  entity_id: string; // FK to Entity
  chunk_index: number; // For long content split into chunks
  vector: number[]; // Float array
  model: string; // Which model generated this
  created_at: string;
}

/**
 * Result from similarity search including the full embedding
 */
export interface SimilarityResult {
  entity_id: string;
  similarity: number; // 0-1, higher is more similar
  embedding: EmbeddingRecord;
}

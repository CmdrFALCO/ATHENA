export interface Embedding {
  id: string;
  entity_id: string; // FK to Entity
  chunk_index: number; // For long content split into chunks
  vector: number[]; // Float array
  model: string; // Which model generated this
  created_at: string;
}

export interface SimilarityResult {
  entity_id: string;
  similarity: number; // 0-1
}

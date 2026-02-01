export interface SimilarityWeights {
  title: number; // Weight for title similarity (default: 0.3)
  content: number; // Weight for content similarity (default: 0.2)
  embedding: number; // Weight for embedding similarity (default: 0.5)
}

export interface SimilarityScores {
  title: number; // Jaro-Winkler score (0-1)
  content: number; // Levenshtein similarity (0-1)
  embedding: number; // Cosine similarity (0-1)
  combined: number; // Weighted combination (0-1)
}

export interface NoteReference {
  id: string;
  title: string;
  contentPreview: string; // First 200 chars of plain text
  createdAt: string;
  updatedAt: string;
  connectionCount: number;
  clusterCount: number;
}

export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'merged';

export interface MergeCandidate {
  id: string;
  noteA: NoteReference;
  noteB: NoteReference;
  scores: SimilarityScores;
  status: CandidateStatus;
  detectedAt: string;
  reviewedAt?: string;
}

export type MergeContentStrategy =
  | 'keep_primary' // Keep primary note's content
  | 'keep_secondary' // Keep secondary note's content
  | 'concatenate' // Append secondary to primary
  | 'manual'; // User will edit manually

export interface MergeOptions {
  primaryNoteId: string; // The note that survives
  secondaryNoteId: string; // The note that gets absorbed
  contentStrategy: MergeContentStrategy;
  transferConnections: boolean; // Move connections from secondary
  transferClusters: boolean; // Update cluster memberships
}

export interface MergeResult {
  success: boolean;
  survivorId: string;
  mergedId: string;
  connectionsTransferred: number;
  clustersUpdated: number;
  error?: string;
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'complete' | 'error';
  notesScanned: number;
  totalNotes: number;
  candidatesFound: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

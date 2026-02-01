// src/modules/views/types.ts — WP 8.9: Smart Views (Canned Queries)

export interface ViewParameter {
  name: string;                          // Parameter name (used in SQL as :name)
  label: string;                         // Display label
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  defaultValue?: string | number;
  options?: { value: string; label: string }[];  // For 'select' type
}

export interface SmartView {
  id: string;
  name: string;
  description: string;
  sql: string;                           // SQL with :param placeholders
  parameters: ViewParameter[];
  category: 'system' | 'sophia' | 'pronoia' | 'ergane' | 'user';
  icon?: string;                         // Lucide icon name
  createdBy: 'system' | 'user';
  createdAt?: string;
  updatedAt?: string;
}

export interface ViewResult {
  id: string;
  title: string;
  type: string;                          // 'note', 'resource', etc.
  preview: string;                       // First ~100 chars
  createdAt: string;
  updatedAt: string;
  connectionCount?: number;              // Optional enrichment
}

export interface ViewExecutionResult {
  view: SmartView;
  results: ViewResult[];
  executedAt: string;
  executionTimeMs: number;
  parameterValues: Record<string, string | number>;
}

export interface ViewsConfig {
  enabled: boolean;
  showInSidebar: boolean;
  recentViewIds: string[];               // Last 3 used views for quick access
  maxResults: number;                    // Default: 50
}

export interface CreateViewInput {
  name: string;
  description: string;
  sql: string;
  parameters?: ViewParameter[];
  category?: SmartView['category'];
  icon?: string;
}

export interface UpdateViewInput {
  name?: string;
  description?: string;
  sql?: string;
  parameters?: ViewParameter[];
  icon?: string;
}

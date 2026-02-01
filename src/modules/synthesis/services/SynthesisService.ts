// src/modules/synthesis/services/SynthesisService.ts — WP 8.7 (WP 8.7.1: Resource Support)

import type { SynthesisRequest, SynthesisReport, SynthesisProgress } from '../types';
import type { Entity } from '@/shared/types/entities';
import type { Resource } from '@/shared/types/resources';
import type { Connection } from '@/shared/types/connections';
import { buildSynthesisPrompt, generateReportTitle } from '../prompts/synthesisPrompts';
import { getAIService } from '@/modules/ai';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';

export type ProgressCallback = (progress: SynthesisProgress) => void;

export class SynthesisService {
  private noteAdapter: INoteAdapter | null = null;
  private connectionAdapter: IConnectionAdapter | null = null;
  private resourceAdapter: IResourceAdapter | null = null;

  /**
   * Inject adapters for data access. Called once during initialization.
   */
  setAdapters(
    noteAdapter: INoteAdapter,
    connectionAdapter: IConnectionAdapter,
    resourceAdapter: IResourceAdapter,
  ): void {
    this.noteAdapter = noteAdapter;
    this.connectionAdapter = connectionAdapter;
    this.resourceAdapter = resourceAdapter;
  }

  /**
   * Generate a synthesis report from selected entities and resources.
   */
  async synthesize(
    request: SynthesisRequest,
    onProgress?: ProgressCallback,
  ): Promise<SynthesisReport> {
    const startTime = Date.now();

    if (!this.noteAdapter || !this.connectionAdapter) {
      throw new Error('SynthesisService adapters not initialized');
    }

    // Phase 1: Gather data
    onProgress?.({
      status: 'gathering',
      progress: 10,
      partialContent: '',
    });

    const entities = await this.loadEntities(request.entityIds);

    // WP 8.7.1: Load resources
    let resources: Resource[] = [];
    if (request.includeResources && request.resourceIds.length > 0) {
      resources = await this.loadResources(request.resourceIds);
    }

    if (entities.length === 0 && resources.length === 0) {
      throw new Error('No valid content found for synthesis');
    }

    // Load connections (updated to include resource connections)
    let connections: Connection[] = [];
    if (request.includeConnections) {
      connections = await this.loadConnectionsBetween(request.entityIds, request.resourceIds);
    }

    onProgress?.({
      status: 'gathering',
      progress: 30,
      partialContent: '',
    });

    // Phase 2: Build prompt
    const prompt = buildSynthesisPrompt({
      entities,
      resources,
      connections,
      format: request.format,
      maxLength: request.maxLength,
      customPrompt: request.customPrompt,
      resourceMaxChars: request.resourceMaxChars,
    });

    // Phase 3: Generate with streaming
    onProgress?.({
      status: 'generating',
      progress: 40,
      partialContent: '',
    });

    const aiService = getAIService();
    let fullContent = '';

    try {
      const result = await aiService.generateStream({
        messages: [{ role: 'user', content: prompt }],
        onChunk: (chunk) => {
          fullContent += chunk;
          onProgress?.({
            status: 'generating',
            progress: Math.min(40 + (fullContent.length / 100), 95),
            partialContent: fullContent,
          });
        },
      });

      fullContent = result.fullResponse;
    } catch (error) {
      onProgress?.({
        status: 'error',
        progress: 0,
        partialContent: fullContent,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
      throw error;
    }

    // Phase 4: Create report
    const report: SynthesisReport = {
      id: crypto.randomUUID(),
      title: generateReportTitle(entities, resources, request.format),
      content: fullContent,
      format: request.format,
      sourceEntityIds: request.entityIds,
      sourceResourceIds: request.resourceIds,
      sourceConnectionIds: connections.map((c) => c.id),
      generatedAt: new Date().toISOString(),
      model: aiService.getCurrentProvider() || 'unknown',
    };

    onProgress?.({
      status: 'complete',
      progress: 100,
      partialContent: fullContent,
    });

    console.log(`[SynthesisService] Generated ${request.format} in ${Date.now() - startTime}ms`);

    return report;
  }

  /**
   * Load entities by IDs via adapter.
   */
  private async loadEntities(entityIds: string[]): Promise<Entity[]> {
    if (!this.noteAdapter) return [];

    const results: Entity[] = [];
    for (const id of entityIds) {
      const note = await this.noteAdapter.getById(id);
      if (note) results.push(note);
    }
    return results;
  }

  /**
   * Load resources by IDs via adapter (WP 8.7.1).
   */
  private async loadResources(resourceIds: string[]): Promise<Resource[]> {
    if (!this.resourceAdapter || resourceIds.length === 0) return [];

    const results: Resource[] = [];
    for (const id of resourceIds) {
      const resource = await this.resourceAdapter.getById(id);
      if (resource && !resource.invalidAt) {
        results.push(resource);
      }
    }
    return results;
  }

  /**
   * Load connections between a set of entity AND resource IDs via adapter.
   */
  private async loadConnectionsBetween(
    entityIds: string[],
    resourceIds: string[] = [],
  ): Promise<Connection[]> {
    if (!this.connectionAdapter) return [];

    const allIds = [...entityIds, ...resourceIds];
    if (allIds.length < 2) return [];

    const idSet = new Set(allIds);
    const allConnections: Connection[] = [];
    const seen = new Set<string>();

    // Query connections for entities
    for (const id of entityIds) {
      const connections = await this.connectionAdapter.getForNode('entity', id);
      for (const conn of connections) {
        if (
          !seen.has(conn.id) &&
          idSet.has(conn.source_id) &&
          idSet.has(conn.target_id)
        ) {
          seen.add(conn.id);
          allConnections.push(conn);
        }
      }
    }

    // Query connections for resources
    for (const id of resourceIds) {
      const connections = await this.connectionAdapter.getForNode('resource', id);
      for (const conn of connections) {
        if (
          !seen.has(conn.id) &&
          idSet.has(conn.source_id) &&
          idSet.has(conn.target_id)
        ) {
          seen.add(conn.id);
          allConnections.push(conn);
        }
      }
    }

    return allConnections;
  }
}

// Singleton instance
let serviceInstance: SynthesisService | null = null;

export function getSynthesisService(): SynthesisService {
  if (!serviceInstance) {
    serviceInstance = new SynthesisService();
  }
  return serviceInstance;
}

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_SYNTHESIS_SERVICE__: () => SynthesisService }).__ATHENA_SYNTHESIS_SERVICE__ =
    () => getSynthesisService();
}

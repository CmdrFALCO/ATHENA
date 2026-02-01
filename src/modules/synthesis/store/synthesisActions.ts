// src/modules/synthesis/store/synthesisActions.ts — WP 8.7 (WP 8.7.1: Resource Support)

import { synthesisState$ } from './synthesisState';
import { getSynthesisService } from '../services/SynthesisService';
import type { SynthesisFormat, SynthesisRequest } from '../types';
import type { Block } from '@/shared/types/entities';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import { entityActions } from '@/store';

// ============================================
// Adapter Initialization
// ============================================

/**
 * Initialize the SynthesisService with adapters.
 * Called from a React component inside AdapterProvider.
 */
export function initSynthesisAdapters(
  noteAdapter: INoteAdapter,
  connectionAdapter: IConnectionAdapter,
  resourceAdapter: IResourceAdapter,
): void {
  getSynthesisService().setAdapters(noteAdapter, connectionAdapter, resourceAdapter);
}

// ============================================
// Panel Actions
// ============================================

export function openSynthesisPanel(): void {
  synthesisState$.isPanelOpen.set(true);
}

export function closeSynthesisPanel(): void {
  synthesisState$.isPanelOpen.set(false);
}

export function toggleSynthesisPanel(): void {
  synthesisState$.isPanelOpen.set((v) => !v);
}

// ============================================
// Option Actions
// ============================================

export function setFormat(format: SynthesisFormat): void {
  synthesisState$.selectedFormat.set(format);
}

export function setCustomPrompt(prompt: string): void {
  synthesisState$.customPrompt.set(prompt);
}

export function setMaxLength(length: number): void {
  synthesisState$.maxLength.set(length);
}

export function setIncludeConnections(include: boolean): void {
  synthesisState$.includeConnections.set(include);
}

export function setIncludeResources(include: boolean): void {
  synthesisState$.includeResources.set(include);
}

export function setResourceMaxChars(maxChars: number): void {
  synthesisState$.resourceMaxChars.set(maxChars);
}

// ============================================
// Generation Actions
// ============================================

export async function generateSynthesis(
  entityIds: string[],
  resourceIds: string[] = [],
): Promise<void> {
  if (entityIds.length === 0 && resourceIds.length === 0) {
    console.warn('[synthesisActions] No content selected');
    return;
  }

  const service = getSynthesisService();
  const state = synthesisState$.get();

  const request: SynthesisRequest = {
    entityIds,
    resourceIds,
    format: state.selectedFormat,
    maxLength: state.maxLength,
    customPrompt: state.customPrompt || undefined,
    includeConnections: state.includeConnections,
    includeResources: state.includeResources,
    resourceMaxChars: state.resourceMaxChars,
  };

  // Reset state
  synthesisState$.currentReport.set(null);
  synthesisState$.currentProgress.set({
    status: 'gathering',
    progress: 0,
    partialContent: '',
  });

  try {
    const report = await service.synthesize(request, (progress) => {
      synthesisState$.currentProgress.set(progress);
    });

    synthesisState$.currentReport.set(report);

    // Add to recent reports (keep last 5)
    const recent = synthesisState$.recentReports.get();
    synthesisState$.recentReports.set([report, ...recent.slice(0, 4)]);
  } catch (error) {
    console.error('[synthesisActions] Generation failed:', error);
    synthesisState$.currentProgress.set({
      status: 'error',
      progress: 0,
      partialContent: synthesisState$.currentProgress.partialContent.get(),
      error: error instanceof Error ? error.message : 'Generation failed',
    });
  }
}

/**
 * Save current report as a new note via adapter.
 */
export async function saveReportAsNote(
  noteAdapter: INoteAdapter,
): Promise<string | null> {
  const report = synthesisState$.currentReport.get();
  if (!report) {
    console.warn('[synthesisActions] No report to save');
    return null;
  }

  try {
    const content = formatContentForNote(report.content);
    const note = await noteAdapter.create({
      type: 'note',
      subtype: 'synthesis',
      title: report.title,
      content,
      metadata: {
        synthesisSource: {
          entityIds: report.sourceEntityIds,
          resourceIds: report.sourceResourceIds,
          connectionIds: report.sourceConnectionIds,
          format: report.format,
          generatedAt: report.generatedAt,
        },
      },
      position_x: 0,
      position_y: 0,
    });

    // Add to global store
    entityActions.addNote(note);

    console.log(`[synthesisActions] Saved synthesis as note: ${note.id}`);
    return note.id;
  } catch (error) {
    console.error('[synthesisActions] Failed to save note:', error);
    return null;
  }
}

/**
 * Clear current synthesis state.
 */
export function clearSynthesis(): void {
  synthesisState$.currentReport.set(null);
  synthesisState$.currentProgress.set({
    status: 'idle',
    progress: 0,
    partialContent: '',
  });
  synthesisState$.customPrompt.set('');
}

// ============================================
// Helpers
// ============================================

/**
 * Convert markdown-ish content to Tiptap Block[] format.
 */
function formatContentForNote(content: string): Block[] {
  const paragraphs = content.split(/\n\n+/);

  return paragraphs.map((p) => {
    // Headers
    const headerMatch = p.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      return {
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: headerMatch[2] }],
      };
    }

    // Bullet list
    if (p.startsWith('- ') || p.startsWith('* ')) {
      const items = p.split(/\n[-*]\s+/);
      return {
        type: 'bulletList',
        content: items.filter(Boolean).map((item) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: item.replace(/^[-*]\s+/, '') }],
            },
          ],
        })),
      };
    }

    // Regular paragraph
    return {
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    };
  });
}

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_SYNTHESIS__: Record<string, unknown> }).__ATHENA_SYNTHESIS__ = {
    openPanel: openSynthesisPanel,
    closePanel: closeSynthesisPanel,
    generate: generateSynthesis,
    clear: clearSynthesis,
    setFormat,
    setIncludeResources,
    setResourceMaxChars,
  };
}

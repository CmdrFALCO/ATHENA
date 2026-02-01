import { resourceState$ } from '@/store/resourceState';
import { getAIService } from '@/modules/ai/AIService';
import { getDatabase } from '@/database';
import { SQLiteEmbeddingAdapter } from '@/adapters/sqlite/SQLiteEmbeddingAdapter';
import { SQLiteResourceAdapter } from '@/adapters/sqlite/SQLiteResourceAdapter';
import { DocumentTreeExtractor } from './documentTree';
import { devSettings$ } from '@/config/devSettings';

/**
 * Post-extraction processing for resources:
 * 1. FTS is automatically updated via triggers when extractedText is saved
 * 2. Generate embedding for semantic search
 * 3. Extract document tree structure for PDFs (WP 8.2)
 *
 * Called after BrowserExtractionService.extract() completes successfully.
 */
export async function postExtraction(resourceId: string): Promise<void> {
  // Get resource from state
  const resourceObservable = resourceState$.resources[resourceId];
  const resource = resourceObservable?.peek();

  if (!resource?.extractedText) {
    console.log(`[PostExtraction] No text for resource ${resourceId}, skipping embedding`);
    return;
  }

  const aiService = getAIService();

  // Check if AI is configured
  if (!aiService.isConfigured()) {
    console.log(`[PostExtraction] AI not configured, skipping embedding for resource ${resourceId}`);
    return;
  }

  const model = aiService.getActiveEmbeddingModel();
  if (!model) {
    console.log(`[PostExtraction] No active embedding model, skipping resource ${resourceId}`);
    return;
  }

  // Get database and create embedding adapter
  const db = getDatabase();
  if (!db) {
    console.error(`[PostExtraction] Database not initialized`);
    return;
  }

  const embeddingAdapter = new SQLiteEmbeddingAdapter(db);

  try {
    // Generate embedding
    const result = await aiService.embed(resource.extractedText);
    if (!result.vector || result.vector.length === 0) {
      console.warn(`[PostExtraction] Empty embedding for resource ${resourceId}`);
      return;
    }

    // Store resource embedding
    await embeddingAdapter.storeForResource(resourceId, result.vector, model);
    console.log(`[PostExtraction] Indexed resource ${resourceId} with ${result.vector.length}-dim embedding`);
  } catch (error) {
    console.error(`[PostExtraction] Failed to index resource ${resourceId}:`, error);
  }

  // WP 8.2: Extract document tree structure for PDFs
  const pdfSettings = devSettings$.resources.pdf?.peek();
  if (
    resource.mimeType === 'application/pdf' &&
    pdfSettings?.extractStructure &&
    resource.extractedText
  ) {
    try {
      const treeExtractor = new DocumentTreeExtractor(aiService);

      // Expose for debugging
      if (typeof window !== 'undefined') {
        (window as unknown as { __ATHENA_TREE_EXTRACTOR__: DocumentTreeExtractor }).__ATHENA_TREE_EXTRACTOR__ = treeExtractor;
      }

      const treeResult = await treeExtractor.extract(
        resource.extractedText,
        null,
        resource.name
      );

      if (treeResult.success && treeResult.tree) {
        const resourceAdapter = new SQLiteResourceAdapter(db);
        await resourceAdapter.updateStructure(resourceId, JSON.stringify(treeResult.tree));

        // Update in-memory state
        resourceObservable.structure.set(JSON.stringify(treeResult.tree));

        console.log(
          `[PostExtraction] Extracted document tree for ${resource.name}: ${treeResult.sectionCount} sections, depth ${treeResult.maxDepth}`
        );
      } else if (treeResult.error) {
        console.warn(`[PostExtraction] Document tree extraction failed for ${resource.name}: ${treeResult.error}`);
      }
    } catch (error) {
      console.warn('[PostExtraction] Document tree extraction error:', error);
      // Non-fatal - resource is still usable without structure
    }
  }
}

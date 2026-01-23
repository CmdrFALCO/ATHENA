import type { Resource, ResourceType } from '@/shared/types/resources';
import type { ExtractionResult } from './types';
import { getAIService } from '@/modules/ai/AIService';
import { blobStorage } from '@/services/blobStorage';
import { devSettings$ } from '@/config/devSettings';
import { updateResource } from '@/store/resourceActions';

/**
 * AI-powered content extraction for PDFs and images.
 * Uses Gemini's multimodal capabilities for OCR and document understanding.
 */
export class AIExtractionService {
  private static readonly SUPPORTED_TYPES: ResourceType[] = ['pdf', 'image'];

  /**
   * Check if AI extraction can handle this resource
   */
  canExtract(resource: Resource): boolean {
    // Check if AI extraction is enabled in settings
    const config = devSettings$.resources.extraction.get();
    if (!config.aiEnabled) {
      return false;
    }

    // Check if resource type is supported
    if (!AIExtractionService.SUPPORTED_TYPES.includes(resource.type)) {
      return false;
    }

    // Check file size limit
    if (resource.fileSize) {
      const maxBytes = config.maxFileSizeMB * 1024 * 1024;
      if (resource.fileSize > maxBytes) {
        return false;
      }
    }

    // Check if AI service is configured
    const aiService = getAIService();
    return aiService.isConfigured() && aiService.supportsMultimodal();
  }

  /**
   * Extract content from a PDF or image using AI
   */
  async extract(resource: Resource): Promise<ExtractionResult> {
    const aiService = getAIService();

    // Validate AI is available
    if (!aiService.isConfigured()) {
      return {
        text: '',
        error: 'AI service not configured',
      };
    }

    if (!aiService.supportsMultimodal()) {
      return {
        text: '',
        error: 'Current AI provider does not support multimodal extraction',
      };
    }

    // Get blob from storage
    if (!resource.storageKey) {
      return {
        text: '',
        error: 'No storage key for resource',
      };
    }

    const blob = await blobStorage.retrieve(resource.storageKey);
    if (!blob) {
      return {
        text: '',
        error: 'Blob not found in storage',
      };
    }

    // Check file size
    const config = devSettings$.resources.extraction.get();
    const maxBytes = config.maxFileSizeMB * 1024 * 1024;
    if (blob.size > maxBytes) {
      return {
        text: '',
        error: `File too large for AI extraction (${(blob.size / 1024 / 1024).toFixed(1)}MB > ${config.maxFileSizeMB}MB limit)`,
      };
    }

    try {
      // Convert blob to base64
      const base64 = await this.blobToBase64(blob);

      // Build extraction prompt based on resource type
      const prompt = this.buildPrompt(resource.type);

      // Call AI with multimodal input
      const result = await aiService.generateWithAttachment({
        prompt,
        attachment: {
          mimeType: resource.mimeType || this.getDefaultMimeType(resource.type),
          data: base64,
        },
        maxTokens: 8192, // Allow long responses for document extraction
        temperature: 0, // Deterministic for OCR
      });

      if (result.finishReason === 'error') {
        return {
          text: '',
          error: 'AI extraction failed - content may be blocked or unprocessable',
        };
      }

      return {
        text: result.text.trim(),
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'AI extraction failed',
      };
    }
  }

  /**
   * Extract content and update resource status
   * This is the main entry point called by BrowserExtractionService
   */
  async extractAndUpdate(resource: Resource): Promise<ExtractionResult> {
    const result = await this.extract(resource);

    // Update resource with results
    const status = result.error && !result.text ? 'failed' : 'complete';
    await updateResource(resource.id, {
      extractedText: result.text || undefined,
      extractionStatus: status,
      extractionMethod: 'ai',
    });

    return result;
  }

  /**
   * Build extraction prompt based on resource type
   */
  private buildPrompt(type: ResourceType): string {
    if (type === 'pdf') {
      return `Extract all text content from this PDF document.

Instructions:
- Extract the complete text, preserving structure where possible
- Include headings, paragraphs, and list items
- For tables, represent data in a readable format
- Do not summarize - extract the full text
- If text is unclear or partially visible, include what you can read with [unclear] markers
- Output only the extracted text, no commentary`;
    }

    if (type === 'image') {
      return `Analyze this image and extract all information.

Instructions:
1. First, perform OCR on any visible text (signs, labels, documents, etc.)
2. Then, briefly describe the visual content
3. If it's a diagram, chart, or infographic, describe its structure and any data

Format your response as:
[OCR TEXT]
(extracted text here, or "No text detected" if none)

---

[VISUAL DESCRIPTION]
(brief description of image content)`;
    }

    return 'Extract and describe the content of this file. Include any text visible in the content.';
  }

  /**
   * Convert blob to base64 string (without data URL prefix)
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = dataUrl.split(',')[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error('Failed to extract base64 from data URL'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get default MIME type for resource type
   */
  private getDefaultMimeType(type: ResourceType): string {
    switch (type) {
      case 'pdf':
        return 'application/pdf';
      case 'image':
        return 'image/png'; // Generic fallback
      default:
        return 'application/octet-stream';
    }
  }
}

// Singleton instance
export const aiExtractionService = new AIExtractionService();

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_AI_EXTRACTION__: typeof aiExtractionService }).__ATHENA_AI_EXTRACTION__ =
    aiExtractionService;
}

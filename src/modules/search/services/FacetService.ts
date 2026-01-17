/**
 * FacetService - Extract and apply facets for search results
 * WP 4.6: Faceted Search Panel
 */

import type { SearchResult } from '@/adapters/ISearchAdapter';
import type { Facet, FacetSelection, DateRangeBucket } from '../types/facets';
import { DATE_BUCKET_LABELS } from '../types/facets';

export class FacetService {
  /**
   * Extract facets from search results.
   * Counts occurrences of each facet value.
   */
  extractFacets(results: SearchResult[], selection: FacetSelection = {}): Facet[] {
    const facets: Facet[] = [];

    // Type facet
    const typeFacet = this.buildTypeFacet(results, selection.type || []);
    if (typeFacet.values.length > 0) {
      facets.push(typeFacet);
    }

    // Date facet (only if results have createdAt)
    const dateFacet = this.buildDateFacet(results, selection.created || []);
    if (dateFacet.values.length > 0) {
      facets.push(dateFacet);
    }

    return facets;
  }

  /**
   * Apply selected facets to filter results.
   * Multiple selections within a facet = OR
   * Selections across facets = AND
   */
  applyFacets(results: SearchResult[], selection: FacetSelection): SearchResult[] {
    if (Object.keys(selection).length === 0) {
      return results;
    }

    return results.filter((result) => {
      // Check each facet - must pass ALL facets (AND logic)
      for (const [facetId, values] of Object.entries(selection)) {
        if (!values || values.length === 0) continue;

        // Within a facet, use OR logic
        let passedFacet = false;

        switch (facetId) {
          case 'type':
            passedFacet = values.includes(result.type);
            break;
          case 'created':
            if (result.createdAt) {
              const bucket = this.getDateBucket(new Date(result.createdAt));
              passedFacet = values.includes(bucket);
            } else {
              // If no createdAt, only pass if 'older' is selected or no date filter
              passedFacet = values.includes('older');
            }
            break;
          default:
            passedFacet = true; // Unknown facet, ignore
        }

        if (!passedFacet) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Build the Type facet from results.
   */
  private buildTypeFacet(results: SearchResult[], selected: string[]): Facet {
    const counts = new Map<string, number>();
    for (const r of results) {
      counts.set(r.type, (counts.get(r.type) || 0) + 1);
    }

    const values = [
      { value: 'note', label: 'Note', count: counts.get('note') || 0 },
      { value: 'plan', label: 'Plan', count: counts.get('plan') || 0 },
      { value: 'document', label: 'Document', count: counts.get('document') || 0 },
    ]
      .filter((v) => v.count > 0)
      .map((v) => ({ ...v, selected: selected.includes(v.value) }));

    return {
      id: 'type',
      label: 'Type',
      type: 'exact',
      values,
    };
  }

  /**
   * Build the Date facet from results.
   */
  private buildDateFacet(results: SearchResult[], selected: string[]): Facet {
    const counts = new Map<DateRangeBucket, number>();

    for (const r of results) {
      if (r.createdAt) {
        const bucket = this.getDateBucket(new Date(r.createdAt));
        counts.set(bucket, (counts.get(bucket) || 0) + 1);
      } else {
        // Items without dates go to 'older'
        counts.set('older', (counts.get('older') || 0) + 1);
      }
    }

    const bucketOrder: DateRangeBucket[] = ['today', 'this_week', 'this_month', 'older'];
    const values = bucketOrder
      .map((bucket) => ({
        value: bucket,
        label: DATE_BUCKET_LABELS[bucket],
        count: counts.get(bucket) || 0,
        selected: selected.includes(bucket),
      }))
      .filter((v) => v.count > 0);

    return {
      id: 'created',
      label: 'Created',
      type: 'date_range',
      values,
    };
  }

  /**
   * Categorize a date into a bucket.
   */
  private getDateBucket(date: Date): DateRangeBucket {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (date >= startOfToday) return 'today';
    if (date >= startOfWeek) return 'this_week';
    if (date >= startOfMonth) return 'this_month';
    return 'older';
  }
}

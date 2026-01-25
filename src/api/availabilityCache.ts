/**
 * Availability Cache Module
 * Memory-based cache for court availability data with TTL
 */

import type { AvailabilityResponse } from './courts';

const CACHE_TTL_MS = 30 * 1000; // 30 seconds

interface CacheEntry {
  data: AvailabilityResponse;
  fetchedAt: number;
}

class AvailabilityCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get cached data for a date
   */
  get(dateStr: string): { data: AvailabilityResponse; isStale: boolean } | null {
    const entry = this.cache.get(dateStr);
    if (!entry) return null;

    const age = Date.now() - entry.fetchedAt;
    return {
      data: entry.data,
      isStale: age > CACHE_TTL_MS,
    };
  }

  /**
   * Store data for a date
   */
  set(dateStr: string, data: AvailabilityResponse): void {
    this.cache.set(dateStr, {
      data,
      fetchedAt: Date.now(),
    });
  }

  /**
   * Check if date is in cache (regardless of staleness)
   */
  has(dateStr: string): boolean {
    return this.cache.has(dateStr);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const availabilityCache = new AvailabilityCache();

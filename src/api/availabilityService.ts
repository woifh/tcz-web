/**
 * Availability Service Module
 * Handles fetching availability data with caching and prefetching
 */

import api from './client';
import { availabilityCache } from './availabilityCache';
import type { AvailabilityResponse } from './courts';

const PREFETCH_DAYS = 14;
const PREFETCH_BUFFER = 3; // Prefetch when within 3 days of cache edge

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid DST issues
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
}

function getToday(): string {
  return formatDateISO(new Date());
}

class AvailabilityService {
  private pendingFetches = new Set<string>();
  private subscribers = new Map<string, Set<(data: AvailabilityResponse) => void>>();

  /**
   * Get availability for a single date (cache-first)
   */
  async getForDate(dateStr: string): Promise<{ data: AvailabilityResponse; fromCache: boolean }> {
    const cached = availabilityCache.get(dateStr);

    if (cached && !cached.isStale) {
      return { data: cached.data, fromCache: true };
    }

    if (cached && cached.isStale) {
      // Return stale data immediately, refresh in background
      this.refreshInBackground(dateStr);
      return { data: cached.data, fromCache: true };
    }

    // Not in cache - fetch synchronously
    const data = await this.fetchSingle(dateStr);
    return { data, fromCache: false };
  }

  /**
   * Initial load - fetch range starting from today
   */
  async initialLoad(): Promise<void> {
    const today = getToday();
    try {
      await this.fetchRange(today, PREFETCH_DAYS);
    } catch (err) {
      console.warn('Range fetch failed, falling back to single date:', err);
      // Fall back to single date fetch
      await this.fetchSingle(today);
    }
  }

  /**
   * Prefetch dates around a center date if near cache edge
   */
  prefetchAround(centerDate: string): void {
    // Check if we're near the edge of cached dates
    const checkAhead = addDays(centerDate, PREFETCH_BUFFER);
    const checkBehind = addDays(centerDate, -PREFETCH_BUFFER);

    const needsAhead = !availabilityCache.has(checkAhead);
    const needsBehind = !availabilityCache.has(checkBehind);

    if (needsAhead) {
      // Prefetch 7 days ahead in background
      const startAhead = addDays(centerDate, 1);
      this.fetchRange(startAhead, 7).catch((err) => {
        console.warn('Prefetch ahead failed:', err);
      });
    }

    if (needsBehind) {
      // Prefetch 7 days behind in background
      const startBehind = addDays(centerDate, -7);
      this.fetchRange(startBehind, 7).catch((err) => {
        console.warn('Prefetch behind failed:', err);
      });
    }
  }

  /**
   * Fetch a single date from the API
   */
  async fetchSingle(dateStr: string): Promise<AvailabilityResponse> {
    const response = await api.get<AvailabilityResponse>('/api/courts/availability', {
      params: { date: dateStr },
    });
    const data = response.data;
    availabilityCache.set(dateStr, data);
    this.notifySubscribers(dateStr, data);
    return data;
  }

  /**
   * Fetch a date range from the API
   */
  async fetchRange(startDate: string, numDays: number): Promise<void> {
    const cacheKey = `${startDate}-${numDays}`;

    // Prevent duplicate fetches for same range
    if (this.pendingFetches.has(cacheKey)) {
      return;
    }

    this.pendingFetches.add(cacheKey);

    try {
      const response = await api.get<{ days: Record<string, AvailabilityResponse> }>(
        '/api/courts/availability/range',
        { params: { start: startDate, days: numDays } }
      );

      const data = response.data;

      // Store each day in cache
      if (data.days) {
        for (const [dateStr, dayData] of Object.entries(data.days)) {
          availabilityCache.set(dateStr, dayData);
          this.notifySubscribers(dateStr, dayData);
        }
      }
    } finally {
      this.pendingFetches.delete(cacheKey);
    }
  }

  /**
   * Refresh a date in the background (fire and forget)
   */
  refreshInBackground(dateStr: string): void {
    this.fetchSingle(dateStr).catch((err) => {
      console.warn('Background refresh failed:', err);
    });
  }

  /**
   * Subscribe to updates for a specific date
   */
  subscribe(dateStr: string, callback: (data: AvailabilityResponse) => void): () => void {
    if (!this.subscribers.has(dateStr)) {
      this.subscribers.set(dateStr, new Set());
    }
    this.subscribers.get(dateStr)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(dateStr)?.delete(callback);
    };
  }

  /**
   * Notify subscribers when data updates
   */
  private notifySubscribers(dateStr: string, data: AvailabilityResponse): void {
    const subs = this.subscribers.get(dateStr);
    if (subs) {
      subs.forEach((callback) => callback(data));
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    availabilityCache.clear();
  }
}

// Singleton instance
export const availabilityService = new AvailabilityService();

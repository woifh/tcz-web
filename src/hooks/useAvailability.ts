/**
 * useAvailability Hook
 * Provides court availability with caching, prefetching, and background refresh
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { availabilityService } from '../api/availabilityService';
import { availabilityCache } from '../api/availabilityCache';
import type { AvailabilityResponse } from '../api/courts';

interface UseAvailabilityResult {
  data: AvailabilityResponse | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useAvailability(dateStr: string): UseAvailabilityResult {
  const [data, setData] = useState<AvailabilityResponse | null>(() => {
    // Initialize from cache if available
    const cached = availabilityCache.get(dateStr);
    return cached?.data ?? null;
  });
  const [isLoading, setIsLoading] = useState(!availabilityCache.has(dateStr));
  const [error, setError] = useState<Error | null>(null);
  const initialLoadDone = useRef(false);

  // Initial range load (once per app lifecycle)
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      availabilityService.initialLoad().catch(console.error);
    }
  }, []);

  // Load data for current date
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      // Check cache first - show cached data immediately
      const cached = availabilityCache.get(dateStr);
      if (cached) {
        setData(cached.data);
        setIsLoading(false);

        // If stale, refresh in background (handled by service)
        if (cached.isStale) {
          availabilityService.refreshInBackground(dateStr);
        }
      } else {
        // Not in cache - need to load
        setIsLoading(true);
      }

      try {
        const result = await availabilityService.getForDate(dateStr);
        if (!cancelled) {
          setData(result.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load availability'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }

      // Trigger prefetch for nearby dates
      availabilityService.prefetchAround(dateStr);
    };

    loadData();

    // Subscribe to updates (e.g., from background refresh)
    const unsubscribe = availabilityService.subscribe(dateStr, (newData) => {
      if (!cancelled) {
        setData(newData);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [dateStr]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    availabilityService.fetchSingle(dateStr).then(
      (newData) => {
        setData(newData);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );
  }, [dateStr]);

  return { data, isLoading, error, refresh };
}

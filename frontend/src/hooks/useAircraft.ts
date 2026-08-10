"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchNearbyAircraft } from "@/lib/api";
import type { Coordinate, NearbyAircraftResponse } from "@/types/aircraft";

const POLL_INTERVAL_MS = Math.max(10000, Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || 30000));

export function useAircraft(location: Coordinate | null, radiusKm: number) {
  const [data, setData] = useState<NearbyAircraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const activeController = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!location || paused) return;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setLoading(true);
    try {
      const next = await fetchNearbyAircraft(location, radiusKm, controller.signal);
      setData(next); setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) setError(`${err.message} Retry in about ${err.retryAfter}s.`);
      else setError(err instanceof Error ? err.message : "Unable to load aircraft data.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [location, paused, radiusKm]);

  useEffect(() => {
    if (!location || paused) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => { window.clearInterval(timer); activeController.current?.abort(); };
  }, [location, paused, refresh]);

  return { data, loading, error, refresh, paused, setPaused };
}

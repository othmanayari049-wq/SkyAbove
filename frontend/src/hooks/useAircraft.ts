"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, fetchNearbyAircraft } from "@/lib/api";
import type { Coordinate, NearbyAircraftResponse } from "@/types/aircraft";

const POLL_INTERVAL_MS = Math.max(
  10_000,
  Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || 10_000),
);

type TrailPoint = [number, number];
type AircraftTrails = Record<string, TrailPoint[]>;

export function useAircraft(location: Coordinate | null, radiusKm: number) {
  const [data, setData] = useState<NearbyAircraftResponse | null>(null);
  const [trails, setTrails] = useState<AircraftTrails>({});
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
      setData(next);
      setTrails((current) => {
        const updated = { ...current };
        for (const plane of next.aircraft) {
          const trail = updated[plane.icao24] ?? [];
          const last = trail.at(-1);
          if (!last || last[0] !== plane.latitude || last[1] !== plane.longitude) {
            updated[plane.icao24] = [
              ...trail,
              [plane.latitude, plane.longitude] as TrailPoint,
            ].slice(-24);
          }
        }
        return updated;
      });
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
        setError(`${err.message} Retry in about ${err.retryAfter}s.`);
      } else {
        setError(err instanceof Error ? err.message : "Unable to load aircraft data.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [location, paused, radiusKm]);

  useEffect(() => {
    if (!location || paused) return;

    const initialTimer = window.setTimeout(() => void refresh(), 0);
    const pollTimer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
      activeController.current?.abort();
    };
  }, [location, paused, refresh]);

  return { data, trails, loading, error, refresh, paused, setPaused };
}

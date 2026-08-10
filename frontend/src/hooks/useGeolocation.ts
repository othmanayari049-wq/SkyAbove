"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Coordinate } from "@/types/aircraft";

type GeoState = {
  location: Coordinate | null;
  accuracyM: number | null;
  status: "requesting" | "ready" | "denied" | "unavailable" | "error";
  error: string | null;
};

const initialState: GeoState = {
  location: null,
  accuracyM: null,
  status: "requesting",
  error: null,
};

export function useGeolocation() {
  const [state, setState] = useState<GeoState>(initialState);
  const watchRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({
        ...initialState,
        status: "unavailable",
        error: "This browser does not expose the Geolocation API.",
      });
      return () => undefined;
    }

    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    setState((current) => ({ ...current, status: "requesting", error: null }));
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          accuracyM: position.coords.accuracy,
          status: "ready",
          error: null,
        });
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setState((current) => ({
          ...current,
          status: denied ? "denied" : "error",
          error: denied
            ? "Location permission was denied. SkyAbove needs it to find nearby aircraft."
            : error.message || "Unable to determine your location.",
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 12_000,
      },
    );

    watchRef.current = watchId;
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (watchRef.current === watchId) watchRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      cleanup = requestLocation();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      cleanup?.();
    };
  }, [requestLocation]);

  return { ...state, requestLocation };
}

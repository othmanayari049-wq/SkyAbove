import type { Coordinate, NearbyAircraftResponse } from "@/types/aircraft";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly retryAfter?: string | null) {
    super(message);
  }
}

export async function fetchNearbyAircraft(location: Coordinate, radiusKm: number, signal?: AbortSignal): Promise<NearbyAircraftResponse> {
  const params = new URLSearchParams({
    lat: location.lat.toString(),
    lon: location.lon.toString(),
    radius_km: radiusKm.toString(),
  });
  const response = await fetch(`${API_BASE_URL}/api/v1/aircraft/nearby?${params}`, { signal, cache: "no-store" });
  if (!response.ok) {
    let message = `SkyAbove API returned HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Keep status-based message when response is not JSON.
    }
    throw new ApiError(message, response.status, response.headers.get("Retry-After"));
  }
  return (await response.json()) as NearbyAircraftResponse;
}

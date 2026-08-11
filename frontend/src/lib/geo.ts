import type { Aircraft, Coordinate } from "@/types/aircraft";

const EARTH_RADIUS_M = 6_371_008.8;
const MAX_EXTRAPOLATION_SECONDS = 45;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function projectAircraftPosition(aircraft: Aircraft, nowMs: number): Coordinate {
  if (
    aircraft.on_ground ||
    aircraft.velocity_mps == null ||
    aircraft.track_deg == null ||
    aircraft.last_contact == null
  ) {
    return { lat: aircraft.latitude, lon: aircraft.longitude };
  }

  const ageSeconds = nowMs / 1000 - aircraft.last_contact;
  if (ageSeconds < 0 || ageSeconds > MAX_EXTRAPOLATION_SECONDS) {
    return { lat: aircraft.latitude, lon: aircraft.longitude };
  }

  const distanceM = aircraft.velocity_mps * ageSeconds;
  if (distanceM <= 0) {
    return { lat: aircraft.latitude, lon: aircraft.longitude };
  }

  const angularDistance = distanceM / EARTH_RADIUS_M;
  const bearing = toRadians(aircraft.track_deg);
  const lat1 = toRadians(aircraft.latitude);
  const lon1 = toRadians(aircraft.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: toDegrees(lat2),
    lon: ((toDegrees(lon2) + 540) % 360) - 180,
  };
}

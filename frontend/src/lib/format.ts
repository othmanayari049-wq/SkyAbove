export function metersToFeet(value: number | null): number | null {
  return value == null ? null : value * 3.28084;
}

export function mpsToKnots(value: number | null): number | null {
  return value == null ? null : value * 1.94384;
}

export function formatAltitude(value: number | null): string {
  const feet = metersToFeet(value);
  return feet == null ? "—" : `${Math.round(feet).toLocaleString()} ft`;
}

export function formatSpeed(value: number | null): string {
  const knots = mpsToKnots(value);
  return knots == null ? "—" : `${Math.round(knots)} kt`;
}

export function formatVerticalRate(value: number | null): string {
  if (value == null) return "—";
  const feetPerMinute = value * 196.8504;
  const sign = feetPerMinute > 20 ? "+" : "";
  return `${sign}${Math.round(feetPerMinute)} ft/min`;
}

export function formatDistance(value: number): string {
  return value < 10 ? `${value.toFixed(1)} km` : `${Math.round(value)} km`;
}

export function cardinalDirection(bearing: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(bearing / 45) % 8];
}

export function ageLabel(unixSeconds: number | null): string {
  if (!unixSeconds) return "Unknown";
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
}

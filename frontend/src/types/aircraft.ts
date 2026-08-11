export type Coordinate = { lat: number; lon: number };

export type Aircraft = {
  icao24: string;
  callsign: string | null;
  origin_country: string | null;
  latitude: number;
  longitude: number;
  baro_altitude_m: number | null;
  geo_altitude_m: number | null;
  on_ground: boolean;
  velocity_mps: number | null;
  track_deg: number | null;
  vertical_rate_mps: number | null;
  squawk: string | null;
  position_source: string | null;
  category: string | null;
  last_contact: number | null;
  data_provider: string | null;
  distance_km: number;
  bearing_deg: number;
  overhead_candidate: boolean;
};

export type NearbyAircraftResponse = {
  generated_at: string;
  source_time: number | null;
  data_provider: string;
  center: Coordinate;
  radius_km: number;
  count: number;
  cache_hit: boolean;
  upstream_rate_limit_remaining: number | null;
  aircraft: Aircraft[];
};

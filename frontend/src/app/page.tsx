"use client";

import {
  CirclePause,
  CirclePlay,
  Crosshair,
  LocateFixed,
  Plane,
  Radio,
  RefreshCw,
  Satellite,
  Search,
  WifiOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { AircraftDetails } from "@/components/AircraftDetails";
import { useAircraft } from "@/hooks/useAircraft";
import { useGeolocation } from "@/hooks/useGeolocation";
import { formatAltitude, formatDistance, formatSpeed } from "@/lib/format";
import type { Aircraft } from "@/types/aircraft";

const AircraftMap = dynamic(() => import("@/components/AircraftMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Satellite className="spin-slow" /> Initializing radar…
    </div>
  ),
});

const RADII = [25, 50, 100, 200];
const EMPTY_AIRCRAFT: Aircraft[] = [];
const EMPTY_TRAIL: [number, number][] = [];

export default function Home() {
  const geo = useGeolocation();
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data, trails, loading, error, refresh, paused, setPaused } = useAircraft(
    geo.location,
    radiusKm,
  );

  const aircraft = data?.aircraft ?? EMPTY_AIRCRAFT;
  const selected = aircraft.find((item) => item.icao24 === selectedIcao) ?? null;
  const selectedTrail = selectedIcao ? trails[selectedIcao] ?? EMPTY_TRAIL : EMPTY_TRAIL;
  const overhead = aircraft.find((item) => item.overhead_candidate && !item.on_ground) ?? null;

  const filteredAircraft = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return aircraft;
    return aircraft.filter(
      (item) =>
        item.callsign?.toLowerCase().includes(query) ||
        item.icao24.toLowerCase().includes(query) ||
        item.origin_country?.toLowerCase().includes(query),
    );
  }, [aircraft, search]);

  const averageAltitude = useMemo(() => {
    const airborne = aircraft.filter(
      (item) => !item.on_ground && item.baro_altitude_m != null,
    );
    if (!airborne.length) return null;
    return (
      airborne.reduce((sum, item) => sum + (item.baro_altitude_m ?? 0), 0) /
      airborne.length
    );
  }, [aircraft]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Plane size={19} />
          </div>
          <div>
            <strong>SkyAbove</strong>
            <span>LIVE AIRSPACE</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`status-pill ${error ? "status-pill--error" : ""}`}>
            <span className="pulse-dot" /> {error ? "DATA ISSUE" : paused ? "PAUSED" : "LIVE"}
          </span>
          <button
            className="icon-button"
            onClick={() => setPaused(!paused)}
            title={paused ? "Resume updates" : "Pause updates"}
          >
            {paused ? <CirclePlay size={18} /> : <CirclePause size={18} />}
          </button>
          <button
            className="icon-button"
            onClick={() => void refresh()}
            disabled={!geo.location || loading}
            title="Refresh now"
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
        </div>
      </header>

      {geo.status !== "ready" || !geo.location ? (
        <section className="permission-screen">
          <div className="orb">
            <LocateFixed size={32} />
          </div>
          <span className="eyebrow">Location required</span>
          <h1>See what&apos;s flying above you.</h1>
          <p>
            SkyAbove uses your browser location to query only the surrounding airspace. No
            SkyAbove database stores your position.
          </p>
          {geo.error && (
            <div className="permission-error">
              <WifiOff size={17} /> {geo.error}
            </div>
          )}
          <button className="primary-button" onClick={() => geo.requestLocation()}>
            <Crosshair size={18} />{" "}
            {geo.status === "requesting" ? "Requesting location…" : "Enable location"}
          </button>
          <small>
            For deployed sites, browsers normally require HTTPS before geolocation is available.
          </small>
        </section>
      ) : (
        <>
          <section className="hero-row">
            <div>
              <span className="eyebrow">
                <Radio size={13} /> Live around your position
              </span>
              <h1>Your sky, right now.</h1>
              <p>
                Tracking aircraft within <strong>{radiusKm} km</strong>. Location accuracy ±
                {Math.round(geo.accuracyM ?? 0)} m.
              </p>
            </div>
            <div className="radius-control" aria-label="Search radius">
              <span>Radar radius</span>
              <div>
                {RADII.map((radius) => (
                  <button
                    key={radius}
                    className={radius === radiusKm ? "active" : ""}
                    onClick={() => setRadiusKm(radius)}
                  >
                    {radius}
                    <small>km</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {error && (
            <div className="error-banner">
              <WifiOff size={17} />
              <span>{error}</span>
            </div>
          )}

          <section className="stat-grid">
            <div className="stat-card">
              <span>Aircraft in range</span>
              <strong>{aircraft.length}</strong>
              <small>{paused ? "Updates paused" : "Refreshes every 30 seconds"}</small>
            </div>
            <div className="stat-card">
              <span>Closest aircraft</span>
              <strong>
                {aircraft[0] ? formatDistance(aircraft[0].distance_km) : "—"}
              </strong>
              <small>
                {aircraft[0]?.callsign ||
                  aircraft[0]?.icao24.toUpperCase() ||
                  "No aircraft reported"}
              </small>
            </div>
            <div className="stat-card">
              <span>Average altitude</span>
              <strong>{formatAltitude(averageAltitude)}</strong>
              <small>Airborne aircraft with altitude data</small>
            </div>
            <div className="stat-card">
              <span>OpenSky credits</span>
              <strong>{data?.upstream_rate_limit_remaining ?? "—"}</strong>
              <small>
                {data?.cache_hit ? "Served from short cache" : "Upstream remaining, when reported"}
              </small>
            </div>
          </section>

          {overhead && (
            <section className="overhead-card" onClick={() => setSelectedIcao(overhead.icao24)}>
              <div className="overhead-radar">
                <span />
                <Plane size={23} />
              </div>
              <div>
                <span className="eyebrow">Closest overhead candidate</span>
                <h2>{overhead.callsign || overhead.icao24.toUpperCase()}</h2>
                <p>
                  {formatDistance(overhead.distance_km)} away ·{" "}
                  {formatAltitude(overhead.baro_altitude_m)} · {formatSpeed(overhead.velocity_mps)}
                </p>
              </div>
              <div className="bearing-block">
                <strong>{Math.round(overhead.bearing_deg)}°</strong>
                <span>bearing</span>
              </div>
            </section>
          )}

          <section className="workspace">
            <div className="map-card">
              <div className="map-toolbar">
                <div>
                  <span className="pulse-dot" /> Live map{" "}
                  <small>
                    {data?.source_time
                      ? `source ${new Date(data.source_time * 1000).toLocaleTimeString()}`
                      : "waiting for source"}
                  </small>
                </div>
                <span>{aircraft.length} targets</span>
              </div>
              <AircraftMap
                location={geo.location}
                aircraft={aircraft}
                radiusKm={radiusKm}
                selectedIcao={selectedIcao}
                selectedTrail={selectedTrail}
                onSelect={setSelectedIcao}
              />
              {loading && (
                <div className="loading-chip">
                  <RefreshCw size={14} className="spin" /> Updating airspace
                </div>
              )}
            </div>

            <aside className="sidebar">
              <div className="aircraft-list-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">Nearby traffic</span>
                    <h2>Aircraft</h2>
                  </div>
                  <span>{filteredAircraft.length}</span>
                </div>
                <label className="search-field">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Callsign, ICAO24, country"
                  />
                </label>
                <div className="aircraft-list">
                  {filteredAircraft.length === 0 ? (
                    <div className="empty-list">
                      <Plane size={24} />
                      <p>No matching aircraft currently reported.</p>
                    </div>
                  ) : (
                    filteredAircraft.map((plane) => (
                      <button
                        key={plane.icao24}
                        className={`aircraft-row ${
                          plane.icao24 === selectedIcao ? "selected" : ""
                        }`}
                        onClick={() => setSelectedIcao(plane.icao24)}
                      >
                        <div
                          className="mini-plane"
                          style={{ transform: `rotate(${plane.track_deg ?? 0}deg)` }}
                        >
                          ✈
                        </div>
                        <div>
                          <strong>{plane.callsign || plane.icao24.toUpperCase()}</strong>
                          <span>{plane.origin_country || "Unknown origin"}</span>
                        </div>
                        <div>
                          <strong>{formatDistance(plane.distance_km)}</strong>
                          <span>{formatAltitude(plane.baro_altitude_m)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <AircraftDetails aircraft={selected} />
            </aside>
          </section>
        </>
      )}

      <footer>
        <span>SkyAbove is an educational live-airspace viewer, not a safety or navigation system.</span>
        <span>Aircraft data: OpenSky Network · Map: OpenStreetMap contributors</span>
      </footer>
    </main>
  );
}

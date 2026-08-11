"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import {
  cardinalDirection,
  formatAltitude,
  formatDistance,
  formatSpeed,
} from "@/lib/format";
import { projectAircraftPosition } from "@/lib/geo";
import type { Aircraft, Coordinate } from "@/types/aircraft";

function planeIcon(aircraft: Aircraft, selected: boolean) {
  const rotation = ((aircraft.track_deg ?? 0) + 360) % 360;
  return L.divIcon({
    className: "aircraft-marker-shell",
    html: `<div class="aircraft-marker ${selected ? "aircraft-marker--selected" : ""}" style="transform: rotate(${rotation}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c-.85 0-1.35.7-1.35 1.55v5.9L3.7 12.8v1.85l6.95-1.9v4.85l-2.2 1.7v1.55L12 19.9l3.55.95V19.3l-2.2-1.7v-4.85l6.95 1.9V12.8l-6.95-3.85v-5.9c0-.85-.5-1.55-1.35-1.55Z"/></svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

const userIcon = L.divIcon({
  className: "user-marker-shell",
  html: '<div class="user-marker"><span></span></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function Recenter({ location }: { location: Coordinate }) {
  const map = useMap();
  const previous = useRef<Coordinate | null>(null);

  useEffect(() => {
    const old = previous.current;
    const moved =
      !old ||
      Math.abs(old.lat - location.lat) > 0.002 ||
      Math.abs(old.lon - location.lon) > 0.002;

    if (moved) {
      map.panTo([location.lat, location.lon], { animate: true });
      previous.current = location;
    }
  }, [location, map]);

  return null;
}

type Props = {
  location: Coordinate;
  aircraft: Aircraft[];
  radiusKm: number;
  selectedIcao: string | null;
  selectedTrail: [number, number][];
  onSelect: (icao24: string) => void;
};

export default function AircraftMap({
  location,
  aircraft,
  radiusKm,
  selectedIcao,
  selectedTrail,
  onSelect,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const rings = [0.25, 0.5, 1].map((ratio) => radiusKm * 1000 * ratio);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const projectedAircraft = useMemo(
    () =>
      aircraft.map((plane) => ({
        plane,
        position: projectAircraftPosition(plane, nowMs),
      })),
    [aircraft, nowMs],
  );

  return (
    <MapContainer
      center={[location.lat, location.lon]}
      zoom={radiusKm <= 25 ? 10 : radiusKm <= 50 ? 9 : radiusKm <= 100 ? 8 : 7}
      className="map"
      zoomControl={true}
      preferCanvas={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter location={location} />

      {rings.map((radius, index) => (
        <Circle
          key={radius}
          center={[location.lat, location.lon]}
          radius={radius}
          pathOptions={{
            color: index === 2 ? "#65f5c6" : "#55718a",
            opacity: index === 2 ? 0.42 : 0.25,
            weight: 1,
            fillOpacity: 0,
            dashArray: index === 2 ? undefined : "5 7",
          }}
        />
      ))}

      <Marker position={[location.lat, location.lon]} icon={userIcon}>
        <Tooltip direction="top" offset={[0, -12]}>
          You are here
        </Tooltip>
      </Marker>

      {selectedTrail.length > 1 && (
        <Polyline
          positions={selectedTrail}
          pathOptions={{ color: "#65f5c6", weight: 2, opacity: 0.75 }}
        />
      )}

      {projectedAircraft.map(({ plane, position }) => {
        const selected = plane.icao24 === selectedIcao;
        return (
          <Marker
            key={plane.icao24}
            position={[position.lat, position.lon]}
            icon={planeIcon(plane, selected)}
            eventHandlers={{ click: () => onSelect(plane.icao24) }}
            zIndexOffset={selected ? 1000 : 0}
          >
            <Tooltip direction="top" offset={[0, -13]} opacity={0.96}>
              <strong>{plane.callsign || plane.icao24.toUpperCase()}</strong>
              <br />
              {formatDistance(plane.distance_km)} · {formatAltitude(plane.baro_altitude_m)}
            </Tooltip>
            <Popup>
              <div className="map-popup">
                <strong>{plane.callsign || "Unknown callsign"}</strong>
                <span>{plane.origin_country || "Unknown country"}</span>
                <span>
                  {formatAltitude(plane.baro_altitude_m)} · {formatSpeed(plane.velocity_mps)}
                </span>
                <span>
                  {cardinalDirection(plane.bearing_deg)} {Math.round(plane.bearing_deg)}° ·{" "}
                  {formatDistance(plane.distance_km)}
                </span>
                <span>Provider: {plane.data_provider || "Unknown"}</span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

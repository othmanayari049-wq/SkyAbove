"use client";

import L, { LatLngExpression } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { cardinalDirection, formatAltitude, formatDistance, formatSpeed } from "@/lib/format";
import type { Aircraft, Coordinate } from "@/types/aircraft";

function planeIcon(aircraft: Aircraft, selected: boolean) {
  const rotation = aircraft.track_deg ?? 0;
  return L.divIcon({ className: "aircraft-marker-shell", html: `<div class="aircraft-marker ${selected ? "aircraft-marker--selected" : ""}" style="transform: rotate(${rotation}deg)">✈</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
}

const userIcon = L.divIcon({ className: "user-marker-shell", html: '<div class="user-marker"><span></span></div>', iconSize: [30, 30], iconAnchor: [15, 15] });

function Recenter({ location }: { location: Coordinate }) {
  const map = useMap();
  const previous = useRef<Coordinate | null>(null);
  useEffect(() => {
    const old = previous.current;
    if (!old || Math.abs(old.lat - location.lat) > 0.002 || Math.abs(old.lon - location.lon) > 0.002) {
      map.panTo([location.lat, location.lon], { animate: true });
      previous.current = location;
    }
  }, [location, map]);
  return null;
}

type Props = { location: Coordinate; aircraft: Aircraft[]; radiusKm: number; selectedIcao: string | null; onSelect: (icao24: string) => void };

export default function AircraftMap({ location, aircraft, radiusKm, selectedIcao, onSelect }: Props) {
  const history = useRef<Map<string, LatLngExpression[]>>(new Map());
  useEffect(() => {
    for (const plane of aircraft) {
      const trail = history.current.get(plane.icao24) ?? [];
      const last = trail.at(-1) as [number, number] | undefined;
      if (!last || last[0] !== plane.latitude || last[1] !== plane.longitude) history.current.set(plane.icao24, [...trail, [plane.latitude, plane.longitude] as LatLngExpression].slice(-12));
    }
  }, [aircraft]);
  const selectedTrail = useMemo(() => selectedIcao ? history.current.get(selectedIcao) ?? [] : [], [selectedIcao, aircraft]);
  const rings = [0.25, 0.5, 1].map((ratio) => radiusKm * 1000 * ratio);
  return <MapContainer center={[location.lat, location.lon]} zoom={radiusKm <= 25 ? 10 : radiusKm <= 50 ? 9 : radiusKm <= 100 ? 8 : 7} className="map" zoomControl preferCanvas>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Recenter location={location} />
    {rings.map((radius, index) => <Circle key={radius} center={[location.lat, location.lon]} radius={radius} pathOptions={{ color: index === 2 ? "#65f5c6" : "#55718a", opacity: index === 2 ? 0.42 : 0.25, weight: 1, fillOpacity: 0, dashArray: index === 2 ? undefined : "5 7" }} />)}
    <Marker position={[location.lat, location.lon]} icon={userIcon}><Tooltip direction="top" offset={[0, -12]}>You are here</Tooltip></Marker>
    {selectedTrail.length > 1 && <Polyline positions={selectedTrail} pathOptions={{ color: "#65f5c6", weight: 2, opacity: 0.75 }} />}
    {aircraft.map((plane) => {
      const selected = plane.icao24 === selectedIcao;
      return <Marker key={plane.icao24} position={[plane.latitude, plane.longitude]} icon={planeIcon(plane, selected)} eventHandlers={{ click: () => onSelect(plane.icao24) }} zIndexOffset={selected ? 1000 : 0}>
        <Tooltip direction="top" offset={[0, -13]} opacity={0.96}><strong>{plane.callsign || plane.icao24.toUpperCase()}</strong><br />{formatDistance(plane.distance_km)} · {formatAltitude(plane.baro_altitude_m)}</Tooltip>
        <Popup><div className="map-popup"><strong>{plane.callsign || "Unknown callsign"}</strong><span>{plane.origin_country || "Unknown country"}</span><span>{formatAltitude(plane.baro_altitude_m)} · {formatSpeed(plane.velocity_mps)}</span><span>{cardinalDirection(plane.bearing_deg)} {Math.round(plane.bearing_deg)}° · {formatDistance(plane.distance_km)}</span></div></Popup>
      </Marker>;
    })}
  </MapContainer>;
}

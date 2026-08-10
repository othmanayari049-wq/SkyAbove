"use client";

import { Activity, ArrowDownRight, ArrowUpRight, Compass, Gauge, Globe2, Plane, Radio, Ruler } from "lucide-react";
import { ageLabel, cardinalDirection, formatAltitude, formatDistance, formatSpeed, formatVerticalRate } from "@/lib/format";
import type { Aircraft } from "@/types/aircraft";

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="detail-row"><span className="detail-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></div>;
}

export function AircraftDetails({ aircraft }: { aircraft: Aircraft | null }) {
  if (!aircraft) return <section className="details-panel empty-details"><div className="empty-plane"><Plane size={30} /></div><h3>Select an aircraft</h3><p>Choose a marker or list item to inspect its latest available state vector.</p></section>;
  const verticalIcon = (aircraft.vertical_rate_mps ?? 0) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />;
  return <section className="details-panel">
    <div className="details-heading"><div><span className="eyebrow">Selected aircraft</span><h2>{aircraft.callsign || aircraft.icao24.toUpperCase()}</h2><p>{aircraft.origin_country || "Origin country unavailable"}</p></div>{aircraft.overhead_candidate && <span className="overhead-badge">Overhead candidate</span>}</div>
    <div className="details-grid">
      <Detail icon={<Ruler size={16} />} label="Distance" value={formatDistance(aircraft.distance_km)} />
      <Detail icon={<Compass size={16} />} label="Bearing" value={`${cardinalDirection(aircraft.bearing_deg)} ${Math.round(aircraft.bearing_deg)}°`} />
      <Detail icon={<Plane size={16} />} label="Altitude" value={formatAltitude(aircraft.baro_altitude_m)} />
      <Detail icon={<Gauge size={16} />} label="Ground speed" value={formatSpeed(aircraft.velocity_mps)} />
      <Detail icon={verticalIcon} label="Vertical rate" value={formatVerticalRate(aircraft.vertical_rate_mps)} />
      <Detail icon={<Activity size={16} />} label="Track" value={aircraft.track_deg == null ? "—" : `${Math.round(aircraft.track_deg)}°`} />
      <Detail icon={<Radio size={16} />} label="Signal source" value={aircraft.position_source || "—"} />
      <Detail icon={<Globe2 size={16} />} label="Category" value={aircraft.category || "—"} />
    </div>
    <div className="details-footer"><span>ICAO24 <strong>{aircraft.icao24.toUpperCase()}</strong></span><span>Squawk <strong>{aircraft.squawk || "—"}</strong></span><span>Last contact <strong>{ageLabel(aircraft.last_contact)}</strong></span></div>
  </section>;
}

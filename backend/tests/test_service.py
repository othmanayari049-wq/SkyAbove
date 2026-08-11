from app.service import normalize_adsblol_state, normalize_state


def sample_state() -> list[object]:
    return [
        "06a123",
        "QTR123 ",
        "Qatar",
        1786363197,
        1786363198,
        51.54,
        25.30,
        10363.2,
        False,
        240.0,
        126.0,
        2.1,
        None,
        10500.0,
        "1234",
        False,
        0,
        4,
    ]


def sample_adsblol_state() -> dict[str, object]:
    return {
        "hex": "710123",
        "flight": "SVA123 ",
        "lat": 21.55,
        "lon": 39.18,
        "alt_baro": 30000,
        "alt_geom": 30500,
        "gs": 450.0,
        "track": 90.0,
        "baro_rate": -640,
        "squawk": "1234",
        "type": "adsb_icao",
        "category": "A3",
        "seen": 1.2,
    }


def test_normalize_state_maps_fields_and_distance() -> None:
    aircraft = normalize_state(
        sample_state(),
        center_lat=25.2854,
        center_lon=51.5310,
        radius_km=50,
        overhead_threshold_km=8,
    )
    assert aircraft is not None
    assert aircraft.callsign == "QTR123"
    assert aircraft.position_source == "ADS-B"
    assert aircraft.category == "Large"
    assert aircraft.distance_km < 5
    assert aircraft.overhead_candidate is True


def test_normalize_state_discards_missing_position() -> None:
    state = sample_state()
    state[5] = None
    assert (
        normalize_state(
            state,
            center_lat=25.2854,
            center_lon=51.5310,
            radius_km=50,
            overhead_threshold_km=8,
        )
        is None
    )


def test_normalize_state_discards_outside_radius() -> None:
    state = sample_state()
    state[5] = 53.0
    state[6] = 26.0
    assert (
        normalize_state(
            state,
            center_lat=25.2854,
            center_lon=51.5310,
            radius_km=10,
            overhead_threshold_km=8,
        )
        is None
    )


def test_normalize_adsblol_state_maps_units_and_fields() -> None:
    aircraft = normalize_adsblol_state(
        sample_adsblol_state(),
        center_lat=21.5433,
        center_lon=39.1728,
        radius_km=50,
        overhead_threshold_km=8,
        source_time=1786420000,
    )
    assert aircraft is not None
    assert aircraft.callsign == "SVA123"
    assert aircraft.icao24 == "710123"
    assert aircraft.position_source == "ADSB ICAO"
    assert round(aircraft.baro_altitude_m or 0) == 9144
    assert round(aircraft.velocity_mps or 0) == 232
    assert aircraft.distance_km < 2
    assert aircraft.overhead_candidate is True


def test_normalize_adsblol_ground_aircraft() -> None:
    state = sample_adsblol_state()
    state["alt_baro"] = "ground"
    aircraft = normalize_adsblol_state(
        state,
        center_lat=21.5433,
        center_lon=39.1728,
        radius_km=50,
        overhead_threshold_km=8,
        source_time=1786420000,
    )
    assert aircraft is not None
    assert aircraft.on_ground is True
    assert aircraft.baro_altitude_m is None
    assert aircraft.overhead_candidate is False

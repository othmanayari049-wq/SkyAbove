from app.service import normalize_state


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

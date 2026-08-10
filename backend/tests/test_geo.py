import pytest

from app.geo import haversine_km, initial_bearing_deg, radius_to_bounding_boxes


def test_haversine_same_point_is_zero() -> None:
    assert haversine_km(25.2854, 51.5310, 25.2854, 51.5310) == pytest.approx(0.0)


def test_haversine_one_degree_latitude_is_about_111_km() -> None:
    assert haversine_km(0, 0, 1, 0) == pytest.approx(111.195, rel=0.002)


def test_bearing_east_is_90_degrees() -> None:
    assert initial_bearing_deg(0, 0, 0, 1) == pytest.approx(90.0, abs=0.01)


def test_regular_radius_returns_one_bbox() -> None:
    boxes = radius_to_bounding_boxes(25.0, 51.0, 50.0)
    assert len(boxes) == 1


def test_antimeridian_radius_splits_bbox() -> None:
    boxes = radius_to_bounding_boxes(0.0, 179.9, 50.0)
    assert len(boxes) == 2
    assert all(-180 <= box[1] <= 180 and -180 <= box[3] <= 180 for box in boxes)

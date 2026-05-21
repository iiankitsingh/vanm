import pytest
from aeroparse import parse_notam, get_aircraft_limitations
from aeroparse.models.canonical import Notam

def test_icao_notam_parsing():
    raw = (
        "Q) KZNY/QMRLC/IV/NBO/A/000/999/4042N07400W005\n"
        "A) KJFK B) 2605212200 C) 2605220600\n"
        "E) RWY 04L/22R CLSD FOR MAINT."
    )
    notam = parse_notam(raw)
    
    assert notam.id == "ICAO-UNKNOWN" # No explicit ID header in raw text, defaults to standard
    assert notam.q_code == "QMRLC"
    assert notam.location == "KJFK"
    assert notam.valid_from == "2026-05-21T22:00:00Z"
    assert notam.valid_to == "2026-05-22T06:00:00Z"
    assert "Runway 04L/22R Closed for Maintenance" in notam.plain_text
    assert notam.geometry is not None
    assert notam.geometry.type == "Polygon"
    # Centroid coordinate check (lon, lat)
    coords = notam.geometry.coordinates[0]
    assert len(coords) > 0
    # Lon around -74.0, Lat around 40.7
    assert -74.05 < coords[0][0] < -73.95
    assert 40.65 < coords[0][1] < 40.79

def test_icao_with_id_header():
    raw = (
        "A0123/26 NOTAMR A0110/26\n"
        "Q) KZNY/QMXLC/IV/M/A/000/999/4063N07377W002\n"
        "A) KJFK B) 2605212200 C) 2605220600\n"
        "E) TWY A CLSD"
    )
    notam = parse_notam(raw)
    assert notam.id == "A0123/26"
    assert notam.q_code == "QMXLC"
    assert "Taxiway A Closed" in notam.plain_text

def test_faa_domestic_notam():
    raw = "!DCA 05/123 DCA AD AP CLSD MON-FRI 1400-2200"
    notam = parse_notam(raw)
    
    assert notam.id == "!DCA-05/123"
    assert notam.location == "DCA"
    assert "Airport Closed" in notam.plain_text
    # Check that MON-FRI is preserved and abbreviations translated
    assert "Monday-Friday" in notam.plain_text

def test_faa_fdc_tfr_notam():
    raw = (
        "!FDC 3/9412 ZNY NY.. TEMPORARY FLIGHT RESTRICTIONS "
        "EFFECTIVE 2605212200 UTC UNTIL 2605220600 UTC. "
        "CIRCLE RADIUS 5NM OF 4042N07400W. PURSUANT TO 14 CFR SECTION 91.141."
    )
    notam = parse_notam(raw)
    
    assert notam.id == "!FDC-3/9412"
    assert notam.valid_from == "2026-05-21T22:00:00Z"
    assert notam.valid_to == "2026-05-22T06:00:00Z"
    assert "Temporary flight restrictions" in notam.plain_text
    assert notam.geometry is not None
    assert notam.geometry.type == "Polygon"


def test_aircraft_limitations_lookup():
    c172 = get_aircraft_limitations("C172")
    assert c172 is not None
    assert c172.max_altitude_ft == 14000.0
    assert c172.runway_takeoff_length_m == 490.0
    
    b738 = get_aircraft_limitations("b738")
    assert b738 is not None
    assert b738.max_altitude_ft == 41000.0
    
    invalid = get_aircraft_limitations("SPITFIRE")
    assert invalid is None

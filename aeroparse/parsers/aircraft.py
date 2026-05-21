import csv
import io
from typing import Dict, Optional, List
from aeroparse.models.canonical import AircraftLimitation

# Out-of-the-box embedded database for viral ease of use and testing
AIRCRAFT_DATABASE: Dict[str, AircraftLimitation] = {
    "C172": AircraftLimitation(
        aircraft_model="C172",
        engine_type="Lycoming IO-360-L2A",
        weight_variant="Standard",
        max_altitude_ft=14000.0,
        runway_takeoff_length_m=490.0,
        runway_landing_length_m=400.0,
        climb_limit_rate_fpm=730.0,
        temp_restriction_c=50.0
    ),
    "B738": AircraftLimitation(
        aircraft_model="B738",
        engine_type="CFM56-7B",
        weight_variant="MTOW 79000 kg",
        max_altitude_ft=41000.0,
        runway_takeoff_length_m=2450.0,
        runway_landing_length_m=1750.0,
        climb_limit_rate_fpm=3000.0,
        temp_restriction_c=54.0
    ),
    "A320": AircraftLimitation(
        aircraft_model="A320",
        engine_type="CFM56-5B",
        weight_variant="MTOW 78000 kg",
        max_altitude_ft=39800.0,
        runway_takeoff_length_m=2100.0,
        runway_landing_length_m=1500.0,
        climb_limit_rate_fpm=2800.0,
        temp_restriction_c=55.0
    ),
    "C56X": AircraftLimitation(
        aircraft_model="C56X",
        engine_type="PW545B",
        weight_variant="Citation Excel",
        max_altitude_ft=45000.0,
        runway_takeoff_length_m=1100.0,
        runway_landing_length_m=970.0,
        climb_limit_rate_fpm=4200.0,
        temp_restriction_c=50.0
    ),
    "GLF6": AircraftLimitation(
        aircraft_model="GLF6",
        engine_type="Rolls-Royce BR725",
        weight_variant="Gulfstream G650",
        max_altitude_ft=51000.0,
        runway_takeoff_length_m=1786.0,
        runway_landing_length_m=914.0,
        climb_limit_rate_fpm=4000.0,
        temp_restriction_c=54.0
    )
}

def get_aircraft_limitations(model: str) -> Optional[AircraftLimitation]:
    """
    Looks up pre-loaded performance limits for a given aircraft ICAO code (e.g. C172, B738).
    """
    model_upper = model.strip().upper()
    return AIRCRAFT_DATABASE.get(model_upper)

def parse_openap_csv(csv_data: str) -> List[AircraftLimitation]:
    """
    Parses OpenAP (openap.dev) or Eurocontrol BADA CSV dataset structures.
    Expected CSV columns: model, engine, mtow, max_alt, takeoff_m, landing_m, climb_fpm, temp_c
    """
    limitations = []
    f = io.StringIO(csv_data)
    reader = csv.DictReader(f)
    for row in reader:
        try:
            model = row.get("model", "").strip().upper()
            if not model:
                continue
                
            lim = AircraftLimitation(
                aircraft_model=model,
                engine_type=row.get("engine"),
                weight_variant=row.get("mtow"),
                max_altitude_ft=float(row["max_alt"]) if row.get("max_alt") else None,
                runway_takeoff_length_m=float(row["takeoff_m"]) if row.get("takeoff_m") else None,
                runway_landing_length_m=float(row["landing_m"]) if row.get("landing_m") else None,
                climb_limit_rate_fpm=float(row["climb_fpm"]) if row.get("climb_fpm") else None,
                temp_restriction_c=float(row["temp_c"]) if row.get("temp_c") else None
            )
            limitations.append(lim)
            # Dynamically register in database
            AIRCRAFT_DATABASE[model] = lim
        except (ValueError, KeyError):
            continue
    return limitations

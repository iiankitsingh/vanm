# ✈ AeroParse 2.0

A highly optimized, production-ready, and developer-friendly NOTAM & flight restriction parsing library and service, featuring a modern real-time visual web playground and GraphQL API.

AeroParse solves the nightmare of deciphering arcane, all-caps, abbreviation-heavy aviation notices (NOTAMs) and flight restrictions (TFRs), translating them to plain English and mapping their geometries instantly.

---

## 🚀 Quickstart

### 1. Installation
Clone the repository and install the dependencies:
```bash
# Set up a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Interactive Web Playground & GraphQL Server
Launch the server via our helper script:
```bash
# Launch the API server
python3 run.py
```
Then open [http://localhost:8000](http://localhost:8000) in your browser to experience the **Interactive Flight Restriction Map & Playground**!


---

## 🕹 Developer Usage

### 🐍 Python Library API
AeroParse is easily importable into your python scripts for batch jobs, data pipelines, or backend apps:

```python
from aeroparse import parse_notam, get_aircraft_limitations

# Parse a standard ICAO Runway Closure NOTAM
notam = parse_notam("""
Q) KZNY/QMRLC/IV/NBO/A/000/999/4063N07377W005
A) KJFK B) 2605212200 C) 2605220600
E) RWY 04L/22R CLSD FOR MAINT.
""")

print(notam.id)             # -> "ICAO-UNKNOWN"
print(notam.plain_text)     # -> "Runway 04L/22R Closed for Maintenance. (Lower limit: SFC, Upper limit: UNL)"
print(notam.geometry)       # -> GeoJSON polygon representing the 5 NM radius circle around JFK

# Lookup Aircraft Limitations from Type Certificate Data Sheets (TCDS)
aircraft = get_aircraft_limitations("B738")
print(aircraft.max_altitude_ft)          # -> 41000.0
print(aircraft.runway_takeoff_length_m)  # -> 2450.0
```

### 💻 Command Line Interface (CLI)
AeroParse comes with a powerful CLI. Pipe inputs or supply arguments directly:

```bash
# Pretty-print parsed NOTAM from a string argument
python3 -m aeroparse -p "Q) KZNY/QMRLC/IV/NBO/A/000/999/4063N07377W005 A) KJFK B) 2605212200 C) 2605220600 E) RWY 04L/22R CLSD FOR MAINT."

# Parse from a file or STDIN
cat notam.txt | python3 -m aeroparse --pretty
```

---

## ⚡ Strawberry GraphQL API

The server exposes a fully functional GraphQL endpoint at `/graphql` supporting spatial queries and real-time subscription push via WebSockets:

### Fetch NOTAMs spatially overlapping a 10 NM flight radius
```graphql
query {
  notams(lat: 40.6397, lon: -73.7789, radiusNM: 10.0) {
    id
    location
    plainText
    priority
    geometry {
      type
      coordinatesJson
    }
  }
}
```

### Broadcast/Parse a NOTAM dynamically
```graphql
mutation {
  parseRawNotam(rawText: "!DCA 05/123 DCA AD AP CLSD MON-FRI 1400-2200") {
    id
    location
    plainText
    priority
  }
}
```

### Live WebSocket Subscription
```graphql
subscription {
  notamAdded {
    id
    plainText
    priority
  }
}
```

---

## 🗺️ Project Architecture
- `aeroparse/models/canonical.py`: Canonical Pydantic schemas validating geo-shapes and aircraft specifications.
- `aeroparse/parsers/`: Plugin-based parsing engine (ICAO, FAA, and Aircraft limits) with custom abbreviation tokenization.
- `aeroparse/utils/geo.py`: Pure-python spherical projection and coordinate parser (zero binary GIS dependency overhead!).
- `aeroparse/utils/cache.py`: High-performance TTL spatial lookup index.
- `server/`: FastAPI and Strawberry GraphQL server, mounting a responsive dark-mode Leaflet frontend dashboard.

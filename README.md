# 📡 AeroRadar | Mumbai & Navi Mumbai Flight Tracker & FIDS Board

A premium, real-time Flight Information Display System (FIDS) and interactive radar map for **Chhatrapati Shivaji Maharaj International Airport (VABB)** and **Navi Mumbai International Airport (VANM)**.

Deployed live on GitHub Pages: **[https://iiankitsingh.github.io/vanm/](https://iiankitsingh.github.io/vanm/)**

---

## ✨ Features

- **Interactive Radar Map**: Real-time Leaflet airspace visualization with high-fidelity, custom-rotated airplane vectors showing live telemetry headings.
- **Flight Trails**: Dynamic dashed vector paths illustrating the recent historical trajectory of any selected flight.
- **Glowing FIDS Boards**: Full live lists for **Arrivals**, **Departures**, and **Ground Traffic** with responsive, color-coded status badges (Final Approach, Climbing, En Route, Landed, Taxiing, Boarding).
- **Comprehensive Search & Filters**: Search flights instantly by callsign, airline, origin, destination, or model. Toggle filters between VABB, VANM, or both airports.
- **Live Telemetry Details**: Click any flight to view detailed metrics including altitude, speed, heading, climb rate, ICAO24 hex code, gate assignments, and airport control zones.
- **Serverless Automation**: Continuously updated using a Python backend fetching ADS-B state vectors from the OpenSky Network API, backed by GitHub Actions automation.

---

## 🚀 Quickstart

### 1. Installation
Clone the repository and prepare the virtual environment:
```bash
# Set up a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Updater & Launch Preview Server
Execute the single control script:
```bash
python3 run.py
```
This will:
1. Fetch the latest live flight data from OpenSky API (or simulate flight movements if offline/rate-limited).
2. Save it to `flights.json`.
3. Spin up a local HTTP server serving the dashboard at **[http://localhost:8080](http://localhost:8080)**.

---

## 🛠️ Project Structure

- `index.html`: Main dashboard container holding layout, FIDS tables, sidebar panels, and script hooks.
- `styles.css`: Custom premium dark themes, neon radar sweeps, rotated airplane vectors, and table layouts.
- `app.js`: Core client logic handling asynchronously fetching data, Leaflet rendering, telemetry updates, search, and 10-second refreshes.
- `update_flights.py`: Backend Python script parsing OpenSky states and generating simulated feeds when needed.
- `flights.json`: The database updated automatically by GitHub Actions containing active flight vectors.
- `.github/workflows/update_flights.yml`: Automated GitHub Action updating live coordinates and scheduling telemetry commits.

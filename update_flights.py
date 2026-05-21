import os
import json
import urllib.request
import time
import math
import random

# Bounding box around Mumbai and Navi Mumbai (VABB and VANM)
LAMIN = 18.5
LOMIN = 72.4
LAMAX = 19.4
LOMAX = 73.4

# Airport center coordinates
VABB_COORDS = (19.0896, 72.8656)  # Chhatrapati Shivaji Maharaj International Airport (Mumbai)
VANM_COORDS = (18.9919, 73.0617)  # Navi Mumbai International Airport (Navi Mumbai)

# Airline mapping by callsign prefix
AIRLINE_MAP = {
    "AIC": {"name": "Air India", "logo": "🇮🇳"},
    "IGO": {"name": "IndiGo", "logo": "🔵"},
    "VTI": {"name": "Vistara", "logo": "🟣"},
    "SEJ": {"name": "SpiceJet", "logo": "🔴"},
    "AKJ": {"name": "Akasa Air", "logo": "🟠"},
    "UAE": {"name": "Emirates", "logo": "🇦🇪"},
    "SIA": {"name": "Singapore Airlines", "logo": "🇸🇬"},
    "QTR": {"name": "Qatar Airways", "logo": "🇶🇦"},
    "BAW": {"name": "British Airways", "logo": "🇬🇧"},
    "LHA": {"name": "Lufthansa", "logo": "🇩🇪"},
    "ETD": {"name": "Etihad Airways", "logo": "🇦🇪"},
    "JAI": {"name": "Jet Airways", "logo": "🇮🇳"}
}

def get_airline_info(callsign):
    prefix = callsign[:3]
    if prefix in AIRLINE_MAP:
        return AIRLINE_MAP[prefix]
    # Default fallback
    return {"name": "Private/Other", "logo": "✈️"}

def calculate_distance(lat1, lon1, lat2, lon2):
    # Quick distance using equirectangular approximation (fine for small areas)
    x = (lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2.0))
    y = lat2 - lat1
    return math.sqrt(x*x + y*y) * 111.32  # distance in km

def fetch_live_flights():
    """
    Attempts to fetch live state vectors from OpenSky Network API.
    """
    url = f"https://opensky-network.org/api/states/all?lamin={LAMIN}&lomin={LOMIN}&lamax={LAMAX}&lomax={LOMAX}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        if response.status != 200:
            raise Exception(f"HTTP Error {response.status}")
        return json.loads(response.read().decode("utf-8"))

def generate_simulated_flights():
    """
    Generates a beautifully structured simulated flight database.
    Planes move dynamically based on the current timestamp (time.time())
    so they progress along their paths on page refreshes.
    """
    now = time.time()
    
    # Templates for simulated flights
    # status: 'final_approach', 'descending', 'en_route', 'climbing', 'departed', 'on_ground'
    templates = [
        # ARRIVALS TO VABB (Mumbai)
        {
            "callsign": "UAE504",
            "model": "B77W",
            "origin": "Dubai (OMDB)",
            "destination": "Mumbai (VABB)",
            "start_lat": 18.7, "start_lon": 72.0,
            "end_lat": VABB_COORDS[0], "end_lon": VABB_COORDS[1],
            "speed": 160, "alt_start": 15000, "alt_end": 0,
            "duration": 900, "cycle_offset": 0,
            "type": "arrival", "airport": "VABB"
        },
        {
            "callsign": "IGO612",
            "model": "A20N",
            "origin": "Delhi (VIDP)",
            "destination": "Mumbai (VABB)",
            "start_lat": 19.5, "start_lon": 72.8,
            "end_lat": VABB_COORDS[0], "end_lon": VABB_COORDS[1],
            "speed": 140, "alt_start": 8000, "alt_end": 0,
            "duration": 600, "cycle_offset": 200,
            "type": "arrival", "airport": "VABB"
        },
        {
            "callsign": "VTI821",
            "model": "A321",
            "origin": "Bangalore (VOBL)",
            "destination": "Mumbai (VABB)",
            "start_lat": 18.2, "start_lon": 72.9,
            "end_lat": VABB_COORDS[0], "end_lon": VABB_COORDS[1],
            "speed": 150, "alt_start": 10000, "alt_end": 0,
            "duration": 700, "cycle_offset": 450,
            "type": "arrival", "airport": "VABB"
        },
        {
            "callsign": "SIA422",
            "model": "A359",
            "origin": "Singapore (WSSS)",
            "destination": "Mumbai (VABB)",
            "start_lat": 18.4, "start_lon": 73.3,
            "end_lat": VABB_COORDS[0], "end_lon": VABB_COORDS[1],
            "speed": 180, "alt_start": 18000, "alt_end": 0,
            "duration": 1000, "cycle_offset": 100,
            "type": "arrival", "airport": "VABB"
        },
        
        # DEPARTURES FROM VABB (Mumbai)
        {
            "callsign": "AIC101",
            "model": "B788",
            "origin": "Mumbai (VABB)",
            "destination": "London (EGLL)",
            "start_lat": VABB_COORDS[0], "start_lon": VABB_COORDS[1],
            "end_lat": 19.3, "end_lon": 72.1,
            "speed": 260, "alt_start": 0, "alt_end": 18000,
            "duration": 800, "cycle_offset": 150,
            "type": "departure", "airport": "VABB"
        },
        {
            "callsign": "IGO804",
            "model": "A20N",
            "origin": "Mumbai (VABB)",
            "destination": "Chennai (VOMM)",
            "start_lat": VABB_COORDS[0], "start_lon": VABB_COORDS[1],
            "end_lat": 18.1, "end_lon": 73.1,
            "speed": 230, "alt_start": 0, "alt_end": 14000,
            "duration": 700, "cycle_offset": 300,
            "type": "departure", "airport": "VABB"
        },
        {
            "callsign": "AKJ112",
            "model": "B38M",
            "origin": "Mumbai (VABB)",
            "destination": "Goa (VOGO)",
            "start_lat": VABB_COORDS[0], "start_lon": VABB_COORDS[1],
            "end_lat": 18.3, "end_lon": 72.7,
            "speed": 220, "alt_start": 0, "alt_end": 12000,
            "duration": 650, "cycle_offset": 500,
            "type": "departure", "airport": "VABB"
        },

        # NAVI MUMBAI (VANM) TEST/VIP FLIGHTS
        {
            "callsign": "GLF6_VIP",
            "model": "GLF6",
            "origin": "Delhi (VIDP)",
            "destination": "Navi Mumbai (VANM)",
            "start_lat": 19.6, "start_lon": 73.2,
            "end_lat": VANM_COORDS[0], "end_lon": VANM_COORDS[1],
            "speed": 170, "alt_start": 12000, "alt_end": 0,
            "duration": 850, "cycle_offset": 350,
            "type": "arrival", "airport": "VANM"
        },
        {
            "callsign": "AIC_TEST",
            "model": "C25B",
            "origin": "Navi Mumbai (VANM)",
            "destination": "Pune (VAPO)",
            "start_lat": VANM_COORDS[0], "start_lon": VANM_COORDS[1],
            "end_lat": 18.6, "end_lon": 73.9,
            "speed": 190, "alt_start": 0, "alt_end": 10000,
            "duration": 600, "cycle_offset": 50,
            "type": "departure", "airport": "VANM"
        },
        
        # ON GROUND - VABB
        {
            "callsign": "SEJ154",
            "model": "B737",
            "origin": "Mumbai (VABB)",
            "destination": "Goa (VOGO)",
            "lat": 19.091, "lon": 72.862,
            "speed": 0, "alt": 0, "heading": 90,
            "type": "on_ground", "airport": "VABB", "gate": "Gate 14", "status": "Boarding"
        },
        {
            "callsign": "IGO105",
            "model": "A20N",
            "origin": "Hyderabad (VOHY)",
            "destination": "Mumbai (VABB)",
            "lat": 19.086, "lon": 72.871,
            "speed": 5, "alt": 0, "heading": 140,
            "type": "on_ground", "airport": "VABB", "gate": "Taxiway M3", "status": "Taxiing"
        },
        
        # ON GROUND - VANM (Navi Mumbai)
        {
            "callsign": "VT-NMA",
            "model": "BE20",
            "origin": "Mumbai (VABB)",
            "destination": "Navi Mumbai (VANM)",
            "lat": 18.991, "lon": 73.065,
            "speed": 0, "alt": 0, "heading": 260,
            "type": "on_ground", "airport": "VANM", "gate": "Apron A1", "status": "Landed"
        }
    ]
    
    flights = []
    for t in templates:
        airline_info = get_airline_info(t["callsign"])
        
        if t["type"] == "on_ground":
            flights.append({
                "icao24": f"c0{random.randint(1000, 9999)}",
                "callsign": t["callsign"],
                "airline": airline_info["name"],
                "logo": airline_info["logo"],
                "model": t["model"],
                "origin": t["origin"],
                "destination": t["destination"],
                "lat": t["lat"],
                "lon": t["lon"],
                "altitude": 0,
                "speed": t["speed"],
                "heading": t["heading"],
                "vertical_rate": 0,
                "status": t["status"],
                "gate": t["gate"],
                "type": "on_ground",
                "airport": t["airport"],
                "trail": [[t["lon"], t["lat"]]]
            })
            continue
            
        # Determine progress along trajectory based on current time
        total_sec = t["duration"]
        progress_period = (now + t["cycle_offset"]) % total_sec
        fraction = progress_period / total_sec
        
        # Calculate intermediate position
        lat = t["start_lat"] + (t["end_lat"] - t["start_lat"]) * fraction
        lon = t["start_lon"] + (t["end_lon"] - t["start_lon"]) * fraction
        
        # Altitude calculation
        alt = t["alt_start"] + (t["alt_end"] - t["alt_start"]) * fraction
        
        # Heading calculation
        delta_lat = t["end_lat"] - t["start_lat"]
        delta_lon = t["end_lon"] - t["start_lon"]
        heading = int((math.degrees(math.atan2(delta_lon, delta_lat)) + 360) % 360)
        
        # Vertical rate (fpm)
        vrate = (t["alt_end"] - t["alt_start"]) / (total_sec / 60.0)
        
        # Determine status details
        if t["type"] == "arrival":
            if fraction > 0.85:
                status = "Final Approach"
            elif fraction > 0.5:
                status = "Descending"
            else:
                status = "En Route"
        else: # departure
            if fraction < 0.15:
                status = "Climbing"
            elif fraction < 0.3:
                status = "Departed"
            else:
                status = "En Route"
                
        # Generate trail history
        trail = []
        steps = 5
        for s in range(steps + 1):
            s_frac = fraction * (s / steps)
            s_lat = t["start_lat"] + (t["end_lat"] - t["start_lat"]) * s_frac
            s_lon = t["start_lon"] + (t["end_lon"] - t["start_lon"]) * s_frac
            trail.append([s_lon, s_lat])
            
        flights.append({
            "icao24": f"c0{random.randint(10000, 99999)}",
            "callsign": t["callsign"],
            "airline": airline_info["name"],
            "logo": airline_info["logo"],
            "model": t["model"],
            "origin": t["origin"],
            "destination": t["destination"],
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "altitude": int(alt),
            "speed": t["speed"],
            "heading": heading,
            "vertical_rate": int(vrate),
            "status": status,
            "gate": "",
            "type": t["type"],
            "airport": t["airport"],
            "trail": trail
        })
        
    return flights

def main():
    print("📡 Fetching flight states for Mumbai area bounds...")
    flights = []
    
    try:
        data = fetch_live_flights()
        states = data.get("states", [])
        if not states:
            print("⚠️ No live flights found in boundary box. Loading simulated feed.")
            flights = generate_simulated_flights()
        else:
            print(f"✅ Found {len(states)} live flight vectors in airspace.")
            for s in states:
                icao = s[0]
                callsign = s[1].strip() if s[1] else f"FLT-{icao.upper()[:4]}"
                if not callsign:
                    continue
                
                lon = s[5]
                lat = s[6]
                if lon is None or lat is None:
                    continue
                    
                alt = int(s[7] * 3.28084) if s[7] is not None else 0 # m to ft
                on_ground = s[8]
                speed = int(s[9] * 1.94384) if s[9] is not None else 0 # m/s to kts
                heading = int(s[10]) if s[10] is not None else 0
                vrate = int(s[11] * 196.85) if s[11] is not None else 0 # m/s to fpm
                
                # Check closest airport
                dist_vabb = calculate_distance(lat, lon, VABB_COORDS[0], VABB_COORDS[1])
                dist_vanm = calculate_distance(lat, lon, VANM_COORDS[0], VANM_COORDS[1])
                
                closer_airport = "VABB" if dist_vabb < dist_vanm else "VANM"
                closer_dist = min(dist_vabb, dist_vanm)
                
                airline_info = get_airline_info(callsign)
                
                # Determine flight type
                if on_ground:
                    flight_type = "on_ground"
                    status = "Landed" if closer_dist < 2 else "On Ground"
                elif vrate < -200:
                    flight_type = "arrival"
                    status = "Final Approach" if closer_dist < 15 else "Descending"
                elif vrate > 200:
                    flight_type = "departure"
                    status = "Climbing"
                else:
                    flight_type = "arrival" if closer_dist < 40 and alt < 12000 else "departure"
                    status = "En Route"
                
                # Define simple origin/dest estimation
                if flight_type == "arrival":
                    origin = "En Route"
                    destination = f"Mumbai ({closer_airport})"
                elif flight_type == "departure":
                    origin = f"Mumbai ({closer_airport})"
                    destination = "En Route"
                else:
                    origin = "Local"
                    destination = f"Mumbai ({closer_airport})"
                
                flights.append({
                    "icao24": icao,
                    "callsign": callsign,
                    "airline": airline_info["name"],
                    "logo": airline_info["logo"],
                    "model": "A320" if "IGO" in callsign else "B788" if "AIC" in callsign else "B738",
                    "origin": origin,
                    "destination": destination,
                    "lat": lat,
                    "lon": lon,
                    "altitude": alt,
                    "speed": speed,
                    "heading": heading,
                    "vertical_rate": vrate,
                    "status": status,
                    "gate": "Gate A" if on_ground else "",
                    "type": flight_type,
                    "airport": closer_airport,
                    "trail": [[lon, lat]]  # Simple trail for live vectors
                })
    except Exception as e:
        print(f"⚠️ Failed to connect to OpenSky Network API ({e}). Falling back to simulated feed.")
        flights = generate_simulated_flights()
        
    # Write to flights.json
    os.makedirs("docs", exist_ok=True)
    flights_json_path = os.path.join("docs", "flights.json")
    with open(flights_json_path, "w") as f:
        json.dump(flights, f, indent=2)
        
    print(f"💾 Saved {len(flights)} flight datasets to {flights_json_path}")
    print("🎉 Done! Flight data update complete.")

if __name__ == "__main__":
    main()

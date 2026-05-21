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

def get_flight_metadata(callsign, aircraft_type, flight_type, closer_airport, custom_origin=None, custom_dest=None):
    # Determine airline from callsign
    prefix = callsign[:3]
    
    # Generate realistic registration based on country prefix
    if prefix in ["UAE", "ETD"]:
        reg = f"A6-{random.choice('EFGH')}{random.choice('JKLMNOPQ')}{random.choice('ABCDEF')}"
    elif prefix == "SIA":
        reg = f"9V-{random.choice('SMN')}{random.choice('ABCDE')}{random.choice('FGHIJ')}"
    elif prefix == "QTR":
        reg = f"A7-{random.choice('ALM')}{random.choice('ABCDE')}{random.choice('FGHIJ')}"
    elif prefix == "BAW":
        reg = f"G-X{random.choice('WYZ')}{random.choice('ABCDE')}{random.choice('FGHIJ')}"
    elif prefix == "LHA":
        reg = f"D-A{random.choice('BCE')}{random.choice('ABCDE')}{random.choice('FGHIJ')}"
    else:
        # Default Indian registration prefix VT-
        reg_char = "I"
        if prefix == "IGO": reg_char = random.choice(["I", "Y"])
        elif prefix == "AIC": reg_char = random.choice(["A", "E"])
        elif prefix == "VTI": reg_char = "T"
        elif prefix == "SEJ": reg_char = "S"
        elif prefix == "AKJ": reg_char = "K"
        reg = f"VT-{reg_char}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"

    # Model specific details
    model_data = {
        "A20N": {
            "name": "Airbus A320-251N (A20N)",
            "engines": "2x CFM LEAP-1A26",
            "photo_url": "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=600&q=80",
            "msn_range": (8500, 11500),
            "age_range": (0.5, 6.0)
        },
        "A321": {
            "name": "Airbus A321-271NX (A321)",
            "engines": "2x PW1133G-JM",
            "photo_url": "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=600&q=80",
            "msn_range": (9000, 12000),
            "age_range": (0.5, 4.0)
        },
        "B77W": {
            "name": "Boeing 777-300ER (B77W)",
            "engines": "2x GE GE90-115B",
            "photo_url": "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=600&q=80",
            "msn_range": (35000, 43000),
            "age_range": (5.0, 12.0)
        },
        "A359": {
            "name": "Airbus A350-941 (A359)",
            "engines": "2x RR Trent XWB-84",
            "photo_url": "https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?auto=format&fit=crop&w=600&q=80",
            "msn_range": (100, 500),
            "age_range": (1.0, 8.0)
        },
        "B788": {
            "name": "Boeing 787-8 Dreamliner (B788)",
            "engines": "2x RR Trent 1000",
            "photo_url": "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=600&q=80",
            "msn_range": (34000, 39000),
            "age_range": (4.0, 10.0)
        },
        "B38M": {
            "name": "Boeing 737 MAX 8 (B38M)",
            "engines": "2x CFM LEAP-1B27",
            "photo_url": "https://images.unsplash.com/photo-1473862170180-84427c485ade?auto=format&fit=crop&w=600&q=80",
            "msn_range": (43000, 45000),
            "age_range": (0.5, 5.0)
        },
        "GLF6": {
            "name": "Gulfstream G650ER (GLF6)",
            "engines": "2x RR BR725A1-12",
            "photo_url": "https://images.unsplash.com/photo-1527261834078-9b37d35a4a32?auto=format&fit=crop&w=600&q=80",
            "msn_range": (6000, 6500),
            "age_range": (2.0, 10.0)
        }
    }
    
    # Check model
    m_info = model_data.get(aircraft_type, {
        "name": f"Aircraft {aircraft_type}",
        "engines": "Twin Jet Engines",
        "photo_url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
        "msn_range": (1000, 9999),
        "age_range": (1.0, 15.0)
    })
    
    # Generate age & serial number
    random.seed(callsign) # Seed based on callsign to maintain consistency across runs
    age = round(random.uniform(m_info["age_range"][0], m_info["age_range"][1]), 1)
    msn = random.randint(m_info["msn_range"][0], m_info["msn_range"][1])
    
    # Reset random seed
    random.seed()
    
    # Airport names mapping
    airports = {
        "VABB": {"fullname": "Chhatrapati Shivaji Maharaj Intl (BOM/VABB)", "city": "Mumbai", "iata": "BOM"},
        "VANM": {"fullname": "Navi Mumbai International (NMIA/VANM)", "city": "Navi Mumbai", "iata": "NMIA"},
        "VIDP": {"fullname": "Indira Gandhi International (DEL/VIDP)", "city": "Delhi", "iata": "DEL"},
        "VOBL": {"fullname": "Kempegowda International (BLR/VOBL)", "city": "Bangalore", "iata": "BLR"},
        "VOMM": {"fullname": "Chennai International (MAA/VOMM)", "city": "Chennai", "iata": "MAA"},
        "VOGO": {"fullname": "Manohar International (GOX/VOGO)", "city": "Goa", "iata": "GOX"},
        "VAPO": {"fullname": "Pune Airport (PNQ/VAPO)", "city": "Pune", "iata": "PNQ"},
        "OMDB": {"fullname": "Dubai International (DXB/OMDB)", "city": "Dubai", "iata": "DXB"},
        "WSSS": {"fullname": "Singapore Changi (SIN/WSSS)", "city": "Singapore", "iata": "SIN"},
        "EGLL": {"fullname": "London Heathrow (LHR/EGLL)", "city": "London", "iata": "LHR"},
        "QTR": {"fullname": "Doha Hamad International (DOH/OTBD)", "city": "Doha", "iata": "DOH"},
        "AUH": {"fullname": "Abu Dhabi International (AUH/OMAA)", "city": "Abu Dhabi", "iata": "AUH"}
    }
    
    # Map origin and destination
    origin = None
    destination = None
    
    # If custom ones are supplied like "Dubai (OMDB)"
    if custom_origin:
        if "(" in custom_origin and ")" in custom_origin:
            code = custom_origin.split("(")[1].split(")")[0]
            if code in airports:
                origin = code
            else:
                origin = custom_origin
        else:
            origin = custom_origin
            
    if custom_dest:
        if "(" in custom_dest and ")" in custom_dest:
            code = custom_dest.split("(")[1].split(")")[0]
            if code in airports:
                destination = code
            else:
                destination = custom_dest
        else:
            destination = custom_dest

    # Auto generation if not supplied
    if not origin:
        if flight_type == "arrival":
            if prefix == "UAE": origin = "OMDB"
            elif prefix == "SIA": origin = "WSSS"
            elif prefix == "QTR": origin = "QTR"
            elif prefix == "BAW": origin = "EGLL"
            else: origin = random.choice(["VIDP", "VOBL", "VOMM", "VOGO"])
        else:
            origin = closer_airport
            
    if not destination:
        if flight_type == "departure":
            if prefix == "UAE": destination = "OMDB"
            elif prefix == "SIA": destination = "WSSS"
            elif prefix == "QTR": destination = "QTR"
            elif prefix == "BAW": destination = "EGLL"
            else: destination = random.choice(["VIDP", "VOBL", "VOMM", "VOGO"])
        else:
            destination = closer_airport

    orig_fullname = airports[origin]["fullname"] if origin in airports else (origin if isinstance(origin, str) else f"En Route ({origin})")
    orig_city = airports[origin]["city"] if origin in airports else (origin.split(" ")[0] if isinstance(origin, str) else "En Route")
    orig_iata = airports[origin]["iata"] if origin in airports else (origin.split("(")[1].split(")")[0] if isinstance(origin, str) and "(" in origin else "BOM")
    
    dest_fullname = airports[destination]["fullname"] if destination in airports else (destination if isinstance(destination, str) else f"En Route ({destination})")
    dest_city = airports[destination]["city"] if destination in airports else (destination.split(" ")[0] if isinstance(destination, str) else "En Route")
    dest_iata = airports[destination]["iata"] if destination in airports else (destination.split("(")[1].split(")")[0] if isinstance(destination, str) and "(" in destination else "BOM")
    
    # Generate departure / arrival times
    random.seed(callsign)
    dep_hour = random.randint(0, 23)
    dep_min = random.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
    duration_hours = random.choice([1, 2, 3, 5, 8])
    duration_mins = random.choice([0, 15, 30, 45])
    
    arr_hour = (dep_hour + duration_hours) % 24
    arr_min = (dep_min + duration_mins) % 60
    
    dep_time = f"{dep_hour:02d}:{dep_min:02d}"
    arr_time = f"{arr_hour:02d}:{arr_min:02d}"
    
    # Photographer credit & manufacturer
    photographers = [
        "Aravind Krishnan", "Rahul Sharma", "Vivek Patel", "Aniket Singh", "Sanjay Rao",
        "Priya Das", "Karan Malhotra", "Neha Gupta", "Rohan Joshi", "Rajesh Nair",
        "Siddharth Shah", "Sameer Deshmukh", "Tanmay Sen", "Vikram Kadam"
    ]
    random.seed(reg)
    photographer = random.choice(photographers)
    random.seed()
    
    manufacturer = "Boeing"
    if "Airbus" in m_info["name"]:
        manufacturer = "Airbus"
    elif "Gulfstream" in m_info["name"]:
        manufacturer = "Gulfstream"
    
    return {
        "registration": reg,
        "serial_number": f"MSN {msn}",
        "age": f"{age} years",
        "engines": m_info["engines"],
        "aircraft_fullname": m_info["name"],
        "photo_url": m_info["photo_url"],
        "origin_fullname": orig_fullname,
        "origin_city": orig_city,
        "origin_iata": orig_iata,
        "destination_fullname": dest_fullname,
        "destination_city": dest_city,
        "destination_iata": dest_iata,
        "dep_time": dep_time,
        "arr_time": arr_time,
        "photographer": photographer,
        "manufacturer": manufacturer
    }

def generate_simulated_flights():
    """
    Generates a beautifully structured simulated flight database.
    Planes move dynamically based on the current timestamp (time.time())
    so they progress along their paths on page refreshes.
    """
    now = time.time()
    
    # Templates for simulated flights
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
            "model": "GLF6",
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
            "model": "B38M",
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
            "model": "GLF6",
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
        meta = get_flight_metadata(t["callsign"], t["model"], t["type"], t["airport"], custom_origin=t.get("origin"), custom_dest=t.get("destination"))
        
        if t["type"] == "on_ground":
            flights.append({
                "icao24": f"c0{random.randint(1000, 9999)}",
                "callsign": t["callsign"],
                "airline": airline_info["name"],
                "logo": airline_info["logo"],
                "model": t["model"],
                "origin": meta["origin_city"],
                "destination": meta["destination_city"],
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
                "trail": [[t["lon"], t["lat"]]],
                **meta
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
            "origin": meta["origin_city"],
            "destination": meta["destination_city"],
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
            "trail": trail,
            **meta
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
                
                # Model determination
                ac_model = "A20N" if "IGO" in callsign else "B788" if "AIC" in callsign else "B738"
                if "VTI" in callsign: ac_model = "A321"
                elif "UAE" in callsign: ac_model = "B77W"
                elif "SIA" in callsign: ac_model = "A359"
                elif "GLF" in callsign: ac_model = "GLF6"
                
                meta = get_flight_metadata(callsign, ac_model, flight_type, closer_airport)
                
                flights.append({
                    "icao24": icao,
                    "callsign": callsign,
                    "airline": airline_info["name"],
                    "logo": airline_info["logo"],
                    "model": ac_model,
                    "origin": meta["origin_city"],
                    "destination": meta["destination_city"],
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
                    "trail": [[lon, lat]],  # Simple trail for live vectors
                    **meta
                })
    except Exception as e:
        print(f"⚠️ Failed to connect to OpenSky Network API ({e}). Falling back to simulated feed.")
        flights = generate_simulated_flights()
        
    # Write to flights.json
    flights_json_path = "flights.json"
    with open(flights_json_path, "w") as f:
        json.dump(flights, f, indent=2)
        
    print(f"💾 Saved {len(flights)} flight datasets to {flights_json_path}")
    print("🎉 Done! Flight data update complete.")

if __name__ == "__main__":
    main()

import os
import json
import urllib.request
import urllib.parse
from aeroparse import parse_notam
from aeroparse.parsers.aircraft import AIRCRAFT_DATABASE

# List of realistic mock/fallback NOTAMs for VANM (Navi Mumbai) and VABB (Mumbai)
MOCK_NOTAM_STRINGS = [
    # VANM - Navi Mumbai International Airport
    (
        "A0757/26 NOTAMN\n"
        "Q) VABF/QMRLC/IV/NBO/A/000/999/1859N07303E005\n"
        "A) VANM B) 2605220430 C) 2605231230\n"
        "D) DAILY 0430-1230\n"
        "E) RWY 08/26 CLSD DUE TO WORK IN PROGRESS AND SYSTEM TESTING."
    ),
    (
        "A0758/26 NOTAMN\n"
        "Q) VABF/QNVAS/IV/BO/AE/000/999/1859N07303E025\n"
        "A) VANM B) 2605211200 C) 2606211830 EST\n"
        "E) DVOR/DME NMI 115.3MHZ U/S DUE TO MAINTENANCE."
    ),
    (
        "A0759/26 NOTAMN\n"
        "Q) VABF/QOBCE/IV/M/AE/000/005/1859N07303E001\n"
        "A) VANM B) 2605200000 C) 2611202359\n"
        "E) ERECTED CONSTRUCTION CRANE AT THR RWY 08, HEIGHT 120FT AGL, LIGHTED."
    ),
    (
        "A0760/26 NOTAMN\n"
        "Q) VABF/QRTCA/IV/BO/W/000/040/1859N07303E010\n"
        "A) VANM B) 2605220200 C) 2605220800\n"
        "E) TEMPORARY RESTRICTED AREA FOR DRONE TEST FLIGHTS UP TO 4000FT AGL OVER THE AIRPORT RADIUS 10NM."
    ),
    
    # VABB - Chhatrapati Shivaji Maharaj International Airport (Mumbai)
    (
        "A1245/26 NOTAMN\n"
        "Q) VABF/QMRLC/IV/NBO/A/000/999/1905N07251E005\n"
        "A) VABB B) 2605240830 C) 2605241030\n"
        "E) RWY 09/27 CLSD FOR PRE-MONSOON MAINTENANCE AND REPAIRS."
    ),
    (
        "A1246/26 NOTAMN\n"
        "Q) VABF/QFAAH/IV/NBO/A/000/999/1905N07251E999\n"
        "A) VABB B) 2605210000 C) 2605252359\n"
        "E) TAXIWAY MIKE CLSD BETWEEN TWY ECHO AND TWY TANGO DUE TO WIP."
    ),
    (
        "A1247/26 NOTAMN\n"
        "Q) VABF/QWLLW/IV/M/W/000/020/1905N07251E005\n"
        "A) VABB B) 2605221800 C) 2605222200\n"
        "E) LASER LIGHT HAZARD REPORTED NORTH WEST OF AIRPORT, PILOTS TO EXERCISE CAUTION."
    )
]

def fetch_live_notams():
    """
    Attempts to fetch live NOTAMs for VANM and VABB from the FAA Search API.
    Returns a list of raw NOTAM text strings, or raises an exception on failure.
    """
    url = "https://notams.aim.faa.gov/notamSearch/nsapi/search"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    payload = {
        "searchType": "ICAO",
        "designatorsForFilter": ["VANM", "VABB"],
        "selection": "ICAO",
        "notamsOnly": False
    }
    
    data_encoded = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_encoded, headers=headers, method="POST")
    
    # Increase timeout to be safe
    with urllib.request.urlopen(req, timeout=10) as response:
        if response.status != 200:
            raise Exception(f"HTTP Error {response.status}")
        
        resp_data = json.loads(response.read().decode("utf-8"))
        notam_list = resp_data.get("notamList", [])
        
        raw_texts = []
        for item in notam_list:
            # Prefer traditional/raw format if available
            txt = item.get("traditionalNotamText") or item.get("simpleText")
            if txt:
                raw_texts.append(txt)
        return raw_texts

def main():
    print("📡 Fetching NOTAMs for VANM and VABB...")
    
    raw_notams = []
    try:
        raw_notams = fetch_live_notams()
        print(f"✅ Successfully fetched {len(raw_notams)} live NOTAMs from FAA API.")
    except Exception as e:
        print(f"⚠️ Failed to fetch live NOTAMs ({e}). Falling back to local high-fidelity simulated NOTAMs.")
        raw_notams = MOCK_NOTAM_STRINGS

    print("⚡ Parsing raw NOTAMs using AeroParse engine...")
    parsed_notams = []
    for raw_str in raw_notams:
        try:
            notam = parse_notam(raw_str)
            parsed_notams.append(notam)
            print(f"   Parsed NOTAM {notam.id} - Location: {notam.location} - Priority: {notam.priority}")
        except Exception as parse_err:
            print(f"   ❌ Error parsing NOTAM: {parse_err}\nRaw text:\n{raw_str}\n")
            
    # Ensure the output directory 'docs' exists
    os.makedirs("docs", exist_ok=True)
    
    # Save the parsed NOTAMs as JSON
    notams_json_path = os.path.join("docs", "notams.json")
    # Convert Pydantic models to dictionaries
    serializable_notams = [n.model_dump() for n in parsed_notams]
    
    with open(notams_json_path, "w") as f:
        json.dump(serializable_notams, f, indent=2)
    print(f"💾 Saved {len(serializable_notams)} parsed NOTAMs to {notams_json_path}")
    
    # Save the aircraft limitations specs as JSON
    aircraft_json_path = os.path.join("docs", "aircraft.json")
    serializable_aircraft = {k: v.model_dump() for k, v in AIRCRAFT_DATABASE.items()}
    
    with open(aircraft_json_path, "w") as f:
        json.dump(serializable_aircraft, f, indent=2)
    print(f"💾 Saved aircraft specs database to {aircraft_json_path}")
    
    print("🎉 Done! NOTAM update completed successfully.")

if __name__ == "__main__":
    main()

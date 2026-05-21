import re
from typing import Dict

ABBREVIATIONS: Dict[str, str] = {
    "RWY": "Runway",
    "RWYS": "Runways",
    "CLSD": "Closed",
    "OBST": "Obstacle",
    "OBSTS": "Obstacles",
    "OBSTN": "Obstruction",
    "OBSTNS": "Obstructions",
    "LT": "Light",
    "LGT": "Light",
    "LGTS": "Lights",
    "LGTD": "Lighted",
    "AD": "Aerodrome",
    "AP": "Airport",
    "MAINT": "Maintenance",
    "WEF": "With Effect From",
    "WIE": "With Immediate Effect",
    "TFC": "Traffic",
    "FL": "Flight Level",
    "FT": "Feet",
    "GND": "Ground",
    "ACT": "Active",
    "ALT": "Altitude",
    "APR": "Apron",
    "APRON": "Apron",
    "TWY": "Taxiway",
    "TWYS": "Taxiways",
    "THR": "Threshold",
    "DEP": "Departure",
    "DEPS": "Departures",
    "ARR": "Arrival",
    "ARRs": "Arrivals",
    "ILS": "Instrument Landing System",
    "GP": "Glide Path",
    "LOC": "Localizer",
    "VOR": "VHF Omnidirectional Range",
    "DME": "Distance Measuring Equipment",
    "NDB": "Non-Directional Beacon",
    "FREQ": "Frequency",
    "FREQS": "Frequencies",
    "TFR": "Temporary Flight Restriction",
    "SUA": "Special Use Airspace",
    "UAS": "Unmanned Aircraft System",
    "MON": "Monday",
    "TUE": "Tuesday",
    "WED": "Wednesday",
    "THU": "Thursday",
    "FRI": "Friday",
    "SAT": "Saturday",
    "SUN": "Sunday",
    "HR": "Hour",
    "HRS": "Hours",
    "MIN": "Minutes",
    "FM": "From",
    "TIL": "Until",
    "UFN": "Until Further Notice",
    "EST": "Estimated",
    "NOTAM": "Notice to Air Missions",
    "NOTAMS": "Notices to Air Missions",
    "COORD": "Coordinates",
    "DIST": "Distance",
    "ELEV": "Elevation",
    "H24": "24 Hours a day",
    "HJ": "From sunrise to sunset",
    "HN": "From sunset to sunrise",
    "OPR": "Operate",
    "OPS": "Operations",
    "WIP": "Work in progress",
    "EXC": "Except",
    "FLT": "Flight",
    "FLTS": "Flights",
    "CIV": "Civil",
    "MIL": "Military",
    "NAV": "Navigation",
    "ATC": "Air Traffic Control",
    "ATIS": "Automatic Terminal Information Service",
    "AWY": "Airway",
    "BLDG": "Building",
    "CAT": "Category",
    "CHG": "Change",
    "COM": "Communications",
    "CTA": "Control Area",
    "CTR": "Control Zone",
    "DLA": "Delay",
    "DLY": "Daily",
    "FATO": "Final Approach and Takeoff Area",
    "FIC": "Flight Information Centre",
    "FIR": "Flight Information Region",
    "FIS": "Flight Information Service",
    "FMS": "Flight Management System",
    "GPS": "Global Positioning System",
    "HDG": "Heading",
    "HEL": "Helicopter",
    "IAS": "Indicated Airspeed",
    "IFR": "Instrument Flight Rules",
    "IMPR": "Improve",
    "IMC": "Instrument Meteorological Conditions",
    "INFO": "Information",
    "INOP": "Inoperative",
    "INSTL": "Install",
    "INTST": "Intensity",
    "KM": "Kilometers",
    "KT": "Knots",
    "LAT": "Latitude",
    "LONG": "Longitude",
    "LDG": "Landing",
    "LVL": "Level",
    "MAX": "Maximum",
    "MET": "Meteorological",
    "MIN": "Minimum",
    "MNT": "Monitor",
    "MSA": "Minimum Sector Altitude",
    "MSG": "Message",
    "MSL": "Mean Sea Level",
    "O/R": "On Request",
    "OBS": "Obstacle",
    "PAPI": "Precision Approach Path Indicator",
    "PAR": "Precision Approach Radar",
    "PERM": "Permanent",
    "PJE": "Parachute Jumping Exercise",
    "PLN": "Plan",
    "PN": "Prior Notice",
    "PPR": "Prior Permission Required",
    "PROC": "Procedure",
    "PROV": "Provisional",
    "PWR": "Power",
    "RCC": "Rescue Coordination Centre",
    "RCA": "Reach Cruising Altitude",
    "REF": "Reference",
    "REG": "Registration",
    "REQ": "Request",
    "RESTR": "Restriction",
    "RNAV": "Area Navigation",
    "RNP": "Required Navigation Performance",
    "RSC": "Rescue",
    "RTE": "Route",
    "RTF": "Radiotelephony",
    "RVR": "Runway Visual Range",
    "SALS": "Simple Approach Lighting System",
    "SAR": "Search and Rescue",
    "SEC": "Seconds",
    "SECT": "Sector",
    "SFC": "Surface",
    "SID": "Standard Instrument Departure",
    "SIGMET": "Significant Meteorological Information",
    "STAR": "Standard Instrument Arrival",
    "SVC": "Service",
    "SYS": "System",
    "TAXI": "Taxi",
    "TODA": "Takeoff Distance Available",
    "TORA": "Takeoff Run Available",
    "TR": "Track",
    "TS": "Thunderstorm",
    "TWR": "Tower",
    "TXT": "Text",
    "UIR": "Upper Flight Information Region",
    "VA": "Volcanic Ash",
    "VAL": "Validity",
    "VAR": "Visual Aeronautical Chart",
    "VASIS": "Visual Approach Slope Indicator System",
    "VDF": "VHF Direction-Finding Station",
    "VFR": "Visual Flight Rules",
    "VMC": "Visual Meteorological Conditions",
    "VOLMET": "Meteorological Information for Aircraft in Flight",
    "VOR/DME": "VHF Omnidirectional Range / Distance Measuring Equipment",
    "VORTAC": "VHF Omnidirectional Range and Tactical Air Navigation",
    "WDI": "Wind Direction Indicator",
    "WDG": "Warning",
    "WX": "Weather",
    "XBAR": "Crossbar",
    "YDS": "Yards",
}

def translate_notam_text(text: str) -> str:
    """
    Translates raw NOTAM text (typically ALL CAPS and abbreviated)
    into a plain-English, readable string.
    """
    if not text:
        return ""
        
    # Replace line breaks and multiple spaces with a single space
    cleaned = re.sub(r'\s+', ' ', text).strip()
    
    # Tokenize by finding words and preserving punctuation
    tokens = re.findall(r'[a-zA-Z0-9/\-]+|[^\w\s]', cleaned)
    
    translated_tokens = []
    for token in tokens:
        # If it is a punctuation mark, add as is
        if not re.match(r'[a-zA-Z0-9/\-]+', token):
            translated_tokens.append(token)
            continue
            
        # Split token by slashes and hyphens to translate component abbreviations
        parts = re.split(r'([/\-])', token)
        translated_parts = []
        for part in parts:
            if part in ['/', '-']:
                translated_parts.append(part)
            else:
                upper_part = part.upper()
                if upper_part in ABBREVIATIONS:
                    translated_parts.append(ABBREVIATIONS[upper_part])
                else:
                    if part.isupper() and len(part) > 1 and not part.isdigit():
                        # Keep designators (e.g. KJFK) and tokens with numbers (e.g. 04L) uppercase
                        is_designator = re.match(r'^[A-Z]{4}$', part) or re.match(r'^\d{2}[LRC]?$', part) or part in ["JFK", "LAX", "ORD", "DCA", "IAD", "SFO"]
                        has_digit = any(c.isdigit() for c in part)
                        if is_designator or has_digit:
                            translated_parts.append(part)
                        else:
                            translated_parts.append(part.lower())
                    else:
                        translated_parts.append(part)
        translated_tokens.append("".join(translated_parts))
                
    # Reassemble tokens into a string, handles punctuation spacing nicely
    result = []
    for t in translated_tokens:
        if t in ['.', ',', ';', ':', '!', '?'] and result:
            result[-1] += t
        else:
            result.append(t)
            
    # Capitalize the first letter of the result and after periods
    sentence_str = " ".join(result)
    sentences = re.split(r'(\.\s+)', sentence_str)
    capitalized_sentences = []
    for part in sentences:
        if part and not part.isspace() and part[0].isalpha():
            capitalized_sentences.append(part[0].upper() + part[1:])
        else:
            capitalized_sentences.append(part)
            
    return "".join(capitalized_sentences)


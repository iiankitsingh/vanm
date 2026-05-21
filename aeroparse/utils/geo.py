import re
import math
from typing import Optional, Tuple, Dict, Any, List

# Dictionary of major reference airports/points for coordinate offset resolution
REFERENCE_POINTS = {
    "JFK": (40.6397, -73.7789),
    "KJFK": (40.6397, -73.7789),
    "LAX": (33.9416, -118.4085),
    "KLAX": (33.9416, -118.4085),
    "ORD": (41.9742, -87.9073),
    "KORD": (41.9742, -87.9073),
    "DCA": (38.8512, -77.0377),
    "KDCA": (38.8512, -77.0377),
    "IAD": (38.9445, -77.4558),
    "KIAD": (38.9445, -77.4558),
    "SFO": (37.6189, -122.3749),
    "KSFO": (37.6189, -122.3749),
    "LHR": (51.4700, -0.4543),
    "EGLL": (51.4700, -0.4543),
    "CDG": (49.0097, 2.5479),
    "LFPG": (49.0097, 2.5479),
    "HND": (35.5494, 139.7798),
    "RJTT": (35.5494, 139.7798),
    "SYD": (-33.9461, 151.1772),
    "YSSY": (-33.9461, 151.1772),
    "ZNY": (40.7500, -73.9900), # New York ARTCC center approximate
}

DIRECTIONS = {
    "N": 0.0, "NNE": 22.5, "NE": 45.0, "ENE": 67.5,
    "E": 90.0, "ESE": 112.5, "SE": 135.0, "SSE": 157.5,
    "S": 180.0, "SSW": 202.5, "SW": 225.0, "WSW": 247.5,
    "W": 270.0, "WNW": 292.5, "NW": 315.0, "NNW": 337.5
}

def parse_coordinate_string(coord_str: str) -> Optional[Tuple[float, float]]:
    """
    Parses FAA/ICAO coordinate formats like 4042N07400W or 404222N0740011W
    into decimal degrees (latitude, longitude).
    """
    s = coord_str.strip().upper()
    # Pattern: DDMM[SS]N/S DDDMM[SS]E/W (optional spaces inside or around)
    pattern = r'^(\d{2})(\d{2})(\d{2})?([NS])\s*(\d{3})(\d{2})(\d{2})?([EW])$'
    match = re.match(pattern, s)
    if match:
        try:
            lat_deg = float(match.group(1))
            lat_min = float(match.group(2))
            lat_sec = float(match.group(3)) if match.group(3) else 0.0
            lat_dir = match.group(4)
            
            lon_deg = float(match.group(5))
            lon_min = float(match.group(6))
            lon_sec = float(match.group(7)) if match.group(7) else 0.0
            lon_dir = match.group(8)
            
            lat = lat_deg + lat_min / 60.0 + lat_sec / 3600.0
            if lat_dir == 'S':
                lat = -lat
                
            lon = lon_deg + lon_min / 60.0 + lon_sec / 3600.0
            if lon_dir == 'W':
                lon = -lon
                
            return lat, lon
        except ValueError:
            return None
    return None

def project_point(lat: float, lon: float, distance_nm: float, bearing_deg: float) -> Tuple[float, float]:
    """
    Projects a lat/lon point by a distance (in Nautical Miles) and bearing (in degrees).
    Uses great-circle distance projection formulas.
    """
    R_NM = 3440.065 # Earth radius in nautical miles
    
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    bearing_rad = math.radians(bearing_deg)
    d_div_r = distance_nm / R_NM
    
    lat_out = math.asin(
        math.sin(lat_rad) * math.cos(d_div_r) +
        math.cos(lat_rad) * math.sin(d_div_r) * math.cos(bearing_rad)
    )
    
    lon_out = lon_rad + math.atan2(
        math.sin(bearing_rad) * math.sin(d_div_r) * math.cos(lat_rad),
        math.cos(d_div_r) - math.sin(lat_rad) * math.sin(lat_out)
    )
    
    return math.degrees(lat_out), math.degrees(lon_out)

def create_circle_polygon(lat: float, lon: float, radius_nm: float, num_points: int = 36) -> Dict[str, Any]:
    """
    Generates a GeoJSON Polygon approximate representation of a circle.
    """
    coords = []
    for i in range(num_points):
        angle = (i * 360.0) / num_points
        p_lat, p_lon = project_point(lat, lon, radius_nm, angle)
        coords.append([p_lon, p_lat])
    # Close the polygon by repeating the first coordinate
    coords.append(coords[0])
    return {
        "type": "Polygon",
        "coordinates": [coords]
    }

def extract_spatial_info_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Scans NOTAM free-text to extract geometries.
    Looks for:
    - Circular restrictions (e.g., 'CIRCLE RADIUS 5NM OF 4042N07400W')
    - Radial distances (e.g., '10NM SW OF KJFK')
    - Coordinates alone (e.g., '4042N07400W')
    Returns a GeoJSON Geometry dict if parsed, or None.
    """
    text_upper = text.upper()
    
    # 1. Circle with radius and coordinates (e.g., "RADIUS 5NM OF 4042N07400W" or "5 NM RADIUS OF 4042N07400W")
    circle_pattern_1 = r'(?:CIRCLE\s+)?RADIUS\s+(\d+(?:\.\d+)?)\s*(?:NM|NAUTICAL\s+MILES)?\s*(?:OF|AROUND)\s*(\d{4,6}[NS]\s*\d{5,7}[EW])'
    circle_pattern_2 = r'(\d+(?:\.\d+)?)\s*(?:NM|NAUTICAL\s+MILES)?\s*RADIUS\s*(?:OF|AROUND)\s*(\d{4,6}[NS]\s*\d{5,7}[EW])'
    
    for pattern in [circle_pattern_1, circle_pattern_2]:
        match = re.search(pattern, text_upper)
        if match:
            radius = float(match.group(1))
            coord_str = match.group(2).replace(" ", "")
            parsed_coords = parse_coordinate_string(coord_str)
            if parsed_coords:
                lat, lon = parsed_coords
                return create_circle_polygon(lat, lon, radius)
                
    # 2. Radial distance from reference point (e.g. "10NM SW OF KJFK" or "5 NM SW OF JFK")
    radial_pattern = r'(\d+(?:\.\d+)?)\s*(?:NM|NAUTICAL\s+MILES)?\s*(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)\s+OF\s+([A-Z0-9]{3,4})'
    match = re.search(radial_pattern, text_upper)
    if match:
        radius = float(match.group(1))
        dir_str = match.group(2)
        ref_pt = match.group(3)
        if ref_pt in REFERENCE_POINTS:
            ref_lat, ref_lon = REFERENCE_POINTS[ref_pt]
            bearing = DIRECTIONS[dir_str]
            center_lat, center_lon = project_point(ref_lat, ref_lon, radius, bearing)
            # Create a 2 NM safety circle around the target point, or just represent it as a Point/Circle
            return create_circle_polygon(center_lat, center_lon, 2.0)
            
    # 3. Direct Coordinate in text
    coord_pattern = r'(\d{4,6}[NS]\s*\d{5,7}[EW])'
    match = re.search(coord_pattern, text_upper)
    if match:
        coord_str = match.group(1).replace(" ", "")
        parsed_coords = parse_coordinate_string(coord_str)
        if parsed_coords:
            lat, lon = parsed_coords
            # Return a simple Point geometry
            return {
                "type": "Point",
                "coordinates": [lon, lat]
            }
            
    return None

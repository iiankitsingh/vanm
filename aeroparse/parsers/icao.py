import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from aeroparse.models.canonical import Notam, GeoJSONGeometry
from aeroparse.parsers.base import BaseParser, register_parser
from aeroparse.parsers.abbreviations import translate_notam_text
from aeroparse.utils.geo import parse_coordinate_string, create_circle_polygon, extract_spatial_info_from_text

class IcaoNotamParser(BaseParser):
    """
    Parser for standard ICAO format NOTAMs containing a Q) line and lettered fields.
    """
    
    def can_parse(self, raw_text: str) -> bool:
        # Check if the text contains a Q) line indicator
        return "Q)" in raw_text or re.search(r'^[A-Z]\d{4}/\d{2}', raw_text.strip()) is not None

    def parse(self, raw_text: str) -> Notam:
        # Standardize line endings
        normalized = raw_text.replace('\r\n', '\n').strip()
        
        # Extract ID (e.g., A0123/26)
        id_match = re.search(r'^([A-Z]\d{4}/\d{2})', normalized)
        notam_id = id_match.group(1) if id_match else "ICAO-UNKNOWN"
        
        # Parse Q) line
        q_code = None
        geometry = None
        fir = None
        
        q_match = re.search(r'Q\)\s*([^A-Z]*[A-Z0-9/]+)', normalized)
        if q_match:
            q_line = q_match.group(1).strip()
            parts = q_line.split('/')
            if len(parts) >= 2:
                fir = parts[0].strip()
                q_code = parts[1].strip()
            
            # Extract coordinates/radius from Q) line if available (usually the 8th part)
            if len(parts) >= 8:
                coord_part = parts[7].strip()
                # Remove any comments or trailing letters
                coord_part = re.sub(r'[^0-9NSEW]', '', coord_part)
                if coord_part:
                    geometry = self._parse_q_line_coords(coord_part)
                    
        # Parse fields A) through G)
        field_a = self._extract_field(normalized, 'A')
        field_b = self._extract_field(normalized, 'B')
        field_c = self._extract_field(normalized, 'C')
        field_d = self._extract_field(normalized, 'D')
        field_e = self._extract_field(normalized, 'E')
        field_f = self._extract_field(normalized, 'F')
        field_g = self._extract_field(normalized, 'G')
        
        # Format datetimes
        valid_from = self._parse_notam_datetime(field_b) if field_b else None
        valid_to = self._parse_notam_datetime(field_c) if field_c else None
        
        # Affected aerodromes
        affected_aerodromes = []
        if field_a:
            # Splitting by spaces or slashes
            aerodromes = re.split(r'[\s/]+', field_a.strip())
            affected_aerodromes = [ad for ad in aerodromes if ad]
            
        # Plain English Translation
        description_text = field_e if field_e else normalized
        plain_text = translate_notam_text(description_text)
        
        # Add altitude information to plain text if available
        alt_info = []
        if field_f:
            alt_info.append(f"Lower limit: {field_f.strip()}")
        if field_g:
            alt_info.append(f"Upper limit: {field_g.strip()}")
        if alt_info:
            plain_text += " (" + ", ".join(alt_info) + ")"
            
        # Priority mapping based on Q-code or presence of critical words
        priority = "MEDIUM"
        plain_text_upper = plain_text.upper()
        if "CLOSED" in plain_text_upper or "CLSD" in plain_text_upper or "EMERGENCY" in plain_text_upper:
            priority = "HIGH"
        elif "HAZARD" in plain_text_upper or "RESTRICTED" in plain_text_upper:
            priority = "HIGH"
            
        # Try extracting geometry from free text if Q-line geometry parsing failed
        if not geometry and field_e:
            geometry = extract_spatial_info_from_text(field_e)
            
        # Create canonical GeoJSON Geometry model
        geojson_geom = None
        if geometry:
            geojson_geom = GeoJSONGeometry(**geometry)
            
        return Notam(
            id=notam_id,
            q_code=q_code,
            raw_text=raw_text,
            location=field_a.strip() if field_a else (fir if fir else None),
            valid_from=valid_from,
            valid_to=valid_to,
            plain_text=plain_text,
            affected_aerodromes=affected_aerodromes,
            geometry=geojson_geom,
            priority=priority
        )
        
    def _extract_field(self, text: str, field_letter: str) -> Optional[str]:
        """
        Extracts the contents of a lettered field (e.g. E) from the NOTAM text.
        """
        # Look for e.g. E) or \nE) followed by content until the next field letter) or end of string
        pattern = rf'(?:^|\s){field_letter}\)\s*(.*?)(?=(?:\s[A-G]\)|$))'
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return None
        
    def _parse_q_line_coords(self, coord_str: str) -> Optional[Dict[str, Any]]:
        """
        Parses the coordinate and radius part of the Q line.
        E.g. 4042N07400W005 -> Lat: 40.7, Lon: -74.0, Radius: 5 NM
        """
        # Match format: 4042N07400W005 (DDMMN/DDDMMW/RRR)
        # Lat: 2 degrees + 2 minutes + N/S (5 chars)
        # Lon: 3 degrees + 2 minutes + E/W (6 chars)
        # Radius: 3 digits (3 chars)
        match = re.match(r'^(\d{4}[NS])(\d{5}[EW])(\d{3})?$', coord_str)
        if match:
            lat_str = match.group(1)
            lon_str = match.group(2)
            radius_str = match.group(3)
            
            parsed = parse_coordinate_string(lat_str + lon_str)
            if parsed:
                lat, lon = parsed
                radius = float(radius_str) if radius_str else 5.0 # Default radius in NM
                return create_circle_polygon(lat, lon, radius)
        return None
        
    def _parse_notam_datetime(self, dt_str: str) -> Optional[str]:
        """
        Parses YYMMDDHHMM datetime format into ISO format.
        """
        dt_str = dt_str.strip().upper()
        if dt_str in ["PERM", "UFN", "EST"]:
            return dt_str
            
        # Match 10 digits
        match = re.match(r'^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$', dt_str)
        if match:
            try:
                year = 2000 + int(match.group(1))
                month = int(match.group(2))
                day = int(match.group(3))
                hour = int(match.group(4))
                minute = int(match.group(5))
                dt = datetime(year, month, day, hour, minute)
                return dt.isoformat() + "Z"
            except ValueError:
                return None
        return None

# Register ICAO Parser instance
register_parser(IcaoNotamParser())
